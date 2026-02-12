const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, required: true, unique: true, index: true, lowercase: true },
  phone: { type: String },
  passwordHash: { type: String },
  role: { type: String },
  isFirstLogin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: 'PENDING' },
  isActive: { type: Boolean, default: true },
  staffType: { type: String },
  rollNumber: { type: String },
  className: { type: String },
  children: { type: Array },
  relationship: { type: String },
  designation: { type: String },
  subject: { type: String },
  profilePicture: { type: String },
  hasNewNotification: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);