import { Router } from "express";

import { getDashboardSummary } from "../controllers/financialReport.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.get(
  "/dashboard-summary",
  protect,
  restrictTo("admin", "manager"),
  getDashboardSummary,
);
