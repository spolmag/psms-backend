import {
  requestTransferService,
  completeTranferService,
} from "../sevices/StockTransfer.service.js";

export const createTransferRequest = async (req, res, next) => {
  try {
    // req.user.id comes from your protect middleware token payload
    const transfer = await requestTransferService(req.body, req.user.id);

    return res.status(201).json({
      success: true,
      message:
        "Transfer request create. Stock reserve at source branch / สร้างรายการขอโอนสินค้าสำเร็จ สต็อกที่สาขาต้นทางถูกกันไว้แล้ว ",
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

export const completeTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transfer = await completeTranferService(id);

    return res.status(200).json({
      success: true,
      message:
        "Transfer complete. Stock level synchronized / โอนย้ายสินค้าและรับเข้าสต็อกแล้ว",
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};
