import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, primeRateReadingsTable } from "@workspace/db";
import { GetPrimeRateResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/prime-rate", async (req, res): Promise<void> => {
  const [latest] = await db
    .select()
    .from(primeRateReadingsTable)
    .orderBy(desc(primeRateReadingsTable.observedDate))
    .limit(1);

  if (!latest) {
    req.log.info("No prime rate readings recorded yet");
    res.status(404).json({ error: "No prime rate reading available yet" });
    return;
  }

  res.json(
    GetPrimeRateResponse.parse({
      observedDate: latest.observedDate,
      primeRatePct: latest.primeRatePct,
      source: latest.source,
      lastCheckedAt: latest.fetchedAt.toISOString(),
    }),
  );
});

export default router;
