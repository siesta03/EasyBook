import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureCategoryPackagesSeeded } from "@/lib/seed-categories";

export async function GET(request: Request) {
  try {
    await ensureCategoryPackagesSeeded();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const services = await prisma.servicePackage.findMany({
      where: category && category !== "ALL" ? { category } : undefined,
      orderBy: [{ category: "asc" }, { price: "asc" }],
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("[Admin Services] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

const createServiceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required").default("Indoor Photoshoot"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().positive("Price must be positive"),
  durationMinutes: z.coerce.number().int().positive("Duration must be a positive integer"),
  bufferMinutes: z.coerce.number().int().nonnegative("Buffer must be non-negative").default(30),
  isActive: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body && body.action === "seed_defaults") {
      await ensureCategoryPackagesSeeded(true);
      const services = await prisma.servicePackage.findMany({
        orderBy: [{ category: "asc" }, { price: "asc" }],
      });
      return NextResponse.json({
        success: true,
        message: "Default category packages seeded successfully",
        services,
      });
    }

    const parsed = createServiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid service data",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const service = await prisma.servicePackage.create({
      data: parsed.data,
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("[Admin Services] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create service package" },
      { status: 500 }
    );
  }
}

const updateServiceSchema = z.object({
  id: z.string().min(1, "id is required"),
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.coerce.number().positive().optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
  bufferMinutes: z.coerce.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateServiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid update data",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { id, ...updateFields } = parsed.data;

    const updated = await prisma.servicePackage.update({
      where: { id },
      data: updateFields,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[Admin Services] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update service package" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing service ID" }, { status: 400 });
    }

    // Check if bookings are associated with this service
    const bookingCount = await prisma.booking.count({
      where: { serviceId: id },
    });

    if (bookingCount > 0) {
      // Soft-delete to preserve booking history integrity
      const softDeleted = await prisma.servicePackage.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        message: "Service has existing bookings and was set to inactive",
        service: softDeleted,
      });
    }

    await prisma.servicePackage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Service deleted successfully" });
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

    console.error("[Admin Services] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}
