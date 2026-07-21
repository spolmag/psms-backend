import { Invoice } from "../models/Invoice.model.js";
import { School } from "../models/School.model.js";
import { Product } from "../models/Product.model.js";

export const createInvoiceService = async (invoiceData) => {
  const { schoolId, userId, dueDate, items, discount = 0, note } = invoiceData;

  if (!items || items.length === 0) {
    throw new Error(
      "Invoice must contain at least one item / ต้องมีรายการสินค้าอย่างน้อย 1 รายการ",
    );
  }

  // 1. Fetch dynamic school settings from the database *Note for VAT rate
  const school = await School.findById(schoolId);
  if (!schoolId) {
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
      calculatedSubtotal = +totalPrice;

      // Default item-level VAT flag
      let itemHasVat = false;

      // If it is a product, pull its authentic configuration from your Product collection
      if (item.itemType === "RETAIL_STOCK") {
        const product = await Product.findById(item.referenceId);
        if (product) {
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

  // 5. Save the finished Invoice document to MongoDB
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

  return await newInvoice.save();
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
  if (status) existingInvoice.status = status;
  if (dueDate) existingInvoice.dueDate = dueDate;
  if (note !== undefined) existingInvoice.note = note;

  // Use new discount value if provided, otherwise keep the old one
  const finalDiscount =
    discount !== undefined ? discount : existingInvoice.discount;
  existingInvoice.discount = finalDiscount;

  // 4. If the items array was modified, re-run your advanced calculations loop
  if (items && items.length > 0) {
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
            // Check if there is enough stock for the newly requested quantity
            if (product.stockCount < item.quantity) {
              throw new Error(
                `Not enough for ${product.productName.en} / สินค้า ${product.productName.th} มีไม่พอในสต็อก`,
              );
            }
            itemHasVat = product.isVatEnabled ?? true;
          }
        } else if (item.itemType === "STUDENT_TRACK") {
          itemHasVat = item.isVatEnabled ?? false;
        }
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

    // Apply recalculated values to document fields
    existingInvoice.items = processedItem;
    existingInvoice.subTotal = calculatedSubtotal;
    existingInvoice.tax = Math.round(totalCalculatedTax * 100) / 100;

    const rawTotal = calculatedSubtotal + totalCalculatedTax;
    existingInvoice.totalAmount =
      Math.round(Math.max(0, rawTotal - finalDiscount) * 100) / 100;
  }

  // 5. Save the updated invoice back to MongoDB
  return await existingInvoice.save();
};
