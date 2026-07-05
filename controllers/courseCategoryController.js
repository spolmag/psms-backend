import { CourseCategory } from "../models/CourseCategory.model.js";

export const createCourseCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body || {};
    const schoolId = req.user.activeSchool;

    const courseCategoryExists = await CourseCategory.findOne({
      schoolId,
      $or: [{ "name.en": name?.en }, { "name.th": name?.th }],
    });

    if (courseCategoryExists) {
      res.status(400);
      throw new Error(
        "This category already exists in this branch / มีหลักสูตรนี้อยู่ในสาขานี้แล้ว",
      );
    }

    const category = await CourseCategory.create({
      schoolId,
      name,
      description,
    });

    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    return next(error);
  }
};

export const getCourseCategory = async (req, res, next) => {
  try {
    const schoolId = req.user.activeSchool;
    const categories = await CourseCategory.find({ schoolId, isActive: true });

    return res
      .status(200)
      .json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    return next(error);
  }
};
