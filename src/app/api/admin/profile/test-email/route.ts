import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  buildTokenInvitationEmail,
  getActiveEmailProvider,
  isEmailConfigured,
  sendEmail,
} from "@/lib/email";

const schema = z.object({
  to: z.string().email().optional(),
});

/**
 * POST /api/admin/profile/test-email
 * Sends a sample Token-Based Invitation email (defaults to the admin's own email).
 */
export async function POST(request: Request) {
  try {
    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error:
            "No email API key configured. Set BREVO_API_KEY (recommended) or RESEND_API_KEY in Vercel → Settings → Environment Variables (and in local .env), then redeploy.",
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

    const sampleStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    sampleStart.setHours(10, 0, 0, 0);
    const sampleEnd = new Date(sampleStart.getTime() + 60 * 60 * 1000);

    const invitation = buildTokenInvitationEmail({
      eventType: "BOOKING_CONFIRMED",
      recipientRole: "CUSTOMER",
      booking: {
        id: "sample-booking-001",
        manageToken: "sample-token-preview",
        clientName: "Customer Preview",
        clientEmail: to,
        clientPhone: "+60123456789",
        startTime: sampleStart,
        endTime: sampleEnd,
        totalAmount: 250,
        notes: "Arrive 10 minutes early for studio briefing.",
      },
      service: {
        name: "Studio Portrait Session",
        category: "Indoor Photoshoot",
        durationMinutes: 60,
        bufferMinutes: 30,
      },
    });

    const result = await sendEmail({
      to,
      toName: "Customer Preview",
      subject: `[Test] ${invitation.subject}`,
      html: invitation.html,
      text: invitation.plainText,
    });

    const activeProvider = result.provider || getActiveEmailProvider();
    const providerLabel = activeProvider === "brevo" ? "Brevo" : "Resend";

    await prisma.notificationLog.create({
      data: {
        channel: "EMAIL",
        recipient: to,
        recipientRole: "CUSTOMER",
        eventType: "TEST",
        message: invitation.plainText,
        status: result.ok ? "SENT" : "FAILED",
        metadata: JSON.stringify({
          provider: activeProvider,
          externalId: result.id || null,
          manageToken: "sample-token-preview",
          invitationUrl: invitation.invitationUrl,
          deliveryNote: result.ok
            ? `Test token invitation emailed to ${to} via ${providerLabel}`
            : `Email error: ${result.error}`,
          sentAt: new Date().toISOString(),
        }),
      },
    });

    if (!result.ok) {
      const isSandbox =
        typeof result.error === "string" &&
        result.error.toLowerCase().includes("only send testing emails");

      const friendlyError = isSandbox
        ? `${result.error}`
        : `${providerLabel} rejected the email: ${result.error}`;

      return NextResponse.json(
        {
          error: friendlyError,
          isSandboxRestriction: isSandbox,
          provider: activeProvider,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test token invitation email sent to ${to} via ${providerLabel}`,
      invitationUrl: invitation.invitationUrl,
      provider: activeProvider,
    });
  } catch (error) {
    console.error("[Test Email] Error:", error);
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
