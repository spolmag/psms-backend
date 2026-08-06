import { School } from "../models/School.model.js";

export const registerSchool = async (req, res, next) => {
  try {
    const {
      schoolName,
      schoolType,
      email,
      phoneNumber,
      taxId,
      address,
      setting,
    } = req.body || {};

    const schoolExists = await School.findOne({
      $or: [
        { "schoolName.en": schoolName?.en },
        { "schoolName.th": schoolName?.th },
      ],
    });

    if (schoolExists) {
      res.status(400);
      throw new Error(
        "A school with this name already exists/มีโรงเรียนชื่อนี้อยู่ในระบบแล้ว",
      );
    }

    const school = await School.create({
      schoolName,
      schoolType,
      email,
      phoneNumber,
      taxId,
      address,
      setting,
    });

    return res.status(201).json({ success: true, data: school });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all school branches (Active catalog list registry)
 * @route   GET /api/schools
 * @access  Private (Authenticated users / Shared lookups)
 */
export const getSchools = async (req, res, next) => {
  try {
    // Fetch all active schools sorted by their creation order (Oldest first)
    const schools = await School.find({ isActive: true }).sort({
      createdAt: 1,
    });

    return res.status(200).json({
      success: true,
      count: schools.length,
      data: schools, // Exactly matches the response.data.data array frontend expects!
    });
  } catch (error) {
    next(error);
  }
};

export const getSchoolById = async (req, res, next) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      res.status(404);
      throw new Error("School profile not found! / ไม่พบข้อมูลโรงเรียน");
    }

    return res.status(200).json({ success: true, data: school });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update school branch profile data configurations
 * @route   PUT /api/schools/:id
 * @access  Private (Admin)
 */
export const updateSchool = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Use $set to update fields dynamically based on whatever the administrator submits
    const updatedSchool = await School.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }, // Returns the fresh document and fires schema validation check
    );

    if (!updatedSchool) {
      res.status(404);
      throw new Error("School branch not found / ไม่พบข้อมูลโรงเรียน-สาขา");
    }

    return res.status(200).json({
      success: true,
      message:
        "School branch update successfully / แก้ไขข้อมูลโรงเรียน-สาขาสำเร็จ",
      data: updatedSchool,
    });
  } catch (error) {
    next(error);
  }
};
