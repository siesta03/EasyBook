import { addMinutes, getDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  label: string;
  available: boolean;
}

export async function getAvailableSlots(
  dateStr: string,
  serviceId: string
): Promise<AvailableSlot[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD");
  }

  const timezone = process.env.TIMEZONE || "Asia/Kuala_Lumpur";

  // 1. Fetch ServicePackage
  const service = await prisma.servicePackage.findUnique({
    where: { id: serviceId },
  });

  if (!service || !service.isActive) {
    throw new Error("Service package not found or inactive");
  }

  // 2. Determine Day of Week in configured timezone (0 = Sunday, ..., 6 = Saturday)
  const noonInTimezone = fromZonedTime(`${dateStr} 12:00:00`, timezone);
  const zonedNoon = toZonedTime(noonInTimezone, timezone);
  const dayOfWeek = getDay(zonedNoon);

  // 3. Fetch OperatingHours
  const operatingHours = await prisma.operatingHours.findUnique({
    where: { dayOfWeek },
  });

  if (!operatingHours || operatingHours.isClosed) {
    return [];
  }

  // Determine studio open and close timestamps for that day
  const studioOpenTime = fromZonedTime(
    `${dateStr} ${operatingHours.openTime.padStart(5, "0")}:00`,
    timezone
  );
  const studioCloseTime = fromZonedTime(
    `${dateStr} ${operatingHours.closeTime.padStart(5, "0")}:00`,
    timezone
  );

  if (studioCloseTime.getTime() <= studioOpenTime.getTime()) {
    return [];
  }

  // Query boundaries spanning the business day in UTC
  const dayStartUtc = fromZonedTime(`${dateStr} 00:00:00`, timezone);
  const dayEndUtc = fromZonedTime(`${dateStr} 23:59:59.999`, timezone);

  const now = new Date();

  // 4. Query overlapping BlackoutDate records
  const blackoutDates = await prisma.blackoutDate.findMany({
    where: {
      startTime: { lt: dayEndUtc },
      endTime: { gt: dayStartUtc },
    },
  });

  // 5. Query overlapping active Booking records
  const bookings = await prisma.booking.findMany({
    where: {
      startTime: { lt: dayEndUtc },
      bufferEndTime: { gt: dayStartUtc },
      OR: [
        { status: "CONFIRMED" },
        {
          status: "PENDING_PAYMENT",
          expiresAt: { gt: now },
        },
      ],
    },
  });

  // Combine busy intervals for collision checking
  const busyIntervals: { start: Date; end: Date }[] = [
    ...bookings.map((b) => ({ start: b.startTime, end: b.bufferEndTime })),
    ...blackoutDates.map((bo) => ({ start: bo.startTime, end: bo.endTime })),
  ];

  // 6. Generate candidate slots at 30-minute intervals
  const slots: AvailableSlot[] = [];
  let currentSlotStart = studioOpenTime;

  const todayStr = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const isToday = dateStr === todayStr;
  const isPast = dateStr < todayStr;
  const twoHoursFromNowMs = now.getTime() + 2 * 60 * 60 * 1000;

  while (currentSlotStart.getTime() < studioCloseTime.getTime()) {
    const slotEnd = addMinutes(currentSlotStart, service.durationMinutes);
    const slotBufferEnd = addMinutes(slotEnd, service.bufferMinutes);

    const slotStartMs = currentSlotStart.getTime();
    const slotBufferEndMs = slotBufferEnd.getTime();

    // Rule 1: slotEnd must not exceed the studio's closeTime
    const rule1Passes = slotEnd.getTime() <= studioCloseTime.getTime();

    // Rule 2: If dateStr is today, slotStart must be at least 2 hours in the future from new Date()
    let rule2Passes = true;
    if (isPast) {
      rule2Passes = false;
    } else if (isToday) {
      rule2Passes = slotStartMs >= twoHoursFromNowMs;
    }

    // Rule 3 (Collision Check): [slotStart, slotBufferEnd) must NOT overlap with any busy intervals
    const hasCollision = busyIntervals.some((busy) => {
      const busyStartMs = busy.start.getTime();
      const busyEndMs = busy.end.getTime();
      return slotStartMs < busyEndMs && slotBufferEndMs > busyStartMs;
    });
    const rule3Passes = !hasCollision;

    const available = rule1Passes && rule2Passes && rule3Passes;

    slots.push({
      startTime: currentSlotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      label: formatInTimeZone(currentSlotStart, timezone, "hh:mm a"),
      available,
    });

    currentSlotStart = addMinutes(currentSlotStart, 30);
  }

  return slots;
}
