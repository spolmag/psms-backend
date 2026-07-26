import {
  createPurchaseOrderService,
  receivePurchaseOrderItemsService,
  cancelPurchaseOrderService,
} from "../sevices/PurchaseOrder.service.js";

/**
 * @desc    Open a new corporate purchase order tracking ticket
 * @route   POST /api/purchase-orders
 * @access  Private (Admin/Manager)
 */
export const createPurchaseOrder = async (req, res, next) => {
  try {
    // req.user.id is supplied dynamically via your protect auth middleware
    const po = await createPurchaseOrderService(req.body, req.user.id);

    return res.status(201).json({
      success: true,
      message: "PO open sucessfully / ออกใบสั่งซื้อสินค้าแล้ว",
      data: po,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Log full, partial, or split-shipment item arrivals at the branch warehouse dock
 * @route   PATCH /api/purchase-orders/:id/receive
 * @access  Private (Admin/Manager)
 */
export const receivePurchaseOrderItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Expects an array inside req.body.items containing [{ productId, incrementQuantity, cancelItem }]
    const updatedPo = await receivePurchaseOrderItemsService(
      id,
      req.body.items,
    );

    return res.status(200).json({
      success: true,
      message:
        "Items received and warehouse stock updated / รับเข้าสินค้าและปรับปรุงสต็อกแล้ว",
      data: updatedPo,
    });
  } catch (eror) {
    next(error);
  }
};

/**
 * @desc    Abort an open purchase order and terminate pending balances
 * @route   PATCH /api/purchase-orders/:id/cancel
 * @access  Private (Admin/Manager)
 */
export const cancelPurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body; // Allow optional message explaining why it was cancelled

    const canceledPo = await cancelPurchaseOrderService(id, note);

    res.status(200).json({
      success: true,
      message:
        "Canceled PO and stock balance terminated / ยกเลิกใบสั่งซื้อแล้ว",
      data: canceledPo,
    });
  } catch (error) {
    next(error);
  }
};
