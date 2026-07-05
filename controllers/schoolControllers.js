import { School } from "../models/School.model.js";

export const registerSchool = async (req, res, next) => {
  try {
    const { schoolName, schoolType, email, phoneNumber, address, setting } =
      req.body || {};

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
      address,
      setting,
    });

    return res.status(201).json({ success: true, data: school });
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
