import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableSlots } from "@/lib/scheduler";

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
  serviceId: z
    .string()
    .min(1, "serviceId is required"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      date: searchParams.get("date"),
      serviceId: searchParams.get("serviceId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { date, serviceId } = parsed.data;
    const slots = await getAvailableSlots(date, serviceId);

    return NextResponse.json(slots);
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_")
    ) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Failed to calculate slots";

    if (message.includes("Service package not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error("Error calculating available slots:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
