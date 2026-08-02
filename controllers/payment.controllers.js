import { Payment } from "../models/Payment.model.js";
import { Invoice } from "../models/Invoice.model.js";
import { manageStockReservationService } from "../sevices/Invoice.service.js";
import { stripe } from "../config/stripe.js";

/**
 * @desc    Record a new transaction payment entry against an invoice
 * @route   POST /api/payments
 * @access  Private (Admin/Manager)
 */
export const recordPayment = async (req, res, next) => {
  try {
    const {
      schoolId,
      invoiceId,
      paymentMethod,
      transactionReference,
      amountPaid,
      status,
      note,
    } = req.body;

    // 1. Verify the targeted invoice exists
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      res.status(404);
      throw new Error("Linked invoice not found / ไม่พบข้อมูลอินวอยซ์");
    }

    if (invoice.status === "PAID") {
      res.status(400);
      throw new Error(
        "This invoice is already fully paid / อินวอยซ์นี้ชำระเงินครบถ้วนแล้ว",
      );
    }

    // 2. Create the payment record entry
    const payment = await Payment.create({
      schoolId,
      invoiceId,
      paymentMethod,
      transactionReference,
      amountPaid,
      status: status || "SUCCESSFUL", // Defaults to successful for manual cash/bank logging
      note,
    });

    // 3. If payment is successful, transition invoice state and execute inventory Soft-Locks!
    if (payment.status === "SUCCESSFUL") {
      // Shifting status to PAID triggers the CONFIRM_PAYMENT query inside your reservation engine
      await manageStockReservationService(invoice, "CONFIRM_PAYMENT");

      invoice.status = "PAID";
      await invoice.save();
    }

    return res.status(201).json({
      success: true,
      message:
        "Payment transaction logged successfully / บันทึกรายการชำระเงินแล้ว",
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get filtered, paginated transaction histories for financial auditing
 * @route   GET /api/payments
 * @access  Private (Admin/Manager)
 */
export const getPayments = async (req, res, next) => {
  try {
    const { schoolId, paymentMethod, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (schoolId) filter.schoolId = schoolId;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (status) filter.status = status;

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);
    const dataLimit = parseInt(limit);

    const [payments, totalRecords] = await Promise.all([
      Payment.find(filter)
        .populate("invoiceId", "invoiceNumber totalAmount")
        .sort({ paidAt: -1 })
        .skip(skipIndex)
        .limit(dataLimit),
      Payment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Financial payments log compiled / รายการการชำระเงินสำเร็จ",
      data: payments,
      pagination: {
        totalRecords,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / dataLimit),
        limit: dataLimit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a secure Stripe Payment Intent for Credit Card or PromptPay checkouts
 * @route   POST /api/payments/create-intent
 * @access  Private (Registered User/Student/Parent)
 */
export const createStripePaymentIntent = async (req, res, next) => {
  try {
    const { invoiceId, paymentMethodType = "card" } = req.body; // paymentMethodType can be 'card' or 'promptpay'

    // 1. Fetch the invoice from database to verify the correct amount due
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      res.status(404);
      throw new Error("Target invoice not found / ไม่พบข้อมูลอินวอยซ์");
    }

    // Security Gate: Prevent double-payments
    if (invoice.status === "PAID") {
      res.status(400);
      throw new Error(
        "This invoice has already been settled / อินวอยซ์นี้มีการชำระเงินแล้ว",
      );
    }

    // 2. CONVERT THE AMOUNT PAYABLE TO STRIPE'S STANDARDS
    // Stripe requires all values to be passed as the smallest currency unit (Integers / Satangs for THB)
    // Example: 150.50 THB must be passed to Stripe as 15050 satangs.
    const amountInSatangs = Math.round(invoice.totalAmount * 100);

    if (amountInSatangs <= 0) {
      res.status(400);
      throw new Error(
        "Invoice total must be greater than zero / ยอดชำระจะต้องมากกว่า 0 บาท",
      );
    }

    // 3. REQUEST AN OFFICIAL PAYMENT INTENT FROM STRIPE
    // We pass dynamic metadata so our server can link the successful transaction back to this invoice later.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSatangs,
      currency: "thb",
      payment_method_types: [paymentMethodType], // Dynamically handles ['card'] or ['promptpay']
      metadata: {
        invoiceId: invoice._id.toString(),
        schoolId: invoice.schoolId.toString(),
        userId: req.user._id.toString(), // Logs staff who executing the transaction
      },
    });

    // 4. RETURN THE CRITICAL CLIENT_SECRET KEY TO YOUR FRONTEND
    return res.status(200).json({
      success: true,
      message:
        "Stripe payment intent established / สร้างเซซชั่นชำระเงิน Stripe สำเร็จ",
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: invoice.totalAmount,
        currency: "thb",
      },
    });
  } catch (error) {
    next(error);
  }
};
