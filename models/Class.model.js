import mongoose from "mongoose";

//Take snapshot of each student course/level
const classStudentSnapshotSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [
      true,
      "Must specify student reference ID / กรุณาระบุรหัสนักเรียน",
    ],
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: [true, "Must specify course reference ID / กรุณารหัสวิชาเรียน"],
  },
  level: {
    type: Number,
    required: [
      true,
      "Must specify the specific course level / กรุณาระบุเลเวลของวิชา",
    ],
    min: [
      1,
      "Level must be at least 1 / เลเวลต้องเริ่มระบุที่เลเวล 1 เป็นอย่างน้อย",
    ],
  },
  baseTeacherPayout: {
    type: Number,
    required: [
      true,
      "Must get snapshot of base teacher payout / ต้องบันทึกค่าตอบแทนครู",
    ],
    min: [
      0,
      "Payout snapshot cannot be lower than 0 / ค่าตอบแทนครูต้องไม่ต่ำกว่า 0",
    ],
  },
  priceSnapshot: {
    type: Number,
    required: true,
    min: 0,
  },
});

const classSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Class must belong to a school branch / จะต้องระบุรหัสสาขาโรงเรียน",
      ],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [
        true,
        "Class must have an assigned teacher / ต้องระบุรหัสครูผู้สอน",
      ],
    },
    enrolledStudents: {
      type: [classStudentSnapshotSchema],
      validate: {
        validator: function (array) {
          return array && array.length > 0;
        },
        message:
          "Class must have at least one student / คลาสเรียนจะต้องมีนักเรียนอย่างน้อย 1 คน",
      },
    },
    startTime: {
      type: Date,
      required: [
        true,
        "Please add a class start time / กรุณาระบุเวลาเริ่มคลาสเรียน",
      ],
    },
    endTime: {
      type: Date,
      required: [
        true,
        "Please add a class end time / กรุณาระบุเวลาหมดคลาสเรียน",
      ],
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: [
        true,
        "Class must be assiged to zone location / คลาสเรียนจะต้องระบุโซนห้องเรียน",
      ],
    },
    status: {
      type: String,
      enum: {
        values: ["scheduled", "completed", "cancelled"],
        message: "{VALUE} is not a valid class status",
      },
      default: "scheduled",
    },
    note: {
      type: String,
    },
  },
  { timestamps: true },
);

// High-utility compound database indexes to prevent room and teacher double-bookings across branches
classSchema.index({ teacherId: 1, startTime: 1, endTime: 1 });
classSchema.index({ zoneId: 1, startTime: 1, endTime: 1 });
// Optimized for querying historical payroll tiers by student levels dynamically later
classSchema.index({ schoolId: 1, "enrolledStudents.level": 1, status: 1 });

export const Class = mongoose.model("Class", classSchema);
