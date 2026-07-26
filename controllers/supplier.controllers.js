import { Supplier } from "../models/Supplier.model.js";

/**
 * @desc    Register a new corporate vendor/supplier
 * @route   POST /api/suppliers
 * @access  Private (Admin/Manager)
 */
export const createSupplier = async (req, res, next) => {
  try {
    const { supplierName, taxId, contactPerson, email, phoneNumber, address } =
      req.body;

    const supplierExists = await Supplier.findOne({ taxId });
    if (supplierExists) {
      resnext.status(400);
      throw new Error(
        "A supplier with this tax ID already exists / มีซัพพลายเออร์รหัสผู้เสียภาษีนี้อยู่แล้ว",
      );
    }

    const supplier = await Supplier.create({
      supplierName,
      taxId,
      contactPerson,
      email,
      phoneNumber,
      address,
    });

    return res.status(201).json({
      success: true,
      message:
        "Supplier registed successfully / บันทึกข้อมูลซัพพลายเออร์ใหม่แล้ว",
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get filtered, paginated supplier listings for dashboard registries
 * @route   GET /api/suppliers
 * @access  Private (Admin/Manager)
 */
export const getSuppliers = async (req, res, next) => {
  try {
    const { search, isActive, page = 1, limit = 10 } = req.query;
    const filter = {};

    // Filter by active status if explicitly requested
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Global text match search (Searches by English Name, Thai Name, or Tax ID)
    if (search) {
      filter.$or = [
        { "supplierName.en": { $regex: search, $options: "i" } },
        { "supplierName.th": { $regex: search, $options: "i" } },
        { taxId: { $regex: search, $options: "i" } },
      ];
    }

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);
    const dataLimit = parseInt(limit);

    const [suppliers, totalRecords] = await Promise.all([
      Supplier.find(filter)
        .sort({ createAt: -1 })
        .skip(skipIndex)
        .limit(dataLimit),
      Supplier.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Suppliers list compiled / โหลดข้อมูลซัพพลายเออร์สำเร็จ",
      data: suppliers,
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
 * @desc    Update corporate supplier profiles
 * @route   PUT /api/suppliers/:id
 * @access  Private (Admin/Manager)
 */
export const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updateSupplier = Supplier.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true },
    );

    if (!updateSupplier) {
      res.status(404);
      throw new Error("Supplier not found / ไม่พบซัพพลายเออร์นี้ในระบบ");
    }

    return res.status(200).json({
      success: true,
      message:
        "Supplier profile updated successfully / อัพเดทข้อมูลซัพพลายเออร์สำเร็จ",
      data: updateSupplier,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get an individual supplier profile by its MongoDB ID
 * @route   GET /api/suppliers/:id
 * @access  Private (Admin/Manager)
 */
export const getSupplierById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findById(id);

    if (!supplier) {
      res.status(404);
      throw new Error("Supplier not found / ไม่พบข้อมูลซัพพลายเออร์");
    }

    return res.status(200).json({
      success: true,
      message: "Supplier details retrieved / แสดงรายละเอียกข้อมูลซัพพลายเออร์",
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};
