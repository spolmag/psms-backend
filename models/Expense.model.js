import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Expense must belong to a branch / รายการจ่าย จะต้องระบุโรงเรียน-สาขา",
      ],
    },
    expenseNumber: {
      type: String,
      required: true,
      unique: true,
    },
    expenseCategory: {
      type: String,
      required: [
        true,
        "Please specify expense category / กรุณาระบุประเภทรายจ่าย",
      ],
      enum: {
        values: [
          "INVENTORY_PURCHASE", // For purchasing retail stocks (guitars, books, accessories)
          "SALARY", // For permanent administrative staff payroll
          "TEACHER_FEE", // For hourly/fractional teacher class sessions
          "REPAIR_MAINTENANCE", // Fixing school equipment, tuning pianos
          "UTILITIES", // Electricity, water, internet bills
          "RENT", // Building rental overheads
          "MARKETING", // Ads, flyers, promotion campaigns
          "SUPPLIER_OTHER", // Standard office supplies, paper, small expenses
        ],
      },
      message: "{VALUE} is not a valid expense category",
    },
    // Flex-Reference: Reference either a corporate Supplier or an internal User/Teacher
    payeeSupplierId: {
      type: mongoose.schoolId.Types.ObjectId,
      ref: "Supplier",
    },
    payeeUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    description: {
      th: {
        type: String,
        required: [true, "กรุณาระบุรายละเอียด-คำอธิยายรายจ่าย"],
      },
      en: {
        type: String,
        required: [true, "Please add an expense description"],
      },
    },
    subtotal: {
      type: Number,
      required: [true, "Please add subtotal amount / กรุณาระบุยอดก่อนภาษี"],
      min: [0, "Amount cannot be negative / ยอดจ่ายจะต้องมากกว่า 0"],
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true, // Auto-computed in service layer: subTotal + taxAmount
    },
    dueDate: {
      type: Date,
      required: [true, "Please specify due date / กรุณาระบุวันกำหนดชำระ"],
    },
    status: {
      type: String,
      enum: {
        values: ["PENDIND_APPROVAL", "APPROVED", "PAID", "VOID"],
        message: "{VALUE} is not a valid expense status",
      },
      default: "PENDIND_APPROVAL",
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "BANK_TRANSFER", "CHEQUE", "CREDIT_CARD"],
    },
    transactionReference: { type: String },
    paidAt: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: { type: string },
  },
  { timestamps: true },
);

expenseSchema.index({ schoolId: 1, expenseCategory: 1, status: 1 });
expenseSchema.index({ expenseNumber: 1 }, { unique: true });

export const Expense = mongoose.model("Expense", expenseSchema);
