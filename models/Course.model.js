import mongoose from "mongoose";

const levelSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: [
      true,
      "Please specify the level number / กรุณาระบุเลเวลของคอร์ส",
    ],
    min: [1, "Level number must be at least 1 / เลเวลต้องเริ่มจาก 1"],
  },
  levelName: {
    type: String,
    required: [true, "Please specify level name / กรุณาระบุชื่อเลเวล"],
  },
  price: {
    type: Number,
    required: [true, "Please add a price for this level / กรุณาระบุค่าเรียน"],
    min: [0, "Price cannot be lower than 0 / ค่าเรียน ต้องไม่ต่ำกว่า 0"],
  },
  baseTeacherPayout: {
    type: Number,
    required: [
      true,
      "Please add a teacher base payout / กรุณาระบุค่าตอบแทนพื้นฐานสำหรับครู",
    ],
    min: [0, "Payout can not be lower than 0 / ค่าตอบแทนครูต้องไม่ต่ำกว่า 0"],
  },
});

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
      th: {
        type: [String],
        default: [],
      },
      en: {
        type: [String],
        default: [],
      },
    },
    levels: {
      type: [levelSchema],
      required: [
        true,
        "Please add at least one level / กรูณาระบุเลเวลอย่างน้อย 1 เลเวล",
      ],
      validate: {
        validator: function (array) {
          return array && array.length > 0;
        },
      },
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

courseSchema.index({ schoolId: 1, "levels.level": 1 });

export const Course = mongoose.model("Course", courseSchema);
