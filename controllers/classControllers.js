import { Class } from "../models/Class.model.js";
import { Course } from "../models/Course.model.js";
import { Zone } from "../models/Zone.model.js";

// @desc    Schedule a new class with historical financial snapshotting and room/teacher conflict checks
// @route   POST /api/classes
// @access  Private (Admin & Manager only)
export const createClass = async (req, res, next) => {
  try {
    const { teacherId, enrolledStudents, startTime, endTime, zoneId, note } =
      req.body || {};
    const schoolId = req.user.activeSchool;

    if (
      !teacherId ||
      !enrolledStudents ||
      !Array.isArray(enrolledStudents) ||
      enrolledStudents.length === 0 ||
      !startTime ||
      !endTime ||
      !zoneId
    ) {
      res.status(400);
      throw new Error(
        "Missing required class parameters / กรุณาระบุข้อมูลคลาสเรียนให้ครบถ้วน",
      );
    }

    // Convert incoming date strings into real JavaScript Date objects
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      res.status(400);
      throw new Error(
        "Start time must before end time / เวลาเริ่มคลาสต้องอยู่ก่อนเวลาหมดคลาส",
      );
    }
    // 2. 🔐 ROOM ZONE VALIDATION & CAPACITY THRESHOLD ENFORCEMENT
    const targetZone = await Zone.findById(zoneId);
    if (
      !targetZone ||
      targetZone.schoolId.toString() !== schoolId.toString() ||
      !targetZone.isActive
    ) {
      res.status(404);
      throw new Error(
        "Target zone not found or inactice / ไม่พบข้อมูลโซน-ห้องเรียนที่ระบุ หรือไม่เปิดใช้งาน",
      );
    }

    if (targetZone.zoneType === "classroom") {
      const studentHeadCount = enrolledStudents.length;
      if (studentHeadCount > targetZone.maxStudentCapacity) {
        res.status(404);
        throw new Error(
          `Room capacity exceeded! Max: ${targetZone.maxStudentCapacity} / จำนวนนักเรียนรับได้สูงสุด ไม่เกิน ${targetZone.maxStudentCapacity} คน`,
        );
      }
    }

    // 3. 🔐 TEACHER & ZONE RESOURCE DOUBLE-BOOKING MATRIX CHECKS
    // Check if teacher is already booked anywhere else at this time slot
    const teacherConflict = await Class.findOne({
      teacherId,
      status: "scheduled",
      startTime: { $lt: end },
      endTime: { $gt: start },
    });
    if (teacherConflict) {
      res.status(400);
      throw new Error(
        "Teacher is already booked for another class at this time! / ครูผู้สอนมีคลาสสอนในช่วงเวลานี้แล้ว",
      );
    }

    // Check if this physical room zone resource is already occupied
    const zoneConflict = await Class.findOne({
      zoneId,
      status: "scheduled",
      startTime: { $lt: end },
      endTime: { $gt: start },
    });
    if (zoneConflict) {
      res.status(400);
      throw new Error(
        "This zone is already in use by other class / ห้องเรียนนี้มีกำหนดคลาสเรียนในเวลานี้แล้ว",
      );
    }

    // 4. 💸 INITIATE AUTOMATED FINANCIAL SNAPSHOTTING OPERATION LOOP
    const finalizedStudentSnapshots = [];
    for (const item of enrolledStudents) {
      if (!item.studentId || !item.courseId || !item.level) {
        res.status(400);
        throw new Error(
          "Invalid student array parameter fields / ข้แมูลการเรียนของนักเรียนไม่ถูกต้อง",
        );
      }

      const parentCourse = await Course.findById(item.courseId);
      if (!parentCourse) {
        res.status(404);
        throw new Error(
          "Parent course profile not found / ไม่พบข้อมูลวิชาเรียนนี้",
        );
      }

      // Find the matching configuration tier index for the requested level
      const matchingLevelTier = parentCourse.levels.find(
        (lvl) => lvl.level === Number(item.level),
      );

      if (!matchingLevelTier) {
        res.status(400);
        throw new Error(
          `Requested level (${item.level}) is not defined in this course / ไม่พบข้อมูลเลเวล (${item.level}) ในคอร์สเรียนนี้`,
        );
      }

      // Lock down the immutable historical price and teacher fee payout numbers into this student node
      finalizedStudentSnapshots.push({
        studentId: item.studentId,
        courseId: item.courseId,
        level: Number(item.level),
        // 💡 EXPLICITLY SNAPSHOTTED: Freezes these numbers forever protecting against future course configuration changes
        baseTeacherPayout: matchingLevelTier.baseTeacherPayout,
        priceSnapshot: matchingLevelTier.price,
      });
    }

    // 5. Create the Class timetable record document in MongoDB
    const newClass = await Class.create({
      schoolId,
      teacherId,
      enrolledStudents: finalizedStudentSnapshots,
      startTime: start,
      endTime: end,
      zoneId,
      note,
    });

    return res.status(201).json({
      success: true,
      message: "Class scheduled successfully / ลงเวลาคลาสเรียนใหม่สำเร็จ",
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
    const { teacherId } = req.params;

    const classes = await Class.find({ teacherId })
      .populate("schoolId", "SchoolName")
      .populate("zoneId", "zoneName zoneType")
      .populate("enrolledStudents.studentId", "name email role phoneNumber")
      .populate("enrollStudents.courseId", "title durationInMinutes lessonType")
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
    const classId = req.params.id;
    const { studentId, courseId, level } = req.body || {};

    if (!studentId || !courseId || !level) {
      res.status(400);
      throw new Error(
        "Missing enrollment fields / กรุณาระบุรหัสนักเรียน, คอร์ส, เลเวล ให้ครบถ้วน",
      );
    }

    const targetClass = await Class.findById(classId).populate("zoneId");
    if (!targetClass) {
      throw new Error("Class not found / ไม่พบข้อมูลคลาสเรียน");
    }

    const isAlreadyEnrolled = targetClass.enrolledStudents.some(
      (student) => student.studentId.toString() === studentId,
    );
    if (isAlreadyEnrolled) {
      res.status(400);
      throw new Error(
        "This student is already enrolled in this class / นักเรียนคนนี้มีชื่ออยู่ในคลาสนี้แล้ว",
      );
    }

    if (targetClass.zoneId && targetClass.zoneId.zoneType === "classroom") {
      const currentEnrollmentCount = targetClass.enrolledStudents.length;
      const maxAllowCapacity = targetClass.zoneId.maxStudentCapacity;

      if (currentEnrollmentCount >= maxAllowCapacity) {
        res.status(400);
        throw new Error(
          `Room capacity is full! Max: ${maxAllowCapacity} / จำนวนนักเรียนเต็มคลาสแล้ว! (${maxAllowCapacity} คน) `,
        );
      }
    }

    const parentCourse = await Course.findById(courseId);
    if (!parentCourse) {
      res.status(404);
      throw new Error(
        "Parent course profile not found! / ไม่พบข้อมูลคอร์สเรียนวิชานี้",
      );
    }

    const matchingLevelTier = parentCourse.levels.find(
      (lvl) => lvl.level === Number(level),
    );
    if (!matchingLevelTier) {
      res.status(400);
      throw new Error(
        `Level ${level} is not defined in this course / ไม่มีเลเวล ${level} ในคอร์สเรียนนี้`,
      );
    }

    const newStudentSnapShot = {
      studentId,
      courseId,
      level: Number(level),
      baseTeacherPayout: matchingLevelTier.baseTeacherPayout,
      priceSnapshot: matchingLevelTier.price,
    };

    const updateClass = await Class.findByIdAndUpdate(
      classId,
      { $push: { enrolledStudents: newStudentSnapShot } },
      { new: true, runValidators: true },
    )
      .populate("enrolledStudents.studentId", "name email role")
      .populate("enrolledStudents.courseId", "title");

    return res.status(200).json({
      success: true,
      message:
        "Student added to class successfully / เพิ่มนักเรียนเข้าคลาสเรียนสำเร็จ",
      data: updateClass,
    });
  } catch (error) {
    return next(error);
  }
};
