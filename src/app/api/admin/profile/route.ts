import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifyAdminToken, signAdminToken } from "@/lib/auth";

async function getAuthenticatedAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyAdminToken(token);
  if (!payload) return null;
  return await prisma.adminUser.findUnique({
    where: { id: payload.id },
  });
}

// GET: Fetch Admin profile, integrations, and recent notification logs
export async function GET() {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      // Auto-fallback: if database has at least one admin, pick first for local dev
      const fallbackAdmin = await prisma.adminUser.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (!fallbackAdmin) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      }
      return formatAdminResponse(fallbackAdmin);
    }

    return formatAdminResponse(admin);
  } catch (error) {
    console.error("[Admin Profile] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load admin profile" },
      { status: 500 }
    );
  }
}

async function formatAdminResponse(admin: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
  whatsappEnabled: boolean;
  whatsappNotifyOnCheckout: boolean;
  whatsappNotifyOnConfirm: boolean;
  whatsappNotifyCustomer?: boolean;
  whatsappProvider: string | null;
  whatsappApiKey: string | null;
  calendarFeedToken: string | null;
  googleCalendarEmail: string | null;
  googleCalendarId: string | null;
  googleServiceAccountEmail: string | null;
  googlePrivateKey: string | null;
  googleCalendarConnected: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const recentLogs = await prisma.notificationLog.findMany({
    take: 15,
    orderBy: { createdAt: "desc" },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const calendarFeedUrl = `${appUrl}/api/calendar/feed?token=${admin.calendarFeedToken || "default"}`;

  return NextResponse.json({
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone || "",
      whatsappNumber: admin.whatsappNumber || "",
      whatsappEnabled: admin.whatsappEnabled,
      whatsappNotifyOnCheckout: admin.whatsappNotifyOnCheckout,
      whatsappNotifyOnConfirm: admin.whatsappNotifyOnConfirm,
      whatsappNotifyCustomer: admin.whatsappNotifyCustomer ?? true,
      whatsappProvider: admin.whatsappProvider || "callmebot",
      whatsappApiKey: admin.whatsappApiKey || "",
      calendarFeedToken: admin.calendarFeedToken || "",
      calendarFeedUrl,
      googleCalendarEmail: admin.googleCalendarEmail || "",
      googleCalendarId: admin.googleCalendarId || "",
      googleServiceAccountEmail: admin.googleServiceAccountEmail || "",
      hasGooglePrivateKey: !!admin.googlePrivateKey,
      googleCalendarConnected: admin.googleCalendarConnected,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    },
    systemEnvDefaults: {
      hasEnvGoogleServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      envGoogleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
      hasEnvGooglePrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      envGoogleCalendarId: process.env.GOOGLE_CALENDAR_ID || "",
    },
    recentLogs,
  });
}

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Valid email is required").optional(),
  phone: z.string().optional().nullable(),
  whatsappNumber: z.string().optional().nullable(),
  whatsappEnabled: z.boolean().optional(),
  whatsappNotifyOnCheckout: z.boolean().optional(),
  whatsappNotifyOnConfirm: z.boolean().optional(),
  whatsappNotifyCustomer: z.boolean().optional(),
  whatsappProvider: z.string().optional(),
  whatsappApiKey: z.string().optional().nullable(),
  googleCalendarEmail: z.string().optional().nullable(),
  googleCalendarId: z.string().optional().nullable(),
  googleServiceAccountEmail: z.string().optional().nullable(),
  googlePrivateKey: z.string().optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "New password must be at least 6 characters").optional(),
});

// PATCH: Update Admin Profile details, security, or integrations
export async function PATCH(request: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    const targetAdmin =
      admin ||
      (await prisma.adminUser.findFirst({
        orderBy: { createdAt: "asc" },
      }));

    if (!targetAdmin) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid update data",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      phone,
      whatsappNumber,
      whatsappEnabled,
      whatsappNotifyOnCheckout,
      whatsappNotifyOnConfirm,
      whatsappNotifyCustomer,
      whatsappProvider,
      whatsappApiKey,
      googleCalendarEmail,
      googleCalendarId,
      googleServiceAccountEmail,
      googlePrivateKey,
      currentPassword,
      newPassword,
    } = parsed.data;

    const updateData: Record<string, unknown> = {};

    // 1. Name & Email updates
    if (name !== undefined) updateData.name = name;
    if (email !== undefined && email !== targetAdmin.email) {
      // Check if email already in use
      const existing = await prisma.adminUser.findUnique({ where: { email } });
      if (existing && existing.id !== targetAdmin.id) {
        return NextResponse.json(
          { error: "Another administrator already uses this email address" },
          { status: 409 }
        );
      }
      updateData.email = email;
    }

    // 2. Contact & WhatsApp settings
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (whatsappNumber !== undefined) {
      updateData.whatsappNumber = whatsappNumber ? whatsappNumber.trim() : null;
    }
    if (whatsappEnabled !== undefined) updateData.whatsappEnabled = whatsappEnabled;
    if (whatsappNotifyOnCheckout !== undefined) {
      updateData.whatsappNotifyOnCheckout = whatsappNotifyOnCheckout;
    }
    if (whatsappNotifyOnConfirm !== undefined) {
      updateData.whatsappNotifyOnConfirm = whatsappNotifyOnConfirm;
    }
    if (whatsappNotifyCustomer !== undefined) {
      updateData.whatsappNotifyCustomer = whatsappNotifyCustomer;
    }
    if (whatsappProvider !== undefined) {
      updateData.whatsappProvider = whatsappProvider;
    }
    if (whatsappApiKey !== undefined) {
      updateData.whatsappApiKey = whatsappApiKey ? whatsappApiKey.trim() : null;
    }

    // 3. Google Calendar & Gmail integration settings
    if (googleCalendarEmail !== undefined) {
      updateData.googleCalendarEmail = googleCalendarEmail ? googleCalendarEmail.trim() : null;
    }
    if (googleCalendarId !== undefined) {
      updateData.googleCalendarId = googleCalendarId ? googleCalendarId.trim() : null;
    }
    if (googleServiceAccountEmail !== undefined) {
      updateData.googleServiceAccountEmail = googleServiceAccountEmail
        ? googleServiceAccountEmail.trim()
        : null;
    }
    if (googlePrivateKey !== undefined) {
      // Only update if provided and non-empty
      if (googlePrivateKey && googlePrivateKey.trim().length > 0) {
        updateData.googlePrivateKey = googlePrivateKey.trim();
      }
    }

    // 4. Password update with verification
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password" },
          { status: 400 }
        );
      }
      const isMatch = await bcrypt.compare(currentPassword, targetAdmin.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Current password does not match" },
          { status: 401 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.adminUser.update({
      where: { id: targetAdmin.id },
      data: updateData,
    });

    // Refresh JWT session cookie if name or email changed
    const response = NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      admin: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone || "",
        whatsappNumber: updated.whatsappNumber || "",
        whatsappEnabled: updated.whatsappEnabled,
        whatsappNotifyOnCheckout: updated.whatsappNotifyOnCheckout,
        whatsappNotifyOnConfirm: updated.whatsappNotifyOnConfirm,
        googleCalendarEmail: updated.googleCalendarEmail || "",
        googleCalendarId: updated.googleCalendarId || "",
        googleServiceAccountEmail: updated.googleServiceAccountEmail || "",
        hasGooglePrivateKey: !!updated.googlePrivateKey,
        googleCalendarConnected: updated.googleCalendarConnected,
        updatedAt: updated.updatedAt,
      },
    });

    if (name !== undefined || (email !== undefined && email !== targetAdmin.email)) {
      const newToken = await signAdminToken({
        id: updated.id,
        email: updated.email,
        name: updated.name,
      });

      response.cookies.set({
        name: COOKIE_NAME,
        value: newToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error("[Admin Profile] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update profile settings" },
      { status: 500 }
    );
  }
}
