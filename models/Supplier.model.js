import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    supplierName: {
      th: { type: String, required: [true, "กรุณาระบุชื่อซัพพลายเออร์"] },
      en: { type: String, required: [true, "Please add a supplier name"] },
    },
    taxId: {
      type: String,
      required: [true, "Tax ID is required / กรุณาระบุเลขประจำตัวผู้เสียภาษี"],
    },
    contactPerson: { type: String },
    email: { type: String },
    phoneNumber: { type: String },
    address: {
      th: { type: String },
      ens: { type: String },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

supplierSchema.index({ "supplierName.en": 1, taxId: 1 });

export const Supplier = mongoose.model("Supplier", supplierSchema);
