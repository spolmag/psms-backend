import { rateLimit } from "express-rate-limit";

export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window tracking window
  limit: 100, // Limit each IP address to exactly 100 requests per window status cycle
  standardHeaders: "draft-7", // Return standard rate limit info in the rate-limit response headers
  legacyHeaders: false, // Disable the X-RateLimit-* legacy headers
  message: {
    success: false,
    message:
      "Too many requests from this IP. Please try again after 15 minutes",
  },
});
