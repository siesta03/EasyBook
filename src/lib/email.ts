import { prisma } from "./prisma";
import {
  formatWhatsAppMessage,
  type BookingNotificationPayload,
} from "./whatsapp";

/**
 * Customer email receipts via Resend (https://resend.com).
 *
 * The backend calls the Resend REST API directly — no SDK required.
 * Required env vars (set in Vercel):
 *   RESEND_API_KEY  – API key from https://resend.com/api-keys
 *   EMAIL_FROM      – e.g. "EasyBook Studio <bookings@yourdomain.com>"
 *                     (defaults to Resend's test sender onboarding@resend.dev)
 */

export interface EmailDispatchResult {
  success: boolean;
  status?: "SENT" | "FAILED" | "SKIPPED";
  reason?: string;
  error?: string;
  logId?: string;
}

const DEFAULT_FROM = "EasyBook Studio <onboarding@resend.dev>";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Convert the WhatsApp-style receipt text into a simple, email-safe HTML body.
 */
export function toEmailHtml(text: string, heading: string): string {
  const lines = text.split("\n").map((line) => {
    if (/^━+$/.test(line.trim())) {
      return '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />';
    }
    if (!line.trim()) return '<div style="height:8px"></div>';
    let html = escapeHtml(line)
      .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
      .replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color:#4f46e5;text-decoration:underline">$1</a>'
      );
    html = `<p style="margin:0 0 6px 0;line-height:1.5">${html}</p>`;
    return html;
  });

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:linear-gradient(90deg,#4f46e5,#db2777);padding:20px 24px;color:#ffffff">
        <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.85">EasyBook Studio</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px">${escapeHtml(heading)}</div>
      </div>
      <div style="padding:24px;font-size:14px">
        ${lines.join("\n        ")}
      </div>
      <div style="padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb">
        This is an automated message from EasyBook Studio. Prices are in Malaysian Ringgit (RM).
      </div>
    </div>
  </body>
</html>`;
}

function getSubject(eventType: BookingNotificationPayload["eventType"]): string {
  switch (eventType) {
    case "BOOKING_CREATED":
      return "Your photoshoot slot is on hold – EasyBook Studio";
    case "BOOKING_CONFIRMED":
      return "Booking confirmed – EasyBook Studio";
    case "BOOKING_RESCHEDULED":
      return "Your booking has been rescheduled – EasyBook Studio";
    case "BOOKING_CANCELLED":
      return "Your booking has been cancelled – EasyBook Studio";
    default:
      return "EasyBook Studio notification";
  }
}

function getHeading(eventType: BookingNotificationPayload["eventType"]): string {
  switch (eventType) {
    case "BOOKING_CREATED":
      return "Booking Hold Created";
    case "BOOKING_CONFIRMED":
      return "Booking Confirmed 🎉";
    case "BOOKING_RESCHEDULED":
      return "Booking Rescheduled";
    case "BOOKING_CANCELLED":
      return "Booking Cancelled";
    default:
      return "Test Email";
  }
}

/**
 * Low-level Resend call.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not set" };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [to],
        subject,
        html,
        text,
      }),
    });
    const data = (await resp.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      error?: string;
    };
    if (!resp.ok) {
      return { ok: false, error: data.message || data.error || `HTTP ${resp.status}` };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Send a booking receipt email to the customer and record it in NotificationLog.
 */
export async function sendCustomerEmailNotification(
  payload: BookingNotificationPayload
): Promise<EmailDispatchResult> {
  try {
    const to = payload.booking?.clientEmail;
    if (!to) {
      return { success: false, status: "SKIPPED", reason: "No customer email on booking" };
    }
    if (!isEmailConfigured()) {
      return { success: false, status: "SKIPPED", reason: "RESEND_API_KEY not configured" };
    }

    const admin = await prisma.adminUser.findFirst({ orderBy: { createdAt: "asc" } });
    if (admin && admin.emailNotifyCustomer === false) {
      return { success: false, status: "SKIPPED", reason: "Customer email receipts disabled" };
    }

    const text = formatWhatsAppMessage({ ...payload, recipientRole: "CUSTOMER" });
    const subject = getSubject(payload.eventType);
    const html = toEmailHtml(text, getHeading(payload.eventType));
    const plain = text.replace(/\*/g, "");

    const result = await sendEmail({ to, subject, html, text: plain });
    const status: "SENT" | "FAILED" = result.ok ? "SENT" : "FAILED";

    const log = await prisma.notificationLog.create({
      data: {
        channel: "EMAIL",
        recipient: to,
        recipientRole: "CUSTOMER",
        eventType: payload.eventType,
        message: plain,
        status,
        isRead: false,
        metadata: JSON.stringify({
          bookingId: payload.booking?.id || null,
          clientName: payload.booking?.clientName || null,
          clientEmail: to,
          category: payload.service?.category || null,
          packageName: payload.service?.name || null,
          subject,
          provider: "resend",
          resendId: result.id || null,
          deliveryNote: result.ok
            ? `Emailed to ${to} via Resend`
            : `Email error: ${result.error || "unknown"}`,
          sentAt: new Date().toISOString(),
        }),
      },
    });

    return {
      success: result.ok,
      status,
      logId: log.id,
      error: result.ok ? undefined : result.error,
    };
  } catch (error) {
    console.error("[Email Receipt] Failed:", error);
    return {
      success: false,
      status: "FAILED",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

