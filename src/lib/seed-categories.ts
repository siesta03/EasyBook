import { prisma } from "./prisma";
import {
  DEFAULT_CATEGORY_PACKAGES,
  PHOTOSHOOT_CATEGORIES,
} from "./categories";

let hasCheckedCategoriesSeed = false;

/**
 * Ensures the latest schema columns exist and all 5 photoshoot categories
 * (Indoor Photoshoot, Outdoor Photoshoot, Wedding, Sport, Product)
 * have active service packages in the database.
 */
export async function ensureCategoryPackagesSeeded(force = false) {
  if (hasCheckedCategoriesSeed && !force) {
    return;
  }

  try {
    // 0. Ensure new columns exist on existing PostgreSQL databases automatically
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "whatsappNotifyCustomer" BOOLEAN NOT NULL DEFAULT true;`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "recipientRole" TEXT NOT NULL DEFAULT 'ADMIN';`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT false;`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "ServicePackage" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Indoor Photoshoot';`
      );
    } catch {
      // Ignore if running in mock/read-only test environment
    }

    const existingServices = await prisma.servicePackage.findMany({
      select: { id: true, name: true, category: true },
    });

    const existingCategories = new Set(
      existingServices.map((s) => s.category)
    );
    const existingNames = new Set(
      existingServices.map((s) => s.name.toLowerCase())
    );

    const packagesToCreate = DEFAULT_CATEGORY_PACKAGES.filter(
      (pkg) =>
        (!existingCategories.has(pkg.category) || force) &&
        !existingNames.has(pkg.name.toLowerCase())
    );

    if (packagesToCreate.length > 0) {
      await prisma.servicePackage.createMany({
        data: packagesToCreate,
      });
    }

    // Also ensure OperatingHours exist if empty
    const opCount = await prisma.operatingHours.count();
    if (opCount === 0) {
      await prisma.operatingHours.createMany({
        data: [
          { dayOfWeek: 0, openTime: "09:00", closeTime: "18:00", isClosed: true },
          { dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: 2, openTime: "09:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: 3, openTime: "09:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: 4, openTime: "09:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: 5, openTime: "09:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: 6, openTime: "09:00", closeTime: "18:00", isClosed: false },
        ],
      });
    }

    // Check if all 5 categories are now present
    const allPresent = PHOTOSHOOT_CATEGORIES.every(
      (cat) =>
        existingCategories.has(cat) ||
        packagesToCreate.some((p) => p.category === cat)
    );
    if (allPresent) {
      hasCheckedCategoriesSeed = true;
    }
  } catch (err) {
    console.error("[Seed Categories] Error ensuring category packages:", err);
  }
}
