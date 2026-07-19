import mongoose from "mongoose";
import { ProductCategory } from "./ProductCategory.model";

const productSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Product must belong to a school branch / สินค้า จะต้องระบุสาขาโรงเรียน",
      ],
    },
    ProductCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: [
        true,
        "Product must be linked to a category / สินค้า ต้องระบุหมวดหมู่สินค้า",
      ],
    },
    currentZoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: [
        true,
        "Please spefify the product's location zone / โปรดระบุโลเคชั่นวาง/เก็บสินค้า",
      ],
    },
    productName: {
      th: { type: String, required: [true, โปรดระบุชื่อสินค้า] },
      en: { type: String, required: [true, "Please add a product name"] },
    },
    purpose: {
      type: String,
      required: [
        true,
        "Please specify product purpose / กรุณาระบุวัตถุประสงค์การใช้สินค้า",
      ],
      enum: {
        values: ["sales", "equipment"],
        message: "{VALUE} is not a valid product purpose",
      },
      default: "sales",
    },
    brand: { type: String },
    modelName: { type: String },
    barcode: { type: String },
    serialNumber: { type: String },
    costPrice: {
      type: Number,
      required: [true, "Please add a cost price / กรุณาระบุราคาทุนสินค้า"],
      min: [0, "Cost can not be lower than 0"],
    },
    retailPrice: {
      type: Number,
      required: [true, "Please add product retail selling price"],
      min: [0, "Selling price can not be lower than 0"],
    },
    isVatEnabled: {
      type: Boolean,
      default: true,
    },
    stockCount: {
      type: Number,
      required: [
        true,
        "Please specify stock quantity / กรุณาระบุจำนวนสต็อกสินค้า",
      ],
      min: [0, "Stock can not below 0"],
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    note: {
      type: String,
    },
  },
  { timestamps: true },
);

// High-utility updated compound database indexes to guarantee rapid, non-blocking online shop sorting
productSchema.index({
  schoolId: 1,
  ProductCategoryId: 1,
  purpose: 1,
  isActive: 1,
});
productSchema.index({ barcode: 1, serialNumber: 1 });

export const Product = mongoose.model("Product", productSchema);
