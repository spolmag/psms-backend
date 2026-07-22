import { Router } from "express";

import {
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoices,
} from "../controllers/invoiceController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post("/", protect, restrictTo("admin", "manager"), createInvoice);
router.get(
  "/",
  protect,
  restrictTo("admin", "teacher", "manager"),
  getInvoices,
);
router.put("/:id", protect, restrictTo("admin", "manager"), updateInvoice);
router.delete("/:id", protect, restrictTo("admin", "manager"), deleteInvoice);
