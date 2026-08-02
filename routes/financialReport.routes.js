import { Router } from "express";

import {
  getDashboardSummary,
  getProductSalesPerformance,
  getOverdueInvoicesReport,
  getThaiInputTaxReport,
  getThaiOutputTaxReport,
  getThaiWithholdingTaxCertificate,
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
router.get(
  "/thai-input-tax",
  protect,
  restrictTo("admin", "manager"),
  getThaiInputTaxReport,
);
router.get(
  "/thai-output-tax",
  protect,
  restrictTo("admin", "manager"),
  getThaiOutputTaxReport,
);
router.get(
  "/withholding-tax-certificate/:expenseId",
  protect,
  restrictTo("admin", "manager"),
  getThaiWithholdingTaxCertificate,
);
