import { NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession } from "@/lib/payment";
import { sendAdminWhatsAppNotification } from "@/lib/whatsapp";

const checkoutSchema = z.object({
  serviceId: z.string().min(1, "Service ID is required"),
  startTime: z.string().datetime({ message: "startTime must be a valid ISO datetime string" }),
  clientName: z.string().min(1, "Name is required"),
  clientEmail: z.string().email("Valid email is required"),
  clientPhone: z.string().min(1, "Phone number is required"),
  notes: z.string().optional().nullable(),
});

class SlotCollisionError extends Error {
  constructor(message = "This slot was just taken by another customer") {
    super(message);
    this.name = "SlotCollisionError";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { serviceId, startTime, clientName, clientEmail, clientPhone, notes } =
      parsed.data;

    const startTimeDate = new Date(startTime);

    // Run booking creation and collision check inside an interactive transaction
    const booking = await prisma.$transaction(async (tx) => {
      // 1. Fetch service package
      const service = await tx.servicePackage.findUnique({
        where: { id: serviceId },
      });

      if (!service || !service.isActive) {
        throw new Error("Service package not found or inactive");
      }

      const endTime = addMinutes(startTimeDate, service.durationMinutes);
      const bufferEndTime = addMinutes(endTime, service.bufferMinutes);
      const now = new Date();

      // 2. Re-verify collision with active bookings
      const conflictingBooking = await tx.booking.findFirst({
        where: {
          startTime: { lt: bufferEndTime },
          bufferEndTime: { gt: startTimeDate },
          OR: [
            { status: "CONFIRMED" },
            {
              status: "PENDING_PAYMENT",
              expiresAt: { gt: now },
            },
          ],
        },
      });

      if (conflictingBooking) {
        throw new SlotCollisionError();
      }

      // 3. Re-verify collision with blackout dates
      const conflictingBlackout = await tx.blackoutDate.findFirst({
        where: {
          startTime: { lt: bufferEndTime },
          endTime: { gt: startTimeDate },
        },
      });

      if (conflictingBlackout) {
        throw new SlotCollisionError("Selected time overlaps with a studio blackout window");
      }

      // 4. Create transient booking hold (PENDING_PAYMENT for 15 minutes)
      const expiresAt = addMinutes(now, 15);

      return await tx.booking.create({
        data: {
          serviceId: service.id,
          startTime: startTimeDate,
          endTime,
          bufferEndTime,
          totalAmount: service.price,
          clientName,
          clientEmail,
          clientPhone,
          notes: notes || null,
          status: "PENDING_PAYMENT",
          expiresAt,
        },
        include: {
          service: true,
        },
      });
    });

    // 5. Generate Checkout Session and record payment reference
    const { checkoutUrl, paymentRef } = await createCheckoutSession(booking);

    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentRef },
    });

    // Notify admin via WhatsApp that customer has added a new booking
    sendAdminWhatsAppNotification({
      eventType: "BOOKING_CREATED",
      booking,
      service: booking.service,
    }).catch((err) =>
      console.error("[Checkout] WhatsApp notification dispatch failed:", err)
    );

    return NextResponse.json({
      checkoutUrl,
      bookingId: booking.id,
      manageToken: booking.manageToken,
    });
  } catch (error: unknown) {
    if (error instanceof SlotCollisionError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to initiate booking checkout";

    if (message.includes("Service package not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error("[Booking Checkout] Error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
