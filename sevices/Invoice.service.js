import { Invoice } from "../models/Invoice.model.js";
import { School } from "../models/School.model.js";
import { Product } from "../models/Product.model.js";

/**
 * Advanced Soft-Lock Stock Reservation Engine
 * Handles atomic shifting between stockCount and reservedCount based on transitions
 * @param {Object} invoice - The full invoice document
 * @param {String} action - 'RESERVE', 'RELEASE', 'CONFIRM_PAYMENT', 'VOID_PAID'
 */
export const manageStockReservationService = async (invoice, action) => {
  if (!invoice.items || invoice.items.length === 0) return;

  await Promise.all(
    invoice.items.map(async (item) => {
      if (item.itemType !== "RETAIL_STOCK") return;

      let updateQuery = {};

      switch (action) {
        case "RESERVE":
          // Invoice Created (DRAFT/SENT): Lock it down by pushing reservations UP
          updateQuery = { $inc: { reservedCount: item.quantity } };
          break;

        case "RELEASE":
          // Invoice deleted or overwritten before payment: Pull reservations DOWN
          updateQuery = { $inc: { reservedCount: -item.quantity } };
          break;

        case "CONFIRM_PAYMENT":
          // Invoice Paid: Pull reservations DOWN, and pull physical stock DOWN
          updateQuery = {
            $inc: { reservedCount: -item.quantity, stockCount: -item.quantity },
          };
          break;

        case "VOID_PAID":
          // Paid Invoice gets voided: Add physical stock back directly
          updateQuery = { $inc: { stockCount: item.quantity } };
          break;
      }
      // Execute update directly in MongoDB atomically
      await Product.findByIdAndUpdate(item.referenceId, updateQuery, {
        runValidators: true,
      });
    }),
  );
};

export const createInvoiceService = async (invoiceData) => {
  const { schoolId, userId, dueDate, items, discount = 0, note } = invoiceData;

  if (!items || items.length === 0) {
    throw new Error(
      "Invoice must contain at least one item / ต้องมีรายการสินค้าอย่างน้อย 1 รายการ",
    );
  }

  // 1. Fetch dynamic school settings from the database *Note for VAT rate
  const school = await School.findById(schoolId);
  if (!school) {
    throw new Error("School branch not found / ไม่พบข้อมูลสาขา-โรงเรียน");
  }

  // Use school's global VAT rate if enabled at the school level, default to 7%
  const schoolVatRateDecimal = (school.setting?.vatRate ?? 7) / 100;

  let calculatedSubtotal = 0;
  let totalCalculateTax = 0;

  // 2. Loop through and calculate each item dynamically
  const processedItems = await Promise.all(
    items.map(async (item) => {
      const totalPrice = item.quantity * item.unitPrice;
      calculatedSubtotal += totalPrice;

      // Default item-level VAT flag
      let itemHasVat = false;

      // If it is a product, pull its authentic configuration from your Product collection
      if (item.itemType === "RETAIL_STOCK") {
        const product = await Product.findById(item.referenceId);
        if (product) {
          // Dynamic Soft-Lock calculation check
          const availableStock = product.stockCount - product.reservedCount;
          if (availableStock < item.quantity) {
            throw new Error(
              `Not enough available stock for ${product.productName.en}. Available ${availableStock} / จำนวนสินค้าในสต็อกไม่เพียงพอหรือสต็อกคงค้างในอินวอยซ์อื่นอยู่`,
            );
          }
          itemHasVat = product.isVatEnabled ?? true;
        }
      } else if (item.itemType === "STUDENT_TRACK") {
        itemHasVat = item.isVatEnabled ?? false;
      }

      // Calculate tax for this specific line item if enabled
      const itemTax = itemHasVat ? totalPrice * schoolVatRateDecimal : 0;
      totalCalculateTax += itemTax;

      return {
        itemType: item.itemType,
        referenceId: item.referenceId,
        description: {
          th: item.description.th,
          en: item.description.en,
        },
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: totalPrice,
      };
    }),
  );

  // 3. Apply global discount and sum up totals
  // Note: If you want discounts to reduce tax, apply discount to subtotal before line calculations.
  // This standard approach subtracts discount directly from the total payable amount.
  const rawTotal = calculatedSubtotal + totalCalculateTax;
  const calculatedTotalAmount = Math.max(0, rawTotal - discount);

  // 4. Auto-generate a sequential running invoice number (e.g., INV-202607-001)
  const today = new Date();
  const yearMonth = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}`;

  const count = await Invoice.countDocuments({
    schoolId,
    invoiceNumber: new RegExp(`^INV-${yearMonth}-`),
  });
  const runningNumber = (count + 1).toString().padStart(3, "0");
  const invoiceNumber = `INV-${yearMonth}-${runningNumber}`;

  // 5. Build the complete Invoice document architecture structure
  const newInvoice = new Invoice({
    schoolId,
    userId,
    invoiceNumber,
    status: "DRAFT",
    subTotal: calculatedSubtotal,
    tax: Math.round(totalCalculateTax * 100) / 100, // Safe rounding to 2 decimal places
    discount: discount,
    totalAmount: Math.round(calculatedTotalAmount * 100) / 100,
    dueDate,
    items: processedItems,
    note,
  });
  const savedInvoice = await newInvoice.save();
  // SOFT LOCK TRIGGER: Automatically reserve items the moment the invoice is born!
  await manageStockReservationService(savedInvoice, "RESERVE");
  return savedInvoice;
};

export const updateInvoiceService = async (invoiceId, updateData) => {
  const { items, discount, dueDate, note, status } = updateData;

  // 1. Find the existing invoice
  const existingInvoice = await Invoice.findById(invoiceId);
  if (!existingInvoice) {
    throw new Error("Invoice not found / ไม่พบอินวอยซ์ที่ต้องการแก้ไข");
  }

  // Security Lock: Do not allow editing if it is already paid or voided
  if (["PAID", "VOID"].includes(existingInvoice.status)) {
    throw new Error(
      "Can not edit an in voice that already PAID or VOID / ไม่สามารถแก้ไขอินวอยซ์ที่สถานะชำระแล้วหรือสถานะยกเลิก",
    );
  }

  // 2. Fetch the school settings to get the correct VAT rate percentage
  const school = await School.findById(existingInvoice.schoolId);
  if (!school) {
    throw new Error("School branch not found / ไม่พบข้อมูลโรงเรียน-สาขา");
  }
  const schoolVatRateDecimal = (school.setting?.vatRate ?? 7) / 100;

  // 3. Update top-level plain fields if provided by the admin
  if (dueDate) existingInvoice.dueDate = dueDate;
  if (note !== undefined) existingInvoice.note = note;

  // Use new discount value if provided, otherwise keep the old one
  const finalDiscount =
    discount !== undefined ? discount : existingInvoice.discount;
  existingInvoice.discount = finalDiscount;

  // 4. If the items array was modified, re-run your advanced calculations loop
  if (items && items.length > 0) {
    // Before overwriting items, release old reservations so we don't double-lock stock
    await manageStockReservationService(existingInvoice, "RELEASE");
    let calculatedSubtotal = 0;
    let totalCalculatedTax = 0;

    const processedItem = await Promise.all(
      items.map(async (item) => {
        const totalPrice = item.quantity * item.unitPrice;
        calculatedSubtotal += totalPrice;

        let itemHasVat = false;

        if (item.itemType === "RETAIL_STOCK") {
          const product = await Product.findById(item.referenceId);
          if (product) {
            // Updated Soft-Lock calculation check for updates
            const availableStock = product.stockCount - product.reservedCount;
            if (availableStock < item.quantity) {
              throw new Error(
                `Not enough stock for ${product.productName.en}. Available: ${availableStock} / สินค้า ${product.productName.th} มีไม่พอในสต็อก`,
              );
            }

            itemHasVat = product.isVatEnabled ?? true;
          }
        } else if (item.itemType === "STUDENT_TRACK") {
          itemHasVat = item.isVatEnabled ?? false;
        }
        const itemTax = itemHasVat ? totalPrice * schoolVatRateDecimal : 0;
        totalCalculatedTax += itemTax;

        return {
          itemType: item.itemType,
          referenceId: item.referenceId,
          description: {
            th: item.description.th,
            en: item.description.en,
          },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: totalPrice,
        };
      }),
    );

    // Apply recalculated values to document fields
    existingInvoice.items = processedItem;
    existingInvoice.subTotal = calculatedSubtotal;
    existingInvoice.tax = Math.round(totalCalculatedTax * 100) / 100;

    const rawTotal = calculatedSubtotal + totalCalculatedTax;
    existingInvoice.totalAmount =
      Math.round(Math.max(0, rawTotal - finalDiscount) * 100) / 100;

    // Put reservations back for the new items list setup
    await manageStockReservationService(existingInvoice, "RESERVE");
  } else if (discount !== undefined) {
    // Recalculate totals if only the discount changed
    const rawTotal = existingInvoice.subTotal + existingInvoice.tax;
    existingInvoice.totalAmount =
      Math.round(Math.max(0, rawTotal - finalDiscount) * 100) / 100;
  }

  // STATUS-TRANSITION CODE HERE
  const statusChanged = status && status !== existingInvoice.status;
  if (statusChanged) {
    if (status === "PAID") {
      // Shifting status from DRAFT/SENT to PAID -> Confirm payment allocations
      await manageStockReservationService(existingInvoice, "CONFIRM_PAYMENT");
    } else if (status === "VOID") {
      // Shifting status to VOID -> Release reservation holds completely
      await manageStockReservationService(existingInvoice, "RELEASE");
    }
    existingInvoice.status = status;
  }

  // 5. Save the updated invoice back to MongoDB
  return await existingInvoice.save();
};

/**
 * Safely removes an invoice and completely cleans up any lingering soft-lock inventory holds
 * @param {String} invoiceId - The targeted invoice document ID
 */
export const deleteInvoiceService = async (invoiceId) => {
  // 1. Find the target invoice document
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error(
      `Invoice ${invoiceId} not found / ไม่พบข้อมูลอินวอยซ์ ${invoiceId}`,
    );
  }

  // Security Lock: Do not allow deletion if it is a paid transaction record
  if (invoice.status === "PAID") {
    throw new Error(
      "Cannot delete invoice that is already paid. Please VOID instead / ไม่สามารถลบอินวอยซ์ที่ชำระเงินแล้ว กรุณาใช้วิธียกเลิกอินวอยซ์แทน",
    );
  }

  // 2. Clear out any stock reservations if the invoice was in a DRAFT or SENT status
  if (invoice.status === "DRAFT" || invoice.status === "SENT") {
    await manageStockReservationService(invoice, "RELEASE");
  }

  // 3. Delete the actual document from MongoDB
  return await Invoice.findByIdAndDelete(invoiceId);
};

/**
 * Fetches filtered and paginated invoices for manager and admin dashboards
 * @param {Object} queryOptions - Object containing filtering properties from req.query
 */
export const getInvoicesService = async (queryOptions) => {
  const {
    schoolId,
    userId,
    status,
    search,
    page = 1,
    limit = 10,
  } = queryOptions;

  // 1. Build a dynamic MongoDB filter query map
  const filter = {};

  // Core scoping criteria
  if (schoolId) filter.schoolId = schoolId;
  if (userId) filter.userId = userId;
  if (status) filter.status = status;

  // Global search match (searches by invoice number)
  if (search) {
    filter.invoiceNumber = { $regex: search, $options: "i" }; // Case-insensitive matching
  }

  // 2. Configure standard cursor pagination calculations
  const skipIndex = (parseInt(page) - 1) * parseInt(limit);
  const dataLimit = parseInt(limit);

  // 3. Fire database queries simultaneously for efficiency
  const [invoices, totalRecords] = await Promise.all([
    Invoice.find(filter)
      .populate("userId", "firstName lastName email phoneNumber") // Pull student contact info dynamically,
      .sort({ createdAt: -1 }) // Show newest invoice first
      .skip(skipIndex)
      .limit(dataLimit),
    invoices.countDocuments(filter),
  ]);

  return {
    invoices,
    pagination: {
      totalRecords,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalRecords / dataLimit),
      limit: dataLimit,
    },
  };
};
