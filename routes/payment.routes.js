import { Router } from "express";

import {
  recordPayment,
  getPayments,
} from "../controllers/payment.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post("/", protect, restrictTo("admin", "manager"), recordPayment);
router.get("/", protect, restrictTo("admin", "mannager"), getPayments);
