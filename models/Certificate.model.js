import mongoose, { mongo } from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [
        true,
        "Certificate must be link to a user / ต้องระบุชื่อนักเรียน หรือ ครู",
      ],
    },
    //Role at entry level - for speed up filtering Lookups
    userRole: {
      type: String,
      required: true,
      enum: ["teacher", "student"],
    },
    //School that record the certificate *Not issue certificate
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Certificate must belong to school branch / ต้องระบุโทษเรียนที่บันทึกเซอร์ติฟิเคท",
      ],
    },
    certificationBody: {
      type: String,
      required: [
        true,
        "Please specify the certification body / ระบุสถาบันที่ออกเซอร์ติฟิเคท",
      ],
      enum: {
        values: ["Yamaha", "Trinity", "ABRSM", "LCM", "Other"],
        message: "{VALUE} is not support examination body",
      },
    },
    //Input if certificationBody select to "Other"
    customBodyName: {
      type: String,
      required: [
        function () {
          return this.certificationBody === "Other";
        },
      ],
    },
    passedGrade: {
      type: String,
      required: [
        true,
        "Please specify the passed grade, level or book / ต้องระบุเกรดที่สอบผ่าน",
      ],
    },
    recordDate: {
      type: Date,
      required: [
        true,
        "Please specify the record date / ต้องระบุวันที่บันทึกข้อมูล",
      ],
      default: Date.now,
    },
    note: {
      type: String,
    },
  },
  { timestamps: true },
);

// Index for help "Find all certificates for this specific userId, sorted by the newest recordDate first."
// Prevent memory crash
certificateSchema.index({ userId: 1, certificationBody: 1, recordDate: -1 });

export const Certificate = mongoose.model("Certificate", certificateSchema);
