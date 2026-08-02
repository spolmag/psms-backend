import { Router } from "express";

import {
  createExpense,
  approveExpense,
  payExpense,
  voidExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
} from "../controllers/expense.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post("/", protect, restrictTo("admin", "manager"), createExpense);
router.get("/", protect, restrictTo("admin", "manager"), getExpenses);
router.get("/:id", protect, restrictTo("admin", "manager"), getExpenseById);
router.put("/:id", protect, restrictTo("admin", "manager"), updateExpense);
router.patch("/:id/approve", protect, restrictTo("manager"), approveExpense);
router.patch("/:id/pay", protect, restrictTo("admin", "manager"), payExpense);
router.patch("/:id/void", protect, restrictTo("admin", "manafer"), voidExpense);
