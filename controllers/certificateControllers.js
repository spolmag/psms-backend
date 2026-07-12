import { Certificate } from "../models/Certificate.model.js";
import { User } from "../models/User.model.js";

// @desc    Log a new milestone certificate for a student or teacher
// @route   POST /api/certificates
// @access  Private (Admin & Manager only)
export const createCertificate = async (req, res, next) => {
  try {
    const {
      userId,
      certificationBody,
      customBodyName,
      passedGrade,
      recordDate,
      note,
    } = req.body || {};
    const schoolId = req.user.activeSchool;

    //1. Core Field Validation
    if (!userId || !certificationBody || !passedGrade) {
      res.status(400);
      throw new Error(
        "Missing required certificate fields / ต้องระบุข้อมูลที่จำเป็นให้ครบถ้วน",
      );
    }

    //2. Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404);
      throw new Error("User account not found / ไม่พบรหัสผู้รับเซอร์ติฟิเคท");
    }

    //3. Save new certification to database
    const certificate = await Certificate.create({
      userId,
      userRole: targetUser.role,
      schoolId,
      certificationBody,
      customBodyName:
        certificationBody === "Other" ? customBodyName : undefined,
      passedGrade,
      recordDate: recordDate ? new Date(recordDate) : new Date(), //Fallback to current date if blank
      note,
    });

    return res.status(201).json({
      success: true,
      message:
        "Certificate logged successfully / บันทึกข้อมูลเซอร์ติฟิเคทเรียบร้อยแล้ว",
      data: certificate,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get complete certificate history log for a specific user (Leverages our compound index)
// @route   GET /api/certificates/user/:userId
// @access  Private (Admin, Manager, or the account owner themselves)
export const getUserCertificates = async (req, res, next) => {
  try {
    const { userId } = req.params;
    // Security Check: Block other students from inspecting someone else's files
    if (
      req.user.role !== "admin" &&
      req.user.role !== "manager" &&
      req.user._id.toString() !== userId
    ) {
      res.status(403);
      throw new Error("Permission denied / คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้");
    }

    // Fetch matching data records utilizing our optimized compound indexing card
    const certificates = await Certificate.find({ userId })
      .populate("userId", "name email role")
      .populate("schoolId", "schoolName")
      .sort({ recordDate: -1 }); //Newest at the top

    return res
      .status(200)
      .json({ success: true, count: certificates.length, data: certificates });
  } catch (error) {
    return next(error);
  }
};
