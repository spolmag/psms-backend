import { Router } from "express";

import {
  submitAttendance,
  getClassAttendance,
} from "../controllers/attendance.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

// Route: /api/attendance
router.post(
  "/",
  protect,
  restrictTo("admin", "manager", "teacher"),
  submitAttendance,
);
// Route: /api/attendance/class/:classId
router.get(
  "/class/:classId",
  protect,
  restrictTo("admin", "manager", "teacher"),
  getClassAttendance,
);
