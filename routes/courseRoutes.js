import { Router } from "express";
import { createCourse, getCourses } from "../controllers/courseController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router
  .route("/")
  .post(protect, restrictTo("admin", "teacher"), createCourse)
  .get(protect, getCourses);
