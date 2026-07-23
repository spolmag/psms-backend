import mongoose from "mongoose";

const stockTransferSchema = new mongoose.Schema(
  {
    productBarcode: {
      type: String,
      required: [true, "Product barcode is required / กรุณาระบุบาร์โค้ดสินค้า"],
    },
    fromSchoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Source branch is required / กรุณาระบุโรงเรียน-สาขาต้นทาง",
      ],
    },
    toSchoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Source branch is required / กรุณาระบุโรงเรียน-สาขาปลายทาง",
      ],
    },
    quantity: {
      type: Number,
      required: [
        true,
        "Please specify transfer quantity / กรุณาระบุจำนวนโอนสินค้า",
      ],
    },
    status: {
      type: String,
      enum: {
        values: ["PENDING", "IN_TRANSIT", "COMPLETED", "CANCELLED"],
        message: "{VALUE} is not a valid transfer status",
      },
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requester ID is required / กรุณาระบุผู้ขอโอนสินค้า"],
    },
    note: {
      type: String,
    },
  },
  { timestamps: true },
);

stockTransferSchema.index({ fromSchoolId: 1, toSchoolId: 1, status: 1 });

export const StockTransfer = mongoose.model(
  "StockTransfer",
  stockTransferSchema,
);
