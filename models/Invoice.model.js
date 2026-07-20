import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    required: [true, "Item type is required / กรุณาระบุประเภทรายการ"],
    enum: {
      values: ["STUDENT_TRACK", "RETAIL_STOCK"],
      message: "{VALUE} is not a valid item type",
    },
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [
      true,
      "Reference item ID is required / กรุณาระบุไอดีคอร์สเรียนหรือสินค้า",
    ],
  },
  description: {
    th: { type: String, required: [true, "โปรดระบุรายละเอียดรายการ"] },
    en: { type: String, required: [true, "Please add item description"] },
  },
  quantity: {
    type: Number,
    required: [true, "Please specify quantity / กรุณาระบุจำนวนสินค้า"],
    min: [1, "Quantity can not be less then 1 / จำนวนจะต้องไม่ต่ำกว่า 1"],
    default: 1,
  },
  unitPrice: {
    type: Number,
    required: [true, "Please add unit price / กรุณาระบุราคาต่อหน่วย"],
    min: [
      0,
      "Unit price can not be lower than 0 / ราคาต่อหน่วยต้องไม่ต่ำกว่า 0",
    ],
  },
  totalPrice: {
    type: Number,
    required: [
      true / "Please add total item price / กรุณาระบุราคารวมของรายการ",
    ],
    min: [
      0,
      "Total price can not be lower than 0 / ราคารวมรายการต้องไม่ต่ำกว่า 0",
    ],
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "Invoice must belong to a school branch / อินวอยซ์จะต้องระบุสาขาโรงเรียน-โชว์รูม",
      ],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [
        true,
        "Invoice must be link to customer or student / อินวอยซ์จะต้องระบุลูกค้าหรือนักเรียน",
      ],
    },
    invoiceNumber: {
      type: String,
      required: [
        true,
        "Please provide invoice number / กรุณาระบุเลขที่อินวอยซ์",
      ],
    },
    status: {
      type: String,
      required: [
        true,
        "Please specify invoice status / กรุณาระบุสถานะใบแจ้งหนี้",
      ],
      enum: {
        values: ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"],
        message: "{VALUE} is not a valid invoice status",
      },
      default: "DRAFT",
    },
    subTotal: {
      type: Number,
      required: [
        true,
        "Please add a subtotal price / กรุณาระบุราคารวมก่อนภาษี",
      ],
      min: [0, "Subtotal can not be lower than 0 / ราคารวมต้องไม่ต่ำกว่า 0"],
      default: 0,
    },
    tax: {
      type: Number,
      min: [0, "Tax can not be lower than 0 / ภาษีจะต้องไม่ต่ำกว่า 0"],
      default: 0,
    },
    discount: {
      type: Number,
      min: [0, "Discount can not lower than 0 / ส่วนลดจะต้องไม่ต่ำกว่า 0"],
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: [
        true,
        "Please add final total amount / กรุณาระบุจำนวนเงินสุทธิ",
      ],
      min: [
        0,
        "Total amount can not be lower than 0 / ราคาสุทธิต้องไม่ต่ำกว่า 0",
      ],
      default: 0,
    },
    dueDate: {
      type: Date,
      required: [
        true,
        "Please specify invoice duedate / กรุณาระบุวันครบกำหนดชำระ",
      ],
    },
    items: [invoiceItemSchema],
    note: {
      type: String,
    },
  },
  { timestamps: true },
);

// High-utility updated compound database indexes for lightning-fast finance searches
invoiceItemSchema.index({ schoolId: 1, userId: 1, status: 1 });
invoiceItemSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceItemSchema.index({ dueDate: 1 });

export const Invoice = mongoose.model("Invoice", invoiceItemSchema);
