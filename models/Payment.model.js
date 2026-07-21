import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Payment must belong to branch / รายการชำระเงินจะต้องระบุสาขา",
      ],
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: [
        true,
        "Payment must link to an invoice / รายการชำระเงินจะต้องลิงค์กับเลขที่อินวอยซ์",
      ],
    },
    paymentMethod: {
      type: String,
      required: [true, "กรุณาระบุช่องทางการชำระ"],
    },
    enum: {
      values: ["CASH", "BANK_TRANSFER", "CREDIT_CARD"],
      message: "{VALUE} is not a valid payment method",
    },
    transactionReference: {
      type: String,
    },
    amountPaid: {
      type: Number,
      required: [true, "Please add paid amount / กรุณาระบุจำนวนเงินรับชำระ"],
      min: [
        0.01,
        "Amount paid must be greater than 0 / จำนวนเงินจะต้องมากกว่า 0",
      ],
    },
    status: {
      type: String,
      required: [
        true,
        "Please specify payment status / กรุณาระบุสถานะการชำระเงิน",
      ],
      enum: {
        values: ["PENDING", "SUCCESSFUL", "FAILED"],
        message: "{VALUE} is not a valid payment status",
      },
      default: "PENDING",
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
    },
  },
  { timestamps: true },
);

paymentSchema.index({ schoolId: 1, invoiceId: 1, status: 1 });
paymentSchema.index({ transactionReference: 1 });
paymentSchema.index({ paidAt: -1 });

export const Payment = mongoose.model("Payment", paymentSchema);
