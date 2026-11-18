import type { BookingNotificationPayload } from "./whatsapp";
import { sendAdminTelegramNotification, type TelegramDispatchResult } from "./telegram";
import { sendCustomerEmailNotification, type EmailDispatchResult } from "./email";

export interface BookingNotificationResults {
  /** Telegram bot alert to Admin */
  telegram: TelegramDispatchResult;
  /** Token-Based Invitation email to Customer (sent on booking confirmation / update) */
  email: EmailDispatchResult;
}

/**
 * Single entry point for all booking notifications:
 *  - Admin    → Telegram bot alert only (direct Telegram Bot API)
 *  - Customer → Token-Based Invitation Email on confirmation/update (direct Resend API)
 *
 * Every channel is independent: one failing never blocks the other.
 */
export async function sendBookingNotifications(
  payload: BookingNotificationPayload
): Promise<BookingNotificationResults> {
  const [telegram, email] = await Promise.allSettled([
    sendAdminTelegramNotification({ ...payload, recipientRole: "ADMIN" }),
    sendCustomerEmailNotification({ ...payload, recipientRole: "CUSTOMER" }),
  ]);

  return {
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
