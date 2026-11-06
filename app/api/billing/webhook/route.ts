import { NextResponse } from "next/server";

import { grantCredits } from "@/lib/credits";
import { getSubscription, lemonConfig, planFromSubscription, verifyWebhookSignature, type LsSubscription } from "@/lib/lemonsqueezy";
import { PRO_CREDIT_USD } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

type Payload = {
  meta?: { event_name?: string; custom_data?: { user_id?: unknown } };
  data?: { id?: string; attributes?: Record<string, unknown> };
};

const SUBSCRIPTION_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
]);

/**
 * Lemon Squeezy → Esylivo Reach. subscription_* events keep the user's plan in sync;
 * subscription_payment_success (first payment and every renewal) adds a month of credit,
 * once per invoice. Non-2xx makes Lemon Squeezy retry, so only bad requests get 4xx.
 */
export async function POST(request: Request) {
  const { webhookSecret } = lemonConfig();
  if (!webhookSecret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });

  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-signature"), webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let payload: Payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.meta?.event_name ?? "";
  const customUserId = typeof payload.meta?.custom_data?.user_id === "string" ? payload.meta.custom_data.user_id : null;

  try {
    if (SUBSCRIPTION_EVENTS.has(event)) {
      const sub = payload.data as LsSubscription;
      const user = await findUser(customUserId, sub.id);
      if (!user) return NextResponse.json({ received: true, applied: "no-matching-user" });
      // Webhooks can arrive out of order; never let an older snapshot win.
      if (user.lsSubscriptionId === sub.id && user.lsUpdatedAt && new Date(sub.attributes.updated_at) < user.lsUpdatedAt) {
        return NextResponse.json({ received: true, applied: "stale" });
      }
      await prisma.user.update({ where: { id: user.id }, data: planFromSubscription(sub) });
      return NextResponse.json({ received: true, applied: "plan" });
    }

    if (event === "subscription_payment_success") {
      const invoiceId = String(payload.data?.id ?? "");
      const subscriptionId = String(payload.data?.attributes?.subscription_id ?? "");
      const user = await findUser(customUserId, subscriptionId);
      if (!user || !invoiceId) return NextResponse.json({ received: true, applied: "no-matching-user" });
      const granted = await grantCredits(user.id, PRO_CREDIT_USD, "SUBSCRIPTION", "Pro plan: monthly credit", `ls-invoice:${invoiceId}`);
      // The invoice can arrive before subscription_created; make sure the plan shows as Pro.
      // Best effort: the subscription_* events also keep the plan in sync.
      if (subscriptionId && user.lsSubscriptionId !== subscriptionId) {
        try {
          await prisma.user.update({ where: { id: user.id }, data: planFromSubscription(await getSubscription(subscriptionId)) });
        } catch (err) {
          console.error("[billing webhook] couldn't read subscription", subscriptionId, err);
        }
      }
      return NextResponse.json({ received: true, applied: granted ? "credit" : "already-credited" });
    }

    return NextResponse.json({ received: true, ignored: event });
  } catch (err) {
    console.error("[billing webhook]", event, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function findUser(customUserId: string | null, subscriptionId: string) {
  if (customUserId) {
    const user = await prisma.user.findUnique({ where: { id: customUserId } });
    if (user) return user;
  }
  return subscriptionId ? prisma.user.findFirst({ where: { lsSubscriptionId: subscriptionId } }) : null;
}
