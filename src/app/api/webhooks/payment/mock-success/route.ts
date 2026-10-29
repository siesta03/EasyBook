import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendBookingWhatsAppNotifications } from "@/lib/whatsapp";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");
    const token = searchParams.get("token");
    const ref = searchParams.get("ref");

    if (!bookingId && !token) {
      return NextResponse.json({ error: "Missing bookingId or token" }, { status: 400 });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          ...(bookingId ? [{ id: bookingId }] : []),
          ...(token ? [{ manageToken: token }] : []),
        ],
      },
      include: {
        service: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Confirm booking
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        expiresAt: null,
        paymentRef: ref || booking.paymentRef || `mock_${Date.now()}`,
      },
      include: {
        service: true,
      },
    });

    // Create Calendar Event if not created yet
    if (!updated.calendarEventId) {
      try {
        const calendarEventId = await createCalendarEvent(updated);
        if (calendarEventId) {
          await prisma.booking.update({
            where: { id: updated.id },
            data: { calendarEventId },
          });
        }
      } catch (calError) {
        console.error("[Mock Payment] Calendar creation error:", calError);
      }
    }

    // Send WhatsApp notification for confirmed booking to both Admin and Customer
    await sendBookingWhatsAppNotifications({
      eventType: "BOOKING_CONFIRMED",
      booking: updated,
      service: updated.service,
    }).catch((err) =>
      console.error("[Mock Payment] WhatsApp confirmation alert error:", err)
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      new URL(`/booking/manage/${booking.manageToken}?confirmed=true`, appUrl)
    );
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

    console.error("[Mock Payment] Error:", error);
    return NextResponse.json({ error: "Failed to process mock payment" }, { status: 500 });
  }
}
