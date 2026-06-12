import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profilesRouter from "./profiles";
import productsRouter from "./products";
import paymentsRouter from "./payments";
import settingsRouter from "./settings";
import contentRouter from "./content";
import dbRouter from "./db";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profilesRouter);
router.use(productsRouter);
router.use(paymentsRouter);
router.use(settingsRouter);
router.use(contentRouter);
router.use(dbRouter);

export default router;
