import { Router } from "express";

import {
  createProductCategory,
  getProductCategories,
} from "../controllers/productCategory.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post(
  "/",
  protect,
  restrictTo("admin", "manager"),
  createProductCategory,
);
router.get("/", protect, getProductCategories);
