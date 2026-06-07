import { Router, type IRouter } from "express";
import { ensureFreshPrimeRate } from "@workspace/db";
import { GetPrimeRateResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/prime-rate", async (req, res): Promise<void> => {
  const latest = await ensureFreshPrimeRate();

  if (!latest) {
    req.log.info("No prime rate reading available (upstream fetch unavailable)");
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
