# EasyBook — WhatsApp Notification Integration Guide

This guide explains how WhatsApp notifications work in **EasyBook**, how to set them up, and the easiest options available for both **Admin alerts** and **Customer booking receipts**.

---

## Quick Summary: 3 Ways to Use WhatsApp in EasyBook

| Method | What It Does | Cost | Setup Time | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **Option 1: 1-Click WhatsApp (`wa.me`)** | Built-in green buttons in Admin Notifications & Calendar that open WhatsApp with pre-filled receipts | **100% Free** | **0 seconds** (Already works!) | Sending receipts & updates directly to customers without any bots or third-party accounts |
| **Option 2: CallMeBot Gateway** | Automatically sends a WhatsApp message to **your personal admin phone** whenever a customer books or pays | **100% Free** | **30 seconds** | Personal alerts directly on your phone when new bookings arrive |
| **Option 3: Fonnte Gateway** | Automatically sends WhatsApp messages to **both Admin and Customers** | Free tier / cheap | **2 minutes** (QR code scan) | Fully automated studio notifications in Malaysia |

---

## Option 1: 1-Click WhatsApp (Zero Setup Required)

You do **not** need to register for any bot or API to message customers. EasyBook already has built-in WhatsApp Web / App integration:

1. When a customer makes a booking, go to **Admin -> Notifications** (`/admin/notifications`) or **Admin -> Calendar** (`/admin/calendar`).
2. You will see a green **"Send via WhatsApp"** button next to the booking.
3. Clicking that button opens WhatsApp on your phone or computer with:
   - The customer's Malaysian phone number already selected (`+601...`).
   - The complete formatted booking receipt in **Malaysia Ringgit (RM)** already typed out.
4. You simply click **Send** in WhatsApp!

---

## Option 2: How to Set Up CallMeBot (Step-by-Step)

### What is CallMeBot?
CallMeBot is a free bot service that sends notifications to **your own personal WhatsApp number**. Whenever a customer books or pays on your website, the server automatically buzzes your phone via WhatsApp.

> **Important Note:** CallMeBot is strictly a *personal notification service*. Its free API key is linked to your phone number and sends messages to **you (the Admin)**. For sending messages to customers, use **Option 1 (1-Click WhatsApp)** or **Option 3 (Fonnte)**.

### Step 1: Message CallMeBot on WhatsApp
1. On your phone (the WhatsApp account you want to receive alerts on), open WhatsApp.
2. Click this link or start a chat with CallMeBot:
   - **Primary Bot:** [Click to message +34 644 26 33 77](https://wa.me/34644263377?text=I%20allow%20callmebot%20to%20send%20me%20messages)
   - **Backup Bot:** [Click to message +34 644 20 54 84](https://wa.me/34644205484?text=I%20allow%20callmebot%20to%20send%20me%20messages)
3. Send this exact text to the bot:
   ```text
   I allow callmebot to send me messages
   ```

### Step 2: Get Your API Key
Within 10 to 60 seconds, the bot will reply with a confirmation message:
```text
CallMeBot API Activated for +60189779241.
Your APIKEY is: 123456
```
Copy that numeric code (e.g. `123456`). **This is your API Key.**

### Step 3: Enter the Key in EasyBook
1. Open your EasyBook Admin Dashboard.
2. Go to **Admin Profile & Integrations** (`/admin/profile?tab=whatsapp`).
3. Click the **WhatsApp Notifications** tab.
4. Fill in:
   - **Admin WhatsApp Number:** Your phone number with country code (e.g. `+60189779241`).
   - **WhatsApp Gateway Provider:** Select `CallMeBot`.
   - **Gateway API Key / Token:** Paste the numeric API key you received (e.g. `123456`).
5. Click **Save Changes** at the bottom of the page.

### Step 4: Test Your Alert
Click the green **"Send Test WhatsApp Alert"** button on that page.
You will immediately receive a test message on your WhatsApp from CallMeBot!

---

## Option 3: Fonnte (Full Automation for Both Admin & Customers)

If you want **both you and your customers** to receive automatic WhatsApp messages without clicking anything:

1. Go to [https://fonnte.com](https://fonnte.com) and create a free account.
2. Connect your studio's WhatsApp number by scanning the QR code on the Fonnte dashboard (just like connecting WhatsApp Web).
3. Copy your **Device Token** from Fonnte.
4. In EasyBook -> **Admin Profile** (`/admin/profile?tab=whatsapp`):
   - **WhatsApp Gateway Provider:** Select `Fonnte (Malaysia & Indonesia Gateway)`.
   - **Gateway API Key / Token:** Paste your Fonnte token.
5. Click **Save Changes**.

Now, whenever a customer makes a booking or completes payment, EasyBook will automatically send them a WhatsApp confirmation, and also send you an Admin notification.

---

## Notification Triggers Available

In **Admin Profile** (`/admin/profile?tab=whatsapp`), you can toggle which notifications are sent:
- **Admin: On Booking Hold:** Receive an alert when a customer selects a photoshoot slot (15-min temporary lock).
- **Admin: On Payment Confirmed:** Receive an alert when payment succeeds.
- **Customer: Booking Receipt:** Enable/disable customer WhatsApp alerts.

