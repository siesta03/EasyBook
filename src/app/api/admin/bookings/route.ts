import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { sendBookingWhatsAppNotifications } from "@/lib/whatsapp";
import { BookingStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const queryParam = searchParams.get("q");

    const where: Record<string, unknown> = {};

    if (
      statusParam &&
      Object.values(BookingStatus).includes(statusParam as BookingStatus)
    ) {
      where.status = statusParam as BookingStatus;
    }

    if (startDateParam || endDateParam) {
      where.startTime = {
        ...(startDateParam ? { gte: new Date(startDateParam) } : {}),
        ...(endDateParam ? { lte: new Date(endDateParam) } : {}),
      };
    }

    if (queryParam && queryParam.trim().length > 0) {
      const q = queryParam.trim();
      where.OR = [
        { clientName: { contains: q, mode: "insensitive" } },
        { clientEmail: { contains: q, mode: "insensitive" } },
        { clientPhone: { contains: q } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        service: true,
      },
      orderBy: {
        startTime: "desc",
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_")
    ) {
      throw error;
    }

    console.error("[Admin Bookings] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

const updateBookingSchema = z.object({
  bookingId: z.string().min(1, "bookingId is required"),
  status: z
    .enum(["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "EXPIRED"])
    .optional(),
  startTime: z.string().datetime().optional(),
});

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid update request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { bookingId, status, startTime } = parsed.data;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // 1. Rescheduling logic
    if (startTime) {
      const newStartTime = new Date(startTime);
      const newEndTime = addMinutes(
        newStartTime,
        booking.service.durationMinutes
      );
      const newBufferEndTime = addMinutes(
        newEndTime,
        booking.service.bufferMinutes
      );

      // Check for collision with other active bookings
      const collision = await prisma.booking.findFirst({
        where: {
          id: { not: booking.id },
          startTime: { lt: newBufferEndTime },
          bufferEndTime: { gt: newStartTime },
          OR: [
            { status: "CONFIRMED" },
            {
              status: "PENDING_PAYMENT",
              expiresAt: { gt: new Date() },
            },
          ],
        },
      });

      if (collision) {
        return NextResponse.json(
          {
            error:
              "Rescheduling conflict: Another active booking occupies this time slot.",
          },
          { status: 409 }
        );
      }

      updateData.startTime = newStartTime;
      updateData.endTime = newEndTime;
      updateData.bufferEndTime = newBufferEndTime;
    }

    // 2. Status update logic
    if (status) {
      updateData.status = status;
      if (status === "CONFIRMED") {
        updateData.expiresAt = null;
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: updateData,
      include: { service: true },
    });

    // 3. Calendar synchronization
    if (status === "CANCELLED" && booking.calendarEventId) {
      try {
        await deleteCalendarEvent(booking.calendarEventId);
      } catch (calErr) {
        console.error("[Admin Bookings] Failed to remove calendar event:", calErr);
      }
    } else if (
      status === "CONFIRMED" &&
      !booking.calendarEventId
    ) {
      try {
        const calendarEventId = await createCalendarEvent(updatedBooking);
        if (calendarEventId) {
          await prisma.booking.update({
            where: { id: updatedBooking.id },
            data: { calendarEventId },
          });
        }
      } catch (calErr) {
        console.error("[Admin Bookings] Failed to sync calendar event:", calErr);
      }
    } else if (startTime && updatedBooking.calendarEventId) {
      // Re-create event with updated times
      try {
        await deleteCalendarEvent(updatedBooking.calendarEventId);
        const newEventId = await createCalendarEvent(updatedBooking);
        if (newEventId) {
          await prisma.booking.update({
            where: { id: updatedBooking.id },
            data: { calendarEventId: newEventId },
          });
        }
      } catch (calErr) {
        console.error("[Admin Bookings] Failed to update calendar event:", calErr);
      }
    }

    // 4. WhatsApp notification to both Customer and Admin on status change or reschedule
    try {
      const eventType =
        status === "CONFIRMED"
          ? "BOOKING_CONFIRMED"
          : status === "CANCELLED"
          ? "BOOKING_CANCELLED"
          : startTime
          ? "BOOKING_RESCHEDULED"
          : null;

      if (eventType) {
        await sendBookingWhatsAppNotifications({
          eventType,
          booking: updatedBooking,
          service: updatedBooking.service,
        });
      }
    } catch (waErr) {
      console.error("[Admin Bookings] Failed to send WhatsApp notification:", waErr);
    }

    return NextResponse.json({
      message: "Booking updated successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("[Admin Bookings] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
