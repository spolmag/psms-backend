import { Product } from "../models/Product.model.js";
import { Zone } from "../models/Zone.model.js";
import { ProductCategory } from "../models/ProductCategory.model.js";
import { School } from "../models/School.model.js";

// @desc    Register a new product or classroom equipment asset
// @route   POST /api/products
// @access  Private (Admin & Manager only)
export const createProduct = async (req, res, next) => {
  try {
    const {
      productCategoryId,
      currentZoneId,
      productName,
      description,
      purpose,
      brand,
      modelName,
      barcode,
      serialNumber,
      costPrice,
      retailPrice,
      isVatEnabled,
      stockCount,
      note,
    } = req.body || {};

    const schoolId = req.user.activeSchool;

    if (
      !productCategoryId ||
      !currentZoneId ||
      !productName ||
      !productName.th ||
      !productName.en ||
      !costPrice ||
      !retailPrice
    ) {
      res.status(400);
      throw new Error(
        "Missing required product parameters / กรุณาระบุรายละเอียดสินค้าให้ครบถ้วน",
      );
    }

    const categoryExists = await ProductCategory.findOne({
      _id: productCategoryId,
      schoolId,
    });
    if (!categoryExists) {
      res.status(404);
      throw new Error(
        "Product category not found in this branch! / ไม่มีรายการหมวดสินค้าในสาขานี้",
      );
    }

    const zoneExists = await Zone.findOne({
      _id: currentZoneId,
      schoolId,
    });
    if (!zoneExists) {
      res.status(404);
      throw new Error(
        "Target location zone not found in this branch / ไม่พบโซนจัดเก็บ-วางสินค้าในสาขานี้",
      );
    }

    if (serialNumber) {
      const serialExists = await Product.findOne({ schoolId, serialNumber });
      if (serialExists) {
        res.status(400);
        throw new Error(
          "An serial number is already exists / มีสินค้าหมายเลขเครื่องนี้อยู่ในสาขาแล้ว",
        );
      }
    }

    const product = await Product.create({
      schoolId,
      productCategoryId,
      currentZoneId,
      productName,
      description,
      purpose: purpose || "sales",
      brand,
      modelName,
      barcode,
      serialNumber,
      costPrice,
      retailPrice,
      isVatEnabled: isVatEnabled !== undefined ? isVatEnabled : true,
      stockCount: stockCount !== undefined ? stockCount : 1,
      note,
    });

    return res.status(201).json({
      success: true,
      message:
        "Product record logged successfully / บันทึกข้อมูลสินค้าเรียบร้อยแล้ว",
      data: product,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all products for the active branch with dynamic web store filtering
// @route   GET /api/products
// @access  Private (Shared catalog view)
export const getProducts = async (req, res, next) => {
  try {
    const schoolId = req.user.activeSchool;
    const { categoryId, purpose } = req.query || {};

    const queryFilter = { schoolId, isActive: true };

    if (categoryId) queryFilter.ProductCategoryId = categoryId;
    if (purpose) queryFilter.purpose = purpose;

    const products = await Product.find(queryFilter)
      .populate("productCategoryId", "name")
      .populate("currentZoneId", "zoneName zoneType")
      .sort({ createdAt: -1 }); //Newest load first

    return res
      .status(200)
      .json({ success: true, count: products.length, data: products });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get detailed stock inventory and equipment asset summaries for a product model
// @route   GET /api/products/stock-summary/:brand/:modelName
// @access  Private (Admin & Manager only)
export const getProductStockSummary = async (req, res, next) => {
  try {
    const schoolId = req.user.activeSchool;
    const { brand, modelName } = req.params;

    const items = await Product.find({
      schoolId,
      brand: { $regex: new RegExp("^" + brand + "$", "i") }, //Case-insensitive
      modelName: { $regex: new RegExp("^" + modelName + "$", "i") },
    }).populate("currentZoneId", "zoneName zoneType");

    if (items.length === 0) {
      res.status(404);
      throw new Error(
        "No inventory of this product found / ไม่พบข้อมูลสต็อกสินค้าในสาขานี้",
      );
    }

    let totalBranchStock = 0;
    const salesInventory = [];
    const schoolEquipmentAssets = [];

    items.forEach((item) => {
      totalBranchStock += item.stockCount;

      if (item.purpose === "sales") {
        salesInventory.push({
          productId: item._id,
          zoneName: item.currentZoneId?.zoneName || {
            th: "คลังสินค้า",
            en: "Main stock",
          },
          stockCount: item.stockCount,
          isVatEnabled: item.isVatEnabled,
          retailPrice: item.retailPrice,
        });
      } else if (item.purpose === "equipment") {
        schoolEquipmentAssets.push({
          productId: item._id,
          zoneName: item.currentZoneId?.zoneName || {
            th: "ห้องเรียน",
            en: "Classroom",
          },
          serialNumber:
            item.serialNumber || "No Serial / ไม่ได้บันทึกหมายเลขเครื่อง",
          note: item.note,
        });
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        brand,
        modelName,
        productName: items[0].productName,
        totalBranchStock,
        salesStockTotal: salesInventory.reduce(
          (acc, curr) => acc + curr.stockCount,
          0,
        ),
        salesInventory,
        schoolEquipmentAssets,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Check product inventory counts across all active branches
 * @route   GET /api/products/cross-branch-check
 * @access  Private (Admin/Manager)
 */
export const getCrossBranchStock = async (req, res, next) => {
  try {
    const { barcode, productName } = req.query;

    if (!barcode || !productName) {
      // Shifting an error code parameter so your handler marks it as a 400 Bad Request
      res.status(400);
      throw new Error(
        "Please provide barcode or product name / กรุณาระบุบาร์โค้ดหรือชื่อสินค้า",
      );
    }

    const filter = { isActive: true };
    if (barcode) {
      filter.barcode = barcode;
    } else if (productName) {
      filter.$or = [
        { "productName.en": { $regex: productName, $options: "i" } },
        { "productName.th": { $regex: productName, $options: "i" } },
      ];
    }

    const matchingProducts = await Product.find(filter)
      .populate("schoolId", "schoolName schoolType")
      .select(
        "schoolId productName barcode brand modelName stockCount reservedCount retailPrice",
      )
      .lean();

    const report = matchingProducts.map((product) => {
      const availableStock = product.stockCount - product.reservedCount;
      return {
        productId: product._id,
        schoolId: product.schoolId?._id || null,
        branchName: {
          th: product.schoolId?.schoolName?.th || "ไม่ระบุสาขา",
          en: product.schoolId?.schoolName?.en || "Unknow Branch",
        },
        productName: product.productName,
        brand: product.brand || "-",
        modelName: product.modelName || "-",
        barcode: product.barcode || "-",
        stockCount: product.stockCount,
        reservedCount: product.reservedCount,
        availableStock: Math.max(0, availableStock),
        retailPrice: product.retailPrice,
      };

      return res.status(200).json({
        success: true,
        message: "Cross-branch inventory data compiled / แสดงสต็อกทุกสาขา",
        data: report,
      });
    });
  } catch (error) {
    next(error);
  }
};
