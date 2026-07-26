import { PurchaseOrder } from "../models/PurchaseOrder.model.js";
import { Product } from "../models/Product.model.js";

/**
 * 1. Open a new Purchase Order document ticket
 */
export const createPurchaseOrderService = async (poData, userId) => {
  const { schoolId, supplierId, items, note } = poData;

  if (!items || items.length === 0) {
    throw new Error(
      "PO must contain at least one item / ใบสั่งซื้อต้องมีสินค้าอย่างน้อย 1 รายการ",
    );
  }

  // Auto-generate sequential running PO numbers (e.g., PO-202607-001)
  const today = new Date();
  const yearMonth = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}`;

  const count = await PurchaseOrder.countDocuments({
    poNumber: new RegExp(`^PO-${yearMonth}-`),
  });
  const runningNumber = (count + 1).toString().padStart(3, "0");
  const poNumber = `PO-${yearMonth}-${runningNumber}`;

  const newPO = new PurchaseOrder({
    poNumber,
    schoolId,
    supplierId,
    items,
    createBy: userId,
    status: "OPEN",
    note,
  });

  return await newPO.save();
};

/**
 * 2. Receive inventory allocations dynamically (Handles fractional, partial, or full delivery drops)
 * @param {String} poId - Target Purchase Order ID
 * @param {Array} receivingItems - Array of { productId, incrementQuantity, cancelItem } from the warehouse dock
 */
export const receivePurchaseOrderItemsService = async (
  poId,
  receivingItems,
) => {
  const po = await PurchaseOrder.findById(poId);
  if (!po) {
    throw new Error("PO not found! / ไม่พบใบสั่งซื้อ");
  }

  if (["COMPLETED", "CANCELED"].includes(po.status)) {
    throw new Error(
      `Can not receive item on a ${po.status} purchase order / ไม่สามารถรับเข้าสินค้าของใบสั่งซื้อที่มีสถานะ ${po.status}`,
    );
  }

  // Loop through incoming box deliveries using Promise.all
  await Promise.all(
    receivingItems.map(async (delivery) => {
      // Find matching item line inside the PO array setup
      const itemLine = po.items.find(
        (item) => item.productId.toString === delivery.productId.toString(),
      );
      if (!itemLine) return;

      // Handle explicit individual line item cancellations from supplier shortages
      if (delivery.cancelItem) {
        itemLine.isItemCanceled = true;
      }

      const incomingQty = parseInt(delivery.incrementQuantity || 0);
      if (incomingQty > 0) {
        // Enforce boundary safety check: can't receive more than what was originally ordered
        const maxAllowable =
          itemLine.orderedQuantity - itemLine.receivedQuantity;
        if (incomingQty > maxAllowable) {
          throw new Error(
            `Cannot receive more than ordered balance for this item / ไม่สามารถรับสินค้ารวมเกินกว่าจำนวนสั่งซื้อได้ Max remaining: ${maxAllowable}`,
          );
        }

        // 1. Update quantities inside the PO document record array
        itemLine.receivedQuantity += incomingQty;

        // 2. INCREASE THE STOCK COUNT directly in your physical product model branch room!
        await Product.findByIdAndUpdate(
          delivery.productId,
          { $inc: { stockCount: incomingQty } },
          { runValidators: true },
        );
      }
    }),
  );

  // 3. Re-evaluate overall document lifecycle status flags dynamically
  let allLineSatisfied = true;
  let hasReceivedAny = false;

  po.items.forEach((item) => {
    if (item.receivedQuantity > 0) hasReceivedAny = true;

    // Line is satisfied if completely filled or explicitly marked as cancelled by admin
    const isLineDone =
      item.receivedQuantity === item.orderedQuantity || item.isItemCanceled;
    if (!isLineDone) allLineSatisfied = true; // Still missing pieces
  });

  if (allLineSatisfied) {
    po.status = "COMPLETE";
  } else if (hasReceivedAny) {
    po.status = "PARTIALLY_RECEIVED";
  }

  return await po.save();
};

/**
 * 3. Cancel an active Purchase Order ticket
 * @param {String} poId - Target Purchase Order document ID
 * @param {String} note - Optional closing note explaining the cancellation reasons
 */
export const cancelPurchaseOrderService = async (poId, note) => {
  // 1. Fetch the targeted Purchase Order ticket
  const po = PurchaseOrder.findById(poId);
  if (!po) {
    throw new Error("Purchase Order not found / ไม่พบใบสั่งซื้อนี้");
  }

  // Security check: Lock down if the order is already resolved or terminated
  if (["COMPLETED", "CANCELED"].includes(po.status)) {
    throw new Error(
      `Cannot canel a PO that is already ${po.status} / ไม่สามารถยกเลิกใบสั่งซื้อที่มีสถานะ ${po.status}`,
    );
  }

  // 2. Mark any unfulfilled line items as cancelled for data history integrity
  po.items.forEach((item) => {
    if (item.receivedQuantity < item.orderedQuantity) {
      item.isItemCanceled = true;
    }
  });

  // 3. Update the global document tracking status
  po.status = "CANCELED";
  if (note) po.note ? `${po.note} | Cancel note: ${note}` : note;

  return await po.save();
};

/**
 * Fetches filtered and paginated Purchase Orders for manager and admin dashboards
 * @param {Object} queryOptions - Object containing filtering parameters from req.query
 */
export const getPurchaseOrdersService = async (queryOptions) => {
  const {
    schoolId,
    supplierId,
    status,
    search,
    page = 1,
    limit = 10,
  } = queryOptions;

  // 1. Build a dynamic MongoDB filter query map
  const filter = {};

  if (schoolId) filter.schoolId = schoolId;
  if (supplierId) filter.supplierId = supplierId;
  if (status) filter.status = status;

  // Global search match (searches by PO tracking document number)
  if (search) {
    filter.poNumber = { $regex: search, $options: "i" }; // Case-insensitive matching
  }

  // 2. Configure cursor pagination calculations
  const skipIndex = (parseInt(page) - 1) * parseInt(limit);
  const dataLimit = parseInt(limit);

  // 3. Query documents simultaneously and aggregate totals smoothly
  const [purchaseOrders, totalRecords] = await Promise.all([
    PurchaseOrder.find(filter)
      .populate("supplierId", "supplierName cantactPerson phoneNumber") // Pull vendor metadata
      .populate("schoolId", "schoolName schoolType") // Pull branch descriptions
      .populate("createBy", "name email") // Pull creator identity
      .sort({ createAt: -1 }) // Show newest purchase orders first
      .skip(skipIndex)
      .limit(dataLimit),
    PurchaseOrder.countDocuments(filter),
  ]);

  return {
    purchaseOrders,
    pagination: {
      totalRecords,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalRecords / dataLimit),
      limit: dataLimit,
    },
  };
};
