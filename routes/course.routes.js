import { Router } from "express";
import { createCourse, getCourses } from "../controllers/course.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router
  .route("/")
  .post(protect, restrictTo("admin", "teacher", "manager"), createCourse)
  .get(protect, getCourses);
