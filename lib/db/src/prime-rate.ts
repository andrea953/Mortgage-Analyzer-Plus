import { desc } from "drizzle-orm";
import { db } from "./index";
import {
  primeRateReadingsTable,
  type PrimeRateReading,
} from "./schema/prime-rate";

const SERIES = "V80691311";
const VALET_URL = `https://www.bankofcanada.ca/valet/observations/${SERIES}/json?recent=1`;

// Consider a stored reading fresh for this long before attempting a refresh.
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
// When we already have a (stale) reading to fall back on, don't re-hit the Bank
// of Canada more often than this. Module-level throttle, per server instance.
const MIN_RETRY_MS = 30 * 60 * 1000;
// When we have NO reading at all (cold start), retry far more aggressively so a
// transient upstream failure doesn't leave the endpoint 404ing for 30 minutes.
const BOOTSTRAP_RETRY_MS = 30 * 1000;
// Upper bound on how long a single upstream fetch may block the caller.
const FETCH_TIMEOUT_MS = 5000;

let lastFetchAttempt = 0;

interface ValetResponse {
  observations?: Array<{ d?: string } & Record<string, { v?: string } | string>>;
}

export interface PrimeRateObservation {
  observedDate: string;
  primeRatePct: number;
}

/** Fetch the latest Canadian prime rate from the Bank of Canada Valet API. */
export async function fetchPrimeRateFromBoC(): Promise<PrimeRateObservation> {
  const res = await fetch(VALET_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(
      `Bank of Canada Valet request failed: ${res.status} ${res.statusText}`,
    );
  }

  const json = (await res.json()) as ValetResponse;
  const obs = json.observations?.[0];
  if (!obs) {
    throw new Error("No observations returned from Bank of Canada Valet");
  }

  const observedDate = obs.d;
  const seriesValue = obs[SERIES];
  const rawRate =
    seriesValue && typeof seriesValue === "object" ? seriesValue.v : undefined;
  const primeRatePct = Number(rawRate);

  if (!observedDate || Number.isNaN(primeRatePct)) {
    throw new Error(`Unexpected observation shape: ${JSON.stringify(obs)}`);
  }

  return { observedDate, primeRatePct };
}

/** Insert (or update) a single prime-rate reading keyed by observed date. */
export async function upsertPrimeRate(
  reading: PrimeRateObservation,
): Promise<PrimeRateReading> {
  const [row] = await db
    .insert(primeRateReadingsTable)
    .values(reading)
    .onConflictDoUpdate({
      target: primeRateReadingsTable.observedDate,
      set: { primeRatePct: reading.primeRatePct, fetchedAt: new Date() },
    })
    .returning();
  return row;
}

/** Return the most recently observed prime-rate reading, or null if none. */
export async function getLatestPrimeRate(): Promise<PrimeRateReading | null> {
  const [latest] = await db
    .select()
    .from(primeRateReadingsTable)
    .orderBy(desc(primeRateReadingsTable.observedDate))
    .limit(1);
  return latest ?? null;
}

/**
 * Return the latest prime-rate reading, refreshing from the Bank of Canada
 * first when the stored value is missing or stale. Resilient by design: if the
 * upstream fetch fails, any existing (stale) reading is returned instead of
 * throwing, so the calculator keeps working as progressive enhancement.
 */
export async function ensureFreshPrimeRate(): Promise<PrimeRateReading | null> {
  const latest = await getLatestPrimeRate();
  const now = Date.now();
  const isStale =
    !latest || now - latest.fetchedAt.getTime() > MAX_AGE_MS;

  if (!isStale) return latest;

  // Back off aggressively on cold start (no data to serve), gently once we have
  // a stale fallback, so a transient upstream blip never long-locks the endpoint.
  const retryWindow = latest ? MIN_RETRY_MS : BOOTSTRAP_RETRY_MS;
  if (now - lastFetchAttempt < retryWindow) return latest;

  lastFetchAttempt = now;
  try {
    return await upsertPrimeRate(await fetchPrimeRateFromBoC());
  } catch {
    return latest;
  }
}
