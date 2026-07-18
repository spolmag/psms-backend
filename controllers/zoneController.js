import { Zone } from "../models/Zone.model.js";

// @desc    Create a new physical zone / facility room space
// @route   POST /api/zones
// @access  Private (Admin & Manager only)
export const createZone = async (req, res, next) => {
  try {
    const { zoneName, zoneType, maxStudentCapacity, note } = req.body || {};
    const schoolId = req.user.activeSchool;

    if (!zoneName || !zoneName.th || !zoneName.en || !zoneType) {
      res.status(400);
      throw new Error(
        "Missing required zone fields / กรุณาระบุชื่อโซน-ประเภทโซน",
      );
    }

    const zoneExists = await Zone.findOne({
      schoolId,
      $or: [{ "zoneName.en": zoneName?.en }, { "zoneName.th": zoneName?.th }],
    });

    if (zoneExists) {
      res.status(400);
      throw new Error(
        "A zone with this name already in this branch / มีโซนชื่อนี้ในสาขานี้แล้ว",
      );
    }

    const zone = await Zone.create({
      schoolId,
      zoneName,
      zoneType,
      // For non-classroom types (like stock_room), if maxStudentCapacity is sent, ignore it or set to undefined
      maxStudentCapacity:
        zoneType === "classroom" ? maxStudentCapacity : undefined,
      note,
    });

    return res.status(201).json({
      success: true,
      message: "Zone recored successfully / บันทึกข้อมูลโซนในสาขาเรียบร้อยแล้ว",
      data: zone,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all active zones / facility rooms for the current branch context
// @route   GET /api/zones
// @access  Private (Authenticated users)
export const getZones = async (req, res, next) => {
  try {
    const schoolId = req.user.activeSchool;

    const zones = await Zone.find({ schoolId, isActive: true }).sort({
      zoneType: 1,
      "zoneName.en": 1,
    });

    return res
      .status(200)
      .json({ success: true, count: zones.length, data: zones });
  } catch (error) {
    return next(error);
  }
};
