import { ProductCategory } from "../models/ProductCategory.model.js";

// @desc    Create a new product catalog category tab (Admin & Manager Only)
// @route   POST /api/product-categories
// @access  Private (Admin & Manager only)
export const createProductCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body || {};
    const schoolId = req.user.activeSchool;

    if (!name || !name.th || !name.en) {
      res.status(400);
      throw new Error("Missing category name fields / กรุณาระบุชื่อหมวดสินค้า");
    }

    const categoryExists = await ProductCategory.findOne({
      schoolId,
      $or: [{ "name.en": name?.en }, { "name.th": name?.th }],
    });
    if (categoryExists) {
      res.status(400);
      throw new Error(
        "Product category with this name already exists with this branch / ชื่อกลุ่มสินค้านี้มีอยู่ในสาขานี้แล้ว",
      );
    }

    const category = await ProductCategory.create({
      schoolId,
      name,
      description,
    });

    res.status(201).json({
      success: true,
      message:
        "Product category create successfully / สร้างกลุ่มสินค้าใหม่สำเร็จ",
      data: category,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all active product category tabs for web store layout renderings
// @route   GET /api/product-categories
// @access  Private
export const getProductCategories = async (req, res, next) => {
  try {
    const schoolId = req.user.activeSchool;
    const categories = await ProductCategory.find({
      schoolId,
      isActive: true,
    }).sort({ "name.en": 1 });

    return res
      .status(200)
      .json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    return next(error);
  }
};
