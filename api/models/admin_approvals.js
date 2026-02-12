const { Schema, model } = require('mongoose');

const adminApprovalSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvalStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
adminApprovalSchema.index({ userId: 1 });
adminApprovalSchema.index({ approvalStatus: 1 });

module.exports = model('AdminApproval', adminApprovalSchema);
