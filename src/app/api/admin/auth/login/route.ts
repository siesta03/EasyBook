import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAdminToken, COOKIE_NAME } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Check if any admin exists. If not, auto-seed default admin and default settings
    const adminCount = await prisma.adminUser.count();
    if (adminCount === 0) {
      const defaultPasswordHash = await bcrypt.hash("admin123456", 10);
      await prisma.adminUser.create({
        data: {
          email: "admin@easybook.com",
          passwordHash: defaultPasswordHash,
          name: "Studio Administrator",
        },
      });

      // Auto-seed default Operating Hours (Mon-Sat 09:00 - 18:00, Sun Closed)
      const opHoursCount = await prisma.operatingHours.count();
      if (opHoursCount === 0) {
        await prisma.operatingHours.createMany({
          data: [
            { dayOfWeek: 0, openTime: "09:00", closeTime: "18:00", isClosed: true }, // Sun
            { dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", isClosed: false }, // Mon
            { dayOfWeek: 2, openTime: "09:00", closeTime: "18:00", isClosed: false }, // Tue
            { dayOfWeek: 3, openTime: "09:00", closeTime: "18:00", isClosed: false }, // Wed
            { dayOfWeek: 4, openTime: "09:00", closeTime: "18:00", isClosed: false }, // Thu
            { dayOfWeek: 5, openTime: "09:00", closeTime: "18:00", isClosed: false }, // Fri
            { dayOfWeek: 6, openTime: "09:00", closeTime: "18:00", isClosed: false }, // Sat
          ],
        });
      }

      // Auto-seed default Service Packages
      const packageCount = await prisma.servicePackage.count();
      if (packageCount === 0) {
        await prisma.servicePackage.createMany({
          data: [
            {
              name: "Portrait & Headshots",
              description:
                "Professional studio lighting, 2 backdrop changes, and 5 retouched high-resolution images.",
              price: 150.0,
              durationMinutes: 60,
              bufferMinutes: 30,
              isActive: true,
            },
            {
              name: "Studio Brand Collection",
              description:
                "Comprehensive business branding shoot with multiple outfit changes and 15 premium edited photos.",
              price: 350.0,
              durationMinutes: 120,
              bufferMinutes: 30,
              isActive: true,
            },
            {
              name: "Full Editorial & Fashion",
              description:
                "Creative director assisted fashion photoshoot with luxury lighting setups and 25 retouched photos.",
              price: 600.0,
              durationMinutes: 180,
              bufferMinutes: 45,
              isActive: true,
            },
          ],
        });
      }
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await signAdminToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[Admin Auth] Login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login" },
      { status: 500 }
    );
  }
}
