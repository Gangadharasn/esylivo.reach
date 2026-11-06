import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// Lemon Squeezy handles the Pro subscription (cards, UPI, tax, invoices). Setup:
// one subscription product with a monthly variant priced at PRO_PRICE_USD, and a webhook
// to https://<domain>/api/billing/webhook for the subscription_* events.
const API_BASE = "https://api.lemonsqueezy.com/v1";

export function lemonConfig() {
  return {
    apiKey: process.env.LEMONSQUEEZY_API_KEY ?? "",
    storeId: process.env.LEMONSQUEEZY_STORE_ID ?? "",
    variantId: process.env.LEMONSQUEEZY_VARIANT_PRO ?? "",
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "",
  };
}

/** Testing only: "Upgrade" activates Pro and adds credit without taking payment. */
export function paymentsBypassed() {
  return process.env.SKIP_PAYMENT_GATEWAY === "true";
}

export function paymentsConfigured() {
  const c = lemonConfig();
  return Boolean(c.apiKey && c.storeId && c.variantId);
}

export type LsSubscription = {
  id: string;
  attributes: {
    customer_id: number;
    variant_id: number;
    status: "on_trial" | "active" | "paused" | "past_due" | "unpaid" | "cancelled" | "expired";
    renews_at: string | null;
    ends_at: string | null;
    updated_at: string;
    urls?: { customer_portal?: string | null };
  };
};

async function lsRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${lemonConfig().apiKey}`,
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[lemonsqueezy]", init.method ?? "GET", path, res.status, JSON.stringify(body));
    throw new Error("The payment provider rejected the request.");
  }
  return body as T;
}

export async function createCheckout(input: { userId: string; email: string; name: string; redirectUrl: string }) {
  const { storeId, variantId } = lemonConfig();
  const body = await lsRequest<{ data: { attributes: { url: string } } }>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          // custom.user_id comes back on every webhook for this subscription.
          checkout_data: { email: input.email, name: input.name, custom: { user_id: input.userId } },
          product_options: { redirect_url: input.redirectUrl, enabled_variants: [Number(variantId)] },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    }),
  });
  return body.data.attributes.url;
}

export async function getSubscription(id: string) {
  return (await lsRequest<{ data: LsSubscription }>(`/subscriptions/${encodeURIComponent(id)}`)).data;
}

/** HMAC-SHA256 of the raw body with the webhook signing secret, hex in X-Signature. */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "utf8");
  const received = Buffer.from(signature, "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** User fields for a subscription's current state. Expired = back to the free plan. */
export function planFromSubscription(sub: LsSubscription) {
  const a = sub.attributes;
  const date = (v: string | null) => (v ? new Date(v) : null);
  const link = { lsSubscriptionId: sub.id, lsCustomerId: String(a.customer_id), lsUpdatedAt: new Date(a.updated_at) };
  switch (a.status) {
    case "on_trial":
    case "active":
      return { ...link, plan: "PRO", planStatus: "active", planRenewsAt: date(a.renews_at) };
    case "past_due":
    case "unpaid":
      return { ...link, plan: "PRO", planStatus: "past_due", planRenewsAt: date(a.renews_at) };
    case "cancelled":
      // Paid through ends_at; stays Pro until then, then an "expired" event arrives.
      return { ...link, plan: "PRO", planStatus: "cancelled", planRenewsAt: date(a.ends_at) };
    default:
      return { ...link, plan: "FREE", planStatus: a.status, planRenewsAt: null };
  }
}
