import { Router } from "express";
import {
  addBranchToUser,
  getUserProfileById,
  updateStudentAcademicProfile,
} from "../controllers/user.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.get("/:id", protect, restrictTo("admin", "manager"), getUserProfileById);
router.patch(
  "/:id/add-branch",
  protect,
  restrictTo("admin", "manager"),
  addBranchToUser,
);
router.patch(
  "/:id/academic-profile",
  protect,
  restrictTo("admin", "manager"),
  updateStudentAcademicProfile,
);
