// How credits work. Pure functions (no database), shared by server code, UI and tests.
//
//   Users spend credits; we pay Apify. Every search costs the user CREDIT_MARKUP times
//   what Apify charges us (2× by default), so half of every credit dollar is revenue:
//   a $10 Pro month funds at most $5 of Apify usage. Free sign-ups get FREE_CREDIT_USD.

export const MICROS = 1_000_000;

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const CREDIT_MARKUP = num(process.env.CREDIT_MARKUP, 2);
export const FREE_CREDIT_USD = num(process.env.FREE_CREDIT_USD, 2);
export const PRO_PRICE_USD = num(process.env.PRO_PRICE_USD, 10);
/** Credit added for each paid Pro month: what the user paid. */
export const PRO_CREDIT_USD = PRO_PRICE_USD;

/** Apify's price per result and per actor run, in USD (their highest, free-tier prices). */
export type SourcePricing = { perResult: number; perRun: number };

export const toMicros = (usd: number) => Math.round(usd * MICROS);

export function formatCredits(micros: number) {
  const usd = micros / MICROS;
  return `${usd < 0 ? "-" : ""}$${Math.abs(usd).toFixed(2)}`;
}

/** What the user is charged for an Apify bill of `apifyUsd`. */
export function creditCostMicros(apifyUsd: number) {
  return Math.ceil(apifyUsd * MICROS * CREDIT_MARKUP);
}

/** Apify cost of one site's run that returned `results` items. */
export function apifyCost(pricing: SourcePricing, results: number) {
  return pricing.perRun + pricing.perResult * results;
}

/** Most a search could cost the user: every site returns its maximum number of results. */
export function maxSearchCostMicros(pricings: SourcePricing[], keywords: number, perKeyword: number) {
  return creditCostMicros(pricings.reduce((sum, p) => sum + apifyCost(p, keywords * perKeyword), 0));
}

export const MIN_RESULTS_PER_KEYWORD = 3;

/**
 * The largest results-per-keyword (up to `wanted`) whose worst-case cost fits in the
 * balance, so a search never spends more than the user has. 0 = can't afford a search.
 */
export function affordablePerKeyword(balanceMicros: number, pricings: SourcePricing[], keywords: number, wanted: number) {
  if (!pricings.length || keywords < 1) return 0;
  for (let n = wanted; n >= MIN_RESULTS_PER_KEYWORD; n--) {
    if (maxSearchCostMicros(pricings, keywords, n) <= balanceMicros) return n;
  }
  return 0;
}
