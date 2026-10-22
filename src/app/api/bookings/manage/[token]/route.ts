import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteCalendarEvent } from "@/lib/google-calendar";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const booking = await prisma.booking.findUnique({
      where: {
        manageToken: token,
      },
      include: {
        service: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("[Booking Manage] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve booking" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const booking = await prisma.booking.findUnique({
      where: {
        manageToken: token,
      },
      include: {
        service: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Booking is already cancelled" },
        { status: 400 }
      );
    }

    // Cancellation policy: Must be at least 24 hours before shoot
    const now = new Date();
    const hoursUntilStart =
      (booking.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilStart < 24) {
      return NextResponse.json(
        {
          error:
            "Bookings can only be cancelled at least 24 hours before the scheduled shoot time.",
        },
        { status: 400 }
      );
    }

    // Update status to CANCELLED
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
      },
      include: {
        service: true,
      },
    });

    // Delete associated Google Calendar event if exists
    if (booking.calendarEventId) {
      try {
        await deleteCalendarEvent(booking.calendarEventId);
      } catch (calError) {
        console.error("[Booking Cancel] Failed to remove calendar event:", calError);
      }
    }

    return NextResponse.json({
      message: "Booking successfully cancelled",
      booking: updated,
    });
  } catch (error) {
    console.error("[Booking Manage] PATCH Error:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
