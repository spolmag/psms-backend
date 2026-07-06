import { Router } from "express";
import { addBranchToUser } from "../controllers/userController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.patch("/:id/add-branch", protect, restrictTo("admin"), addBranchToUser);
