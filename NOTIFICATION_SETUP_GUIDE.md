# EasyBook — Option D: Telegram & Token-Based Email Invitations Guide

This guide explains how to set up **Option D** (the direct, zero-hassle notification setup for EasyBook):
- **Admin Alerts** ➔ **Telegram Bot** (Direct Telegram Bot API, 100% free, no third-party gateway, no message approval).
- **Customer Invitations** ➔ **Token-Based Email via Resend** (Direct REST API, 3,000 free emails/month, passwordless `/booking/manage/[token]` link).
- **Google Calendar** ➔ **Tunnel / Feed URL** (Subscribe directly in Google Calendar).

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

## Part 2: Customer Email Invitations via Brevo (Recommended — Free & No Domain Needed)

EasyBook uses **Brevo** (formerly Sendinblue — [https://www.brevo.com](https://www.brevo.com)) to send Token-Based Invitation emails to confirmed customers.
- **300 free emails per day** (9,000 emails/month).
- **Sends to ANY customer email address immediately** without needing to buy or verify a custom DNS domain!
- Customers automatically receive their photoshoot summary (reference, package, date, time in MYT, RM total) and a direct passwordless link (`/booking/manage/[manageToken]`).

### Step 1: Sign up & Get an API Key in Brevo
1. Create a free account at [https://app.brevo.com](https://app.brevo.com) using your email (e.g. `haziqamani509@gmail.com`).
2. Once logged in, click your account name / profile icon in the top-right corner.
3. Select **"SMTP & API"** (or directly open [https://app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api)).
4. Click **"Generate a new API key"**.
5. Give it a name (e.g., `EasyBook`).
6. Copy your API key (starts with `xkeysib-...`).
   > *Note: Store this key safely — Brevo only displays it once.*

### Step 2: Add to Vercel & Local Environment
1. In **Vercel Dashboard ➔ Settings ➔ Environment Variables**, add:
   - `BREVO_API_KEY`: `xkeysib-your_brevo_api_key_here`
   - `BREVO_SENDER_EMAIL`: `haziqamani509@gmail.com` *(or your registered Brevo email)*
   - `BREVO_SENDER_NAME`: `EasyBook Studio`
2. In your local `.env` file, add the same variables:
   ```env
   BREVO_API_KEY="xkeysib-your_brevo_api_key_here"
   BREVO_SENDER_EMAIL="haziqamani509@gmail.com"
   BREVO_SENDER_NAME="EasyBook Studio"
   ```
3. Trigger a redeploy on Vercel so the environment variables take effect.

### Step 3: Test Real Email Delivery
1. Open EasyBook Admin: **Admin Profile ➔ Telegram & Email Alerts** tab.
2. Under **Customer Token-Based Email Invitations**, you will see the green badge:
   `Brevo Connected (300/day Free)`
3. Enter any recipient email in the test input (your own email, a friend's email, or any test address).
4. Click **"Send Test Token Email"**.
5. You will receive the branded invitation email in seconds!

---

## Part 3: Alternative Provider — Resend (Requires Custom Domain for External Customers)

If you already use **Resend** ([https://resend.com](https://resend.com)):
1. Add `RESEND_API_KEY="re_..."` and `EMAIL_FROM="EasyBook Studio <onboarding@resend.dev>"` to your environment variables.
2. In Resend free sandbox mode, you can **only** send test emails to your registered account email (`haziqamani509@gmail.com`).
3. To send to external customer emails using Resend, you must purchase a domain (e.g., `easybookstudio.my`), add it under [Resend Domains](https://resend.com/domains), and configure 3 DNS records (DKIM, SPF, MX).
   > *Do NOT type `easybook.com` in Resend, because you must own the domain to verify DNS records.*
4. If you do not have a custom domain, use **Brevo (Part 2 above)** instead.

---

## Summary of Environment Variables

Add these in **Vercel Dashboard ➔ Settings ➔ Environment Variables**:

| Variable | Required | Where to Get | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | Neon PostgreSQL | Database connection string |
| `JWT_SECRET` | Yes | Custom secret string | Signs admin session cookies |
| `TIMEZONE` | Yes | `Asia/Kuala_Lumpur` | Studio operating timezone |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://your-app.vercel.app` | Public studio URL |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram `@BotFather` | Powers Admin Telegram alerts |
| `TELEGRAM_CHAT_ID` | Optional | EasyBook Auto-Detect | Admin Telegram chat ID |
| `BREVO_API_KEY` | Recommended | `app.brevo.com` ➔ SMTP & API | Powers customer email invitations (300/day free to any email) |
| `BREVO_SENDER_EMAIL` | Optional | Your Brevo account email | e.g. `haziqamani509@gmail.com` |
| `BREVO_SENDER_NAME` | Optional | Custom name | e.g. `EasyBook Studio` |
| `RESEND_API_KEY` | Optional | `resend.com` | Alternative email provider |
| `EMAIL_FROM` | Optional | Your domain | Alternative sender string |


