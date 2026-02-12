const { Schema, model } = require('mongoose');

const userProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
  dob: { type: Date },
  address: { type: String },
  profilePhoto: { type: String },
  qrCode: { type: String },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'ACTIVE'], default: 'PENDING' },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
userProfileSchema.index({ userId: 1 }, { unique: true });

module.exports = model('UserProfile', userProfileSchema);
