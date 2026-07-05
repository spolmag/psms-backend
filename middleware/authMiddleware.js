import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401);
      throw new Error(
        "Not authorized! No security token found / ไม่พบสิทธิ์การเข้าถึงระบบ",
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    return next();
  } catch (error) {
    res.status(401);
    return next(
      new Error("Not authorized! Token invalid / โทเค็นไม่ถูกต้องหรือหมดอายุ"),
    );
  }
};

export const restrictTo = (...allowdRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowdRoles.includes(req.user.role)) {
      res.status(403);
      return next(
        new Error(
          "Permission denied! No access / ไม่ได้รับสิทธิ์ให้ทำรายการนี้",
        ),
      );
    }
    return next();
  };
};
