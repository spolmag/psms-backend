import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import { connectDB } from "./config/db.js";
import { notFound } from "./middleware/notFoundMiddleware.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import { router as webHookRoutes } from "./routes/webhook.routes.js";
import { router as paymentRoutes } from "./routes/payment.routes.js";
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
import { router as stockTransferRoutes } from "./routes/stockTransfer.routes.js";
import { router as purchaseOrderRoutes } from "./routes/purchaseOrder.routes.js";
import { router as supplierRoutes } from "./routes/supplier.routes.js";
import { router as financialReportRoutes } from "./routes/financialReport.routes.js";
import { router as expenseRoutes } from "./routes/expense.routes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use("/api/webhooks", webHookRoutes);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.use("/api/stock-transfers", stockTransferRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/financial-reports", financialReportRoutes);
app.use("/api/expenses", expenseRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Private School System Management API" });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `🟢 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
  );
});
