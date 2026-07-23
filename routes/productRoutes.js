import { Router } from "express";

import {
  createProduct,
  getProducts,
  getProductStockSummary,
  getCrossBranchStock,
} from "../controllers/productControllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

// Route: /api/products
router.post("/", protect, restrictTo("admin", "manager"), createProduct);
router.get("/", protect, getProducts);
router.get(
  "/stock-summary/:brand/:modelName",
  protect,
  restrictTo("admin", "manager"),
  getProductStockSummary,
);
router.get(
  "/cross-branch-check",
  protect,
  restrictTo("admin", "manager"),
  getCrossBranchStock,
);
