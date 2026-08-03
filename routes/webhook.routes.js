import { Router } from "express";
import express from "express";

import { handleStripeWebhook } from "../controllers/stripeWebhook.controllers.js";

export const router = Router();

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);
