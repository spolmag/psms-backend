import { Router } from "express";

import {
  createPurchaseOrder,
  receivePurchaseOrderItems,
  cancelPurchaseOrder,
} from "../controllers/purchaseOrder.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post("/", protect, restrictTo("admin", "manager"), createPurchaseOrder);
router.patch(
  "/:id/receive",
  protect,
  restrictTo("admin", "maneger"),
  receivePurchaseOrderItems,
);
router.patch(
  "/:id/cancel",
  protect,
  restrictTo("admin", "manager"),
  cancelPurchaseOrder,
);
