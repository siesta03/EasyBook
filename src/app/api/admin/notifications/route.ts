import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { NotificationEventType } from "@/lib/whatsapp";
import { sendAdminTelegramNotification } from "@/lib/telegram";
import { isEmailConfigured, sendCustomerEmailNotification } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel");
    const recipientRole = searchParams.get("recipientRole");
    const eventType = searchParams.get("eventType");
    const status = searchParams.get("status");
    const q = searchParams.get("q");

    const where: Record<string, unknown> = {};

    if (channel && channel !== "ALL") {
      where.channel = channel;
    }
    if (recipientRole && recipientRole !== "ALL") {
      where.recipientRole = recipientRole;
    }
    if (eventType && eventType !== "ALL") {
      where.eventType = eventType;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (q && q.trim().length > 0) {
      const query = q.trim();
      where.OR = [
        { recipient: { contains: query, mode: "insensitive" } },
        { message: { contains: query, mode: "insensitive" } },
        { eventType: { contains: query, mode: "insensitive" } },
      ];
    }

    const [notifications, allStats, admin, recentBookings] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.notificationLog.findMany({
        select: {
          channel: true,
          recipientRole: true,
          status: true,
          isRead: true,
        },
      }),
      prisma.adminUser.findFirst({
        orderBy: { createdAt: "asc" },
      }),
      prisma.booking.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { service: true },
      }),
    ]);

    const stats = {
      total: allStats.length,
      unreadCount: allStats.filter((n) => !n.isRead).length,
      telegramCount: allStats.filter((n) => n.channel === "TELEGRAM").length,
      emailCount: allStats.filter((n) => n.channel === "EMAIL").length,
      calendarCount: allStats.filter((n) => n.channel === "GOOGLE_CALENDAR").length,
      adminAlertsCount: allStats.filter((n) => n.recipientRole === "ADMIN").length,
      customerAlertsCount: allStats.filter((n) => n.recipientRole === "CUSTOMER").length,
      sentCount: allStats.filter((n) => n.status === "SENT").length,
      simulatedCount: allStats.filter((n) => n.status === "SIMULATED").length,
      failedCount: allStats.filter((n) => n.status === "FAILED").length,
    };

    return NextResponse.json({
      notifications,
      stats,
      alertChannels: {
        telegramEnabled: admin?.telegramEnabled ?? false,
        telegramConfigured: !!(
          (admin?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN) &&
          (admin?.telegramChatId || process.env.TELEGRAM_CHAT_ID)
        ),
        emailConfigured: isEmailConfigured(),
        emailNotifyCustomer: admin?.emailNotifyCustomer ?? true,
      },
      recentBookings,
    });
  } catch (error) {
    console.error("[Admin Notifications] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}

const dispatchSchema = z.object({
  action: z.enum(["send_booking_alert", "test"]).default("send_booking_alert"),
  bookingId: z.string().optional(),
  recipientRole: z.enum(["ADMIN", "CUSTOMER", "BOTH"]).default("BOTH"),
  eventType: z
    .enum([
      "BOOKING_CREATED",
      "BOOKING_CONFIRMED",
      "BOOKING_RESCHEDULED",
      "BOOKING_CANCELLED",
      "TEST",
    ])
    .default("BOOKING_CONFIRMED"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = dispatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid notification request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { action, bookingId, recipientRole, eventType } = parsed.data;

    if (action === "test") {
      const res = await sendAdminTelegramNotification({ eventType: "TEST" });
      if (!res.success) {
        return NextResponse.json(
          { error: res.error || res.reason || "Telegram test failed" },
          { status: 400 }
        );
      }
      return NextResponse.json(res);
    }

    if (!bookingId) {
      return NextResponse.json(
        { error: "bookingId is required for booking alerts" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationUrl = `${appUrl}/booking/manage/${booking.manageToken}`;

    if (recipientRole === "BOTH") {
      const [telegramRes, emailRes] = await Promise.allSettled([
        sendAdminTelegramNotification({
          eventType: eventType as NotificationEventType,
          recipientRole: "ADMIN",
          booking,
          service: booking.service,
        }),
        sendCustomerEmailNotification({
          eventType: "BOOKING_CONFIRMED",
          recipientRole: "CUSTOMER",
          booking,
          service: booking.service,
          forceSend: true,
        }),
      ]);

      return NextResponse.json({
        success: true,
        results: {
          telegram:
            telegramRes.status === "fulfilled"
              ? telegramRes.value
              : { success: false, status: "FAILED", error: "Telegram alert failed" },
          email:
            emailRes.status === "fulfilled"
              ? emailRes.value
              : { success: false, status: "FAILED", error: "Email invite failed" },
        },
        invitationUrl,
      });
    }

    if (recipientRole === "CUSTOMER") {
      const res = await sendCustomerEmailNotification({
        eventType: "BOOKING_CONFIRMED",
        recipientRole: "CUSTOMER",
        booking,
        service: booking.service,
        forceSend: true,
      });
      if (!res.success && res.status === "FAILED") {
        return NextResponse.json(
          { error: res.error || "Failed to send confirmation email" },
          { status: 400 }
        );
      }
      return NextResponse.json({ ...res, invitationUrl });
    }

    const res = await sendAdminTelegramNotification({
      eventType: eventType as NotificationEventType,
      recipientRole: "ADMIN",
      booking,
      service: booking.service,
    });
    if (!res.success) {
      return NextResponse.json(
        { error: res.error || res.reason || "Failed to send Telegram alert" },
        { status: 400 }
      );
    }
    return NextResponse.json(res);
  } catch (error) {
    console.error("[Admin Notifications] POST error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch notification" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, markAllRead, isRead } = body;

    if (markAllRead) {
      await prisma.notificationLog.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing notification ID" }, { status: 400 });
    }

    const updated = await prisma.notificationLog.update({
      where: { id },
      data: { isRead: isRead ?? true },
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (error) {
    console.error("[Admin Notifications] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const clearAll = searchParams.get("clearAll") === "true";

    if (clearAll) {
      await prisma.notificationLog.deleteMany({});
      return NextResponse.json({ success: true, message: "Notification logs cleared" });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing notification ID" }, { status: 400 });
    }

    await prisma.notificationLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("[Admin Notifications] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
