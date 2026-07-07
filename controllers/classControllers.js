import { Class } from "../models/Class.model.js";
import { Course } from "../models/Course.model.js";

// @desc    Schedule a new class with double-booking checks
// @route   POST /api/classes
// @access  Private (Admin & Teacher only)
export const createClass = async (req, res, next) => {
  try {
    const {
      courseId,
      teacherId,
      studentIds,
      startTime,
      endTime,
      roomName,
      note,
    } = req.body || {};
    const schoolId = req.user.activeSchool;

    //Convert date in req to javascript date objects
    const start = new Date(startTime);
    const end = new Date(endTime);

    //Validate if start time was before end time
    if (start >= end) {
      res.status(400);
      throw new Error(
        "Start time must before end time / เวลาเริ่มคลาสต้องก่อนหน้าเวลาเลิกคลาส",
      );
    }

    //Check if teacher is available for this new class
    const teacherConflict = await Class.findOne({
      teacherId,
      status: "scheduled",
      startTime: { $lt: end },
      endTime: { $gt: start },
    });
    if (teacherConflict) {
      res.status(400);
      throw new Error(
        "Teacher is already booked for another class / ครูมีคลาสสอนในเวลานีเแล้ว",
      );
    }

    //Check is room is available for this new class
    const roomConflict = await Class.findOne({
      schoolId,
      status: "scheduled",
      $or: [{ "roomName.en": roomName?.en }, { "roomName.th": roomName?.th }],
      startTime: { $lt: end },
      endTime: { $gt: start },
    });
    if (roomConflict) {
      res.status(400);
      throw new Error(
        "Room is already in use by another class / ห้องเรียนถูกกำหนดใช้กับคลาสอื่นแล้ว",
      );
    }

    //Create new class
    const newClass = await Class.create({
      schoolId,
      courseId,
      teacherId,
      studentIds,
      startTime: start,
      endTime: end,
      roomName,
      note,
    });
    return res.status(201).json({
      success: true,
      message: "Class scheduled successfully / ลงตารางเวลาคลาสเรียนใหม่แล้ว",
      data: newClass,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all classes for a specific teacher across ALL branches (Unified Calendar View)
// @route   GET /api/classes/teacher/:teacherId
// @access  Private
export const getTeacherClasses = async (req, res, next) => {
  try {
    const { teachId } = req.params;

    const classes = await Class.find({ teachId })
      .populate("schoolId", "SchoolName")
      .populate("courseId", "title lessonType durationInMinutes")
      .populate("studentIds", "name email -password")
      .sort({ startTime: 1 });

    return res
      .status(200)
      .json({ success: true, count: classes.length, data: classes });
  } catch (error) {
    return next(error);
  }
};

// @desc    Add / Enrol a new student into an existing group class
// @route   PATCH /api/classes/:id/add-student
// @access  Private (Admin & Teacher only)
export const addStudentToClass = async (req, res, next) => {
  try {
    const { studentId } = req.body || {};
    const classId = req.params.id;

    if (!studentId) {
      res.status(400);
      throw new Error("Please provide a student ID / กรุณาระบุรหัสนักเรียน");
    }

    const targetClass = await Class.findById(classId).populate("courseId");
    if (!targetClass) {
      res.status(404);
      throw new Error("Class timetable not found / ไม่พบข้อมูลคลาสเรียนนี้");
    }

    const isAlreadyEnrolled = targetClass.studentIds.some(
      (id) => id.toString() === studentId,
    );
    if (isAlreadyEnrolled) {
      res.status(401);
      throw new Error(
        "This student is already enrolled in this class / นักเรียนรหัสนี้มีรายชื่อในคลาสนี้แล้ว",
      );
    }

    const currentEnrolmentCount = targetClass.studentIds.length;
    const maxAllowedCapacity = targetClass.courseId.maxCapacity;
    if (currentEnrolmentCount >= maxAllowedCapacity) {
      res.status(400);
      throw new Error(
        `This class is already full: ${maxAllowedCapacity} / จำนวนนักเรียนในคลาสนี้เต็มแล้ว (สูงสุด ${maxAllowedCapacity} คน)`,
      );
    }

    //Push new student to class
    const updateClass = await Class.findByIdAndUpdate(
      classId,
      { $addToSet: { studentIds: studentId } },
      { new: true, runValidators: true },
    ).populate("studentIds", "name email -password");
    return res.status(200).json({
      success: true,
      message:
        "Student add to class successfully / เพิ่มนักเรียนเข้าคลาสสำเร็จ",
      data: updateClass,
    });
  } catch (error) {
    return next(error);
  }
};
