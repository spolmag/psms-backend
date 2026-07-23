import { Router } from "express";

import {
  registerSchool,
  getSchoolById,
} from "../controllers/school.controllers.js";

export const router = Router();

router.post("/", registerSchool);
router.get("/:id", getSchoolById);
