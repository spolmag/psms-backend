import { Router } from "express";

import {
  recordPayment,
  getPayments,
  createStripePaymentIntent,
} from "../controllers/payment.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post("/", protect, restrictTo("admin", "manager"), recordPayment);
router.get("/", protect, restrictTo("admin", "mannager"), getPayments);
router.post("/create-intent", protect, createStripePaymentIntent);
