import mongoose from "mongoose";

const schoolSchema = new mongoose.Schema(
  {
    schoolName: {
      th: { type: String, required: [true, "กรุณากรอกชื่อโรงเรียน (ไทย)"] },
      en: {
        type: String,
        required: [true, "Please add a school name (English)"],
      },
    },
    schoolType: {
      type: String,
      required: [true, "School type, ประเภทโรงเรียน"],
      enum: {
        values: ["music", "language", "computer", "generic"],
        message: "{VALUE} is not a valid School type!",
      },
      default: "music",
    },
    email: {
      type: String,
      required: [true, "School contact email/อีเมล์ติดต่อโรงเรียน"],
    },
    phoneNumber: {
      type: String,
    },
    address: {
      th: { type: String },
      en: { type: String },
    },
    setting: {
      currency: { type: String, default: "THB" },
      timeZone: { type: String, default: "Asia/Bangkok" },
      isVatEnabled: {
        type: Boolean,
        default: false,
      },
      vatRate: {
        type: Number,
        default: 7,
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const School = mongoose.model("School", schoolSchema);
