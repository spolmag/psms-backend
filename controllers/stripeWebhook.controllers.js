import { stripe } from "../config/stripe.js";
import { Invoice } from "../models/Invoice.model.js";
import { Payment } from "../models/Payment.model.js";
import { manageStockReservationService } from "../services/Invoice.service.js";

/**
 * @desc    Secure Automated Webhook Receiver endpoint handling Stripe payment events
 * @route   POST /api/webhooks/stripe
 * @access  Public (Called directly by secure Stripe Servers)
 */
export const handleStripeWebhook = async (req, res, next) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    // SECURITY STEP 1: Validate the event signature using your webhook secret to prevent fake spoof attacks!
    // Stripe requires the raw, unparsed request body string binary buffer here to calculate accurate hashes.
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error(`❌ Webhook Signature Verification Failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // AUTOMATED LIFECYCLE PROCESSING ENGINE
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    // Extract the dynamic tracking pointers that embedded into the metadata layout during intent creation!
    const { invoiceId, schoolId, userId } = paymentIntent.metadata;

    try {
      console.log(
        `💰 Stripe Notification: Payment Intent Succeeded for Invoice ID: [${invoiceId}]`,
      );

      // 1. Fetch and verify the targeted invoice record
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        console.error(
          `❌ Webhook Error: Invoice [${invoiceId}] not found in database!`,
        );
        return res
          .status(200)
          .json({ received: true, error: "Invoice not found" }); // Return 200 to Stripe to stop retries
      }

      // If it's already marked paid (e.g. from a duplicate webhook blast), resolve cleanly
      if (invoice.status === "PAID") {
        return res.status(200).json({ received: true, status: "Already paid" });
      }

      // 2. LOG THE PERMANENT RECORD INTO SUCCESSFUL PAYMENTS LEDGER COLLECTION
      await Payment.create({
        schoolId: invoice.schoolId,
        invoiceId: invoice._id,
        paymentMethod: "STRIPE",
        transactionReference: paymentIntent.id, // Stores the unique Stripe Charge/Intent Identification index
        amountPaid: parseFloat(paymentIntent.amount_received) / 100, // Convert satangs integer layout cleanly back to THB decimals
        status: "SUCCESSFUL",
        note: `Automated Stripe Checkout settlement. Charge ID: ${paymentIntent.latest_charge || "-"}`,
      });

      // 3. EXECUTE INVENTORY SOFT-LOCK DROPS!
      // This triggers the CONFIRM_PAYMENT query inside your reservation engine to clear reserved counts and drop stock shelf balances!
      await manageStockReservationService(invoice, "CONFIRM_PAYMENT");

      // 4. TRANSITION THE INVOICE LIFE-CYCLE STATUS INTO PAID
      invoice.status = "PAID";
      await invoice.save();

      console.log(
        `✅ Webhook Complete: Invoice [${invoice.invoiceNumber}] set to PAID. Stock counts auto-adjusted`,
      );
    } catch (dbError) {
      console.error(
        `❌ Webhook Core Processing Database Failure: ${dbError.message}`,
      );
      return next(dbError);
    }
  }

  // Acknowledge receipt of the webhook notification to Stripe with a clear 200 response to prevent retry loops
  return res.status(200).json({ received: true });
};
