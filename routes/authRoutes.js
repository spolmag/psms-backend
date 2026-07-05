import { Router } from "express";
import { registerUser, loginUser } from "../controllers/authController.js";

export const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
