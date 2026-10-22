# Project Name: EasyBook (Photoshoot Booking & Scheduling Engine)

## System Overview

Build a full-stack photoshoot booking web application using Next.js (App Router, TypeScript), Tailwind CSS, Prisma ORM (PostgreSQL), Payment Gateway webhooks, and Google Calendar API integration.

## Core Architectural Rules

1. **No Customer Login:** Customers book as guests using Name, Email, and Phone Number. Each booking generates a unique cryptographic `manageToken` (UUID v4) for viewing, rescheduling, or canceling via `/booking/manage/[token]`.
2. **Admin Auth Only:** `/admin/*` routes and `/api/admin/*` endpoints are protected via JWT session cookies or NextAuth credentials.
3. **Dynamic Slot Calculation:** Slots are NOT stored as empty rows. They are calculated dynamically on the fly using:
   - Operating Hours (per day of week)
   - Service Duration (`durationMinutes`)
   - Buffer/Cleanup Interval (`bufferMinutes`)
   - Existing Active Bookings (`CONFIRMED`, or `PENDING_PAYMENT` where `expiresAt > now()`)
   - Admin Blackout Windows
4. **Transient Slot Locking:** Proceeding to payment creates a `PENDING_PAYMENT` booking with `expiresAt = now() + 15 minutes`.
5. **Webhook-Driven Confirmation:** Payment verification happens strictly via backend webhook (`/api/webhooks/payment`), which transitions status to `CONFIRMED` and dispatches a Google Calendar invite (`sendUpdates: 'all'`) to the customer and admin.
