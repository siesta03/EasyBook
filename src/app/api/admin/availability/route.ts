import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let operatingHours = await prisma.operatingHours.findMany({
      orderBy: { dayOfWeek: "asc" },
    });

    // If operating hours haven't been seeded yet, seed standard defaults
    if (operatingHours.length === 0) {
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
      operatingHours = await prisma.operatingHours.findMany({
        orderBy: { dayOfWeek: "asc" },
      });
    }

    const blackoutDates = await prisma.blackoutDate.findMany({
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({
      operatingHours,
      blackoutDates,
    });
  } catch (error) {
    console.error("[Admin Availability] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability configurations" },
      { status: 500 }
    );
  }
}

const updateHoursSchema = z.object({
  hours: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      openTime: z.string().regex(/^\d{2}:\d{2}$/),
      closeTime: z.string().regex(/^\d{2}:\d{2}$/),
      isClosed: z.boolean(),
    })
  ),
});

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateHoursSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid operating hours data",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Upsert each day's operating hours
    await prisma.$transaction(
      parsed.data.hours.map((h) =>
        prisma.operatingHours.upsert({
          where: { dayOfWeek: h.dayOfWeek },
          update: {
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed,
          },
          create: {
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed,
          },
        })
      )
    );

    const updated = await prisma.operatingHours.findMany({
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({
      message: "Operating hours updated successfully",
      operatingHours: updated,
    });
  } catch (error) {
    console.error("[Admin Availability] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update operating hours" },
      { status: 500 }
    );
  }
}

const createBlackoutSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  reason: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createBlackoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid blackout date payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { startTime, endTime, reason } = parsed.data;

    const blackout = await prisma.blackoutDate.create({
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        reason: reason || null,
      },
    });

    return NextResponse.json(blackout, { status: 201 });
  } catch (error) {
    console.error("[Admin Availability] POST blackout error:", error);
    return NextResponse.json(
      { error: "Failed to create blackout date" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const blackoutId = searchParams.get("blackoutId");

    if (!blackoutId) {
      return NextResponse.json(
        { error: "Missing blackoutId query parameter" },
        { status: 400 }
      );
    }

    await prisma.blackoutDate.delete({
      where: { id: blackoutId },
    });

    return NextResponse.json({
      success: true,
      message: "Blackout date removed successfully",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_")
    ) {
      throw error;
    }

    console.error("[Admin Availability] DELETE blackout error:", error);
    return NextResponse.json(
      { error: "Failed to delete blackout date" },
      { status: 500 }
    );
  }
}
