import mongoose from "mongoose";

const poItemsSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: [true, "Product ID is required / กรุณาระบุรหัสสินค้า"],
  },
  description: { type: String },
  orderedQuantity: {
    type: Number,
    required: [true, "Ordered quantity is required / กรุณาระบุจำนวนสั่งซื้อ"],
    min: [
      1,
      "Ordered quantity must be at least 1 / จำนวนสั่งซื้อขั้นต่ำ 1 ชิ้นขึ้นไป",
    ],
  },
  receivedQuantity: {
    type: Number,
    default: 0,
    min: [
      0,
      "Received quantity cannot be negative / จำนวนรับสินค้าต้องบันทึกตั้งแต่ 0 ขึ้นไป",
    ],
  },
  unitCostPrice: {
    type: Number,
    required: [
      true,
      "Unit cost price is required / กรุณาระบุราคาสั่งซื้อต่อหน่วยห",
    ],
  },
  isItemCancelled: {
    type: Boolean,
    default: false, // Allows admins to cancel an individual out-of-stock item line
  },
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Target branch is required / กรุณาระบุโรงเรียน-สาขาที่รับสินค้า",
      ],
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier is required / กรุณาระบุซัพพลายเออร์"],
    },
    status: {
      type: String,
      enum: {
        values: ["OPEN", "PARTIALLY_RECEIVED", "COMPLETED", "CANCELLED"],
      },
      message: "{VALUE} is not a valid PO status",
      default: "OPEN",
    },
    items: [poItemsSchema],
    createBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

purchaseOrderSchema.index({ schoolId: 1, supplierId: 1, status: 1 });

export const PurchaseOrder = mongoose.model(
  "PurchaseOrder",
  purchaseOrderSchema,
);
