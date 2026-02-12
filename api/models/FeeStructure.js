const { Schema, model } = require('mongoose');

const feeComponentSchema = new Schema({
  name: { type: String, required: true }, // e.g., "Tuition Fee", "Transportation Fee"
  description: String,
  amount: { type: Number, required: true },
  frequency: {
    type: String,
    enum: ['one-time', 'monthly', 'quarterly', 'half-yearly', 'yearly'],
    default: 'yearly'
  },
  isMandatory: { type: Boolean, default: true },
  applicableClasses: [{ type: Schema.Types.ObjectId, ref: 'Class' }], // Empty means all classes
  category: {
    type: String,
    enum: ['academic', 'transportation', 'facilities', 'activities', 'other'],
    default: 'academic'
  },
  dueDates: [{
    period: String, // e.g., "April 2024", "Q1 2024"
    dueDate: Date,
    amount: Number // Override default amount for this period
  }]
}, { _id: false });

const feeStructureSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  academicYear: { type: String, required: true },
  grade: { type: String, required: true }, // Applicable grade/class
  components: [feeComponentSchema],
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  discounts: [{
    name: String,
    type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    value: Number,
    conditions: String,
    maxDiscount: Number
  }],
  lateFees: {
    gracePeriod: { type: Number, default: 7 }, // days
    penaltyType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    penaltyValue: { type: Number, default: 2 }, // 2% or ₹200
    maxPenalty: Number
  },
  paymentPlans: [{
    name: String, // e.g., "Full Payment", "Installments"
    description: String,
    installments: [{
      name: String,
      percentage: Number, // % of total fee
      dueDate: Date,
      amount: Number
    }]
  }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvalDate: Date,
  effectiveFrom: { type: Date, default: Date.now },
  effectiveTo: Date,
  notes: String
}, { timestamps: true });

// Indexes for efficient queries
feeStructureSchema.index({ academicYear: 1, grade: 1 });
feeStructureSchema.index({ isActive: 1 });
feeStructureSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

module.exports = model('FeeStructure', feeStructureSchema);
