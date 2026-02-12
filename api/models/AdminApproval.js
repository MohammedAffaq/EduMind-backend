const { Schema, model } = require('mongoose');

const adminApprovalSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // teacherId
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date }
});

module.exports = model('AdminApproval', adminApprovalSchema);
