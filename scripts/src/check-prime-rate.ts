import { fetchPrimeRateFromBoC, upsertPrimeRate, pool } from "@workspace/db";

async function main(): Promise<void> {
  const row = await upsertPrimeRate(await fetchPrimeRateFromBoC());
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
