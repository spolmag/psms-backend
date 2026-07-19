import mongoose from "mongoose";

const productCategorySchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Category must belong to a school branch / หมวดสินค้าต้องระบุสาขาโรงเรียน",
      ],
    },
    name: {
      th: { type: String, required: [true, "กรุณาระบุชื่อหมวดสินค้า"] },
      en: {
        type: String,
        required: [true, "Please add a product category name"],
      },
    },
    description: {
      th: { type: String },
      en: { type: String },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Ensures category names are unique per school branch to prevent duplicate navigation tags on your website
productCategorySchema.index({ schoolId: 1, "name.en": 1 }, { unique: true });
productCategorySchema.index({ schoolId: 1, "name.th": 1 }, { unique: true });

export const ProductCategory = mongoose.model(
  "ProductCategory",
  productCategorySchema,
);
