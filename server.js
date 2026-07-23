import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import { connectDB } from "./config/db.js";
import { notFound } from "./middleware/notFoundMiddleware.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import { router as schoolRoutes } from "./routes/school.routes.js";
import { router as authRoutes } from "./routes/auth.routes.js";
import { router as courseRoutes } from "./routes/course.routes.js";
import { router as courseCategoryRoutes } from "./routes/courseCategory.routes.js";
import { router as userRoutes } from "./routes/user.routes.js";
import { router as classRoutes } from "./routes/class.routes.js";
import { router as certificateRoutes } from "./routes/certificate.routes.js";
import { router as zoneRoutes } from "./routes/zone.routes.js";
import { router as attendanceRoutes } from "./routes/attendance.routes.js";
import { router as productCategoryRoutes } from "./routes/productCategory.routes.js";
import { router as productRoutes } from "./routes/product.routes.js";
import { router as invoiceRoutes } from "./routes/invoice.routes.js";
import { router as productTransferRoutes } from "./routes/stockTransfer.routes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/schools", schoolRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/course-categories", courseCategoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/product-categories", productCategoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("api/product-transfer", productTransferRoutes);

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
