import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import { connectDB } from "./config/db.js";
import { notFound } from "./middleware/notFoundMiddleware.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import { router as schoolRoutes } from "./routes/schoolRoutes.js";
import { router as authRoutes } from "./routes/authRoutes.js";
import { router as courseRoutes } from "./routes/courseRoutes.js";
import { router as courseCategoryRoutes } from "./routes/courseCategoryRoutes.js";
import { router as userRoutes } from "./routes/userRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/schools", schoolRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/coursecategory", courseCategoryRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Private School System Management API" });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `🟢 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.bold,
  );
});
