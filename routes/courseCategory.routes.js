import { Router } from "express";
import {
  createCourseCategory,
  getCourseCategory,
} from "../controllers/courseCategory.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router
  .route("/")
  .post(
    protect,
    restrictTo("admin", "teacher", "manager"),
    createCourseCategory,
  )
  .get(protect, getCourseCategory);
