const { Schema, model } = require('mongoose');

const otpVerificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false }
});

module.exports = model('OtpVerification', otpVerificationSchema);
