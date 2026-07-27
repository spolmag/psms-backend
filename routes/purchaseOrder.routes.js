import { Router } from "express";

import {
  createPurchaseOrder,
  receivePurchaseOrderItems,
  cancelPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
} from "../controllers/purchaseOrder.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post("/", protect, restrictTo("admin", "manager"), createPurchaseOrder);
router.get("/", protect, restrictTo("admin", "manager"), getPurchaseOrders);
router.get(
  "/:id",
  protect,
  restrictTo("admin", "manager", getPurchaseOrderById),
);
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
