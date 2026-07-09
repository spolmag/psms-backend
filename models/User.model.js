import mongoose, { mongo } from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    schools: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: [true, "User must belong to at least one school branch"],
      },
    ],
    activeSchool: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "User must have active school"],
    },
    name: {
      th: {
        type: String,
        required: [true, "กรุณากรอกชื่อ-นามสกุล (ภาษาไทย)"],
      },
      en: {
        type: String,
        required: [true, "Please add first and last name (English)"],
      },
    },
    email: {
      type: String,
      required: [true, "Please add an email address / กรุณากรอกอีเมล"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email address / กรุณากรอกอีเมลที่ถูกต้อง",
      ],
    },
    password: {
      type: String,
      required: [true, "Please add a password / กรุณากรอกรหัสผ่าน"],
      minlength: [
        6,
        "Password must be at least 6 characters / รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
      ],
      select: true,
    },
    role: {
      type: String,
      required: [
        true,
        "Please specify user role / กรุณาระบุสิทธิ์การใช้งานระบบ",
      ],
      enum: {
        values: ["admin", "teacher", "student", "parent", "user", "manager"],
        message: "{VALUE} is not a valid role",
      },
      default: "student",
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    extraData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.matchPassword = async function (enterPassword) {
  return await bcrypt.compare(enterPassword, this.password);
};

export const User = mongoose.model("User", userSchema);
