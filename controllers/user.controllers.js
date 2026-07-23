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

// @desc    Update a student's active level tracks or add a new course track (Admin/Manager Only)
// @route   PATCH /api/users/:id/academic-profile
// @access  Private (Strictly Admin & Manager only)
export const updateStudentAcademicProfile = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { studentTrack } = req.body || {};

    //Fetch user in req.body from database
    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error("User account not found / ไม่พบข้อมูลยูสเซอร์ไอดีนี้");
    }

    //If user found but role !== "student"
    if (user.role !== "student") {
      res.status(400);
      throw new Error(
        "This profile update is for student only / อัพเดทสถานะคอร์สเรียน-เลเวลได้เฉพาะบัญชีผู้ใช้งานที่เป็นนักเรียนเท่านั้น",
      );
    }

    if (!studentTrack || !Array.isArray(studentTrack)) {
      res.status(400);
      throw new Error(
        "Please provide a valid student track array / กรุณาระบุข้อมูลคอร์สเรียนของนักเรียนให้ถูกต้อง",
      );
    }

    studentTrack.forEach((incomingTrack) => {
      //Check if student is already learning this course
      const existingTrackIndex = user.academicProfile.studentTrack.findIndex(
        (existing) => existing.courseId.toString() === incomingTrack.courseId,
      );

      const trackData = {
        courseId: incomingTrack.courseId,
        currentLevel: incomingTrack.currentLevel || 1,
        status: incomingTrack.status || "active",
        recordDate: incomingTrack.recordDate
          ? new Date(incomingTrack.recordDate)
          : new Date(),
      };

      if (existingTrackIndex > -1) {
        //Student already learn this course (index > -1) -> update level
        user.academicProfile.studentTrack[existingTrackIndex] = trackData;
      } else {
        //Student never learn this course (index = -1) -> append track array
        user.academicProfile.studentTrack.push(trackData);
      }
    });

    await user.save();

    //Fetch new updated profile for response body
    const populatedUser = await User.findById(userId)
      .select("-password")
      .populate("schools", "schoolName")
      .populate("activeSchool", "schoolName")
      .populate({
        path: "academicProfile.studentTrack.courseId",
        select: "title durationInMinutes lessonType levels",
      });

    return res.status(201).json({
      success: true,
      message:
        "Student academic profile uodated successfully / อัพเดทประวัติการเรียนของนักเรียนเรียบร้อยแล้ว",
      data: populatedUser,
    });
  } catch (error) {
    return next(error);
  }
};
