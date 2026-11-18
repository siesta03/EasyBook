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

## Part 2: Customer Email Invitations via Resend

EasyBook uses **Resend** (https://resend.com) to send Token-Based Invitation emails to confirmed customers. The email contains photoshoot details and a private, passwordless management link (`/booking/manage/[manageToken]`).

### Step 1: Sign up & Get an API Key
1. Sign up for a free account at [https://resend.com/signup](https://resend.com/signup) (free tier includes 3,000 emails/month).
2. Go to **API Keys** ([https://resend.com/api-keys](https://resend.com/api-keys)).
3. Click **"Create API Key"**, give it a name (e.g., `EasyBook`), and copy the key (starts with `re_...`).

### Step 2: Add API Key to Environment
1. In **Vercel Dashboard** ➔ Your Project ➔ **Settings** ➔ **Environment Variables**:
   - `RESEND_API_KEY`: `re_your_api_key_here`
   - *(Optional)* `EMAIL_FROM`: `EasyBook Studio <onboarding@resend.dev>` *(default sandbox sender)*
2. In your local `.env` file, add the same variable.
3. Redeploy on Vercel (or trigger a new build) so the environment variable takes effect.

### Step 3: Test Email (Sandbox Mode)
> [!IMPORTANT]
> **Understanding Resend Sandbox Mode (`onboarding@resend.dev`):**
> On Resend's free tier without a verified domain, Resend **only permits sending emails to the email address registered on your Resend account** (e.g., `haziqamani509@gmail.com`).
> If you test sending to any other email, Resend will reject with:
> `You can only send testing emails to your own email address...`

1. Go to **Admin Profile** (`/admin/profile?tab=alerts`).
2. Under **Customer Token-Based Email Invitations**, type your **registered Resend email** (`haziqamani509@gmail.com`) into the test field.
3. Click **"Send Test Token Email"**.
4. Check your inbox: you will receive a test invitation with the private token link!

---

## Part 3: Setting Up a Custom Domain (To Email Any Customer)

If you want to send invitations to real customer email addresses (not just your own Resend account email), you need to verify a domain you own.

> [!WARNING]
> **Do NOT type `easybook.com` in Resend Domains:**
> You can only verify domains that **you personally own and manage DNS records for**. `easybook.com` is owned by an external company, so Resend cannot verify it.

### How to configure your domain:
1. **Acquire a domain** (if you don't already have one) from a registrar like Cloudflare Registrar, Namecheap, Hostinger, or GoDaddy (usually RM30–RM50 / \$8–\$10 per year, e.g., `easybookstudio.my` or `haziqstudio.com`).
2. In [Resend Domains](https://resend.com/domains), click **"Add domain"**:
   - Enter your domain (e.g. `easybookstudio.my` or a subdomain like `mail.easybookstudio.my`).
   - Select Region: **Tokyo (`ap-northeast-1`)** or **Singapore**.
   - Click **Add domain**.
3. Resend will display DNS records to add:
   - **DKIM** (Type `TXT` or `CNAME`, Host `resend._domainkey`)
   - **SPF** (Type `TXT`, Host `send` or `@`)
   - **Return-Path / MX** (Type `MX` / `CNAME`)
4. Open your domain provider's DNS settings (Cloudflare, Namecheap, etc.) and add the records provided by Resend.
5. In Resend, click **"Verify DNS Records"**. Once status is **Verified** (green), your domain is ready!
6. In **Vercel ➔ Settings ➔ Environment Variables**, add or update:
   - `EMAIL_FROM`: `EasyBook Studio <bookings@easybookstudio.my>`
7. Redeploy. EasyBook will now automatically send invitations from your branded domain to any customer worldwide!

> [!NOTE]
> **What happens if you don't have a custom domain yet?**
> EasyBook includes built-in protection: when a customer books with an external email while in Resend sandbox mode, EasyBook **does not fail or crash the booking**. It safely logs the invitation as `SIMULATED` in **Admin ➔ Notifications**, preserving the direct token invitation link (`/booking/manage/[token]`) so you can copy and share it with the customer at any time.

---

## Summary of Environment Variables

Add these in **Vercel Dashboard ➔ Settings ➔ Environment Variables**:

| Variable | Required | Where to Get | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | Neon PostgreSQL | Database connection string |
| `JWT_SECRET` | Yes | Custom secret string | Signs admin session cookies |
| `TIMEZONE` | Yes | `Asia/Kuala_Lumpur` | Studio operating timezone |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://your-app.vercel.app` | Public studio URL |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram `@BotFather` | (Can also be set in Admin Profile UI) |
| `TELEGRAM_CHAT_ID` | Optional | EasyBook Auto-Detect | (Can also be set in Admin Profile UI) |
| `RESEND_API_KEY` | Optional | `resend.com` | Powers customer email invitations |
| `EMAIL_FROM` | Optional | Your verified domain | Custom sender address (e.g., `EasyBook Studio <bookings@yourdomain.com>`) |


