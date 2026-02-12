const { Schema, model } = require('mongoose');

const loginActivitySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  loginTime: { type: Date, default: Date.now },
  logoutTime: { type: Date },
  ipAddress: { type: String },
  userAgent: { type: String },
  deviceType: { type: String, enum: ['web', 'mobile', 'tablet', 'desktop'], default: 'web' },
  location: { type: String },
  success: { type: Boolean, default: true },
  failureReason: { type: String },
  sessionDuration: { type: Number }, // in minutes
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
loginActivitySchema.index({ userId: 1, loginTime: -1 });
loginActivitySchema.index({ loginTime: -1 });

module.exports = model('LoginActivity', loginActivitySchema);
