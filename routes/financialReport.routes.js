import { Router } from "express";

import {
  getDashboardSummary,
  getProductSalesPerformance,
} from "../controllers/financialReport.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.get(
  "/dashboard-summary",
  protect,
  restrictTo("admin", "manager"),
  getDashboardSummary,
);
router.get(
  "/product-performance",
  protect,
  restrictTo("admin", "manager"),
  getProductSalesPerformance,
);
