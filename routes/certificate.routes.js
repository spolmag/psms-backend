import { Router } from "express";

import {
  createCertificate,
  getUserCertificates,
} from "../controllers/certificate.controllers.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

export const router = Router();

//Route: api/certificates
router.post("/", protect, restrictTo("admin", "manager"), createCertificate);
// Route: /api/certificates/user/:userId
router.get("/user/:userId", protect, getUserCertificates);
