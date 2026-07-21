import { Router } from "express";

import {
  createInvoice,
  updateInvoice,
} from "../controllers/invoiceController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post("/", protect, restrictTo("admin", "manager"), createInvoice);
router.put("/:id", protect, restrictTo("admin", "manager"), updateInvoice);
