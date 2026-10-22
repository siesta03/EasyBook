import { NextResponse } from "next/server";
import { z } from "zod";
import { sendAdminWhatsAppNotification } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

const testSchema = z.object({
  whatsappNumber: z.string().min(6, "Please enter a valid phone number with country code"),
  provider: z.string().optional(),
  apiKey: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = testSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid phone number",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { whatsappNumber, provider, apiKey } = parsed.data;

    // Send test notification
    const result = await sendAdminWhatsAppNotification({
      eventType: "TEST",
      targetNumber: whatsappNumber,
      provider: provider || undefined,
      apiKey: apiKey || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || result.reason || "Failed to dispatch test WhatsApp message",
        },
        { status: 400 }
      );
    }

    // Also fetch updated recent logs
    const recentLogs = await prisma.notificationLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      message: "Test WhatsApp notification dispatched successfully!",
      recipient: result.recipient,
      directUrl: result.directUrl,
      previewText: result.message,
      recentLogs,
    });
  } catch (error) {
    console.error("[Test WhatsApp] Error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch test notification" },
      { status: 500 }
    );
  }
}
