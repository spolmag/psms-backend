import mongoose from "mongoose";

const courseCategorySchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Category must belong to school branch / กลุ่มวิชา ต้องระบุโรงเรียน-สาขา",
      ],
    },
    name: {
      th: { type: String, required: [true, "กรุณากรอกชื่อหมวดวิชา (ไทย)"] },
      en: {
        type: String,
        required: [true, "Please add a category name (English)"],
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

export const CourseCategory = mongoose.model(
  "CourseCategory",
  courseCategorySchema,
);
