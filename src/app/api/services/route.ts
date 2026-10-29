import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCategoryPackagesSeeded } from "@/lib/seed-categories";

export async function GET(request: Request) {
  try {
    await ensureCategoryPackagesSeeded();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const services = await prisma.servicePackage.findMany({
      where: {
        isActive: true,
        ...(category && category !== "ALL" ? { category } : {}),
      },
      orderBy: [{ category: "asc" }, { price: "asc" }],
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}
