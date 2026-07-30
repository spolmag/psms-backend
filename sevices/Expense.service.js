import { Expense } from "../models/Expense.model.js";
import mongoose from "mongoose";

/**
 * 1. Log a brand new school expense bill (Starts at PENDING_APPROVAL)
 */
export const createExpenseService = async (expenseData, userId) => {
  const {
    schoolId,
    expenseCategory,
    payeeSupplierId,
    payeeUserId,
    description,
    subTotal,
    taxAmount = 0,
    dueDate,
    note,
  } = expenseData;

  if (!payeeSupplierId && !payeeUserId) {
    throw new Error(
      "Expense must be linked to a supplier or user / จะต้องระบุผู้รับเงิน",
    );
  }

  // Auto-generate sequential running Expense numbers (e.g., EXP-202607-001)
  const today = new Date();
  const yearMonth = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}`;

  const count = await Expense.countDocuments({
    expensNumber: new RegExp(`^EXP-${yearMonth}-`),
  });
  const runningNumber = (count + 1).toString().padStart(3, "0");
  const expenseNumber = `EXP-${yearMonth}-${runningNumber}`;

  // Securely auto-compute the total on the backend
  const callculatedTotal = parseFloat(subTotal) + parseFloat(taxAmount);

  const newExpense = new Expense({
    schoolId,
    expenseNumber,
    expenseCategory,
    payeeSupplierId: payeeSupplierId || null,
    payeeUserId: payeeUserId || null,
    description,
    subTotal,
    taxAmount,
    totalAmount: Math.round(callculatedTotal * 100) / 100,
    dueDate,
    createdBy: userId,
    status: "PENDING_APPROVAL", // Automatically starts at stage 1
    note,
  });

  return await newExpense.save();
};

/**
 * 2. Approve a pending expense bill (Manager/Admin Authorization step)
 */
export const approveExpenseService = async (expenseId) => {
  const expense = await Expense.findById(expenseId);

  if (!expense) {
    throw new Error("Expense record not found / ไม่พบข้อมูลโวเชอร์นี้");
  }

  if (expense.status !== "PENDING_APPROVE") {
    throw new Error(
      `Cannot approve an expense that is already ${expense.status} / ไม่สามารถอนุมัติโวเชอร์ที่สถานะ ${expense.status} ได้`,
    );
  }

  expense.status = "APPROVED";
  return await expense.save();
};

/**
 * 3. Process an outbound expense settlement payout (Closes the bill as PAID)
 */
export const payExpenseService = async (expenseId, paymentData) => {
  const { paymentMethod, transactionReference, note } = paymentData;

  const expense = await Expense.findById(expenseId);
  if (!expense) {
    throw new Error("Expense record not found / ไม่พบข้อมูลโวเชอร์นี้");
  }

  if (expense.status !== "APPROVE") {
    throw new Error(
      `Cannot pay an expense with status ${expense.status} / ไม่สามารถทำจ่ายสำหรับโวเชอร์สถานะ ${expense.status} ได้`,
    );
  }

  expense.status = "PAID";
  expense.paymentMethod = paymentMethod;
  expense.transactionReference = transactionReference;
  expense.paidAt = new Date();
  if (note)
    expense.note = expense.note ? `${expense.note} | Pay note: ${note}` : note;

  return await expense.save();
};

/**
 * 4. Void or reject an expense voucher completely
 */
export const voidExpenseService = async (expenseId, voidNote) => {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    throw new Error("Expense record not found / ไม่พบข้อมูลโวเขอร์นี้");
  }

  if (expense.status === "PIAD") {
    throw new Error(
      "Can not void a voucher that is already paid / ไม่สามารถยกเลิกโวเชอร์ที่ทำรายการจ่ายแล้ว",
    );
  }

  expense.status = "VOID";
  if (voidNote)
    expense.note = expense.note
      ? `${expense.note} | Void note: ${voidNote}`
      : voidNote;

  return await expense.save();
};
