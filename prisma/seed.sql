-- ============================================================
-- EasyBook Seed Data for Neon SQL Editor
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

-- 1. Admin User
-- Password "admin123456" hashed with bcrypt (10 rounds)
INSERT INTO "AdminUser" (
  "id", "email", "passwordHash", "name",
  "whatsappEnabled", "whatsappNotifyOnCheckout", "whatsappNotifyOnConfirm",
  "whatsappProvider", "googleCalendarConnected",
  "calendarFeedToken",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin@easybook.com',
  '$2b$10$F4J2kP2dws8V.zUiODIm6uqnjnb1ZhJh7xYha.wrz6sALvz.1G6Ta',
  'Studio Administrator',
  true, true, true,
  'callmebot', false,
  gen_random_uuid(),
  NOW(), NOW()
)
ON CONFLICT ("email") DO NOTHING;


-- 2. Operating Hours (Mon-Sat 09:00-18:00, Sunday closed)
INSERT INTO "OperatingHours" ("id", "dayOfWeek", "openTime", "closeTime", "isClosed") VALUES
  (gen_random_uuid(), 0, '09:00', '18:00', true),   -- Sunday (Closed)
  (gen_random_uuid(), 1, '09:00', '18:00', false),   -- Monday
  (gen_random_uuid(), 2, '09:00', '18:00', false),   -- Tuesday
  (gen_random_uuid(), 3, '09:00', '18:00', false),   -- Wednesday
  (gen_random_uuid(), 4, '09:00', '18:00', false),   -- Thursday
  (gen_random_uuid(), 5, '09:00', '18:00', false),   -- Friday
  (gen_random_uuid(), 6, '09:00', '18:00', false)    -- Saturday
ON CONFLICT ("dayOfWeek") DO NOTHING;


-- 3. Service Packages
INSERT INTO "ServicePackage" (
  "id", "name", "description", "price",
  "durationMinutes", "bufferMinutes", "isActive",
  "createdAt", "updatedAt"
) VALUES
  (
    gen_random_uuid(),
    'Portrait & Headshots',
    'Professional studio lighting, 2 backdrop changes, and 5 retouched high-resolution images.',
    150.00, 60, 30, true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid(),
    'Studio Brand Collection',
    'Comprehensive business branding shoot with multiple outfit changes and 15 premium edited photos.',
    350.00, 120, 30, true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid(),
    'Full Editorial & Fashion',
    'Creative director assisted fashion photoshoot with luxury lighting setups and 25 retouched photos.',
    600.00, 180, 45, true,
    NOW(), NOW()
  );


-- ============================================================
-- ✅ Done! You can now log in at:
--    https://your-app.vercel.app/admin
--    Email:    admin@easybook.com
--    Password: admin123456
-- ============================================================
