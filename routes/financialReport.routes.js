import { Router } from "express";

import {
  getDashboardSummary,
  getProductSalesPerformance,
  getOverdueInvoicesReport,
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
router.get(
  "/overdue-invoices",
  protect,
  restrictTo("admin", "manager"),
  getOverdueInvoicesReport,
);
