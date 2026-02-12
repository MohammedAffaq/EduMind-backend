const { Schema, model } = require('mongoose');

const otpVerificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  otpCode: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
otpVerificationSchema.index({ userId: 1 });
otpVerificationSchema.index({ expiresAt: 1 });

module.exports = model('OtpVerification', otpVerificationSchema);
