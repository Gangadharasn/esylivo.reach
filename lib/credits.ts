import "server-only";

import { prisma } from "@/lib/prisma";
import { creditCostMicros, toMicros } from "@/lib/pricing";

type Kind = "SIGNUP_BONUS" | "SUBSCRIPTION" | "SEARCH" | "ADJUSTMENT";

/**
 * Adds credit. With a `reference`, the grant happens at most once (a retried payment
 * webhook can't pay out twice); returns false if it already happened.
 */
export async function grantCredits(userId: string, usd: number, kind: Kind, description: string, reference?: string) {
  if (reference && (await prisma.creditTransaction.findUnique({ where: { reference } }))) return false;
  const amountMicros = toMicros(usd);
  try {
    await prisma.$transaction([
      prisma.creditTransaction.create({ data: { userId, kind, amountMicros, description, reference } }),
      prisma.user.update({ where: { id: userId }, data: { creditMicros: { increment: amountMicros } } }),
    ]);
    return true;
  } catch (err) {
    // Two deliveries of the same webhook racing: the unique reference stops the second.
    if (reference && String(err).includes("Unique constraint")) return false;
    throw err;
  }
}

/** Charges a finished search: the user pays CREDIT_MARKUP × the Apify cost. */
export async function chargeSearch(userId: string, apifyUsd: number, description: string) {
  const amountMicros = creditCostMicros(apifyUsd);
  if (amountMicros <= 0) return 0;
  await prisma.$transaction([
    prisma.creditTransaction.create({
      data: { userId, kind: "SEARCH", amountMicros: -amountMicros, apifyCostMicros: toMicros(apifyUsd), description },
    }),
    prisma.user.update({ where: { id: userId }, data: { creditMicros: { decrement: amountMicros } } }),
  ]);
  return amountMicros;
}
