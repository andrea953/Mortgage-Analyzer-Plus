import { Router, type IRouter } from "express";
import healthRouter from "./health";
import primeRateRouter from "./prime-rate";

const router: IRouter = Router();

router.use(healthRouter);
router.use(primeRateRouter);

export default router;
