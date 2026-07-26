import { Router } from "express";

import {
  createSupplier,
  getSuppliers,
  updateSupplier,
  getSupplierById,
} from "../controllers/supplier.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post("/", protect, restrictTo("admin", "manager"), createSupplier);
router.get("/", protect, restrictTo("admin", "manager"), getSuppliers);
router.get("/id", protect, restrictTo("admin", "manager", getSupplierById));
router.patch("/:id", protect, restrictTo("admin", "manager"), updateSupplier);
