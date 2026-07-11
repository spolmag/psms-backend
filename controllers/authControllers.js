import { User } from "../models/User.model.js";
import { generateToken } from "../utils/generateToken.js";

export const registerUser = async (req, res, next) => {
  try {
    const {
      schoolId,
      name,
      email,
      password,
      role,
      phoneNumber,
      dateOfBirth,
      extraData,
      academicProfile,
    } = req.body || {};

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error(
        "This email is already registered / อีเมลนี้ลงทะเบียนในระบบแล้ว",
      );
    }

    const user = await User.create({
      schools: [schoolId],
      activeSchool: schoolId,
      name,
      email,
      password,
      role,
      phoneNumber,
      dateOfBirth,
      extraData,
      academicProfile,
    });

    return res.status(201).json({
      success: true,
      token: generateToken(user._id),
      data: {
        id: user._id,
        schools: user.schools,
        activeSchool: user.activeSchool,
        name: user.name,
        email: user.email,
        role: user.role,
        academicProfile: user.academicProfile,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      return res.status(200).json({
        success: true,
        token: generateToken(user._id),
        data: {
          id: user._id,
          schools: user.schools,
          activeSchool: user.activeSchool,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      res.status(401);
      throw new Error(
        "Invalid email or password / อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      );
    }
  } catch (error) {
    return next(error);
  }
};

export const getCurrentUserProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(404);
      throw new Error("User session not found / ไม่พบข้อมูลผู้ใช้งาน");
    }

    const fullUserProfile = await User.findById(req.user._id)
      .select("-password")
      .populate("schools", "schoolName schoolType settings")
      .populate("activeSchool", "schoolName schoolType settings")
      .populate({
        path: "academicProfile.studentTrack.courseId",
        select: "title durationInMinutes lessonType levels",
      });

    return res.status(200).json({ success: true, data: fullUserProfile });
  } catch (error) {
    return next(error);
  }
};

export const switchBranch = async (req, res, next) => {
  try {
    const { schoolId } = req.body || {};

    if (!schoolId) {
      res.status(400);
      throw new Error(
        "Please provide a school branch ID / กรุณาระบุรหัสสาขาโรงเรียน",
      );
    }

    //Check if user belong to branch (schoolId in user document)
    const belongToBranch = req.user.schools.some(
      (branch) => branch.toString() === schoolId,
    );

    if (!belongToBranch) {
      res.status(403);
      throw new Error(
        "Access denied! you do not belong to this branch / คุณไม่มีสิทธิ์เข้าถึงสาขานี้",
      );
    }

    //Update activeSchool in user document
    req.user.activeSchool = schoolId;
    await req.user.save();

    return res.status(200).json({
      success: true,
      message:
        "Successfully switched active branch / เปลี่ยนสาขาที่ใช้งานสำเร็จ",
      data: {
        id: req.user._id,
        schools: req.user.schools,
        activeSchool: req.user.activeSchool,
        role: req.user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
};
