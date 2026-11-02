import { prisma } from "./prisma";
import {
  formatWhatsAppMessage,
  type BookingNotificationPayload,
} from "./whatsapp";

/**
 * Telegram Bot integration for Admin booking alerts.
 *
 * The backend calls the official Telegram Bot API directly
 * (https://api.telegram.org/bot<TOKEN>/sendMessage) — no third-party gateway.
 *
 * Config is read from the AdminUser row (set in /admin/profile), falling back
 * to the TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID environment variables.
 */

export interface TelegramDispatchResult {
  success: boolean;
  status?: "SENT" | "FAILED" | "SKIPPED";
  reason?: string;
  error?: string;
  logId?: string;
}

const TELEGRAM_API = "https://api.telegram.org";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Convert WhatsApp-style text (*bold*) to Telegram HTML.
 */
export function toTelegramHtml(text: string): string {
  return escapeHtml(text).replace(/\*([^*\n]+)\*/g, "<b>$1</b>");
}

/**
 * Low-level call to Telegram sendMessage.
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; description?: string }> {
  try {
    const resp = await fetch(`${TELEGRAM_API}/bot${botToken.trim()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: toTelegramHtml(text),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const data = (await resp.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
    };
    return { ok: !!data.ok, description: data.description };
  } catch (err) {
    return {
      ok: false,
      description: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Look up the chat ID of whoever most recently messaged the bot.
 * Used by the "Detect Chat ID" button in Admin Profile.
 */
export async function detectTelegramChatId(botToken: string): Promise<{
  success: boolean;
  chatId?: string;
  chatName?: string;
  botUsername?: string;
  error?: string;
}> {
  try {
    const meResp = await fetch(`${TELEGRAM_API}/bot${botToken.trim()}/getMe`);
    const me = (await meResp.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: { username?: string };
      description?: string;
    };
    if (!me.ok) {
      return {
        success: false,
        error: `Invalid bot token (${me.description || "Unauthorized"}). Copy the token from @BotFather again.`,
      };
    }

    const updResp = await fetch(`${TELEGRAM_API}/bot${botToken.trim()}/getUpdates`);
    const upd = (await updResp.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: Array<{
        message?: {
          chat?: { id: number; first_name?: string; title?: string; username?: string };
        };
        my_chat_member?: {
          chat?: { id: number; first_name?: string; title?: string; username?: string };
        };
      }>;
    };

    const updates = upd.result || [];
    for (let i = updates.length - 1; i >= 0; i--) {
      const chat = updates[i].message?.chat || updates[i].my_chat_member?.chat;
      if (chat?.id) {
        return {
          success: true,
          chatId: String(chat.id),
          chatName: chat.title || chat.first_name || chat.username || "",
          botUsername: me.result?.username,
        };
      }
    }

    return {
      success: false,
      botUsername: me.result?.username,
      error: `No messages found. Open Telegram, search for @${me.result?.username || "your_bot"}, press START (or send "hi"), then click Detect again.`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reach Telegram",
    };
  }
}

async function getTelegramConfig() {
  const admin = await prisma.adminUser.findFirst({
    orderBy: { createdAt: "asc" },
  });
  const botToken = admin?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = admin?.telegramChatId || process.env.TELEGRAM_CHAT_ID || "";
  const enabled = admin ? admin.telegramEnabled : !!process.env.TELEGRAM_BOT_TOKEN;
  return { admin, botToken, chatId, enabled };
}

/**
 * Send a booking alert to the Admin via Telegram and record it in NotificationLog.
 */
export async function sendAdminTelegramNotification(
  payload: BookingNotificationPayload
): Promise<TelegramDispatchResult> {
  try {
    const { admin, botToken, chatId, enabled } = await getTelegramConfig();

    if (!enabled && payload.eventType !== "TEST") {
      return { success: false, status: "SKIPPED", reason: "Telegram alerts disabled" };
    }
    if (!botToken || !chatId) {
      return {
        success: false,
        status: "SKIPPED",
        reason: "Telegram bot token or chat ID not configured",
      };
    }

    // Respect the same admin trigger toggles used for WhatsApp
    if (payload.eventType === "BOOKING_CREATED" && admin && !admin.whatsappNotifyOnCheckout) {
      return { success: false, status: "SKIPPED", reason: "Disabled for booking hold" };
    }
    if (payload.eventType === "BOOKING_CONFIRMED" && admin && !admin.whatsappNotifyOnConfirm) {
      return { success: false, status: "SKIPPED", reason: "Disabled for booking confirmation" };
    }

    const message =
      payload.eventType === "TEST"
        ? [
            "🔔 *EasyBook Telegram Alert Test*",
            "",
            "✅ Your Telegram bot is connected! You will receive admin alerts here whenever a customer books, pays, reschedules or cancels.",
          ].join("\n")
        : formatWhatsAppMessage({ ...payload, recipientRole: "ADMIN" });

    const result = await sendTelegramMessage(botToken, chatId, message);
    const status: "SENT" | "FAILED" = result.ok ? "SENT" : "FAILED";

    const log = await prisma.notificationLog.create({
      data: {
        channel: "TELEGRAM",
        recipient: `chat:${chatId}`,
        recipientRole: "ADMIN",
        eventType: payload.eventType,
        message,
        status,
        isRead: false,
        metadata: JSON.stringify({
          bookingId: payload.booking?.id || null,
          clientName: payload.booking?.clientName || null,
          clientPhone: payload.booking?.clientPhone || null,
          category: payload.service?.category || null,
          packageName: payload.service?.name || null,
          provider: "telegram",
          deliveryNote: result.ok
            ? "Delivered via Telegram Bot API"
            : `Telegram error: ${result.description || "unknown"}`,
          sentAt: new Date().toISOString(),
        }),
      },
    });

    return {
      success: result.ok,
      status,
      logId: log.id,
      error: result.ok ? undefined : result.description,
    };
  } catch (error) {
    console.error("[Telegram Alert] Failed:", error);
    return {
      success: false,
      status: "FAILED",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
