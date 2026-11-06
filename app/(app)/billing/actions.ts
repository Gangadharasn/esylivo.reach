"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { grantCredits } from "@/lib/credits";
import { createCheckout, getSubscription, paymentsBypassed, paymentsConfigured } from "@/lib/lemonsqueezy";
import { PRO_CREDIT_USD } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/utils";

export async function upgradeAction() {
  const user = await requireUser();

  if (paymentsBypassed()) {
    // Test mode: one month of Pro and its credit, no payment.
    const month = new Date().toISOString().slice(0, 7);
    await grantCredits(user.id, PRO_CREDIT_USD, "SUBSCRIPTION", "Pro plan: monthly credit (test mode)", `test:${user.id}:${month}`);
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: "PRO", planStatus: "active", planRenewsAt: new Date(Date.now() + 30 * 86_400_000) },
    });
    revalidatePath("/", "layout");
    redirect("/billing?upgraded=1");
  }

  if (!paymentsConfigured()) return { error: "Payments aren't set up yet. Please try again later." };
  let url: string;
  try {
    url = await createCheckout({ userId: user.id, email: user.email, name: user.name, redirectUrl: appUrl("/billing?upgraded=1") });
  } catch {
    return { error: "Couldn't open the payment page. Please try again." };
  }
  redirect(url);
}

/** Lemon Squeezy's customer portal: change card, download invoices, cancel. */
export async function manageSubscriptionAction() {
  const user = await requireUser();
  if (!user.lsSubscriptionId) return { error: "No subscription to manage." };
  let url: string | null | undefined;
  try {
    url = (await getSubscription(user.lsSubscriptionId)).attributes.urls?.customer_portal;
  } catch {
    return { error: "Couldn't open subscription settings. Please try again." };
  }
  if (!url) return { error: "Couldn't open subscription settings. Please try again." };
  redirect(url);
}
