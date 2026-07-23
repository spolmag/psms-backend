import { Router } from "express";

import {
  createTransferRequest,
  completeTransfer,
} from "../controllers/stockTransfer.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post(
  "/",
  protect,
  restrictTo("admin", "manager"),
  createTransferRequest,
);
router.patch(
  "/:id/receive",
  protect,
  restrictTo("admin", "manager"),
  completeTransfer,
);
