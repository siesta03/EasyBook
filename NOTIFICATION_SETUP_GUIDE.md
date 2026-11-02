# EasyBook — Option D: Telegram & Email Notifications Guide

This guide explains how to set up **Option D** (the direct, zero-hassle notification setup for EasyBook):
- **Admin Alerts** ➔ **Telegram Bot** (Direct Telegram Bot API, 100% free, no third-party gateway, no message approval).
- **Customer Receipts** ➔ **Email via Resend** (Direct REST API, 3,000 free emails/month).
- **Personal WhatsApp** ➔ Built-in **1-Click WhatsApp** buttons in Admin Calendar and Notifications.

---

## Part 1: Telegram Bot for Admin Alerts (Takes 2 Minutes)

Because Telegram has an open, official Bot API, your backend communicates directly with Telegram (`https://api.telegram.org`) with zero middlemen.

### Step 1: Create your bot in Telegram
1. Open the Telegram app on your phone or PC.
2. Search for **`@BotFather`** (the official verified Telegram bot with a blue checkmark) or click [https://t.me/BotFather](https://t.me/BotFather).
3. Send the command:
   ```text
   /newbot
   ```
4. BotFather will ask for a name. Enter your studio's name, for example:
   ```text
   EasyBook Alerts
   ```
5. BotFather will ask for a username ending in `bot`. For example:
   ```text
   easybook_studio_bot
   ```
6. BotFather will reply with your **Bot Token**, which looks like:
   ```text
   7123456789:AAHq_Abc123xyz456...
   ```
   Copy this token.

### Step 2: Start a chat with your bot
1. In Telegram, search for your new bot username (e.g. `@easybook_studio_bot`) or click the link BotFather gave you.
2. Click **START** (or send any message like `hi`).
   > *This allows the bot to send you messages.*

### Step 3: Connect it in EasyBook Admin
1. Open EasyBook and log in to the Admin Dashboard.
2. Go to **Admin Profile** (`/admin/profile?tab=alerts`).
3. Click the **Telegram & Email Alerts** tab.
4. Check **"Enable Telegram alerts"**.
5. Paste your bot token into **Bot Token**.
6. Click the **"Detect Chat ID"** button. EasyBook will automatically fetch your Chat ID!
7. Click **"Save Changes"** at the bottom of the page.
8. Click **"Send Test Telegram Alert"**. You will receive an instant test message in Telegram!

---

## Part 2: Customer Email Receipts via Resend (Optional / Recommended)

Your backend calls Resend's REST API directly to send branded email receipts to customers whenever a booking is created, confirmed, rescheduled, or cancelled.

### Step 1: Get an API key from Resend
1. Sign up for a free account at [https://resend.com](https://resend.com) (free tier includes 3,000 emails/month).
2. Go to **API Keys** and click **Create API Key**.
3. Copy your key (starts with `re_...`).

### Step 2: Add to Vercel & Local Environment
1. In **Vercel Dashboard** ➔ Your Project ➔ **Settings** ➔ **Environment Variables**:
   - `RESEND_API_KEY`: `re_your_api_key_here`
   - *(Optional)* `EMAIL_FROM`: `EasyBook Studio <bookings@yourdomain.com>` *(defaults to `EasyBook Studio <onboarding@resend.dev>` for testing)*
2. In your local `.env` file, add the same variables.
3. Redeploy on Vercel so the environment variable takes effect.

### Step 3: Test Email
1. In EasyBook Admin Profile ➔ **Telegram & Email Alerts** tab.
2. Enter your email address in the test input.
3. Click **"Send Test Email"**.

---

## Part 3: Customer WhatsApp Messaging (Zero Setup)

You do **not** need any third-party gateway to message customers on WhatsApp:

1. When a booking is created or confirmed, open **Admin ➔ Calendar** (`/admin/calendar`) or **Admin ➔ Notifications** (`/admin/notifications`).
2. Click the green **"Send via WhatsApp"** button.
3. It opens WhatsApp Web or your WhatsApp app with the customer's phone number and the complete photoshoot confirmation (in RM) already typed out.
4. You simply press **Send**.

---

## Summary of Environment Variables for Option D

Add these in **Vercel Dashboard ➔ Settings ➔ Environment Variables**:

| Variable | Required | Where to Get | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | Neon PostgreSQL | Database connection string |
| `JWT_SECRET` | Yes | Custom secret string | Signs admin session cookies |
| `TIMEZONE` | Yes | `Asia/Kuala_Lumpur` | Studio operating timezone |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://your-app.vercel.app` | Public studio URL |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram `@BotFather` | (Can also be set in Admin Profile UI) |
| `TELEGRAM_CHAT_ID` | Optional | EasyBook Auto-Detect | (Can also be set in Admin Profile UI) |
| `RESEND_API_KEY` | Optional | `resend.com` | Powers customer email receipts |
| `EMAIL_FROM` | Optional | Your domain | Custom sender address |

