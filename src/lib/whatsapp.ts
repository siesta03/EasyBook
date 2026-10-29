import { prisma } from "./prisma";
import { formatInTimeZone } from "date-fns-tz";
import { formatMYR } from "./categories";

export type NotificationEventType =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_CANCELLED"
  | "TEST";

export interface BookingNotificationPayload {
  eventType: NotificationEventType;
  recipientRole?: "ADMIN" | "CUSTOMER";
  booking?: {
    id: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    startTime: Date | string;
    endTime: Date | string;
    totalAmount: number | string | { toString(): string };
    notes?: string | null;
    manageToken?: string;
  };
  service?: {
    name: string;
    category?: string;
    durationMinutes: number;
    bufferMinutes?: number;
  };
  customMessage?: string;
  targetNumber?: string;
  apiKey?: string;
  provider?: string;
}

/**
 * Format phone number to clean international digits (e.g., 0189779241 -> 60189779241)
 */
export function sanitizeWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  // Convert Malaysian local leading '0' (e.g. 0123456789) to '60' (60123456789)
  if (cleaned.startsWith("0") && cleaned.length >= 9 && cleaned.length <= 11) {
    cleaned = "60" + cleaned.substring(1);
  } else if (cleaned.startsWith("1") && (cleaned.length === 9 || cleaned.length === 10)) {
    cleaned = "60" + cleaned;
  }
  return cleaned;
}

/**
 * Build rich WhatsApp formatted message text for Admin or Customer
 */
export function formatWhatsAppMessage(payload: BookingNotificationPayload): string {
  const {
    eventType,
    recipientRole = "ADMIN",
    booking,
    service,
    customMessage,
  } = payload;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const timezone = process.env.TIMEZONE || "Asia/Kuala_Lumpur";

  if (customMessage) {
    return customMessage;
  }

  if (eventType === "TEST") {
    return [
      "🔔 *EasyBook WhatsApp Notification Alert*",
      "",
      "✅ Congratulations! Your WhatsApp alert channel is LIVE and connected.",
      "Both Admin & Customer booking alerts are configured in Malaysia Ringgit (RM).",
      "",
      `📅 *Timestamp:* ${formatInTimeZone(new Date(), timezone, "yyyy-MM-dd HH:mm:ss")} (MYT)`,
      `🌐 *Admin Console:* ${appUrl}/admin/notifications`,
    ].join("\n");
  }

  if (!booking) {
    return "📸 *EasyBook Studio Booking Update Received*";
  }

  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);
  const formattedDate = formatInTimeZone(startDate, timezone, "EEEE, dd MMM yyyy");
  const formattedTime = `${formatInTimeZone(startDate, timezone, "hh:mm a")} - ${formatInTimeZone(endDate, timezone, "hh:mm a")}`;
  const formattedAmount = formatMYR(booking.totalAmount);
  const categoryName = service?.category || "Indoor Photoshoot";
  const packageName = service?.name || "Photoshoot Session";
  const manageUrl = booking.manageToken
    ? `${appUrl}/booking/manage/${booking.manageToken}`
    : `${appUrl}`;

  // =========================================================
  // CUSTOMER MESSAGE TEMPLATES
  // =========================================================
  if (recipientRole === "CUSTOMER") {
    if (eventType === "BOOKING_CREATED") {
      return [
        "📸 *EasyBook Studio — Booking Hold Created!* ⚡",
        "━━━━━━━━━━━━━━━━━━",
        `Hi *${booking.clientName}*, thank you for choosing EasyBook Studio! Your photoshoot slot is temporarily locked for 15 minutes while payment is completed.`,
        "",
        `🏷️ *Category:* ${categoryName}`,
        `📦 *Package:* ${packageName} (${service?.durationMinutes || 60} mins)`,
        `📅 *Date:* ${formattedDate}`,
        `⏰ *Time:* ${formattedTime}`,
        `💳 *Total Amount:* ${formattedAmount}`,
        booking.notes ? `📝 *Notes:* ${booking.notes}` : "",
        "━━━━━━━━━━━━━━━━━━",
        `🔗 *Manage / View Booking:* ${manageUrl}`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (eventType === "BOOKING_CONFIRMED") {
      return [
        "🎉 *EasyBook Studio — Booking Confirmed!* ✅",
        "━━━━━━━━━━━━━━━━━━",
        `Hi *${booking.clientName}*, your photoshoot booking is officially *CONFIRMED*! We look forward to welcoming you.`,
        "",
        `🏷️ *Category:* ${categoryName}`,
        `📦 *Package:* ${packageName} (${service?.durationMinutes || 60} mins)`,
        `📅 *Date:* ${formattedDate}`,
        `⏰ *Time:* ${formattedTime}`,
        `💳 *Amount Paid:* ${formattedAmount}`,
        booking.notes ? `📝 *Notes:* ${booking.notes}` : "",
        "━━━━━━━━━━━━━━━━━━",
        "📍 Please arrive 10 minutes before your scheduled slot.",
        `🔗 *Manage or Reschedule:* ${manageUrl}`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (eventType === "BOOKING_RESCHEDULED") {
      return [
        "📅 *EasyBook Studio — Booking Rescheduled* 🔄",
        "━━━━━━━━━━━━━━━━━━",
        `Hi *${booking.clientName}*, your photoshoot session has been updated to a new date and time:`,
        "",
        `🏷️ *Category:* ${categoryName}`,
        `📦 *Package:* ${packageName}`,
        `📅 *New Date:* ${formattedDate}`,
        `⏰ *New Time:* ${formattedTime}`,
        `💳 *Total:* ${formattedAmount}`,
        "━━━━━━━━━━━━━━━━━━",
        `🔗 *View Updated Booking:* ${manageUrl}`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (eventType === "BOOKING_CANCELLED") {
      return [
        "❌ *EasyBook Studio — Booking Cancelled*",
        "━━━━━━━━━━━━━━━━━━",
        `Hi *${booking.clientName}*, your photoshoot booking for *${packageName}* (${categoryName}) on *${formattedDate}* at *${formattedTime}* has been cancelled.`,
        "",
        `🌐 *Book a New Session:* ${appUrl}`,
      ].join("\n");
    }
  }

  // =========================================================
  // ADMIN MESSAGE TEMPLATES
  // =========================================================
  if (eventType === "BOOKING_CREATED") {
    return [
      "📸 *NEW BOOKING RECEIVED!* ⚡",
      "━━━━━━━━━━━━━━━━━━",
      `👤 *Client:* ${booking.clientName}`,
      `📞 *Phone:* ${booking.clientPhone}`,
      `✉️ *Email:* ${booking.clientEmail}`,
      "",
      `🏷️ *Category:* ${categoryName}`,
      `📦 *Package:* ${packageName} (${service?.durationMinutes || 60}m + ${service?.bufferMinutes ?? 30}m buffer)`,
      `📅 *Date:* ${formattedDate}`,
      `⏰ *Time:* ${formattedTime}`,
      `💵 *Amount:* ${formattedAmount}`,
      booking.notes ? `📝 *Notes:* ${booking.notes}` : "",
      "━━━━━━━━━━━━━━━━━━",
      "⏳ *Status:* Pending Payment (15-min hold)",
      `🔗 *Admin Calendar:* ${appUrl}/admin/calendar`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (eventType === "BOOKING_CONFIRMED") {
    return [
      "🎉 *BOOKING PAYMENT CONFIRMED!* 💳",
      "━━━━━━━━━━━━━━━━━━",
      `👤 *Client:* ${booking.clientName}`,
      `📞 *Phone:* ${booking.clientPhone}`,
      `✉️ *Email:* ${booking.clientEmail}`,
      "",
      `🏷️ *Category:* ${categoryName}`,
      `📦 *Package:* ${packageName} (${service?.durationMinutes || 60}m + ${service?.bufferMinutes ?? 30}m buffer)`,
      `📅 *Date:* ${formattedDate}`,
      `⏰ *Time:* ${formattedTime}`,
      `💵 *Paid:* ${formattedAmount}`,
      booking.notes ? `📝 *Notes:* ${booking.notes}` : "",
      "━━━━━━━━━━━━━━━━━━",
      "✅ *Status:* Confirmed & Synced to Schedule",
      `🔗 *View on Calendar:* ${appUrl}/admin/calendar`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (eventType === "BOOKING_RESCHEDULED") {
    return [
      "📅 *BOOKING RESCHEDULED!* 🔄",
      "━━━━━━━━━━━━━━━━━━",
      `👤 *Client:* ${booking.clientName} (${booking.clientPhone})`,
      `🏷️ *Category:* ${categoryName}`,
      `📦 *Package:* ${packageName}`,
      `📅 *New Date:* ${formattedDate}`,
      `⏰ *New Time:* ${formattedTime}`,
      `💵 *Amount:* ${formattedAmount}`,
      `🔗 *Admin Calendar:* ${appUrl}/admin/calendar`,
    ].join("\n");
  }

  if (eventType === "BOOKING_CANCELLED") {
    return [
      "❌ *BOOKING CANCELLED*",
      "━━━━━━━━━━━━━━━━━━",
      `👤 *Client:* ${booking.clientName} (${booking.clientPhone})`,
      `🏷️ *Category:* ${categoryName}`,
      `📦 *Package:* ${packageName}`,
      `📅 *Cancelled Slot:* ${formattedDate} (${formattedTime})`,
      `💵 *Amount:* ${formattedAmount}`,
      `🔗 *Admin Bookings:* ${appUrl}/admin/bookings`,
    ].join("\n");
  }

  return [
    `⚠️ *Booking Update (${eventType})*`,
    `Client: ${booking.clientName}`,
    `Date: ${formattedDate} at ${formattedTime}`,
    `Amount: ${formattedAmount}`,
    `Manage: ${appUrl}/admin/bookings`,
  ].join("\n");
}

export interface WhatsAppDispatchResult {
  success: boolean;
  isLiveDelivered?: boolean;
  logId?: string;
  status?: "SENT" | "SIMULATED" | "FAILED";
  recipient?: string;
  recipientRole?: "ADMIN" | "CUSTOMER";
  message?: string;
  directUrl?: string;
  deliveryNote?: string;
  reason?: string;
  error?: string;
}

/**
 * Low-level gateway dispatcher + NotificationLog recorder
 */
async function dispatchWhatsAppMessage({
  targetNumber,
  recipientRole,
  eventType,
  message,
  provider,
  apiKey,
  booking,
  service,
}: {
  targetNumber: string;
  recipientRole: "ADMIN" | "CUSTOMER";
  eventType: NotificationEventType;
  message: string;
  provider: string;
  apiKey?: string | null;
  booking?: BookingNotificationPayload["booking"];
  service?: BookingNotificationPayload["service"];
}) {
  const cleanNumber = sanitizeWhatsAppNumber(targetNumber);
  const directUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

  let providerStatus: "SENT" | "SIMULATED" | "FAILED" = "SIMULATED";
  let deliveryNote =
    "Recorded in Notification Center (Use 1-Click WhatsApp or configure gateway key for auto-delivery)";

  // 1. CallMeBot Gateway
  if (provider === "callmebot" && apiKey && apiKey.trim().length > 0) {
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanNumber}&text=${encodeURIComponent(
        message
      )}&apikey=${apiKey.trim()}`;
      const resp = await fetch(url, { method: "GET" });
      const text = await resp.text();
      if (
        resp.ok &&
        (text.includes("Message queued") ||
          text.includes("OK") ||
          text.includes("success") ||
          text.includes("200"))
      ) {
        providerStatus = "SENT";
        deliveryNote = `Delivered to +${cleanNumber} via CallMeBot`;
      } else if (recipientRole === "CUSTOMER") {
        // CallMeBot personal keys only send to the registered phone; fallback to SIMULATED with 1-Click wa.me link for customer
        providerStatus = "SIMULATED";
        deliveryNote =
          "Ready for 1-Click Customer WhatsApp (CallMeBot key is bound to Admin phone; use Fonnte for automated customer numbers)";
      } else {
        providerStatus = "FAILED";
        deliveryNote = `CallMeBot Error: ${text.substring(0, 120)}`;
      }
    } catch (callMeErr) {
      providerStatus = recipientRole === "CUSTOMER" ? "SIMULATED" : "FAILED";
      deliveryNote = `CallMeBot Network Error: ${
        callMeErr instanceof Error ? callMeErr.message : "Request failed"
      }`;
    }
  }
  // 2. Fonnte Gateway (Supports sending to ANY Malaysian / international customer or admin number)
  else if (provider === "fonnte" && apiKey && apiKey.trim().length > 0) {
    try {
      const resp = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: apiKey.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: cleanNumber,
          message,
          countryCode: "60",
        }),
      });
      const fonnteData = await resp.json().catch(() => ({}));
      if (resp.ok && fonnteData.status) {
        providerStatus = "SENT";
        deliveryNote = `Delivered to +${cleanNumber} via Fonnte`;
      } else {
        providerStatus = "FAILED";
        deliveryNote = `Fonnte Error: ${fonnteData.reason || "Failed"}`;
      }
    } catch (fonnteErr) {
      providerStatus = "FAILED";
      deliveryNote = `Fonnte Error: ${
        fonnteErr instanceof Error ? fonnteErr.message : "Request failed"
      }`;
    }
  }
  // 3. Custom Webhook in .env
  else if (process.env.WHATSAPP_API_URL) {
    try {
      const resp = await fetch(process.env.WHATSAPP_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.WHATSAPP_API_TOKEN
            ? { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          to: cleanNumber,
          recipientRole,
          message,
          eventType,
        }),
      });
      if (resp.ok) {
        providerStatus = "SENT";
        deliveryNote = `Delivered to +${cleanNumber} via custom webhook`;
      } else {
        providerStatus = "FAILED";
        deliveryNote = "Custom webhook returned non-200";
      }
    } catch (webhookErr) {
      providerStatus = "FAILED";
      deliveryNote = `Webhook error: ${
        webhookErr instanceof Error ? webhookErr.message : "Request failed"
      }`;
    }
  }

  const log = await prisma.notificationLog.create({
    data: {
      channel: "WHATSAPP",
      recipient: cleanNumber,
      recipientRole,
      eventType,
      message,
      status: providerStatus,
      isRead: false,
      metadata: JSON.stringify({
        bookingId: booking?.id || null,
        clientName: booking?.clientName || null,
        clientPhone: booking?.clientPhone || null,
        clientEmail: booking?.clientEmail || null,
        category: service?.category || "Indoor Photoshoot",
        packageName: service?.name || null,
        totalAmount: booking?.totalAmount ? String(booking.totalAmount) : null,
        manageToken: booking?.manageToken || null,
        recipientRole,
        directUrl,
        provider,
        deliveryNote,
        sentAt: new Date().toISOString(),
      }),
    },
  });

  return {
    success: providerStatus !== "FAILED",
    isLiveDelivered: providerStatus === "SENT",
    logId: log.id,
    status: providerStatus,
    recipient: cleanNumber,
    recipientRole,
    message,
    directUrl,
    deliveryNote,
  };
}

/**
 * Dispatch WhatsApp notification to Admin (or explicit targetNumber)
 */
export async function sendAdminWhatsAppNotification(
  payload: BookingNotificationPayload
): Promise<WhatsAppDispatchResult> {
  try {
    const admin = await prisma.adminUser.findFirst({
      orderBy: { createdAt: "asc" },
    });

    const recipientRole = payload.recipientRole || "ADMIN";
    const targetNumber =
      payload.targetNumber ||
      (recipientRole === "CUSTOMER"
        ? payload.booking?.clientPhone
        : admin?.whatsappNumber ||
          admin?.phone ||
          process.env.ADMIN_WHATSAPP_NUMBER ||
          "60123456789");

    const isEnabled = admin?.whatsappEnabled ?? true;
    const provider = payload.provider || admin?.whatsappProvider || "callmebot";
    const apiKey = payload.apiKey ?? admin?.whatsappApiKey;

    if (
      recipientRole === "ADMIN" &&
      payload.eventType === "BOOKING_CREATED" &&
      admin &&
      !admin.whatsappNotifyOnCheckout
    ) {
      return {
        success: false,
        reason: "Notification disabled for booking checkout",
      };
    }

    if (
      recipientRole === "ADMIN" &&
      payload.eventType === "BOOKING_CONFIRMED" &&
      admin &&
      !admin.whatsappNotifyOnConfirm
    ) {
      return {
        success: false,
        reason: "Notification disabled for booking confirmation",
      };
    }

    if (!targetNumber) {
      return { success: false, reason: "No WhatsApp number configured" };
    }

    if (!isEnabled && payload.eventType !== "TEST") {
      return { success: false, reason: "WhatsApp notifications disabled" };
    }

    const message = formatWhatsAppMessage({
      ...payload,
      recipientRole,
    });

    return await dispatchWhatsAppMessage({
      targetNumber,
      recipientRole,
      eventType: payload.eventType,
      message,
      provider,
      apiKey,
      booking: payload.booking,
      service: payload.service,
    });
  } catch (error) {
    console.error("[WhatsApp Alert] Failed to send notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Dispatch WhatsApp notification to Customer (booking.clientPhone)
 */
export async function sendCustomerWhatsAppNotification(
  payload: BookingNotificationPayload
): Promise<WhatsAppDispatchResult> {
  try {
    if (!payload.booking?.clientPhone) {
      return { success: false, reason: "No customer phone number on booking" };
    }

    const admin = await prisma.adminUser.findFirst({
      orderBy: { createdAt: "asc" },
    });

    const isEnabled = admin?.whatsappEnabled ?? true;
    const notifyCustomer = admin?.whatsappNotifyCustomer ?? true;

    if (!isEnabled || !notifyCustomer) {
      return {
        success: false,
        reason: "Customer WhatsApp notifications disabled",
      };
    }

    const provider = payload.provider || admin?.whatsappProvider || "callmebot";
    const apiKey = payload.apiKey ?? admin?.whatsappApiKey;

    const message = formatWhatsAppMessage({
      ...payload,
      recipientRole: "CUSTOMER",
    });

    return await dispatchWhatsAppMessage({
      targetNumber: payload.booking.clientPhone,
      recipientRole: "CUSTOMER",
      eventType: payload.eventType,
      message,
      provider,
      apiKey,
      booking: payload.booking,
      service: payload.service,
    });
  } catch (error) {
    console.error("[WhatsApp Customer Alert] Failed to send notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Unified helper: Sends WhatsApp notification to BOTH Admin and Customer
 * whenever a booking is created, confirmed, rescheduled, or cancelled.
 */
export async function sendBookingWhatsAppNotifications(
  payload: BookingNotificationPayload
): Promise<{
  admin: WhatsAppDispatchResult;
  customer: WhatsAppDispatchResult;
}> {
  const [adminResult, customerResult] = await Promise.allSettled([
    sendAdminWhatsAppNotification({ ...payload, recipientRole: "ADMIN" }),
    sendCustomerWhatsAppNotification({ ...payload, recipientRole: "CUSTOMER" }),
  ]);

  return {
    admin:
      adminResult.status === "fulfilled"
        ? adminResult.value
        : { success: false, error: "Admin notification failed" },
    customer:
      customerResult.status === "fulfilled"
        ? customerResult.value
        : { success: false, error: "Customer notification failed" },
  };
}
