import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured, sendEmail, toEmailHtml } from "@/lib/email";

const schema = z.object({
  to: z.string().email().optional(),
});

/**
 * POST /api/admin/profile/test-email
 * Sends a sample customer receipt email (defaults to the admin's own email).
 */
export async function POST(request: Request) {
  try {
    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error:
            "RESEND_API_KEY is not set. Add it in Vercel → Settings → Environment Variables (and in your local .env), then redeploy.",
        },
        { status: 400 }
      );
    }

    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const admin = await prisma.adminUser.findFirst({ orderBy: { createdAt: "asc" } });
    const to = parsed.data.to || admin?.email;
    if (!to) {
      return NextResponse.json({ error: "No recipient email" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const text = [
      "Hi *Customer*, this is a sample of the booking receipt your customers will receive.",
      "━━━━━━━━━━━━━━━━━━",
      "🏷️ *Category:* Indoor Photoshoot",
      "📦 *Package:* Studio Portrait Session (60 mins)",
      "📅 *Date:* Saturday, 14 Nov 2026",
      "⏰ *Time:* 10:00 AM - 11:00 AM",
      "💳 *Amount Paid:* RM 250.00",
      "━━━━━━━━━━━━━━━━━━",
      `🔗 *Manage Booking:* ${appUrl}`,
    ].join("\n");

    const result = await sendEmail({
      to,
      subject: "Test email – EasyBook Studio booking receipt",
      html: toEmailHtml(text, "Test Booking Receipt"),
      text: text.replace(/\*/g, ""),
    });

    await prisma.notificationLog.create({
      data: {
        channel: "EMAIL",
        recipient: to,
        recipientRole: "CUSTOMER",
        eventType: "TEST",
        message: text.replace(/\*/g, ""),
        status: result.ok ? "SENT" : "FAILED",
        metadata: JSON.stringify({
          provider: "resend",
          resendId: result.id || null,
          deliveryNote: result.ok ? `Test emailed to ${to}` : `Email error: ${result.error}`,
          sentAt: new Date().toISOString(),
        }),
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: `Resend rejected the email: ${result.error}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: `Test email sent to ${to}` });
  } catch (error) {
    console.error("[Test Email] Error:", error);
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}

