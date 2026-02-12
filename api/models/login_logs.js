const { Schema, model } = require('mongoose');

const loginLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  loginTime: { type: Date, required: true },
  ipAddress: { type: String },
  deviceInfo: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
loginLogSchema.index({ userId: 1 });
loginLogSchema.index({ loginTime: 1 });

module.exports = model('LoginLog', loginLogSchema);
