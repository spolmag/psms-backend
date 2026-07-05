import { User } from "../models/User.model.js";
import { generateToken } from "../utils/generateToken.js";

export const registerUser = async (req, res, next) => {
  try {
    const { schoolId, name, email, password, role, phoneNumber, extraData } =
      req.body || {};

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
      extraData,
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
