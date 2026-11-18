import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "./prisma";
import { formatMYR } from "./categories";
import type { BookingNotificationPayload } from "./whatsapp";

/**
 * Customer Token-Based Invitation emails via Brevo (https://brevo.com) or Resend (https://resend.com).
 *
 * Customers automatically receive an email containing their confirmed booking details and a
 * direct Token-Based Invitation URL (`/booking/manage/<manageToken>`) sent to the exact
 * email address they used when booking.
 *
 * Supported env vars (set in Vercel / .env):
 *   BREVO_API_KEY       – API key from Brevo (starts with xkeysib-...) [RECOMMENDED: 300 free emails/day to any recipient]
 *   BREVO_SENDER_EMAIL  – e.g. "haziqamani509@gmail.com" (defaults to EMAIL_FROM or signup email)
 *   BREVO_SENDER_NAME   – e.g. "EasyBook Studio"
 *   RESEND_API_KEY      – Fallback: API key from https://resend.com/api-keys
 *   EMAIL_FROM          – e.g. "EasyBook Studio <haziqamani509@gmail.com>"
 */

export interface EmailDispatchResult {
  success: boolean;
  status?: "SENT" | "FAILED" | "SKIPPED" | "SIMULATED";
  reason?: string;
  error?: string;
  logId?: string;
  invitationUrl?: string;
  provider?: "brevo" | "resend" | "none";
}

const DEFAULT_SENDER_NAME = "EasyBook Studio";
const DEFAULT_SENDER_EMAIL = "haziqamani509@gmail.com";
const DEFAULT_RESEND_FROM = "EasyBook Studio <onboarding@resend.dev>";

export interface SenderInfo {
  name: string;
  email: string;
}

/**
 * Resolve the sender name & email from environment variables.
 */
export function getSenderInfo(): SenderInfo {
  const raw =
    process.env.BREVO_SENDER_EMAIL ||
    process.env.EMAIL_FROM ||
    DEFAULT_SENDER_EMAIL;

  const match = raw.match(/^(?:(?:"?([^"<]+)"?\s*)?<)?([^>]+)>?$/);
  if (match) {
    const name =
      process.env.BREVO_SENDER_NAME ||
      match[1]?.trim() ||
      DEFAULT_SENDER_NAME;
    const email = match[2]?.trim() || DEFAULT_SENDER_EMAIL;
    return { name, email };
  }

  return {
    name: process.env.BREVO_SENDER_NAME || DEFAULT_SENDER_NAME,
    email: raw.trim() || DEFAULT_SENDER_EMAIL,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Convert plain notification text into a clean email-safe HTML layout.
 */
export function toEmailHtml(text: string, heading: string): string {
  const lines = text.split("\n").map((line) => {
    if (/^━+$/.test(line.trim())) {
      return '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />';
    }
    if (!line.trim()) return '<div style="height:8px"></div>';
    const html = escapeHtml(line)
      .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
      .replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color:#cc0000;text-decoration:underline">$1</a>'
      );
    return `<p style="margin:0 0 6px 0;line-height:1.5">${html}</p>`;
  });

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#0f0f0f;padding:20px 24px;color:#ffffff;border-bottom:3px solid #cc0000">
        <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#aaaaaa">EasyBook Studio</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px">${escapeHtml(heading)}</div>
      </div>
      <div style="padding:24px;font-size:14px">
        ${lines.join("\n        ")}
      </div>
      <div style="padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb">
        This is an automated invitation from EasyBook Studio. Prices are in Malaysian Ringgit (RM).
      </div>
    </div>
  </body>
</html>`;
}

function getSubject(eventType: BookingNotificationPayload["eventType"]): string {
  switch (eventType) {
    case "BOOKING_CONFIRMED":
      return "Booking Confirmed & Private Access Link – EasyBook Studio";
    case "BOOKING_RESCHEDULED":
      return "Booking Rescheduled – Updated Invitation Link – EasyBook Studio";
    case "BOOKING_CANCELLED":
      return "Booking Cancelled – EasyBook Studio";
    case "BOOKING_CREATED":
      return "Booking Details & Access Link – EasyBook Studio";
    default:
      return "Booking Invitation Preview – EasyBook Studio";
  }
}

function getHeading(eventType: BookingNotificationPayload["eventType"]): string {
  switch (eventType) {
    case "BOOKING_CONFIRMED":
      return "Booking Confirmed — Your Photoshoot Invitation";
    case "BOOKING_RESCHEDULED":
      return "Booking Rescheduled — Updated Session Details";
    case "BOOKING_CANCELLED":
      return "Booking Cancelled";
    case "BOOKING_CREATED":
      return "Booking Reserved — Studio Session Details";
    default:
      return "Sample Booking Invitation (Token-Based)";
  }
}

export interface BuiltTokenInvitation {
  subject: string;
  heading: string;
  invitationUrl: string;
  html: string;
  plainText: string;
}

/**
 * Build a Token-Based Invitation Email listing all booking details and a
 * direct passwordless link (`/booking/manage/<manageToken>`) to the customer's booking page.
 */
export function buildTokenInvitationEmail(
  payload: BookingNotificationPayload
): BuiltTokenInvitation {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const timezone = process.env.TIMEZONE || "Asia/Kuala_Lumpur";
  const { eventType, booking, service } = payload;

  const invitationUrl = booking?.manageToken
    ? `${appUrl}/booking/manage/${booking.manageToken}`
    : appUrl;

  const startDate = booking ? new Date(booking.startTime) : new Date();
  const endDate = booking ? new Date(booking.endTime) : new Date();
  const formattedDate = formatInTimeZone(startDate, timezone, "EEEE, dd MMM yyyy");
  const formattedTime = `${formatInTimeZone(startDate, timezone, "hh:mm a")} - ${formatInTimeZone(endDate, timezone, "hh:mm a")}`;
  const formattedAmount = booking ? formatMYR(booking.totalAmount) : "RM 0.00";
  const categoryName = service?.category || "Indoor Photoshoot";
  const packageName = service?.name || "Photoshoot Session";
  const durationMins = service?.durationMinutes || 60;
  const clientName = booking?.clientName || "Valued Client";
  const bookingId = booking?.id || "N/A";
  const manageToken = booking?.manageToken || "N/A";

  const subject = getSubject(eventType);
  const heading = getHeading(eventType);

  const introLine =
    eventType === "BOOKING_CANCELLED"
      ? `Hi ${clientName}, your photoshoot booking listed below has been cancelled. You can still view the record or book another session using your link below.`
      : eventType === "BOOKING_RESCHEDULED"
      ? `Hi ${clientName}, your photoshoot session has been rescheduled. Please review your updated schedule and invitation link below.`
      : `Hi ${clientName}, your photoshoot booking is confirmed! Use your private token-based invitation link below to view your booking page, add to your calendar, or manage your session — no account or password required.`;

  const plainLines = [
    "EasyBook Studio — Booking Invitation",
    "━━━━━━━━━━━━━━━━━━",
    introLine,
    "",
    `Booking Reference: ${bookingId}`,
    `Access Token: ${manageToken}`,
    `Category: ${categoryName}`,
    `Package: ${packageName} (${durationMins} mins)`,
    `Date: ${formattedDate}`,
    `Time: ${formattedTime} (MYT)`,
    `Total Amount: ${formattedAmount}`,
    booking?.notes ? `Notes: ${booking.notes}` : "",
    "━━━━━━━━━━━━━━━━━━",
    eventType === "BOOKING_CANCELLED"
      ? `Book a New Session: ${appUrl}`
      : `Open Your Booking Page: ${invitationUrl}`,
    "",
    "Token-Based Invitation Access: Anyone with this personal link can view and manage this booking directly without logging in.",
  ].filter(Boolean);

  const plainText = plainLines.join("\n");

  const ctaLabel =
    eventType === "BOOKING_CANCELLED"
      ? "Book a New Photoshoot"
      : "View & Manage Your Booking";
  const ctaHref = eventType === "BOOKING_CANCELLED" ? appUrl : invitationUrl;

  const badgeText =
    eventType === "BOOKING_CANCELLED"
      ? "CANCELLED"
      : eventType === "BOOKING_RESCHEDULED"
      ? "RESCHEDULED"
      : "CONFIRMED";
  const badgeStyle =
    eventType === "BOOKING_CANCELLED"
      ? "background:#fee2e2;color:#991b1b;border:1px solid #fecaca;"
      : eventType === "BOOKING_RESCHEDULED"
      ? "background:#fef3c7;color:#92400e;border:1px solid #fde68a;"
      : "background:#dcfce7;color:#166534;border:1px solid #bbf7d0;";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
    <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#0f0f0f;padding:22px 24px;color:#ffffff;border-bottom:3px solid #cc0000">
        <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#aaaaaa">EasyBook Studio • Token Invitation</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px">${escapeHtml(heading)}</div>
      </div>

      <div style="padding:24px;font-size:14px;line-height:1.6">
        <div style="margin-bottom:14px">
          <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;${badgeStyle}">${badgeText}</span>
        </div>

        <p style="margin:0 0 18px 0;color:#374151">${escapeHtml(introLine)}</p>

        <table style="width:100%;border-collapse:collapse;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-size:13px">
          <tbody>
            <tr>
              <td style="padding:10px 14px;color:#6b7280;border-bottom:1px solid #e5e7eb;width:38%">Booking Reference</td>
              <td style="padding:10px 14px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;font-family:monospace">${escapeHtml(bookingId)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;color:#6b7280;border-bottom:1px solid #e5e7eb">Access Token</td>
              <td style="padding:10px 14px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;font-family:monospace">${escapeHtml(manageToken)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;color:#6b7280;border-bottom:1px solid #e5e7eb">Category</td>
              <td style="padding:10px 14px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb">${escapeHtml(categoryName)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;color:#6b7280;border-bottom:1px solid #e5e7eb">Package</td>
              <td style="padding:10px 14px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb">${escapeHtml(packageName)} (${durationMins} mins)</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;color:#6b7280;border-bottom:1px solid #e5e7eb">Date</td>
              <td style="padding:10px 14px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb">${escapeHtml(formattedDate)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;color:#6b7280;border-bottom:1px solid #e5e7eb">Time Window</td>
              <td style="padding:10px 14px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb">${escapeHtml(formattedTime)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;color:#6b7280${booking?.notes ? ";border-bottom:1px solid #e5e7eb" : ""}">Total Amount</td>
              <td style="padding:10px 14px;font-weight:700;color:#059669${booking?.notes ? ";border-bottom:1px solid #e5e7eb" : ""}">${escapeHtml(formattedAmount)}</td>
            </tr>
            ${
              booking?.notes
                ? `<tr>
              <td style="padding:10px 14px;color:#6b7280">Session Notes</td>
              <td style="padding:10px 14px;color:#374151">${escapeHtml(booking.notes)}</td>
            </tr>`
                : ""
            }
          </tbody>
        </table>

        <div style="margin:24px 0 18px 0;text-align:center">
          <a href="${escapeHtml(ctaHref)}" style="display:inline-block;padding:12px 26px;background:#cc0000;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:999px">
            ${escapeHtml(ctaLabel)}
          </a>
        </div>

        <div style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;font-size:12px;color:#4b5563">
          <div style="font-weight:600;color:#111827;margin-bottom:4px">Direct Booking Page Link:</div>
          <a href="${escapeHtml(invitationUrl)}" style="color:#cc0000;word-break:break-all;text-decoration:underline">${escapeHtml(invitationUrl)}</a>
          <div style="margin-top:6px;color:#6b7280;font-size:11px">
            This token-based invitation link gives you direct access to view your booking status, add the session to your calendar, or cancel up to 24 hours before your shoot — no login required.
          </div>
        </div>
      </div>

      <div style="padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb">
        Please arrive 10 minutes before your scheduled slot. Prices are in Malaysian Ringgit (RM).
      </div>
    </div>
  </body>
</html>`;

  return { subject, heading, invitationUrl, html, plainText };
}

export function getActiveEmailProvider(): "brevo" | "resend" | "none" {
  if (process.env.BREVO_API_KEY) return "brevo";
  if (process.env.RESEND_API_KEY) return "resend";
  return "none";
}

export function isEmailConfigured(): boolean {
  return getActiveEmailProvider() !== "none";
}

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  provider?: "brevo" | "resend";
}

/**
 * Dispatch transactional email via Brevo REST API (default) or Resend (fallback).
 */
export async function sendEmail({
  to,
  toName,
  subject,
  html,
  text,
}: SendEmailOptions): Promise<SendEmailResult> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  // 1. PRIMARY: Brevo REST API (https://api.brevo.com/v3/smtp/email)
  if (brevoApiKey) {
    const sender = getSenderInfo();
    try {
      const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: sender.name,
            email: sender.email,
          },
          to: [
            {
              email: to,
              ...(toName ? { name: toName } : {}),
            },
          ],
          subject,
          htmlContent: html,
          ...(text ? { textContent: text } : {}),
        }),
      });

      const data = (await resp.json().catch(() => ({}))) as {
        messageId?: string;
        message?: string;
        code?: string;
      };

      if (!resp.ok) {
        return {
          ok: false,
          error: data.message || data.code || `Brevo HTTP ${resp.status}`,
          provider: "brevo",
        };
      }

      return { ok: true, id: data.messageId, provider: "brevo" };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Brevo network error",
        provider: "brevo",
      };
    }
  }

  // 2. FALLBACK: Resend REST API (https://api.resend.com/emails)
  if (resendApiKey) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || DEFAULT_RESEND_FROM,
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
        return {
          ok: false,
          error: data.message || data.error || `Resend HTTP ${resp.status}`,
          provider: "resend",
        };
      }
      return { ok: true, id: data.id, provider: "resend" };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Resend network error",
        provider: "resend",
      };
    }
  }

  return {
    ok: false,
    error: "No email service configured. Set BREVO_API_KEY (or RESEND_API_KEY) in environment variables.",
  };
}

/**
 * Send a Token-Based Invitation email to the customer when their booking is confirmed
 * (or updated/cancelled), and record it in NotificationLog.
 */
export async function sendCustomerEmailNotification(
  payload: BookingNotificationPayload & { forceSend?: boolean }
): Promise<EmailDispatchResult> {
  try {
    // Only email customers on confirmation (or reschedule / cancel / manual forceSend)
    // If booking was created already in CONFIRMED state, allow sending
    if (
      payload.eventType === "BOOKING_CREATED" &&
      payload.booking?.status !== "CONFIRMED" &&
      !payload.forceSend
    ) {
      return {
        success: false,
        status: "SKIPPED",
        reason: "Customer email is only sent when booking is confirmed",
      };
    }

    const to = payload.booking?.clientEmail;
    if (!to) {
      return { success: false, status: "SKIPPED", reason: "No customer email on booking" };
    }

    const admin = await prisma.adminUser.findFirst({ orderBy: { createdAt: "asc" } });
    if (admin && admin.emailNotifyCustomer === false && !payload.forceSend) {
      return {
        success: false,
        status: "SKIPPED",
        reason: "Customer email invitations disabled",
      };
    }

    const invitation = buildTokenInvitationEmail(payload);
    const activeProvider = getActiveEmailProvider();

    if (!isEmailConfigured()) {
      const log = await prisma.notificationLog.create({
        data: {
          channel: "EMAIL",
          recipient: to,
          recipientRole: "CUSTOMER",
          eventType: payload.eventType,
          message: invitation.plainText,
          status: "SIMULATED",
          isRead: false,
          metadata: JSON.stringify({
            bookingId: payload.booking?.id || null,
            manageToken: payload.booking?.manageToken || null,
            invitationUrl: invitation.invitationUrl,
            clientName: payload.booking?.clientName || null,
            clientEmail: to,
            category: payload.service?.category || null,
            packageName: payload.service?.name || null,
            subject: invitation.subject,
            provider: "token-invitation",
            deliveryNote:
              "Token invitation generated (Set BREVO_API_KEY in env to send live emails)",
            sentAt: new Date().toISOString(),
          }),
        },
      });

      return {
        success: true,
        status: "SIMULATED",
        logId: log.id,
        invitationUrl: invitation.invitationUrl,
        provider: "none",
      };
    }

    const result = await sendEmail({
      to,
      toName: payload.booking?.clientName,
      subject: invitation.subject,
      html: invitation.html,
      text: invitation.plainText,
    });

    const isSandboxRestriction =
      !result.ok &&
      typeof result.error === "string" &&
      result.error.toLowerCase().includes("only send testing emails");

    const status: "SENT" | "SIMULATED" | "FAILED" = result.ok
      ? "SENT"
      : isSandboxRestriction
      ? "SIMULATED"
      : "FAILED";

    const providerName = result.provider === "brevo" ? "Brevo" : "Resend";
    const deliveryNote = result.ok
      ? `Token invitation emailed to ${to} via ${providerName}`
      : isSandboxRestriction
      ? "Token invitation link generated (Verify domain in Resend or use Brevo to deliver to external customer emails)"
      : `Email error: ${result.error || "unknown"}`;

    const log = await prisma.notificationLog.create({
      data: {
        channel: "EMAIL",
        recipient: to,
        recipientRole: "CUSTOMER",
        eventType: payload.eventType,
        message: invitation.plainText,
        status,
        isRead: false,
        metadata: JSON.stringify({
          bookingId: payload.booking?.id || null,
          manageToken: payload.booking?.manageToken || null,
          invitationUrl: invitation.invitationUrl,
          clientName: payload.booking?.clientName || null,
          clientEmail: to,
          category: payload.service?.category || null,
          packageName: payload.service?.name || null,
          subject: invitation.subject,
          provider: result.provider || activeProvider,
          externalId: result.id || null,
          deliveryNote,
          sentAt: new Date().toISOString(),
        }),
      },
    });

    return {
      success: result.ok || isSandboxRestriction,
      status,
      logId: log.id,
      invitationUrl: invitation.invitationUrl,
      provider: result.provider || activeProvider,
      error: result.ok || isSandboxRestriction ? undefined : result.error,
    };
  } catch (error) {
    console.error("[Email Invitation] Failed:", error);
    return {
      success: false,
      status: "FAILED",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
