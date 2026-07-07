import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Class must belong to a school branch / คลาสเรียนจะต้องระบุสาขา",
      ],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [
        true,
        "Class must be link to a course / คลาสเรียน จะต้องระบุวิชา",
      ],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [
        true,
        "Class must have an assigned teacher / คลาสเรียนจะต้องระบุครูผู้สอน",
      ],
    },
    studentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [
          true,
          "Class must have at least one student / คลาสเรียนจะต้องมีจำนวนนักเรียนอย่างน้อย 1 คน",
        ],
      },
    ],
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
    roomName: {
      th: { type: String, required: [true, "กรุณาระบุห้องเรียน"] },
      en: { type: String, required: [true, "Please add a classroom name"] },
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

classSchema.index({ teacherId: 1, startTime: 1, endTime: 1 });
classSchema.index({ schoolId: 1, roomName: 1, startTime: 1, endTime: 1 });

export const Class = mongoose.model("Class", classSchema);
