import { Router } from "express";
import {
  createClass,
  getTeacherClasses,
  addStudentToClass,
} from "../controllers/classControllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post(
  "/",
  protect,
  restrictTo("admin", "teacher", "manager"),
  createClass,
);
router.get("/teacher/:teacherId", protect, getTeacherClasses);
router.patch(
  "/:id/add-student",
  protect,
  restrictTo("admin", "teacher", "manager"),
  addStudentToClass,
);
