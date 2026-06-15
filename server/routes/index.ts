import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profilesRouter from "./profiles";
import productsRouter from "./products";
import paymentsRouter from "./payments";
import settingsRouter from "./settings";
import contentRouter from "./content";
import adminRouter from "./admin";
import dbRouter from "./db";
import nowpaymentsRouter from "./nowpayments";
import uploadRouter from "./upload";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profilesRouter);
router.use(productsRouter);
router.use(paymentsRouter);
router.use(settingsRouter);
router.use(contentRouter);
router.use(adminRouter);
router.use(dbRouter);
router.use(nowpaymentsRouter);
router.use(uploadRouter);
router.use(aiRouter);

export default router;
