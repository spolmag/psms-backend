import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Course must belong to school branch / วิชาต้องระบุชื่อโรงเรียน - สาขา",
      ],
    },
    courseCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseCategory",
      required: [
        true,
        "Course must belong to category / วิชา ต้องระบุหลักสูตรหลัก",
      ],
    },
    title: {
      th: { type: String, required: [true, "กรุณาระบุชื่อวิชา (ภาษาไทย)"] },
      en: {
        type: String,
        required: [true, "Please add a course title (English)"],
      },
    },
    description: {
      th: { type: String },
      en: { type: String },
    },
    basePrice: {
      type: Number,
      required: [true, "Please add a course base price / กรุณาระบุค่าเรียน"],
      min: [0, "Price cannot be lower than 0 / ค่าเรียนต้องไม่ต่ำกว่า 0"],
    },
    durationInMinutes: {
      type: Number,
      required: [
        true,
        "Please add lesson duration (minutes) / กรุณาระบุเวลาเรียนต่อคาบ (นาที)",
      ],
    },
    lessonType: {
      type: String,
      required: [true, "Please choose class type / กรุณาระบุประเภทชั้นเรียน"],
      enum: {
        values: ["private", "semi-private", "group"],
        message: "{VALUE} is not a valid lesson type",
        default: "private",
      },
    },
    maxCapacity: {
      type: Number,
      required: [
        true,
        "Please specify max students per class / กรุณาระบุจำนวนผู้เรียนสูงสุดต่อชั้น",
      ],
      min: [1, "จำนวนผู้เรียนอย่างน้อย 1 คน"],
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Course = mongoose.model("Course", courseSchema);
