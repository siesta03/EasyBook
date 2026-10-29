-- ============================================================
-- EasyBook Seed Data for Neon / PostgreSQL SQL Editor
-- ============================================================
-- Copy & paste this entire file into Neon's SQL Editor and run.
-- This seeds the same default data that the app auto-creates.
--
-- Default Admin Login:
--   Email:    admin@easybook.com
--   Password: admin123456
--
-- ⚠️  CHANGE THE PASSWORD after first login!
-- ============================================================

-- ============================================================
-- 0. Schema Upgrade (Safe & Idempotent for Existing Databases)
-- ============================================================
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "whatsappNotifyCustomer" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "recipientRole" TEXT NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ServicePackage" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Indoor Photoshoot';

-- 1. Admin User
-- Password "admin123456" hashed with bcrypt (10 rounds)
INSERT INTO "AdminUser" (
  "id", "email", "passwordHash", "name",
  "whatsappEnabled", "whatsappNotifyOnCheckout", "whatsappNotifyOnConfirm",
  "whatsappNotifyCustomer",
  "whatsappProvider", "googleCalendarConnected",
  "calendarFeedToken",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin@easybook.com',
  '$2b$10$F4J2kP2dws8V.zUiODIm6uqnjnb1ZhJh7xYha.wrz6sALvz.1G6Ta',
  'Studio Administrator',
  true, true, true,
  true,
  'callmebot', false,
  gen_random_uuid(),
  NOW(), NOW()
)
ON CONFLICT ("email") DO NOTHING;


-- 2. Operating Hours (Mon-Sat 09:00-18:00, Sunday closed)
INSERT INTO "OperatingHours" ("id", "dayOfWeek", "openTime", "closeTime", "isClosed") VALUES
  (gen_random_uuid(), 0, '09:00', '18:00', true),    -- Sunday (Closed)
  (gen_random_uuid(), 1, '09:00', '18:00', false),   -- Monday
  (gen_random_uuid(), 2, '09:00', '18:00', false),   -- Tuesday
  (gen_random_uuid(), 3, '09:00', '18:00', false),   -- Wednesday
  (gen_random_uuid(), 4, '09:00', '18:00', false),   -- Thursday
  (gen_random_uuid(), 5, '09:00', '18:00', false),   -- Friday
  (gen_random_uuid(), 6, '09:00', '18:00', false)    -- Saturday
ON CONFLICT ("dayOfWeek") DO NOTHING;


-- 3. Service Packages (Across 5 Categories in MYR / RM)
INSERT INTO "ServicePackage" (
  "id", "name", "category", "description", "price",
  "durationMinutes", "bufferMinutes", "isActive",
  "createdAt", "updatedAt"
) VALUES
  -- Indoor Photoshoot
  (
    gen_random_uuid(),
    'Studio Portrait & Headshots',
    'Indoor Photoshoot',
    'Professional studio lighting, 2 backdrop changes, and 8 retouched high-resolution portraits.',
    180.00, 60, 20, true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid(),
    'Indoor Family & Graduation Session',
    'Indoor Photoshoot',
    'Warm indoor studio setup for families or graduation groups up to 8 pax, 20 edited photos & all softcopies.',
    350.00, 90, 30, true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid(),
    'Full Studio Editorial & Fashion',
    'Indoor Photoshoot',
    'Creative director assisted studio concept shoot with multi-light setups, 3 outfit changes & 30 retouched images.',
    580.00, 150, 30, true,
    NOW(), NOW()
  ),
  -- Outdoor Photoshoot
  (
    gen_random_uuid(),
    'Golden Hour Mini Outdoor',
    'Outdoor Photoshoot',
    'Natural light outdoor portrait or couple session at a scenic park or urban spot with 12 edited high-res photos.',
    250.00, 60, 45, true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid(),
    'Outdoor Lifestyle & Convocation',
    'Outdoor Photoshoot',
    'On-location outdoor shoot across 2 nearby spots, ideal for convocation, couple, or family memories (25 edited photos).',
    420.00, 120, 45, true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid(),
    'Half-Day Location Adventure Shoot',
    'Outdoor Photoshoot',
    'Extended outdoor location exploration with portable strobe lighting, multiple outfits, and 45 master-retouched images.',
    780.00, 240, 60, true,
    NOW(), NOW()
  ),
  -- Wedding
  (
    gen_random_uuid(),
    'Intimate Solemnization (Nikah / ROM)',
    'Wedding',
    'Complete coverage of solemnization ceremony, family portraits, and couple portrait session with 150+ edited photos.',
    950.00, 180, 60, true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid(),
    'Pre-Wedding / Engagement Concept',
    'Wedding',
    'Romantic indoor + outdoor pre-wedding session with styling guidance, 2 themes, and 40 signature retouched portraits.',
    1280.00, 240, 60, true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid(),
    'Full Day Wedding Reception & Ceremony',
    'Wedding',
    'Full-day 8-hour storytelling coverage from preparation to reception, 2 photographers, and 400+ high-res edited images.',
    2400.00, 480, 90, true,
    NOW(), NOW()
  ),
  -- Sport
  (
    gen_random_uuid(),
    'Athlete Action Portrait Session',
    'Sport',
    'Dramatic high-speed strobe & rim-light athlete portraits in studio or court with 10 high-impact retouched shots.',
    220.00, 60, 30, true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid(),
    'Match / Tournament Live Coverage',
    'Sport',
    'Fast-telephoto sideline action photography for football, badminton, basketball, or motorsport events (80+ action shots).',
    480.00, 120, 45, true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid(),
    'Team & Club Media Day Package',
    'Sport',
    'Complete squad headshots, group banners, and dynamic pose setups for sports clubs, gyms, and fitness brands.',
    850.00, 180, 60, true,
    NOW(), NOW()
  ),
  -- Product
  (
    gen_random_uuid(),
    'E-Commerce White Background Pack',
    'Product',
    'Crisp, color-accurate catalog photography for up to 10 products on pure white or solid studio backdrops.',
    200.00, 60, 20, true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid(),
    'Creative Commercial & Flatlay',
    'Product',
    'Styled prop flatlays, textured surfaces, and hero lighting for cosmetics, F&B, or fashion accessories (20 commercial images).',
    450.00, 120, 30, true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid(),
    'Full Brand Campaign & Lookbook',
    'Product',
    'High-end advertising product & model lifestyle integration shoot with custom set design and 35 retouched campaign assets.',
    880.00, 210, 45, true,
    NOW(), NOW()
  );


-- ============================================================
-- ✅ Done! You can now log in at:
--    https://your-app.vercel.app/admin
--    Email:    admin@easybook.com
--    Password: admin123456
-- ============================================================
