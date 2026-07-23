import { Course } from "../models/Course.model.js";

// @desc    Create a new course catalog package with tiered level parameters
// @route   POST /api/courses
// @access  Private (Admin & Teacher only)
export const createCourse = async (req, res, next) => {
  try {
    let {
      courseCategoryId,
      title,
      description,
      basePrice,
      durationInMinutes,
      lessonType,
      maxCapacity,
      levels,
    } = req.body || {};

    const schoolId = req.user.activeSchool;
    if (!schoolId) {
      res.status(400);
      throw new Error(
        "No active school branch context found / ไม่พบข้อมูลสาขาโรงเรียน",
      );
    }

    //Prevent manual data-entry - transform to Lowercase
    if (lessonType) {
      lessonType = lessonType.toLowerCase();
    }

    if (lessonType === "private") {
      maxCapacity = 1;
    } else if (lessonType === "semi-private") {
      maxCapacity = 2;
    }

    const courseExists = await Course.findOne({
      schoolId,
      $or: [{ "title.en": title?.en }, { "title.th": title?.th }],
    });

    if (courseExists) {
      res.status(400);
      throw new Error(
        "A course with this name is already in this branch / มีวิชาชื่อนี้อยู่ในสาขานี้แล้ว",
      );
    }

    const course = await Course.create({
      courseCategoryId,
      schoolId,
      title,
      description,
      basePrice,
      durationInMinutes,
      lessonType,
      maxCapacity,
      levels,
    });

    return res.status(201).json({ success: true, data: course });
  } catch (error) {
    return next(error);
  }
};

export const getCourses = async (req, res, next) => {
  try {
    const schoolId = req.user.activeSchool;
    const courses = await Course.find({ schoolId, isActive: true }).populate(
      "courseCategoryId",
      "name",
    );

    return res
      .status(200)
      .json({ success: true, count: courses.length, data: courses });
  } catch (error) {
    return next(error);
  }
};
