import mongoose from "mongoose";

import { Payment } from "../models/Payment.model.js";
import { Invoice } from "../models/Invoice.model.js";
import { Expense } from "../models/Expense.model.js";
import { School } from "../models/School.model.js";

/**
 * @desc    Generate comprehensive branch financial summaries (Including Net Profit & Expense isolation)
 * @route   GET /api/financial-reports/dashboard-summary
 * @access  Private (Admin & Manager only)
 */
export const getDashboardSummary = async (req, res, next) => {
  try {
    const schoolId = req.user.activeSchool;
    const { startDate, endDate } = req.query;

    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

    // 1. DYNAMIC DATE RANGE FILTER SETUP
    const dateMatch = {};
    if (startDate) dateMatch.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateMatch.$lte = end;
    }

    const hasDateFilter = startDate || endDate;

    // Build specific matching constraints dictionaries for each collection type
    const paymentMatchCriteria = {
      schoolId: schoolObjectId,
      status: "SUCCESSFUL",
    };
    if (hasDateFilter) paymentMatchCriteria.paidAt = dateMatch;

    const invoiceMatchCriteria = {
      schoolId: schoolObjectId,
      status: { $in: ["DRAFT", "SENT", "OVERDUE"] },
    };
    if (hasDateFilter) invoiceMatchCriteria.dueDate = dateMatch;

    const paidInvoiceMatchCriteria = {
      schoolId: schoolObjectId,
      status: "PAID",
    };
    if (hasDateFilter) paidInvoiceMatchCriteria.updatedAt = dateMatch;

    const expenseMatchCriteria = { schoolId: schoolObjectId, status: "PAID" };
    if (hasDateFilter) expenseMatchCriteria.paidAt = dateMatch;

    // 2. FIRE ALL AGGREGATION PIPELINES SIMULTANEOUSLY FOR HIGH SPEED PERFORMANCE
    const [
      revenuePipeline,
      receivablesPipeline,
      streamPipeline,
      expensePipeline,
    ] = await Promise.all([
      // A. Revenue & VAT Inflows Engine
      Payment.aggregate([
        { $match: paymentMatchCriteria },
        {
          $lookup: {
            from: "invoices",
            localField: "invoiceId",
            foreignField: "_id",
            as: "invoiceDetails",
          },
        },
        { $unwind: "$invoiceDetails" },
        {
          $project: {
            amountPaid: 1,
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
                  $divide: [
                    "$invoiceDetails.tax",
                    "$invoiceDetails.totalAmount",
                  ],
                },
              ],
            },
          },
        },
        {
          $project: {
            netRevenue: {
              $multiply: ["$amountPaid", "$netRevenueMultiplier"],
            },
            collectedVat: { $multiply: ["$amountPaid", "$taxMultiplier"] },
          },
        },
        {
          $group: {
            _id: null,
            totalNetRevenue: { $sum: "$netRevenue" },
            totalCollectedVat: { $sum: "$collectedVat" },
          },
        },
      ]),

      // B. Receivables Engine (Outstanding Untaxed Debts)
      Invoice.aggregate([
        { $match: invoiceMatchCriteria },
        { $group: { _id: null, totalOutstandingNet: { $sum: "$subTotal" } } },
      ]),

      // C. Revenue Stream Sorter Engine
      Invoice.aggregate([
        { $match: paidInvoiceMatchCriteria },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.itemType",
            streamRevenue: { $sum: "$items.totalPrice" },
          },
        },
      ]),

      // D. NEW EXPENSES ENGREEMENT ENGINE (Aggregates pre-tax subTotal outflows)
      Expense.aggregate([
        { $match: expenseMatchCriteria },
        { $group: { _id: null, totalOutFlows: { $sum: "$subTotal" } } },
      ]),
    ]);

    // 3. SECURELY EXTRACT VALUES WITH CLEAN FALLBACK BOUNDARIES
    const cleanRevenueData = revenuePipeline[0] || {
      totalNetRevenue: 0,
      totalCollectedVat: 0,
    };
    const totalOutstanding = receivablesPipeline[0]?.totalOutstandingNet || 0;
    const totalExpenses = expensePipeline[0]?.totalOutFlows || 0;

    // 4. COMPUTE NET PROFIT METRICS
    // Net Profit = (True Income Generated) - (True Expenses Incurred)
    const netSchoolProfit = cleanRevenueData.totalNetRevenue - totalExpenses;

    // 5. MAP REVENUE STREAMS
    const streamReport = { tuitionRevenue: 0, retailRevenue: 0 };
    streamPipeline.forEach((stream) => {
      if (stream._id === "STUDENT_TRACK")
        streamReport.tuitionRevenue = stream.streamRevenue;
      if (stream._id === "RETAIL_STOCK")
        streamReport.retailRevenue = stream.streamRevenue;
    });

    // 6. OUTPUT COMPREHENSIVE TAX-ISOLATED DATA MAP RESPONSE
    return res.status(200).json({
      success: true,
      message:
        "Branch P&L financial summary dashboard compiled / สรุปงบกำไร-ขาดทุนของโรงเรียน-สาขาสำเร็จ",
      data: {
        timeframe: {
          startDate: startDate || "All time",
          endDate: endDate || "All time",
        },
        financials: {
          grossRevenue:
            Math.round(cleanRevenueData.totalNetRevenue * 100) / 100,
          totalExpense: Math.round(totalExpenses * 100) / 100,
          netProfit: Math.round(netSchoolProfit * 100) / 100,
          collectedVatLiability:
            Math.round(cleanRevenueData.totalCollectedVat * 100) / 100,
          outstandingReceivables: Math.round(totalOutstanding * 100) / 100,
        },
        revenueStreams: streamReport,
      },
    });
  } catch (error) {
    return next(error);
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

/**
 * @desc    Compile Input Tax Report data for Thai Revenue Dept (รายงานภาษีซื้อ)
 * @route   GET /api/financial-reports/thai-input-tax
 * @access  Private (Admin & Manager only)
 */
export const getThaiInputTaxReport = async (req, res, next) => {
  try {
    const schoolId = req.user.activeSchool;
    const { year, month } = req.query; // Expecting parameters like ?year=2026&month=07

    if (!year || !month) {
      res.status(400);
      throw new Error(
        "Please specify accounting year and month / โปรดระบุเดือน-ปีสำหรับรายงานภาษีซื้อ",
      );
    }

    // Configure dates to filter exactly for the target month (e.g., July 1st to July 31st)
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(
      parseInt(year),
      parseInt(month),
      0,
      23,
      59,
      59,
      999,
    );

    // Fetch settled expenses that carry tax lines within this target month
    const paidExpenses = await Expense.find({
      schoolId,
      status: "PAID",
      paidAt: { $gte: startDate, $lte: endDate },
      taxAmount: { $gt: 0 }, // Only pick rows that contain input taxes
    })
      .populate("payeeSupplierId", "supplierName taxId address")
      .populate("payeeUserId", "name taxId address")
      .sort({ paidAt: 1 })
      .lean();

    // Map records directly to match the report columns layout
    const formattedRecords = paidExpenses.map((exp, idx) => {
      const payeeName =
        exp.payeeSupplierId?.supplierName || exp.payeeUserId?.name;
      const payeeTaxId =
        exp.payeeSupplierId?.taxId || exp.payeeUserId?.taxId || "-";

      return {
        index: idx + 1,
        date: exp.paidAt,
        documentNumber: exp.transactionReference || exp.expenseNumber, // Tax Invoice invoice number column
        payeeName: payeeName?.th || payeeName?.en || "-",
        taxId: payeeTaxId,
        branch: "สำนักงานใหญ่", // Default corporate fallback descriptor
        subTotal: exp.subTotal,
        vatAmount: exp.taxAmount,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Input tax report compiled / ออกรายงานภาษีซื้อสำเร็จ",
      data: formattedRecords,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Compile Output Tax Report data for Thai Revenue Dept (รายงานภาษีขาย)
 * @route   GET /api/financial-reports/thai-output-tax
 * @access  Private (Admin & Manager only)
 */
export const getThaiOutputTaxReport = async (req, res, next) => {
  try {
    const schoolId = req.user.activeSchool;
    const { year, month } = req.query;

    if (!year || !month) {
      res.status(400);
      throw new Error(
        "Please specify accounting year and month / กรุณาระบุเดือน-ปี สำหรับรายงานภาษีขาย",
      );
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(
      parseInt(year),
      parseInt(month),
      0,
      23,
      59,
      59,
      999,
    );

    // Fetch invoices settled as PAID within this targeted month window
    const paidInvoices = await Invoice.find({
      schoolId,
      status: "PAID",
      updatedAt: { $gte: startDate, $lte: endDate },
      tax: { $gte: 0 }, // Only grab items carrying active output VAT
    })
      .populate("userId", "name taxId")
      .sort({ updatedAt: 1 })
      .lean();

    // Map records to match the report columns layout
    const formattedRecords = paidInvoices.map((inv, idx) => {
      return {
        index: idx + 1,
        date: inv.updatedAt,
        invoiceNumber: inv.invoiceNumber,
        customerName:
          inv.userId?.name?.th || inv.userId?.name?.en || "ลูกค้าปลีก",
        taxId: inv.userId?.taxId || "-",
        branch: "สำนักงานใหญ่",
        subTotal: inv.subTotal,
        taxAmount: inv.tax,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Thai output tax report compiled / ออกรายงานภาษีขายสำเร็จ",
      data: formattedRecords,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Compile specific Expense voucher data to populate a Thai 50 ทวิ Withholding Tax Certificate, รับรองภาษีหัก ณ ที่จ่าย
 * @route   GET /api/financial-reports/withholding-tax-certificate/:expenseId
 * @access  Private (Admin & Manager only)
 */
export const getThaiWithholdingTaxCertificate = async (req, res, next) => {
  try {
    const { expenseId } = req.params;

    // 1. Fetch the targeted expense document and expand payee details
    const expense = await Expense.findById(expenseId)
      .populate("payeeSupplierId", "supplierName taxId address phoneNumber")
      .populate("payeeUserId", "name taxId address phoneNumber")
      .populate("schoolId", "schoolName taxId address email phoneNumber")
      .lean();

    if (!expense) {
      res.status(404);
      throw new Error("Expense record not found / ไม่พบรายการจ่ายในระบบ");
    }

    // Security & Business Validation: Ensure it has an actual withholding tax line item recorded
    if (expense.taxAmount <= 0) {
      res.status(400);
      throw new Error(
        "This expense does not contain a withholding tax line / รายการจ่ายนี้ไม่ได้บันทึกภาษีหัก ณ ที่จ่าย",
      );
    }

    // 2. Identify the Payee (ผู้ถูกหักภาษี ณ ที่จ่าย)
    const payeeName =
      expense.payeeSupplierId?.supplierName || expense.payeeUserId?.name;
    const payeeTaxId =
      expense.payeeSupplierId?.taxId || expense.payeeUserId?.taxId || "-";
    const payeeAddress =
      expense.payeeSupplierId?.address || expense.payeeUserId?.address || "-";

    // 3. Map out the Thai Revenue Department Tax Category Code Classification Row (ประเภทเงินได้)
    let taxCategoryThaiText = "ค่าบริการ / ค่าจ้าง";
    let taxCategoryEnglishText = "Service Fee / Hired Labor";

    if (expense.expenseCategory === "TEACHER_FEE") {
      taxCategoryThaiText = "ค่าสอน / ค่าวิชาชีพอิสระ (มาตรา 40(6))";
      taxCategoryEnglishText = "Teaching Fee / Professional Fee";
    } else if (expense.expenseCategory === "SALARY") {
      taxCategoryThaiText = "เงินเดือน / ค่าจ้าง (มาตรา 40(1))";
      taxCategoryEnglishText = "Salary / Wages";
    }

    // 4. Formulate the comprehensive 50 ทวิ document payload response mapping
    const certificateData = {
      // SECTION 1: Payer Details (ผู้มีหน้าที่หักภาษี ณ ที่จ่าย - Your School Branch)
      payer: {
        schoolName: expense.schoolId?.schoolName || "-",
        taxId: expense.schoolId?.taxId || "-",
        address: expense.schoolId?.address || "-",
      },

      // SECTION 2: Payee Details (ผู้ถูกหักภาษี ณ ที่จ่าย - Teacher or Technician Contractor)
      payee: {
        name: payeeName?.th || payeeName?.en || "-",
        taxId: payeeTaxId,
        address: payeeAddress?.th || payeeAddress?.en || payeeAddress || "-",
      },

      // SECTION 3: Transaction Details (รายการจ่ายเงินและภาษีที่หักไว้)
      transaction: {
        expenseNumber: expense.expenseNumber,
        paymentDate: expense.paidAt || expense.updatedAt,
        incomeType: {
          th: taxCategoryThaiText,
          en: taxCategoryEnglishText,
        },
        amountPaid: expense.subTotal, // Base taxable income column
        withholdingTaxAmount: expense.taxAmount, // Amount of tax deducted and held
        taxRatePercent: Math.round(
          (expense.taxAmount / expense.subTotal) * 100,
        ), // Dynamically computes tax rate (e.g., 3%)
      },

      // SECTION 4: Sign-off Defaults Checklist
      payoutMethodDescriptor: expense.paymentMethod || "BANK_TRANSFER",
    };

    return res.status(200).json({
      success: true,
      message:
        "Thai Withholding Tax Certificate (50 ทวิ) compiled / ออกใบรับรองหักภาษี ณ ที่จ่าย (50 ทวิ) สำเร็จ",
      data: certificateData,
    });
  } catch (error) {
    next(error);
  }
};
