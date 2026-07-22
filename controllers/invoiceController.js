import {
  createInvoiceService,
  updateInvoiceService,
  deleteInvoiceService,
  getInvoicesService,
} from "../sevices/Invoice.service.js";

/**
 * @desc    Create a new invoice with automated item-level VAT calculations
 * @route   POST /api/v1/invoices
 * @access  Private (Admin/Manager)
 */
export const createInvoice = async (req, res) => {
  try {
    // Send the incoming frontend request body data straight into our service engine
    const invoice = await createInvoiceService(req.body);

    // Return a clean 201 Created status to the frontend browser
    return res.status(201).json({
      success: true,
      message: "Invoice create successfully / สร้างอินวอนซ์ใหม่เรียบร้อยแล้ว",
      data: invoice,
    });
  } catch (error) {
    // Intercept any errors thrown inside the service layer and flag them as a 400 Bad Request
    return res.status(400).json({
      success: false,
      message: "Failed to create invoice / ไม่สามารถสร้างอินวอยซ์ใหม่ได้",
    });
  }
};

/**
 * @desc    Update and completely recalculate an existing invoice's pricing structures
 * @route   PUT /api/v1/invoices/:id
 * @access  Private (Admin/Manager)
 */
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params; // Extracts the invoice database ID from the browser route URL

    // Pass the target invoice ID along with the newly updated body fields to our service engine
    const updatedInvoice = await updateInvoiceService(id, req.body);

    // Return a clean 200 OK status to the frontend browser
    return res.status(200).json({
      success: true,
      message: "Invoice updated successfully / อัพเดทอินวอยซ์แล้ว",
      data: updatedInvoice,
    });
  } catch (error) {
    // Intercept missing records or out-of-stock errors and flag them as a 400 Bad Request
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to update invoice / ไม่สามารถอัพเดทข้อมูลอินวอยซ์ได้",
    });
  }
};

/**
 * @desc    Permanently delete an invoice and release its soft-locked stocks
 * @route   DELETE /api/invoices/:id
 * @access  Private (Admin/Manager)
 */
export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteInvoiceService(id);

    return res.status(200).json({
      success: true,
      message:
        "Invoice deleted and stock reservations released / ลบข้อมูลอินวอยซ์และคืนสต็อกที่กันไว้เรียบร้อยแล้ว",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to delete invoice / ไม่สามารถลบข้อมูลอินวอยซ์ได้",
    });
  }
};

/**
 * @desc    Get filtered, paginated invoice listings with contact expansions
 * @route   GET /api/invoices
 * @access  Private (Admin/Teacher/Manager)
 */
export const getInvoices = async (req, res) => {
  try {
    // Forward the URL parameters (?status=PAID&page=1) right to the filter service
    const results = await getInvoicesService(req.query);

    return res.status(200).json({
      success: true,
      message:
        "Invoices fetched successfully / โหลดข้อมูลอินวอยซ์ทั้งหมดสำเร็จ",
      data: results.invoices,
      pagination: results.pagination,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch invoices / โหลดข้อมูลอินวอยซ์ไม่สำเร็จ",
    });
  }
};
