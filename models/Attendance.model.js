import mongoose from "mongoose";

const studentAttendanceSnapshotSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Must specify student ID / กรุณาระบุรหัสนักเรียน"],
  },
  status: {
    type: String,
    required: [
      true,
      "Please specify attendance status / กรุณาระบุสถานะเข้าเรียน",
    ],
    enum: {
      values: ["present", "late", "absent"], //เข้าเรียน, สาย, ขาดเรียน
      message: "{VALUE} is not a valid attendance status",
    },
    default: "present",
  },
  reason: {
    type: String,
  },
});

const attendanceSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Attendance must belong to school branch / ต้องระบุสาขาโรงเรียน",
      ],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Attendance must link to a class / ต้องระบุคลาสเรียน"],
      unique: true, // 💡 Critical constraint: Prevents duplicate roll-calls for the same class hour!
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Must specify the teacher / ต้องระบุครูประจำคลาส"],
    },
    records: {
      type: [studentAttendanceSnapshotSchema],
      validate: {
        validator: function (array) {
          return array && array.length > 0;
        },
        message:
          "Attendance sheet must contain at least one student / รายการเช็คชื่อต้องมีนักเรียนอย่างน้อย 1 คน",
      },
    },
    note: {
      type: String,
    },
  },
  { timestamps: true },
);

// High-speed indices for rapid dashboard calendar updates later
attendanceSchema.index({ schoolId: 1, createdAt: -1 });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
