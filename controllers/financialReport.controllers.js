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
