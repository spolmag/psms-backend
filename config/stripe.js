import Stripe from "stripe";
import dotenv from "dotenv";

// Ensure environment keys are fully populated into memory profiles
dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error(
    "❌ CRITICAL ERROR: process.env.STRIPE_SECRET_KEY is missing inside .env configuration map file!",
  );
}

// Initialize the Stripe engine instance using the latest stable API version configuration settings
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16", // Ensures your data mapping uses a consistent stable platform layout
});
