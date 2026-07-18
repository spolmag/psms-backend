import { Router } from "express";
import { createZone, getZones } from "../controllers/zoneController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

router.post("/", protect, restrictTo("admin", "manager"), createZone);
router.get("/", protect, getZones);
