import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/payment";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendBookingWhatsAppNotifications } from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    const verification = verifyWebhookSignature(signature, rawBody);

    if (!verification.isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const { eventType, bookingId, paymentRef } = verification;

    // Only handle successful checkout / payment events
    const successEvents = [
      "checkout.session.completed",
      "payment_intent.succeeded",
      "charge.succeeded",
    ];

    if (!eventType || !successEvents.includes(eventType)) {
      return NextResponse.json({ received: true });
    }

    if (!bookingId && !paymentRef) {
      return NextResponse.json({ error: "Missing booking identification" }, { status: 400 });
    }

    // Locate booking by ID or paymentRef
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          ...(bookingId ? [{ id: bookingId }] : []),
          ...(paymentRef ? [{ paymentRef }] : []),
        ],
      },
      include: {
        service: true,
      },
    });

    if (!booking) {
      console.warn(`[Payment Webhook] Booking not found for id=${bookingId}, ref=${paymentRef}`);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Transition status to CONFIRMED and release transient hold
    const confirmedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        expiresAt: null,
      },
      include: {
        service: true,
      },
    });

    // Sync event with Google Calendar if not already created
    if (!confirmedBooking.calendarEventId) {
      try {
        const calendarEventId = await createCalendarEvent(confirmedBooking);
        if (calendarEventId) {
          await prisma.booking.update({
            where: { id: confirmedBooking.id },
            data: { calendarEventId },
          });
        }
      } catch (calError) {
        console.error("[Payment Webhook] Error creating calendar event:", calError);
      }
    }

    // Send WhatsApp notification for confirmed booking to both Admin and Customer
    await sendBookingWhatsAppNotifications({
      eventType: "BOOKING_CONFIRMED",
      booking: confirmedBooking,
      service: confirmedBooking.service,
    }).catch((err) =>
      console.error("[Payment Webhook] WhatsApp confirmation notification error:", err)
    );

    return NextResponse.json({ received: true, status: "CONFIRMED" });
  } catch (error) {
    console.error("[Payment Webhook] Internal server error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
