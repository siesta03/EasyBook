import { google } from "googleapis";
import { Booking, ServicePackage } from "@prisma/client";
import { prisma } from "./prisma";

interface CalendarConfig {
  serviceAccountEmail: string | null;
  privateKey: string | null;
  calendarId: string | null;
  gmailAccount: string | null;
}

/**
 * Retrieve active Google Calendar credentials from Admin profile or fallback to .env
 */
export async function getCalendarConfig(): Promise<CalendarConfig> {
  let admin = null;
  try {
    admin = await prisma.adminUser.findFirst({
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.error("[Google Calendar] Error loading admin settings:", err);
  }

  const serviceAccountEmail =
    admin?.googleServiceAccountEmail ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    null;

  const privateKey =
    admin?.googlePrivateKey ||
    process.env.GOOGLE_PRIVATE_KEY ||
    null;

  // Calendar ID defaults to admin's custom Calendar ID, or their linked Gmail account, or env variable
  const calendarId =
    admin?.googleCalendarId ||
    admin?.googleCalendarEmail ||
    process.env.GOOGLE_CALENDAR_ID ||
    null;

  const gmailAccount = admin?.googleCalendarEmail || null;

  return {
    serviceAccountEmail,
    privateKey,
    calendarId,
    gmailAccount,
  };
}

/**
 * Test connectivity with Google Calendar using provided or configured credentials
 */
export async function testGoogleCalendarConnection(customConfig?: Partial<CalendarConfig>) {
  const activeConfig = customConfig
    ? { ...(await getCalendarConfig()), ...customConfig }
    : await getCalendarConfig();

  const { serviceAccountEmail, privateKey, calendarId, gmailAccount } = activeConfig;

  if (!serviceAccountEmail || !privateKey || !calendarId) {
    return {
      success: false,
      isSimulated: true,
      message: `To sync directly with ${gmailAccount || "Google Calendar"}, Google requires authentication. Choose either Option 1: Live Calendar Subscription Feed (Instant - No Google Cloud needed), or Option 2: Google Service Account credentials.`,
      tip: "Use the Live Google Calendar Feed in the tab below to sync in 30 seconds with 1 click, or paste Google Service Account credentials.",
      details: {
        serviceAccountEmail: !!serviceAccountEmail,
        privateKey: !!privateKey,
        calendarId: !!calendarId,
      },
    };
  }

  // Check if credentials are mock/placeholder
  if (
    serviceAccountEmail.includes("example.com") ||
    privateKey.includes("PLACEHOLDER") ||
    calendarId.includes("example.com")
  ) {
    return {
      success: true,
      isSimulated: true,
      message:
        "Demo mode active: Mock credentials detected. Events will simulate sync successfully.",
      targetCalendar: calendarId,
      gmailAccount: gmailAccount || calendarId,
    };
  }

  try {
    const formattedKey = privateKey.replace(/\\n/g, "\n");
    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: formattedKey,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    // Try fetching the calendar metadata
    const response = await calendar.calendars.get({
      calendarId,
    });

    // Update admin user flag if real connection succeeded
    try {
      const admin = await prisma.adminUser.findFirst();
      if (admin) {
        await prisma.adminUser.update({
          where: { id: admin.id },
          data: { googleCalendarConnected: true },
        });
      }
    } catch {
      // non-critical
    }

    return {
      success: true,
      isSimulated: false,
      message: `Successfully connected to Google Calendar: ${response.data.summary || calendarId}`,
      calendarSummary: response.data.summary,
      timeZone: response.data.timeZone,
      targetCalendar: calendarId,
      gmailAccount: gmailAccount || calendarId,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to connect to Google Calendar";
    console.error("[Google Calendar Test] Error:", error);

    let tip = "Ensure your Google Calendar is shared with the Service Account email with 'Make changes to events' permission.";
    if (errMessage.includes("invalid_grant") || errMessage.includes("private key")) {
      tip = "Private key is invalid or malformed. Ensure you copy the entire RSA private key including BEGIN and END header lines.";
    } else if (errMessage.includes("Not Found")) {
      tip = `Calendar '${calendarId}' not found. Make sure the Gmail address is spelled correctly and shared with the Service Account.`;
    }

    return {
      success: false,
      isSimulated: false,
      message: errMessage,
      tip,
    };
  }
}

export async function createCalendarEvent(
  booking: Booking & { service: ServicePackage }
): Promise<string | null> {
  const { serviceAccountEmail, privateKey: rawKey, calendarId } =
    await getCalendarConfig();

  // Gracefully fallback to mock mode if credentials are unset or placeholders
  if (
    !serviceAccountEmail ||
    !rawKey ||
    !calendarId ||
    serviceAccountEmail.includes("example.com") ||
    rawKey.includes("PLACEHOLDER") ||
    calendarId.includes("example.com")
  ) {
    console.warn(
      `[Google Calendar] Credentials not fully configured or placeholder. Simulating event for ${booking.id} (Calendar: ${calendarId || "default"})`
    );

    // Record simulated log
    try {
      await prisma.notificationLog.create({
        data: {
          channel: "GOOGLE_CALENDAR",
          recipient: calendarId || "simulated-calendar",
          eventType: "CALENDAR_EVENT_CREATED",
          message: `Simulated event created for ${booking.clientName} - ${booking.service.name}`,
          status: "SIMULATED",
          metadata: JSON.stringify({ bookingId: booking.id, calendarId }),
        },
      });
    } catch {
      // ignore
    }

    return `mock-event-${booking.id}`;
  }

  try {
    const privateKey = rawKey.replace(/\\n/g, "\n");
    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const manageUrl = `${appUrl}/booking/manage/${booking.manageToken}`;

    const description = [
      `Client Name: ${booking.clientName}`,
      `Client Phone: ${booking.clientPhone}`,
      `Client Email: ${booking.clientEmail}`,
      `Category: ${booking.service.category || "Indoor Photoshoot"}`,
      `Service Package: ${booking.service.name} (${booking.service.durationMinutes} mins + ${booking.service.bufferMinutes} mins buffer)`,
      `Total Amount: RM ${Number(booking.totalAmount).toFixed(2)}`,
      booking.notes ? `Client Notes: ${booking.notes}` : "",
      "",
      `Manage or Reschedule: ${manageUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await calendar.events.insert({
      calendarId,
      sendUpdates: "all",
      requestBody: {
        summary: `[${booking.service.category || "Photoshoot"}] ${booking.clientName} - ${booking.service.name}`,
        description,
        start: {
          dateTime: booking.startTime.toISOString(),
        },
        end: {
          dateTime: booking.endTime.toISOString(),
        },
        attendees: [
          {
            email: booking.clientEmail,
            displayName: booking.clientName,
          },
        ],
      },
    });

    const eventId = response.data.id || null;

    if (eventId) {
      await prisma.notificationLog.create({
        data: {
          channel: "GOOGLE_CALENDAR",
          recipient: calendarId,
          eventType: "CALENDAR_EVENT_CREATED",
          message: `Event inserted into Google Calendar (${calendarId}) for ${booking.clientName}`,
          status: "SENT",
          metadata: JSON.stringify({ bookingId: booking.id, eventId }),
        },
      });
    }

    return eventId;
  } catch (error) {
    console.error("[Google Calendar] Failed to create event:", error);
    return null;
  }
}

export async function deleteCalendarEvent(
  calendarEventId: string | null | undefined
): Promise<boolean> {
  if (!calendarEventId || calendarEventId.startsWith("mock-event-")) {
    return true;
  }

  const { serviceAccountEmail, privateKey: rawKey, calendarId } =
    await getCalendarConfig();

  if (
    !serviceAccountEmail ||
    !rawKey ||
    !calendarId ||
    serviceAccountEmail.includes("example.com") ||
    rawKey.includes("PLACEHOLDER")
  ) {
    return true;
  }

  try {
    const privateKey = rawKey.replace(/\\n/g, "\n");
    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
      calendarId,
      eventId: calendarEventId,
      sendUpdates: "all",
    });

    return true;
  } catch (error) {
    console.error("[Google Calendar] Failed to delete event:", error);
    return false;
  }
}

/**
 * Generate 1-Click "Add to Google Calendar" URL for any booking
 */
export function getGoogleCalendarAddUrl(booking: {
  id?: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  startTime: Date | string;
  endTime: Date | string;
  service?: { name: string; durationMinutes?: number } | null;
  notes?: string | null;
  manageToken?: string;
}): string {
  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);
  const formatUtc = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
  const dates = `${formatUtc(startDate)}/${formatUtc(endDate)}`;
  const title = `Photoshoot: ${booking.clientName} - ${booking.service?.name || "Session"}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const details = [
    `Client: ${booking.clientName}`,
    `Phone: ${booking.clientPhone}`,
    `Email: ${booking.clientEmail}`,
    booking.notes ? `Notes: ${booking.notes}` : "",
    booking.manageToken ? `Manage: ${appUrl}/booking/manage/${booking.manageToken}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(details)}&location=Studio`;
}
