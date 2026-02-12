const { Schema, model } = require('mongoose');

const scholarshipSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['merit', 'need_based', 'sports', 'cultural', 'special_achievement', 'sibling', 'staff_ward', 'other'],
    required: true
  },
  category: {
    type: String,
    enum: ['full_fee', 'partial_fee', 'transportation', 'books', 'uniform', 'other'],
    default: 'partial_fee'
  },
  sponsor: {
    name: String,
    type: { type: String, enum: ['school', 'government', 'private', 'ngo', 'corporate'] },
    contactInfo: {
      email: String,
      phone: String,
      address: String
    }
  },
  eligibilityCriteria: {
    academicPerformance: {
      minPercentage: Number,
      minGrade: String,
      subjects: [String]
    },
    financialCriteria: {
      familyIncome: Number,
      category: { type: String, enum: ['general', 'sc', 'st', 'obc', 'ews'] }
    },
    otherCriteria: [{
      criterion: String,
      description: String,
      required: Boolean
    }],
    grade: String, // Applicable grade/class
    minimumAttendance: Number // percentage
  },
  benefits: {
    discountType: { type: String, enum: ['percentage', 'fixed_amount'], required: true },
    discountValue: { type: Number, required: true },
    maxDiscount: Number,
    covers: [String], // e.g., ["tuition", "transportation"]
    duration: {
      type: { type: String, enum: ['one_time', 'annual', 'monthly'] },
      periods: Number // number of periods it applies
    }
  },
  applicationProcess: {
    applicationStartDate: Date,
    applicationEndDate: Date,
    documentsRequired: [String],
    interviewRequired: { type: Boolean, default: false },
    selectionProcess: String
  },
  academicYear: { type: String, required: true },
  availableSlots: Number,
  awardedCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'cancelled'],
    default: 'active'
  },
  awards: [{
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    awardedDate: { type: Date, default: Date.now },
    awardedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: Number,
    status: {
      type: String,
      enum: ['active', 'suspended', 'revoked', 'completed'],
      default: 'active'
    },
    renewalDate: Date,
    documents: [{
      type: String,
      fileName: String,
      fileUrl: String,
      uploadedAt: { type: Date, default: Date.now }
    }],
    remarks: String,
    performanceReviews: [{
      reviewDate: Date,
      academicPerformance: String,
      attendance: Number,
      remarks: String,
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' }
    }]
  }],
  renewalCriteria: {
    required: Boolean,
    academicPerformance: Number, // minimum percentage
    attendance: Number, // minimum percentage
    behavior: String
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvalDate: Date,
  budget: {
    allocated: Number,
    utilized: { type: Number, default: 0 },
    remaining: Number
  },
  termsAndConditions: String,
  contactPerson: {
    name: String,
    designation: String,
    email: String,
    phone: String
  }
}, { timestamps: true });

// Indexes for efficient queries
scholarshipSchema.index({ type: 1 });
scholarshipSchema.index({ status: 1 });
scholarshipSchema.index({ academicYear: 1 });
scholarshipSchema.index({ 'eligibilityCriteria.grade': 1 });
scholarshipSchema.index({ 'awards.studentId': 1 });

// Update budget utilization when awards are added
scholarshipSchema.methods.updateBudgetUtilization = function() {
  const totalAwarded = this.awards.reduce((sum, award) => sum + (award.amount || 0), 0);
  this.budget.utilized = totalAwarded;
  this.budget.remaining = this.budget.allocated - totalAwarded;
};

module.exports = model('Scholarship', scholarshipSchema);
