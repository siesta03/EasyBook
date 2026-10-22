import crypto from "crypto";
import { Booking, ServicePackage } from "@prisma/client";

export interface CheckoutSessionResult {
  checkoutUrl: string;
  paymentRef: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  eventType?: string;
  bookingId?: string;
  paymentRef?: string;
}

export async function createCheckoutSession(
  booking: Booking & { service: ServicePackage }
): Promise<CheckoutSessionResult> {
  const secretKey = process.env.PAYMENT_SECRET_KEY || "mock";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Mock / Simulated Payment Mode
  if (secretKey === "mock" || secretKey.startsWith("mock")) {
    const paymentRef = `mock_pay_${booking.id}_${Date.now()}`;
    const checkoutUrl = `${appUrl}/api/webhooks/payment/mock-success?bookingId=${booking.id}&token=${booking.manageToken}&ref=${paymentRef}`;

    return {
      checkoutUrl,
      paymentRef,
    };
  }

  // Live Stripe Checkout via REST API
  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append(
    "success_url",
    `${appUrl}/booking/manage/${booking.manageToken}?confirmed=true`
  );
  params.append(
    "cancel_url",
    `${appUrl}/booking/manage/${booking.manageToken}?cancelled=true`
  );
  params.append("client_reference_id", booking.id);
  params.append("customer_email", booking.clientEmail);
  params.append(
    "line_items[0][price_data][currency]",
    process.env.CURRENCY || "myr"
  );
  params.append(
    "line_items[0][price_data][unit_amount]",
    Math.round(Number(booking.totalAmount) * 100).toString()
  );
  params.append(
    "line_items[0][price_data][product_data][name]",
    `Photoshoot: ${booking.service.name}`
  );
  params.append(
    "line_items[0][price_data][product_data][description]",
    `${booking.service.durationMinutes} min session + ${booking.service.bufferMinutes} min buffer`
  );
  params.append("metadata[bookingId]", booking.id);
  params.append("metadata[manageToken]", booking.manageToken);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Stripe checkout creation failed: ${errorData.error?.message || response.statusText}`
    );
  }

  const session = await response.json();

  return {
    checkoutUrl: session.url,
    paymentRef: session.id,
  };
}

export function verifyWebhookSignature(
  signatureHeader: string | null,
  rawBody: string
): WebhookVerificationResult {
  const secretKey = process.env.PAYMENT_SECRET_KEY || "mock";
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

  // Mock / Simulated Mode
  if (secretKey === "mock" || secretKey.startsWith("mock") || !webhookSecret) {
    try {
      const data = JSON.parse(rawBody);
      return {
        isValid: true,
        eventType: data.type || "checkout.session.completed",
        bookingId:
          data.data?.object?.metadata?.bookingId ||
          data.data?.object?.client_reference_id ||
          data.bookingId,
        paymentRef: data.data?.object?.id || data.paymentRef,
      };
    } catch {
      return { isValid: false };
    }
  }

  // Stripe Signature Verification
  if (!signatureHeader) {
    return { isValid: false };
  }

  try {
    const parts = signatureHeader.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const sigPart = parts.find((p) => p.startsWith("v1="));

    if (!timestampPart || !sigPart) {
      return { isValid: false };
    }

    const timestamp = timestampPart.slice(2);
    const signature = sigPart.slice(3);

    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(signedPayload, "utf8")
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );

    if (!isValid) {
      return { isValid: false };
    }

    const event = JSON.parse(rawBody);
    return {
      isValid: true,
      eventType: event.type,
      bookingId:
        event.data?.object?.metadata?.bookingId ||
        event.data?.object?.client_reference_id,
      paymentRef: event.data?.object?.id,
    };
  } catch (error) {
    console.error("[Payment Webhook] Signature verification failed:", error);
    return { isValid: false };
  }
}
