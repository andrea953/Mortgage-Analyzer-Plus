import { db, pool, primeRateReadingsTable } from "@workspace/db";

const SERIES = "V80691311";
const VALET_URL = `https://www.bankofcanada.ca/valet/observations/${SERIES}/json?recent=1`;

interface ValetResponse {
  observations?: Array<{ d?: string } & Record<string, { v?: string } | string>>;
}

async function main(): Promise<void> {
  const res = await fetch(VALET_URL, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Bank of Canada Valet request failed: ${res.status} ${res.statusText}`);
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

  const [row] = await db
    .insert(primeRateReadingsTable)
    .values({ observedDate, primeRatePct })
    .onConflictDoUpdate({
      target: primeRateReadingsTable.observedDate,
      set: { primeRatePct, fetchedAt: new Date() },
    })
    .returning();

  console.log(
    `Recorded prime rate ${row.primeRatePct}% for ${row.observedDate} (source: ${row.source})`,
  );
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("check-prime-rate failed:", err);
    await pool.end().catch(() => {});
    process.exit(1);
  });
