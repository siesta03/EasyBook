import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

function formatIcsDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    // Verify token against adminUser
    const admin = await prisma.adminUser.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (token && admin?.calendarFeedToken && token !== admin.calendarFeedToken) {
      return new NextResponse("Unauthorized calendar feed token", { status: 401 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      },
      include: { service: true },
      orderBy: { startTime: "asc" },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const events = bookings.map((b) => {
      const categoryLabel = b.service.category || "Indoor Photoshoot";
      const summary = `[${categoryLabel}] ${b.clientName} - ${b.service.name}`;
      const description = [
        `Client Name: ${b.clientName}`,
        `Client Phone: ${b.clientPhone}`,
        `Client Email: ${b.clientEmail}`,
        `Category: ${categoryLabel}`,
        `Service Package: ${b.service.name} (${b.service.durationMinutes} mins + ${b.service.bufferMinutes} mins buffer)`,
        `Total Amount: RM ${Number(b.totalAmount).toFixed(2)}`,
        `Status: ${b.status}`,
        b.notes ? `Notes: ${b.notes}` : "",
        `Manage Booking: ${appUrl}/booking/manage/${b.manageToken}`,
      ]
        .filter(Boolean)
        .join("\n");

      return [
        "BEGIN:VEVENT",
        `UID:${b.id}@easybook`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `DTSTART:${formatIcsDate(new Date(b.startTime))}`,
        `DTEND:${formatIcsDate(new Date(b.endTime))}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        `DESCRIPTION:${escapeIcsText(description)}`,
        `STATUS:${b.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE"}`,
        "END:VEVENT",
      ].join("\r\n");
    });

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//EasyBook//Photoshoot Scheduling Engine//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:EasyBook Studio Bookings",
      "X-WR-TIMEZONE:Asia/Kuala_Lumpur",
      events.join("\r\n"),
      "END:VCALENDAR",
    ].join("\r\n");

    const isDownload = searchParams.get("download") === "true";

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": isDownload
          ? 'attachment; filename="easybook-schedule.ics"'
          : 'inline; filename="easybook-schedule.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[Calendar Feed] Error:", error);
    return new NextResponse("Failed to generate calendar feed", { status: 500 });
  }
}
