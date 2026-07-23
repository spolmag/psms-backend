import { StockTransfer } from "../models/StockTransfer.model.js";
import { Product } from "../models/Product.model.js";

/**
 * 1. Request a transfer (Soft-locks stock at the source branch)
 */

export const requestTransferService = async (transferData, userId) => {
  const { productBarcode, fromSchoolId, toSchoolId, quantity, note } =
    transferData;

  // Find the exact product record at the sending branch
  const sourceProduct = await Product.findOne({
    barcode: productBarcode,
    schoolId: fromSchoolId,
  });

  if (!sourceProduct) {
    throw new Error(
      "Product not found at source branch / ไม่พบสินค้าที่สาขาต้อนทาง",
    );
  }

  // Use Soft-Lock check formula
  const availableStock = sourceProduct.stockCount - sourceProduct.reservedCount;
  if (availableStock < quantity) {
    throw new Error(
      `Not enough available stock to transfer. Available ${availableStock} / สต็อกสินค้าที่สาขาต้นทางมีไม่พอ`,
    );
  }

  // Soft-lock it down: Push reservations UP at Branch B so they don't accidentally sell it locally
  sourceProduct.reservedCount += quantity;
  await sourceProduct.save();

  // Create the tracking log ticket
  const transfer = new StockTransfer({
    productBarcode,
    fromSchoolId,
    toSchoolId,
    quantity,
    requestedBy: userId,
    status: "PENDING",
    note,
  });

  return await transfer.save();
};

/**
 * 2. Complete a transfer (Fired when destination branch clicks "Receive")
 */
export const completeTranferService = async (transferId) => {
  const transfer = await StockTransfer.findById(transferId);
  if (!transfer || transfer.status !== "PENDING") {
    throw new Error(
      "Invalid or un-processable transfer ticket / เอกสารโอนสินค้าไม่ถูกต้อง หรือดำเนินการไปแล้ว",
    );
  }

  // Fetch product configurations at both branches
  const sourceProduct = await Product.findOne({
    barcode: transfer.productBarcode,
    schoolId: transfer.fromSchoolId,
  });
  let destProduct = await Product.findOne({
    barcode: transfer.productBarcode,
    schoolId: transfer.toSchoolId,
  });

  if (!sourceProduct) {
    throw new Error("Source product record missing / ไม่พบสินค้าที่สาขาต้นทาง");
  }

  // --- BRANCH B LOGIC (Subtract entirely from inventory pool) ---
  sourceProduct.reservedCount -= transfer.quantity;
  sourceProduct.stockCount -= transfer.quantity;
  await sourceProduct.save();

  // --- BRANCH A LOGIC (Add safely to arrival location) ---
  if (destProduct) {
    destProduct.stockCount += transfer.quantity;
    await destProduct.save();
  } else {
    // If Branch A has never owned this product before, clone the configuration template from Branch B!
    destProduct = new Product({
      schoolId: transfer.toSchoolId,
      productCategoryId: sourceProduct.productCategoryId,
      currentZoneId: sourceProduct.currentZoneId, //Admin can change this later
      productName: sourceProduct.productName,
      purpose: sourceProduct.purpose,
      brand: sourceProduct.brand,
      modelName: sourceProduct.modelName,
      barcode: sourceProduct.barcode,
      serialNumber: `${sourceProduct.serialNumber || "TRF"}-${Date.now()}`,
      costPrice: sourceProduct.costPrice,
      retailPrice: sourceProduct.retailPrice,
      isVatEnabled: sourceProduct.isVatEnabled,
      stockCount: transfer.quantity,
      reservedCount: 0,
    });
    await destProduct.save();
  }

  // Update tracking state status
  transfer.status = "COMPLETED";
  return await transfer.save();
};
