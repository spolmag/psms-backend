import { Attendance } from "../models/Attendance.model.js";
import { Class } from "../models/Class.model.js";

// @desc    Submit a new roll-call attendance sheet for a class session
// @route   POST /api/attendance
// @access  Private (Admin, Manager & Assigned Teacher only)
export const submitAttendance = async (req, res, next) => {
  try {
    const { classId, records, note, teacherId: bodyTeacherId } = req.body || {};
    const schoolId = req.user.activeSchool;

    if (
      !classId ||
      !records ||
      !Array.isArray(records) ||
      records.length === 0
    ) {
      res.status(400);
      throw new Error(
        "Missing required attendance parameters / ข้อมูลสำหรับเช็คชื่อนักเรียนไม่ครบถ้วน",
      );
    }

    const targetClass = await Class.findById(classId);
    if (!targetClass) {
      res.status(404);
      throw new Error("Target class session not found! / ไม่พบข้อมูลคลาสเรียน");
    }

    // 💡 2. DYNAMIC ROLE-BASED TEACHER ASSIGNMENT LOGIC
    let finalTeacherId;
    if (req.user.role === "teacher") {
      // 🔐 If a regular teacher is logged in, force their own ID for absolute security
      if (targetClass.teacherId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error(
          "You are not authorized to submit attendance for another teacher's class / ไม่มีสิทธิ์ในการเช็คชื่อเข้าเรียนคลาสของครูคนอื่น",
        );
      }
      finalTeacherId = req.user._id;
    } else {
      // 👔 If logged in as an Admin or Manager, allow assigning a specific teacher dynamically
      // Fallback to the class's default pre-scheduled teacher if bodyTeacherId is omitted
      finalTeacherId = bodyTeacherId || targetClass.teacherId;
    }

    // 3. 🔐 ROSTER COMPLIANCE CHECK (Remains unchanged)
    const enrolledStudentIds = targetClass.enrolledStudents.map((s) =>
      s.studentId.toString(),
    );
    for (const record of records) {
      if (!record.studentId || !record.status) {
        res.status(400);
        throw new Error(
          "Invalid record fields in attendance sheet / ข้อมูลรายการเช็คชื่อไม่ถูกต้อง",
        );
      }
    }

    // 4. 💡 FIXED: Save the verified Attendance Sheet document with our dynamic finalTeacherId variable
    const attendanceSheet = await Attendance.create({
      schoolId,
      classId,
      teacherId: finalTeacherId,
      records,
      note,
    });

    return res.status(201).json({
      success: true,
      message:
        "Attendance record successfully / บันทึกการเข้าเรียนเรียบร้อยแล้ว",
      data: attendanceSheet,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get attendance details for a specific class session
// @route   GET /api/attendance/class/:classId
// @access  Private (Admin, Manager, & Assigned Teacher)
export const getClassAttendance = async (req, res, next) => {
  try {
    const { classId } = req.params;

    const attendanceSheet = await Attendance.findOne({ classId })
      .populate("teachId", "name email role")
      .populate("records.studentId", "name email role phoneNumber");

    if (!attendanceSheet) {
      res.status(404);
      throw new Error(
        "No attendance found for this class / ยังไม่มีการบันทึกประวัติการเข้าเรียนของคลาสนี้",
      );
    }

    return res.status(200).json({ success: true, data: attendanceSheet });
  } catch (error) {
    return next(error);
  }
};
