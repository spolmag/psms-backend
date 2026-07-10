import { User } from "../models/User.model.js";

export const addBranchToUser = async (req, res, next) => {
  try {
    const { schoolId } = req.body || {};
    const userId = req.params.id;

    if (!schoolId) {
      res.status(400);
      throw new Error(
        "Please provide a school branch ID to add / กรุณาระบุรหัสสาขาโรงเรียนที่ต้องการเพิ่ม",
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { schools: schoolId } },
      { new: true, runValidators: true },
    ).select("-password");

    if (!updatedUser) {
      res.status(404);
      throw new Error("User account not found / ไม่พบบัญชีผู้ใช้งานนี้");
    }

    return res.status(200).json({
      success: true,
      message:
        "Successfully added new schoolbranch / เพิ่มโรงเรียนสาขาให้กับผู้ใช้งานแล้ว",
      data: updatedUser,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Admin/Manager look up any specific user profile details (Deep Populated)
// @route   GET /api/users/:id
// @access  Private (Strictly Admin & Manager only)
export const getUserProfileById = async (req, res, next) => {
  try {
    const userProfile = await User.findById(req.params.id)
      .select("-password")
      .populate("schools", "schoolName schoolType settings")
      .populate("activeSchool", "schoolName schoolType settings")
      .populate({
        path: "academicProfile.studentTrack.courseId",
        select: "title durationInMinutes lessonType levels",
      });

    if (!userProfile) {
      res.status(404);
      throw new Error("User account not found / ไม่พบบัญชีผู้ใช้งานนี้ในระบบ");
    }

    return res.status(200).json({ success: true, data: userProfile });
  } catch (error) {
    return next(error);
  }
};
