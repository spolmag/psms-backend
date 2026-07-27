import { Router } from "express";

import {
  registerSchool,
  getSchoolById,
  updateSchool,
} from "../controllers/school.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post("/", protect, restrictTo("admin", "manager"), registerSchool);
router.get("/:id", protect, restrictTo("admin", "manager"), getSchoolById);
router.put("/:id", protect, restrictTo("admin", "manager"), updateSchool);
