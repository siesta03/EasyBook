import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { detectTelegramChatId, sendTelegramMessage } from "@/lib/telegram";

const schema = z.object({
  action: z.enum(["detect", "test"]).default("test"),
  botToken: z.string().optional().nullable(),
  chatId: z.string().optional().nullable(),
});

/**
 * POST /api/admin/profile/test-telegram
 *  - action "detect": find the chat ID of whoever last messaged the bot
 *  - action "test":   send a test alert to the configured chat
 * If botToken/chatId are omitted, the saved values (or env vars) are used.
 */
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const admin = await prisma.adminUser.findFirst({ orderBy: { createdAt: "asc" } });
    const botToken =
      parsed.data.botToken?.trim() ||
      admin?.telegramBotToken ||
      process.env.TELEGRAM_BOT_TOKEN ||
      "";

    if (!botToken) {
      return NextResponse.json(
        { error: "Paste your Telegram bot token from @BotFather first." },
        { status: 400 }
      );
    }

    if (parsed.data.action === "detect") {
      const result = await detectTelegramChatId(botToken);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, botUsername: result.botUsername },
          { status: 400 }
        );
      }
      return NextResponse.json(result);
    }

    const chatId =
      parsed.data.chatId?.trim() ||
      admin?.telegramChatId ||
      process.env.TELEGRAM_CHAT_ID ||
      "";

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is missing. Click \"Detect Chat ID\" first." },
        { status: 400 }
      );
    }

    const message = [
      "🔔 *EasyBook Telegram Alert Test*",
      "",
      "✅ Your Telegram bot is connected! You will receive admin alerts here whenever a customer books, pays, reschedules or cancels a photoshoot.",
    ].join("\n");

    const result = await sendTelegramMessage(botToken, chatId, message);

    await prisma.notificationLog.create({
      data: {
        channel: "TELEGRAM",
        recipient: `chat:${chatId}`,
        recipientRole: "ADMIN",
        eventType: "TEST",
        message,
        status: result.ok ? "SENT" : "FAILED",
        metadata: JSON.stringify({
          provider: "telegram",
          deliveryNote: result.ok
            ? "Test delivered via Telegram Bot API"
            : `Telegram error: ${result.description || "unknown"}`,
          sentAt: new Date().toISOString(),
        }),
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: `Telegram rejected the message: ${result.description || "unknown error"}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Test alert sent to Telegram!" });
  } catch (error) {
    console.error("[Test Telegram] Error:", error);
    return NextResponse.json({ error: "Failed to contact Telegram" }, { status: 500 });
  }
}

