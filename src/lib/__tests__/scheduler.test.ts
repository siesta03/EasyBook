import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAvailableSlots } from "../scheduler";
import { prisma } from "@/lib/prisma";
import { fromZonedTime } from "date-fns-tz";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    servicePackage: {
      findUnique: vi.fn(),
    },
    operatingHours: {
      findUnique: vi.fn(),
    },
    blackoutDate: {
      findMany: vi.fn(),
    },
    booking: {
      findMany: vi.fn(),
    },
  },
}));

const mockServiceFindUnique = prisma.servicePackage.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockOpHoursFindUnique = prisma.operatingHours.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockBlackoutFindMany = prisma.blackoutDate.findMany as unknown as ReturnType<typeof vi.fn>;
const mockBookingFindMany = prisma.booking.findMany as unknown as ReturnType<typeof vi.fn>;

describe("Dynamic Slot Scheduler Engine", () => {
  const timezone = "Asia/Kuala_Lumpur";
  // Future date to avoid "isToday" 2-hour advance notice interference in standard collision tests
  const testDate = "2028-06-14"; // Wednesday (dayOfWeek: 3)

  beforeEach(() => {
    vi.clearAllMocks();

    // Default active 60-min photoshoot service with 30-min buffer
    mockServiceFindUnique.mockResolvedValue({
      id: "pkg-portrait",
      name: "Portrait Session",
      durationMinutes: 60,
      bufferMinutes: 30,
      price: 150,
      isActive: true,
    });

    // Default operating hours: Wednesday (3) open 09:00 - 17:00
    mockOpHoursFindUnique.mockResolvedValue({
      id: "op-wed",
      dayOfWeek: 3,
      openTime: "09:00",
      closeTime: "17:00",
      isClosed: false,
    });

    // Default: no blackouts
    mockBlackoutFindMany.mockResolvedValue([]);
    // Default: no bookings
    mockBookingFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should generate all slots as available when schedule is completely open", async () => {
    const slots = await getAvailableSlots(testDate, "pkg-portrait");

    expect(slots.length).toBeGreaterThan(0);
    // 09:00 to 16:00 slots can finish by 17:00 (since duration is 60 min)
    const slot0900 = slots.find((s) => s.label === "09:00 AM");
    expect(slot0900).toBeDefined();
    expect(slot0900?.available).toBe(true);
  });

  it("should exclude candidate slots that exceed closeTime (Rule 1)", async () => {
    // Operating hours 09:00 - 17:00. Service duration = 60 mins.
    // 16:00 slot ends at 17:00 -> fits within closeTime (available: true)
    // 16:30 slot ends at 17:30 -> exceeds closeTime (available: false)
    const slots = await getAvailableSlots(testDate, "pkg-portrait");

    const slot1600 = slots.find((s) => s.label === "04:00 PM");
    const slot1630 = slots.find((s) => s.label === "04:30 PM");

    expect(slot1600).toBeDefined();
    expect(slot1600?.available).toBe(true);

    expect(slot1630).toBeDefined();
    expect(slot1630?.available).toBe(false);
  });

  it("should enforce variable duration + buffer interval blocking the exact required window", async () => {
    // Service: 60 min duration + 30 min buffer (total block = 90 mins).
    // An existing booking at 11:30 - 12:30 (bufferEnd 13:00).
    const bookingStart = fromZonedTime(`${testDate} 11:30:00`, timezone);
    const bookingEnd = fromZonedTime(`${testDate} 12:30:00`, timezone);
    const bookingBufferEnd = fromZonedTime(`${testDate} 13:00:00`, timezone);

    mockBookingFindMany.mockResolvedValue([
      {
        id: "b-1",
        startTime: bookingStart,
        endTime: bookingEnd,
        bufferEndTime: bookingBufferEnd,
        status: "CONFIRMED",
        expiresAt: null,
      },
    ]);

    const slots = await getAvailableSlots(testDate, "pkg-portrait");

    // Slot at 10:00: shoot 10:00 - 11:00, buffer 11:00 - 11:30.
    // slotBufferEnd is 11:30. Booking starts at 11:30.
    // Half-open interval [10:00, 11:30) does NOT overlap [11:30, 13:00) -> AVAILABLE!
    const slot1000 = slots.find((s) => s.label === "10:00 AM");
    expect(slot1000?.available).toBe(true);

    // Slot at 10:30: shoot 10:30 - 11:30, buffer 11:30 - 12:00.
    // slotBufferEnd (12:00) > bookingStart (11:30) and slotStart (10:30) < bookingBufferEnd (13:00) -> COLLISION!
    const slot1030 = slots.find((s) => s.label === "10:30 AM");
    expect(slot1030?.available).toBe(false);

    // Slot at 11:00: shoot 11:00 - 12:00, overlaps shoot -> COLLISION!
    const slot1100 = slots.find((s) => s.label === "11:00 AM");
    expect(slot1100?.available).toBe(false);

    // Slot at 11:30: exact same start time -> COLLISION!
    const slot1130 = slots.find((s) => s.label === "11:30 AM");
    expect(slot1130?.available).toBe(false);

    // Slot at 12:00: inside booking shoot -> COLLISION!
    const slot1200 = slots.find((s) => s.label === "12:00 PM");
    expect(slot1200?.available).toBe(false);

    // Slot at 12:30: shoot 12:30 - 13:30, overlaps booking buffer [12:30, 13:00) -> COLLISION!
    const slot1230 = slots.find((s) => s.label === "12:30 PM");
    expect(slot1230?.available).toBe(false);

    // Slot at 13:00: booking buffer ended at 13:00.
    // Half-open interval [13:00, 14:30) does NOT overlap [11:30, 13:00) -> AVAILABLE!
    const slot1300 = slots.find((s) => s.label === "01:00 PM");
    expect(slot1300?.available).toBe(true);
  });

  it("should mark slots unavailable when colliding with an active CONFIRMED booking", async () => {
    const bookingStart = fromZonedTime(`${testDate} 14:00:00`, timezone);
    const bookingEnd = fromZonedTime(`${testDate} 15:00:00`, timezone);
    const bookingBufferEnd = fromZonedTime(`${testDate} 15:30:00`, timezone);

    mockBookingFindMany.mockResolvedValue([
      {
        id: "b-confirmed",
        startTime: bookingStart,
        endTime: bookingEnd,
        bufferEndTime: bookingBufferEnd,
        status: "CONFIRMED",
        expiresAt: null,
      },
    ]);

    const slots = await getAvailableSlots(testDate, "pkg-portrait");

    const slot1400 = slots.find((s) => s.label === "02:00 PM");
    const slot1430 = slots.find((s) => s.label === "02:30 PM");
    const slot1500 = slots.find((s) => s.label === "03:00 PM");

    expect(slot1400?.available).toBe(false);
    expect(slot1430?.available).toBe(false);
    expect(slot1500?.available).toBe(false);

    // 01:00 PM (buffer ends 02:30, which collides with 02:00!)
    const slot1300 = slots.find((s) => s.label === "01:00 PM");
    expect(slot1300?.available).toBe(false);

    // 12:30 PM: buffer ends at 12:30 + 90m = 14:00 (exact boundary, no collision)
    const slot1230 = slots.find((s) => s.label === "12:30 PM");
    expect(slot1230?.available).toBe(true);
  });

  it("should query active PENDING_PAYMENT holds (expiresAt > now) and block candidate slots", async () => {
    // 06:00 AM in Kuala Lumpur on test day (at least 2 hours before 10:00 AM slots)
    const fixedNow = fromZonedTime(`${testDate} 06:00:00`, timezone);
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    const bookingStart = fromZonedTime(`${testDate} 10:00:00`, timezone);
    const bookingEnd = fromZonedTime(`${testDate} 11:00:00`, timezone);
    const bookingBufferEnd = fromZonedTime(`${testDate} 11:30:00`, timezone);

    // Active hold with expiresAt 15 minutes after fixedNow (06:15 AM)
    const activeExpiresAt = new Date(fixedNow.getTime() + 15 * 60 * 1000);

    mockBookingFindMany.mockImplementation((args: unknown) => {
      // Verify that prisma.booking.findMany includes filtering for expiresAt > now
      const queryArgs = args as { where: { OR: Array<Record<string, unknown>> } };
      const orConditions = queryArgs.where.OR;
      expect(orConditions).toContainEqual({ status: "CONFIRMED" });
      expect(orConditions).toContainEqual({
        status: "PENDING_PAYMENT",
        expiresAt: { gt: expect.any(Date) },
      });

      return Promise.resolve([
        {
          id: "b-pending-active",
          startTime: bookingStart,
          endTime: bookingEnd,
          bufferEndTime: bookingBufferEnd,
          status: "PENDING_PAYMENT",
          expiresAt: activeExpiresAt,
        },
      ]);
    });

    const slots = await getAvailableSlots(testDate, "pkg-portrait");

    const slot1000 = slots.find((s) => s.label === "10:00 AM");
    expect(slot1000?.available).toBe(false);
  });

  it("should NOT block candidate slots if PENDING_PAYMENT hold is expired (expiresAt < now)", async () => {
    // 06:00 AM in Kuala Lumpur on test day (at least 2 hours before 10:00 AM slots)
    const fixedNow = fromZonedTime(`${testDate} 06:00:00`, timezone);
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    // Expired 15 minutes before fixedNow (05:45 AM)
    const expiredAt = new Date(fixedNow.getTime() - 15 * 60 * 1000);

    const bookingStart = fromZonedTime(`${testDate} 10:00:00`, timezone);
    const bookingEnd = fromZonedTime(`${testDate} 11:00:00`, timezone);
    const bookingBufferEnd = fromZonedTime(`${testDate} 11:30:00`, timezone);

    mockBookingFindMany.mockImplementation(() => {
      // Simulate real Prisma behavior: an expired booking does NOT match `expiresAt: { gt: now }`
      const candidateBookings = [
        {
          id: "b-pending-expired",
          startTime: bookingStart,
          endTime: bookingEnd,
          bufferEndTime: bookingBufferEnd,
          status: "PENDING_PAYMENT",
          expiresAt: expiredAt,
        },
      ];

      // Filter as database would
      const filtered = candidateBookings.filter((b) => {
        if (b.status === "CONFIRMED") return true;
        if (b.status === "PENDING_PAYMENT" && b.expiresAt > fixedNow) return true;
        return false;
      });

      return Promise.resolve(filtered);
    });

    const slots = await getAvailableSlots(testDate, "pkg-portrait");

    // Since expired hold was not returned from DB query, slot 10:00 AM remains available!
    const slot1000 = slots.find((s) => s.label === "10:00 AM");
    expect(slot1000?.available).toBe(true);
  });

  it("should return empty array if studio is closed on that day", async () => {
    mockOpHoursFindUnique.mockResolvedValue({
      id: "op-closed",
      dayOfWeek: 3,
      openTime: "09:00",
      closeTime: "17:00",
      isClosed: true,
    });

    const slots = await getAvailableSlots(testDate, "pkg-portrait");
    expect(slots).toEqual([]);
  });

  it("should block candidate slots overlapping with BlackoutDate records", async () => {
    const blackoutStart = fromZonedTime(`${testDate} 13:00:00`, timezone);
    const blackoutEnd = fromZonedTime(`${testDate} 15:00:00`, timezone);

    mockBlackoutFindMany.mockResolvedValue([
      {
        id: "bo-1",
        startTime: blackoutStart,
        endTime: blackoutEnd,
        reason: "Studio Maintenance",
      },
    ]);

    const slots = await getAvailableSlots(testDate, "pkg-portrait");

    // 13:00, 13:30, 14:00, 14:30 are during blackout
    const slot1300 = slots.find((s) => s.label === "01:00 PM");
    const slot1400 = slots.find((s) => s.label === "02:00 PM");

    expect(slot1300?.available).toBe(false);
    expect(slot1400?.available).toBe(false);

    // 09:00 AM is unaffected
    const slot0900 = slots.find((s) => s.label === "09:00 AM");
    expect(slot0900?.available).toBe(true);
  });
});
