import {
  sendBookingWhatsAppNotifications,
  type BookingNotificationPayload,
  type WhatsAppDispatchResult,
} from "./whatsapp";
import { sendAdminTelegramNotification, type TelegramDispatchResult } from "./telegram";
import { sendCustomerEmailNotification, type EmailDispatchResult } from "./email";

export interface BookingNotificationResults {
  /** WhatsApp (gateway or 1-Click wa.me link) to Admin */
  admin: WhatsAppDispatchResult;
  /** WhatsApp (gateway or 1-Click wa.me link) to Customer */
  customer: WhatsAppDispatchResult;
  /** Telegram bot alert to Admin */
  telegram: TelegramDispatchResult;
  /** Email receipt to Customer */
  email: EmailDispatchResult;
}

/**
 * Single entry point for all booking notifications:
 *  - Admin  → Telegram bot alert (direct Telegram Bot API)
 *  - Customer → Email receipt (direct Resend API)
 *  - Both   → WhatsApp record with 1-Click wa.me link in the Notification Center
 *
 * Every channel is independent: one failing never blocks the others.
 */
export async function sendBookingNotifications(
  payload: BookingNotificationPayload
): Promise<BookingNotificationResults> {
  const [whatsapp, telegram, email] = await Promise.allSettled([
    sendBookingWhatsAppNotifications(payload),
    sendAdminTelegramNotification({ ...payload, recipientRole: "ADMIN" }),
    sendCustomerEmailNotification({ ...payload, recipientRole: "CUSTOMER" }),
  ]);

  return {
    admin:
      whatsapp.status === "fulfilled"
        ? whatsapp.value.admin
        : { success: false, error: "Admin WhatsApp notification failed" },
    customer:
      whatsapp.status === "fulfilled"
        ? whatsapp.value.customer
        : { success: false, error: "Customer WhatsApp notification failed" },
    telegram:
      telegram.status === "fulfilled"
        ? telegram.value
        : { success: false, status: "FAILED", error: "Telegram notification failed" },
    email:
      email.status === "fulfilled"
        ? email.value
        : { success: false, status: "FAILED", error: "Email notification failed" },
  };
}

