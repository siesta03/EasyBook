import { NextResponse } from "next/server";
import { z } from "zod";
import { testGoogleCalendarConnection } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

const testCalendarSchema = z.object({
  gmailAccount: z.string().email("Valid Gmail address required").optional().nullable(),
  calendarId: z.string().optional().nullable(),
  serviceAccountEmail: z.string().optional().nullable(),
  privateKey: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = testCalendarSchema.safeParse(body);

    const data = parsed.success ? parsed.data : {};

    const result = await testGoogleCalendarConnection({
      gmailAccount: data.gmailAccount || undefined,
      calendarId: data.calendarId || data.gmailAccount || undefined,
      serviceAccountEmail: data.serviceAccountEmail || undefined,
      privateKey: data.privateKey || undefined,
    });

    // If connected or simulated, also log the event
    await prisma.notificationLog.create({
      data: {
        channel: "GOOGLE_CALENDAR",
        recipient: data.calendarId || data.gmailAccount || "Google Calendar",
        eventType: "CONNECTION_TEST",
        message: result.message,
        status: result.success ? (result.isSimulated ? "SIMULATED" : "SENT") : "FAILED",
        metadata: JSON.stringify(result),
      },
    });

    const recentLogs = await prisma.notificationLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ...result,
      recentLogs,
    });
  } catch (error) {
    console.error("[Test Calendar] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Calendar connection test failed",
      },
      { status: 500 }
    );
  }
}
