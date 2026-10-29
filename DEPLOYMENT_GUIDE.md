# EasyBook — Production Deployment Guide (Vercel + Neon PostgreSQL)

This guide explains how **EasyBook** is deployed in production using **Vercel** and **Neon Serverless PostgreSQL**, how Environment Variables work across **Vercel** vs. **GitHub Actions**, and how the database schema & photoshoot category packages are kept in sync.

---

## 1. Architecture Overview

EasyBook uses:
- **Hosting & Build Pipeline**: **Vercel** (connected directly to your GitHub repository `siesta03/EasyBook`).
- **Build Command**: `npm run vercel-build` (defined in `package.json` as `prisma db push && next build`).
- **Database**: **Neon Serverless PostgreSQL** (`easybook_db`).
- **Automatic Category & Schema Seeding**: On first request or Admin login, `ensureCategoryPackagesSeeded()` in `src/lib/seed-categories.ts` automatically ensures all new columns (`category`, `recipientRole`, `isRead`, `whatsappNotifyCustomer`) exist and seeds all **5 Photoshoot Categories** (`Indoor Photoshoot`, `Outdoor Photoshoot`, `Wedding`, `Sport`, `Product`) in **Malaysia Ringgit (`RM`)**.

---

## 2. Why GitHub Actions Showed the `DATABASE_URL` Error (Even Though Vercel Had It Set)

 **Vercel** and **GitHub Actions** have **two completely separate secret stores**:

1. **Vercel Environment Variables** (`Vercel Dashboard -> Project Settings -> Environment Variables`):
   - Used when **Vercel** builds and runs your app (`npm run vercel-build`, which runs `prisma db push && next build`).
   - You already configured `DATABASE_URL`, `JWT_SECRET`, `TIMEZONE`, and `NEXT_PUBLIC_APP_URL` here.
2. **GitHub Actions Secrets** (`GitHub Repository -> Settings -> Secrets and variables -> Actions`):
   - Used by `.github/workflows/deploy.yml` when GitHub runs its own workflow on push to `main`.
   - GitHub Actions **cannot automatically read** Vercel's Environment Variables.
   - Previously, `.github/workflows/deploy.yml` unconditionally ran `npx prisma migrate deploy` even when GitHub's `secrets.DATABASE_URL` was empty, causing `Error code: P1012: The environment variable 'DATABASE_URL' resolved to an empty string`.

### How This Is Fixed
- `.github/workflows/deploy.yml` now checks `if: env.DATABASE_URL != ''` before running `npx prisma db push`.
- If `DATABASE_URL` is only configured in **Vercel** (and not duplicated in GitHub Secrets), GitHub Actions cleanly succeeds and lets **Vercel's `vercel-build` script** handle `prisma db push && next build` using your Vercel Environment Variables.
- *(Optional)* If you also want GitHub Actions to run `prisma db push`, you can add `DATABASE_URL` under **GitHub Repo -> Settings -> Secrets and variables -> Actions -> New repository secret**.

---

## 3. Vercel Environment Variables Reference

In **Vercel Dashboard -> Settings -> Environment Variables**, ensure the following variables are set for **Production** (and **Preview**):

| Variable | Required | Example Value | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://easybook_db_owner:...@...-pooler.ap-southeast-1.aws.neon.tech/easybook_db?sslmode=require` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Yes | `easybook-super-secret-jwt-key-2026-production` | Secret key used to sign Admin session JWT cookies |
| `TIMEZONE` | Yes | `Asia/Kuala_Lumpur` | Studio operating timezone (`UTC+8` Malaysia) |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://your-project.vercel.app` | Public URL used in booking manage links & WhatsApp notifications |
| `WHATSAPP_API_PROVIDER` | Optional | `META` / `FONNTE` / `TWILIO` / `WEBHOOK` | Optional automated WhatsApp API provider (defaults to simulation + 1-Click `wa.me` links in `/admin/notifications`) |
| `WHATSAPP_API_TOKEN` | Optional | `your-api-token` | API token for automated WhatsApp dispatching |

---

## 4. Database Schema & Seed Data (`RM` Categories)

Your live Neon PostgreSQL database (`easybook_db`) includes:
- **`ServicePackage`**: Includes `category` (`Indoor Photoshoot`, `Outdoor Photoshoot`, `Wedding`, `Sport`, `Product`), `durationMinutes`, `bufferMinutes`, and `priceCents` (in Malaysia Ringgit `RM` sen).
- **`NotificationLog`**: Includes `recipientRole` (`ADMIN` or `CUSTOMER`), `recipient`, `message`, `status`, and `isRead` for the `/admin/notifications` center.
- **`AdminUser`**: Includes `whatsappPhone`, `whatsappNotifyOnNewBooking`, `whatsappNotifyOnReschedule`, `whatsappNotifyOnCancel`, and `whatsappNotifyCustomer`.

To manually re-sync or seed from your local machine at any time:
```bash
npx prisma db push
```
Or click **"Load Default Category Packages"** inside **Admin -> Services & Buffers (`/admin/services`)**.
