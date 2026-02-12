const { Schema, model } = require('mongoose');

const leaveRequestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  leaveType: {
    type: String,
    enum: ['sick', 'casual', 'annual', 'maternity', 'paternity', 'emergency', 'other'],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: { type: Number, required: true },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  appliedDate: { type: Date, default: Date.now },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedDate: Date,
  rejectionReason: String,
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  comments: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  substituteTeacher: { type: Schema.Types.ObjectId, ref: 'User' }, // For teachers
  academicYear: { type: String, required: true }, // e.g., "2023-2024"
  isHalfDay: { type: Boolean, default: false },
  halfDayType: { type: String, enum: ['first_half', 'second_half'] }, // If half day
  balanceDeducted: { type: Boolean, default: false },
  notificationSent: { type: Boolean, default: false }
}, { timestamps: true });

// Indexes for efficient queries
leaveRequestSchema.index({ userId: 1, appliedDate: -1 });
leaveRequestSchema.index({ status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });
leaveRequestSchema.index({ approvedBy: 1 });
leaveRequestSchema.index({ academicYear: 1 });

// Virtual for leave duration calculation
leaveRequestSchema.virtual('duration').get(function() {
  const diffTime = Math.abs(this.endDate - this.startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return this.isHalfDay ? diffDays - 0.5 : diffDays;
});

// Instance method to approve leave
leaveRequestSchema.methods.approve = function(approvedByUserId, comments = null) {
  this.status = 'approved';
  this.approvedBy = approvedByUserId;
  this.approvedDate = new Date();

  if (comments) {
    this.comments.push({
      userId: approvedByUserId,
      comment: comments,
      createdAt: new Date()
    });
  }

  return this.save();
};

// Instance method to reject leave
leaveRequestSchema.methods.reject = function(approvedByUserId, rejectionReason, comments = null) {
  this.status = 'rejected';
  this.approvedBy = approvedByUserId;
  this.approvedDate = new Date();
  this.rejectionReason = rejectionReason;

  if (comments) {
    this.comments.push({
      userId: approvedByUserId,
      comment: comments,
      createdAt: new Date()
    });
  }

  return this.save();
};

// Static method to get leave balance for user
leaveRequestSchema.statics.getLeaveBalance = async function(userId, academicYear) {
  const approvedLeaves = await this.find({
    userId,
    academicYear,
    status: 'approved',
    balanceDeducted: true
  });

  const totalUsed = approvedLeaves.reduce((sum, leave) => sum + leave.totalDays, 0);

  // Default leave balances (can be configured per organization)
  const defaultBalances = {
    sick: 10,
    casual: 12,
    annual: 30,
    maternity: 180, // 6 months
    paternity: 15,
    emergency: 5,
    other: 5
  };

  return {
    used: totalUsed,
    remaining: Math.max(0, 30 - totalUsed), // Assuming 30 days total annual leave
    breakdown: defaultBalances
  };
};

module.exports = model('LeaveRequest', leaveRequestSchema);
