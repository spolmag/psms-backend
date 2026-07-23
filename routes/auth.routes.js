import { Router } from "express";
import {
  registerUser,
  loginUser,
  getCurrentUserProfile,
  switchBranch,
} from "../controllers/auth.controllers.js";
import { protect } from "../middleware/authMiddleware.js";

export const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getCurrentUserProfile);
router.patch("/switch-branch", protect, switchBranch);
