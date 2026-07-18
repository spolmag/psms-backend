import mongoose from "mongoose";

const zoneSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Zone must belong to school branch / โซนต้องระบุสาขาโรงเรียน",
      ],
    },
    zoneName: {
      th: { type: String, required: [true, "กรุณาระบุชื่อโซน/ห้องเรียน"] },
      en: { type: String, required: [true, "Please add a zone/room name"] },
    },
    zoneType: {
      type: String,
      required: [true, "Please specify zone type / กรุณาระบุประเภทโซน"],
      enum: {
        values: [
          "classroom",
          "showroom",
          "front_desk",
          "teachers_room",
          "manager_office",
          "stock_room",
          "canteen",
          "other",
        ],
      },
      message: "{VALUE} is not a valid zone type",
      default: "classroom",
    },
    maxStudentCapacity: {
      type: Number,
      required: [
        function () {
          return this.zoneType === "classroom";
        },
        "Please specify maximum capacity for classroom / กรุณาระบุจำนวนนักเรียนสูงสุดของห้องเรียน",
      ],
      min: [
        1,
        "Capacity must be at least 1 / จำนวนผู้เรียนต่อห้องต้องระบุขั้นต่ำตั้งแต่ 1 คนเป็นต้นไป",
      ],
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

zoneSchema.index({ schoolId: 1, "zoneName.en": 1 }, { unique: true });
zoneSchema.index({ schoolId: 1, "zoneName.th": 1 }, { unique: true });

export const Zone = mongoose.model("Zone", zoneSchema);
