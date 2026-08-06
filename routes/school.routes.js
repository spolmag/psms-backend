import { Router } from "express";

import {
  registerSchool,
  getSchoolById,
  updateSchool,
  getSchools,
} from "../controllers/school.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post("/", protect, restrictTo("admin", "manager"), registerSchool);
router.get("/", protect, restrictTo("admin", "manager"), getSchools);
router.get("/:id", protect, restrictTo("admin", "manager"), getSchoolById);
router.put("/:id", protect, restrictTo("admin", "manager"), updateSchool);
