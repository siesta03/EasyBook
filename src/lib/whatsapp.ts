import { prisma } from "./prisma";
import { format } from "date-fns";

export interface BookingNotificationPayload {
  eventType: "BOOKING_CREATED" | "BOOKING_CONFIRMED" | "BOOKING_CANCELLED" | "TEST";
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
    durationMinutes: number;
  };
  customMessage?: string;
  targetNumber?: string;
  apiKey?: string;
  provider?: string;
}

/**
 * Format phone number to clean digits (e.g., 60189779241)
 */
export function sanitizeWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Build rich WhatsApp formatted message text
 */
export function formatWhatsAppMessage(payload: BookingNotificationPayload): string {
  const { eventType, booking, service, customMessage } = payload;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (customMessage) {
    return customMessage;
  }

  if (eventType === "TEST") {
    return [
      "🔔 *EasyBook WhatsApp Notification Alert*",
      "",
      "✅ Congratulations! Your WhatsApp alert channel is LIVE and connected.",
      "You will receive immediate alerts whenever a customer adds a photoshoot booking.",
      "",
      `📅 *Timestamp:* ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
      `🌐 *Admin Console:* ${appUrl}/admin/dashboard`,
    ].join("\n");
  }

  if (!booking) {
    return "📸 *EasyBook Booking Update Received*";
  }

  const startDate = new Date(booking.startTime);
  const formattedDate = format(startDate, "EEEE, MMMM d, yyyy");
  const formattedTime = format(startDate, "hh:mm a");
  const amountStr =
    typeof booking.totalAmount === "object"
      ? booking.totalAmount.toString()
      : String(booking.totalAmount);

  if (eventType === "BOOKING_CREATED") {
    return [
      "📸 *NEW BOOKING ADDED!* ⚡",
      "━━━━━━━━━━━━━━━━━━",
      `👤 *Client:* ${booking.clientName}`,
      `📞 *Phone:* ${booking.clientPhone}`,
      `✉️ *Email:* ${booking.clientEmail}`,
      "",
      `📦 *Package:* ${service?.name || "Photoshoot Session"} (${service?.durationMinutes || 60}m)`,
      `📅 *Date:* ${formattedDate}`,
      `⏰ *Time:* ${formattedTime}`,
      `💵 *Amount:* $${amountStr}`,
      booking.notes ? `📝 *Notes:* ${booking.notes}` : "",
      "━━━━━━━━━━━━━━━━━━",
      "⏳ *Status:* Pending Payment (15-min hold)",
      `🔗 *View Booking:* ${appUrl}/admin/bookings`,
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
      `📦 *Package:* ${service?.name || "Photoshoot Session"}`,
      `📅 *Date:* ${formattedDate}`,
      `⏰ *Time:* ${formattedTime}`,
      `💵 *Paid:* $${amountStr}`,
      "━━━━━━━━━━━━━━━━━━",
      "✅ *Status:* Confirmed & Added to Schedule",
      `🔗 *Manage in Admin:* ${appUrl}/admin/bookings`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `⚠️ *Booking Update (${eventType})*`,
    `Client: ${booking.clientName}`,
    `Date: ${formattedDate} at ${formattedTime}`,
    `Manage: ${appUrl}/admin/bookings`,
  ].join("\n");
}

/**
 * Dispatch WhatsApp notification to Admin or target phone
 */
export async function sendAdminWhatsAppNotification(payload: BookingNotificationPayload) {
  try {
    const admin = await prisma.adminUser.findFirst({
      orderBy: { createdAt: "asc" },
    });

    const targetNumber = payload.targetNumber || admin?.whatsappNumber;
    const isEnabled = admin?.whatsappEnabled ?? true;
    const provider = payload.provider || admin?.whatsappProvider || "callmebot";
    const apiKey = payload.apiKey || admin?.whatsappApiKey;

    // Check specific event notification toggles
    if (payload.eventType === "BOOKING_CREATED" && admin && !admin.whatsappNotifyOnCheckout) {
      return { success: false, reason: "Notification disabled for booking checkout" };
    }
    if (payload.eventType === "BOOKING_CONFIRMED" && admin && !admin.whatsappNotifyOnConfirm) {
      return { success: false, reason: "Notification disabled for booking confirmation" };
    }

    if (!targetNumber) {
      console.warn("[WhatsApp Notification] No WhatsApp number configured. Alert skipped.");
      return { success: false, reason: "No WhatsApp number configured" };
    }

    if (!isEnabled && payload.eventType !== "TEST") {
      console.log("[WhatsApp Notification] WhatsApp alerts are disabled in settings.");
      return { success: false, reason: "WhatsApp notifications disabled" };
    }

    const cleanNumber = sanitizeWhatsAppNumber(targetNumber);
    const message = formatWhatsAppMessage(payload);
    const directUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

    let providerStatus: "SENT" | "SIMULATED" | "FAILED" = "SIMULATED";
    let deliveryNote = "Simulated: No WhatsApp Gateway API key configured.";

    // 1. CallMeBot Gateway (100% Free personal WhatsApp delivery)
    if (provider === "callmebot" && apiKey && apiKey.trim().length > 0) {
      try {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanNumber}&text=${encodeURIComponent(message)}&apikey=${apiKey.trim()}`;
        const resp = await fetch(url, { method: "GET" });
        const text = await resp.text();
        if (resp.ok && (text.includes("Message queued") || text.includes("OK") || text.includes("success") || text.includes("200"))) {
          providerStatus = "SENT";
          deliveryNote = "Delivered to WhatsApp via CallMeBot";
        } else {
          providerStatus = "FAILED";
          deliveryNote = `CallMeBot Error: ${text.substring(0, 120)}`;
        }
      } catch (callMeErr) {
        providerStatus = "FAILED";
        deliveryNote = `CallMeBot Network Error: ${callMeErr instanceof Error ? callMeErr.message : "Request failed"}`;
      }
    }
    // 2. Fonnte Gateway (Popular token-based gateway in Malaysia / SE Asia)
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
          }),
        });
        const fonnteData = await resp.json().catch(() => ({}));
        if (resp.ok && fonnteData.status) {
          providerStatus = "SENT";
          deliveryNote = "Delivered to WhatsApp via Fonnte";
        } else {
          providerStatus = "FAILED";
          deliveryNote = `Fonnte Error: ${fonnteData.reason || "Failed"}`;
        }
      } catch (fonnteErr) {
        providerStatus = "FAILED";
        deliveryNote = `Fonnte Error: ${fonnteErr instanceof Error ? fonnteErr.message : "Request failed"}`;
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
            message,
            eventType: payload.eventType,
          }),
        });
        if (resp.ok) {
          providerStatus = "SENT";
          deliveryNote = "Delivered via custom webhook";
        } else {
          providerStatus = "FAILED";
          deliveryNote = "Custom webhook returned non-200";
        }
      } catch (webhookErr) {
        providerStatus = "FAILED";
        deliveryNote = `Webhook error: ${webhookErr instanceof Error ? webhookErr.message : "Request failed"}`;
      }
    }

    // 4. Record in NotificationLog table for visibility in Admin console
    const log = await prisma.notificationLog.create({
      data: {
        channel: "WHATSAPP",
        recipient: cleanNumber,
        eventType: payload.eventType,
        message,
        status: providerStatus,
        metadata: JSON.stringify({
          bookingId: payload.booking?.id || null,
          directUrl,
          provider,
          deliveryNote,
          sentAt: new Date().toISOString(),
        }),
      },
    });

    console.log(
      `[WhatsApp Alert] ${payload.eventType} -> +${cleanNumber} [Status: ${providerStatus}] (${deliveryNote})`
    );

    return {
      success: providerStatus !== "FAILED",
      isLiveDelivered: providerStatus === "SENT",
      logId: log.id,
      status: providerStatus,
      recipient: cleanNumber,
      message,
      directUrl,
      deliveryNote,
    };
  } catch (error) {
    console.error("[WhatsApp Alert] Failed to send notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
