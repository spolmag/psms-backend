import mongoose from "mongoose";

import { Payment } from "../models/Payment.model.js";
import { Invoice } from "../models/Invoice.model.js";

/**
 * @desc    Generate comprehensive branch financial data analytics summaries
 * @route   GET /api/financial-reports/dashboard-summary
 * @access  Private (Admin & Manager only)
 */
export const getDashboardSummary = async (req, res, next) => {
  try {
    const schoolId = req.user.activeSchool;
    const { startDate, endDate } = req.query;

    // Use standard mongoose casting to wrap raw strings into valid ObjectIds for the aggregation filters
    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

    // 1. DYNAMIC DATE RANGE FILTER SETUP
    // If dates are provided by the frontend, map them into raw dates, else default to all time
    const dateMatch = {};
    if (startDate) {
      dateMatch.$gte = new Date(startDate); // Start of range (e.g., 2026-07-01T00:00:00.000Z)
    }
    if (endDate) {
      // Set end date to the absolute end of that day (23:59:59) so it captures final day checkouts
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateMatch.$lte = end;
    }

    const paymentMatchCriteria = {
      schoolId: schoolObjectId,
      status: "SUCCESSFUL",
    };

    if (startDate || endDate) {
      paymentMatchCriteria.paidAt = dateMatch;
    }

    // 2. ACCOUNTING-ACCURATE REVENUE PIPELINE (Extracts VAT cleanly)
    const revenuePipeline = await Payment.aggregate([
      { $match: paymentMatchCriteria },
      // Join with the Invoices collection to read the subTotal and tax breakdowns
      {
        $lookup: {
          from: "invoices",
          localField: "invoiceId",
          foreignField: "_id",
          as: "invoiceDetails",
        },
      },
      { $unwind: "$invoiceDetails" },
      // Dynamic Projections: Calculate exact Net Revenue and Collected VAT per payment transaction row
      {
        $project: {
          amountPaid: 1,
          // If totalAmount is 0, protect against dividing by zero crashes
          netRevenueMultiplier: {
            $cond: [
              { $eq: ["$invoiceDetails.totalAmount", 0] },
              0,
              {
                $divide: [
                  "$invoiceDetails.subTotal",
                  "$invoiceDetails.totalAmount",
                ],
              },
            ],
          },
          taxMultiplier: {
            $cond: [
              { $eq: ["$invoiceDetails.totalAmount", 0] },
              0,
              {
                $divide: ["$invoiceDetails.tax", "$invoiceDetails.totalAmoumt"],
              },
            ],
          },
        },
      },
      {
        $project: {
          netRevenue: { $multiply: ["$amountPaid", "$netRevenueMultiplier"] },
          collectedVat: { $multiply: ["$amountPaid", "$taxMultiplier"] },
        },
      },
      // Sum up net earnings and collected tax totals separately
      {
        $group: {
          _id: null,
          totalNetRevenue: { $sum: "$netRevenue" },
          totalCollectedVat: { $sum: "$collectedVat" },
        },
      },
    ]);

    // 3. OUTSTANDING DEBT RECEIVABLES PIPELINE (Based purely on invoice subTotal to show true missing revenue)
    const invoiceMatchCriteria = {
      schoolId: schoolObjectId,
      status: { $in: ["DRAFT", "SENT", "OVERDUE"] },
    };

    if (startDate || endDate) {
      invoiceMatchCriteria.dueDate = dateMatch; // Audits debts due within this timeframe
    }

    const receivablesPipeline = await Invoice.aggregate([
      { $match: invoiceMatchCriteria },
      { $group: { _id: null, totalOutstandingNet: { $sum: "$subTotal" } } },
    ]);

    // 4. REVENUE STREAM SPLIT PIPELINE
    const paidInvoiceMatchCriteria = {
      schoolId: schoolObjectId,
      status: "PAID",
    };

    if (startDate || endDate) {
      // Tracks product/tuition income generated from invoices updated within this frame
      paidInvoiceMatchCriteria.updatedAt = dateMatch;
    }

    const streamPipeline = await Invoice.aggregate([
      { $match: paidInvoiceMatchCriteria },
      { $unwind: "$items" }, // Flattens the array items list out into single documents for sorting
      {
        $group: {
          _id: "$items.itemType",
          streamRevenue: { $sum: "$items.totalPrice" },
          itemCount: { $sum: "$items.quantity" },
        },
      },
    ]);

    // Extract calculated values with clean fallback boundaries
    const cleanRevenueData = revenuePipeline[0] || {
      totalNetRevenue: 0,
      totalCollectedVat: 0,
    };
    const totalOutstanding = receivablesPipeline[0]?.totalOutstandingNet || 0;

    const streamReport = {
      tuitionRevenue: 0,
      retailRevenue: 0,
    };

    streamPipeline.forEach((stream) => {
      if (stream._id === "STUDENT_TRACK")
        streamReport.tuitionRevenue = stream.streamRevenue;
      if (stream._id === "RETAIL_STOCK")
        streamReport.retailRevenue = stream.streamRevenue;
    });

    return res.status(200).json({
      success: true,
      message:
        "Tax-isolated financial metrics compiled / โหลดข้อมูลสรุปการเงิน-แยกภาษีมูลค่าเพิ่มสำเร็จ",
      data: {
        timeframe: {
          startDate: startDate || "All time",
          endDate: endDate || "All time",
        },
        totalNetRevenue:
          Math.round(cleanRevenueData.totalNetRevenue * 100) / 100,
        totalCollectedVat:
          Math.round(cleanRevenueData.totalCollectedVat * 100) / 100,
        totalOutstandingReceivables: Math.round(totalOutstanding * 100) / 100,
        revenueStreams: streamReport,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate ranked retail product sales leaderboard (Supports Specific Branch or All-Branch Consolidated)
 * @route   GET /api/financial-reports/product-performance
 * @access  Private (Admin & Manager only)
 */
export const getProductSalesPerformance = async (req, res, next) => {
  try {
    const userActiveSchoolId = req.user.activeSchool;
    const { startDate, endDate, schoolId } = req.query;

    // 1. DETERMINE MULTI-BRANCH FILTER SCOPING RULES
    const invoiceMatchCriteria = { status: "PAID" };

    if (schoolId !== "ALL") {
      const targetSchoolId = schoolId || userActiveSchoolId;
      invoiceMatchCriteria.schoolId = new mongoose.Types.ObjectId(
        targetSchoolId,
      );
    }

    // 2. CONFIGURE DYNAMIC DATE RANGE FILTER CONSTRAINTS
    const dateMatch = {};
    if (startDate) dateMatch.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateMatch.$lte = end;
    }

    if (startDate || endDate) {
      invoiceMatchCriteria.updatedAt = dateMatch; // Track invoices settled in this timeframe
    }

    // 3. RUN ENTERPRISE PERFORMANCE AGGREGATION PIPELINE
    const report = await Invoice.aggregate([
      { $match: invoiceMatchCriteria },
      { $unwind: "$items" },
      { $match: { "items.itemType": "RETAIL_STOCK" } }, // Exclude tuition course tracks cleanly
      // Group lines by the unique product referenceId
      {
        $group: {
          _id: "$items.referenceId",
          totalQuantitySold: { $sum: "$items.quantity" },
          totalNetRevenue: { $sum: "$items.totalPrice" }, // pre-tax subtotal line pricing
        },
      },
      // Join with the Products collection to extract names, brands, barcodes, and stock levels
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      // DYNAMIC CONSOLIDATION STAGE: Group by BARCODE to merge multi-branch stock balances cleanly
      {
        $group: {
          _id: "$productDetails.barcode", // Group everything sharing the same barcode string layout
          productName: { $first: "$productDetails.productName" },
          brand: { $first: "$productDetails.brand" },
          modelName: { $first: "$productDetails.modelName" },
          retailPrice: { $first: "$productDetails.retailPrice" },
          totalQuantitySold: { $sum: "$totalQuantitySold" },
          totalNetRevenue: { $sum: "$totalNetRevenue" },
          currentGlobalStockLeft: { $sum: "$productDetails.stockCount" },
        },
      },
      // Clean up fields output schema layout mapping
      {
        $project: {
          barcode: "$_id",
          _id: 0,
          productName: 1,
          brand: { $ifNull: ["$brand", "-"] },
          modelName: { $ifNull: ["$modelName", "-"] },
          retailPrice: 1,
          totalQuantitySold: 1,
          totalNetRevenue: 1,
          currentStockLeft: "$currentGlobalStockLeft",
        },
      },
      // Sort performance output: Highest revenue generators show up first
      { $sort: { totalNetRevenue: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      message:
        "Product sales performance report compiled / สรุปยอดขายสินค้าเรียบร้อยแล้ว",
      data: {
        timeframe: {
          startDate: startDate || "All time",
          endDate: endDate || "All time",
        },
        itemsCount: report.length,
        rankingList: report,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Get a list of all unpaid invoices past their due date with student contact info
 * @route   GET /api/financial-reports/overdue-invoices
 * @access  Private (Admin & Manager only)
 */
export const getOverdueInvoicesReport = async (req, res, next) => {
  try {
    const userActiveSchoolId = req.user.activeSchool;
    const { schoolId, page = 1, limit = 10 } = req.query;

    // 1. Configure Branch Scoping (Specific Branch or All Branches)
    const filter = {
      status: { $in: ["DRAFT", "SENT", "OVERDUE"] }, // Still unpaid
      dueDate: { $lt: new Date() }, // Due date is in the past
    };

    if (schoolId !== "ALL") {
      const targetSchoolId = schoolId || userActiveSchoolId;
      filter.schoolId = new mongoose.Types.ObjectId(targetSchoolId);
    }

    // 2. Configure standard cursor pagination calculations
    const skipIndex = (parseInt(page) - 1) * parseInt(limit);
    const dataLimit = parseInt(limit);

    // 3. Fire database queries concurrently for high efficiency
    const [overdueInvoices, totalrecords, totalOverdueSumPipeline] =
      await Promise.all([
        Invoice.find(filter)
          .populate("userId", "name email phoneNumber")
          .populate("schoolId", "schoolName schoolType")
          .sort({ dueDate: 1 }) // Show the oldest overdue debts first so they get prioritized!
          .skip(skipIndex)
          .limit(dataLimit)
          .lean(),
        Invoice.countDocuments(filter),
        Invoice.aggregate([
          { $match: filter },
          { $group: { _id: null, grandSum: { $sum: "$totalAmount" } } },
        ]),
      ]);

    // 4. Extract the aggregated sum safely with a clean fallback default
    const totalOverdueSum = totalOverdueSumPipeline[0]?.grandSum || 0;

    // 5. Map records to calculate exactly how many days each invoice is overdue
    const today = new Date();
    const formattedList = overdueInvoices.map((invoice) => {
      const due = new Date(invoice.dueDate);
      const timeDiff = today.getTime() - due.gateTime();
      const daysOverdue = Math.floor(timeDiff / (1000 * 60 * 60 * 24)); // Convert milliseconds to whole days

      return {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        subTotal: invoice.subTotal,
        tax: invoice.tax,
        dueDate: invoice.dueDate,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
        branchName: invoice.schoolId?.schoolName || "-",
        studate: {
          id: invoice.userId?._id || null,
          name: invoice.userId?.name || {
            th: "ไม่ระบุข้อมูล",
            en: "Unknow student",
          },
          email: invoice.userId?.email || "-",
          phoneNumber: invoice.userId?.phoneNumber || "-",
        },
      };
    });

    return res.status(200).json({
      success: true,
      message:
        "Overdue invoices tracking report compiled / โหลดรายงานอินวอยซ์เกินกำหนดชำระสำเร็จ",
      data: {
        scope:
          schoolId === "ALL"
            ? "All Branches Consolidated / ข้อมูลทุกสาขา"
            : "Single Branch / ข้อมูลเฉพาะสาขา",
        totalOverdueCount: totalrecords,
        totalOverdueAmountSum: Math.round(totalOverdueSum * 100) / 100,
        reportList: formattedList,
        pagination: {
          totalrecords,
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalrecords / dataLimit),
          limit: dataLimit,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};
