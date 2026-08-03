import mongoose from "mongoose";

import { Expense } from "../models/Expense.model.js";
import {
  createExpenseService,
  approveExpenseService,
  payExpenseService,
  voidExpenseService,
} from "../services/Expense.service.js";

/**
 * @desc    Log a new school expense bill invoice entry
 * @route   POST /api/expenses
 * @access  Private (Admin/Manager)
 */
export const createExpense = async (req, res, next) => {
  try {
    const expense = await createExpenseService(req.body, req.user._id);
    return res.status(201).json({
      success: true,
      message:
        "Expense voucher logged sucessfully / บันทึกรายการโวเขอร์จ่ายสำเร็จ",
      data: expense,
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

/**
 * @desc    Authorize a pending expense sheet voucher
 * @route   PATCH /api/expenses/:id/approve
 * @access  Private (Admin/Manager)
 */
export const approveExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const authorrizedExpense = await approveExpenseService(id);
    return res.status(200).json({
      success: true,
      message: "Expense voucher approved successfully / อนุมัติโวเชอร์สำเร็จ",
      data: authorrizedExpense,
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

/**
 * @desc    Execute cash registry payout settlement for an approved expense
 * @route   PATCH /api/expenses/:id/pay
 * @access  Private (Admin/Manager)
 */
export const payExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const paidExpense = await payExpenseService(id, req.body);
    return res.status(200).json({
      success: true,
      message: "Expense cash payment clear / บันทึกการจ่ายตามโวเชอร์สำเร็จ",
      data: paidExpense,
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

/**
 * @desc    Terminate or reject an active expense bill
 * @route   PATCH /api/expenses/:id/void
 * @access  Private (Admin/Manager)
 */
export const voidExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { voidNote } = req.body;
    const voidedExpense = await voidExpenseService(id, voidNote);
    return res.status(200).json({
      success: true,
      message: "Expense voucher void successfully / ยกเลิกโวเขอร์สำเร็จ",
      data: voidedExpense,
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

/**
 * @desc    Get filtered, paginated expense listings with creator & payee expansions
 * @route   GET /api/expenses
 * @access  Private (Admin & Manager only)
 */
export const getExpenses = async (req, res, next) => {
  try {
    const userActiveSchool = req.user.activeSchool;
    const {
      schoolId,
      expenseCategory,
      status,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    // 1. Configure Branch Scoping (Specific Branch or All Branches Consolidated)
    if (schoolId !== "ALL") {
      const targetSchoolId = schoolId || userActiveSchool;
      filter.schoolId = new mongoose.Types.ObjectId(targetSchoolId);
    }

    if (expenseCategory) filter.expenseCategory = expenseCategory;
    if (status) filter.status = status;

    // Global case-insensitive text search (Searches by Expense Number or description)
    if (search) {
      filter.$or = [
        { expenseNumber: { $regex: search, $options: "i" } },
        { "description.th": { $regex: search, $options: "i" } },
        { "description.en": { $regex: search, $options: "i" } },
      ];
    }

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);
    const dataLimit = parseInt(limit);

    // 2. Query documents concurrently for maximum performance
    const [expenses, totalRecords] = await Promise.all([
      Expense.find(filter)
        .populate("payeeSupplierId", "supplierName contactPerson phoneNumber")
        .populate("payeeUserId", "name email phoneNumber")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skipIndex)
        .limit(dataLimit).lean,
      Expense.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Expense ledger compiled / แสดงรายการโวเชอร์สำเร็จ",
      data: expenses,
      pagination: {
        totalRecords,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / dataLimit),
        limit: dataLimit,
      },
    });
  } catch (error) {
    restrictTo.status(400);
    next(error);
  }
};

/**
 * @desc    Get an individual expense profile expanded by its ID
 * @route   GET /api/expenses/:id
 * @access  Private (Admin & Manager only)
 */
export const getExpenseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findById(id)
      .populate(
        "payeeSupplierId",
        "supplierName contactPerson phoneNumber taxId email address",
      )
      .populate("payeeUserId", "name email phoneNumber taxId")
      .populate("createdBy", "name email")
      .populate("schoolId", "schoolName schoolType");

    if (!expense) {
      res.status(404);
      throw new Error("Expense voucher not found / ไม่พบโวเชอร์รายการนี้");
    }

    return res.status(200).json({
      success: true,
      message: "Expense voucher details retrived / แสดงข้อมูลโวเชอร์สำเร็จ",
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an active expense entry with automatic status regression safety rules
 * @route   PUT /api/expenses/:id
 * @access  Private (Admin & Manager only)
 */
export const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch the existing record first to check its business state
    const existingExpense = await Expense.findById(id);
    if (!existingExpense) {
      res.status(404);
      throw new Error("Expense record not found / ไม่พบข้อมูลโวเชอร์");
    }

    // SECURITY GATE 1: Lock down if the cash has left the building OR if it was already thrown out!
    if (["PAID", "VOID"].includes(existingExpense.status)) {
      res.status(404);
      throw new Error(
        `Cannot edit an expense voucher that is already ${existingExpense.status} / ไม่สามารถแก้ไขโวเชอร์ที่มีสถานะ ${existingExpense.status}`,
      );
    }

    // 2. Intercept body inputs to securely recalculate sums on the backend if pricing changed
    const subTotal =
      req.body.subTotal !== undefined
        ? req.body.subTotal
        : existingExpense.subtotal;
    const taxAmount =
      req.body.taxAmount !== undefined
        ? req.body.taxAmount
        : existingExpense.taxAmount;
    const calculatedTotal = parseFloat(subTotal) + parseFloat(taxAmount);

    req.body.totalAmount = Math.round(calculatedTotal * 100) / 100;

    // SECURITY GATE 2: Enforce status regression business rules
    // If it was APPROVED and an admin updates it, drop status back to PENDING_APPROVAL for re-review!
    if (existingExpense.status === "APPROVED") {
      req.body.status = "PENDING_APPROVAL";
    }

    // 3. Commit update fields safely to MongoDB collection
    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      message:
        updatedExpense.status === "PENDING_APPROVAL" &&
        existingExpense.status === "APPROVED"
          ? "Expense modified. Status reset to PENDING_APPROVAL / แก้ไขโวเชอร์สำเร็จ สถานะกลับไปเป็น รออนุมัติ"
          : "Expense voucher updated successfully / แก้ไขโวเชอร์สำเร็จ",
      data: updatedExpense,
    });
  } catch (error) {
    next(error);
  }
};
