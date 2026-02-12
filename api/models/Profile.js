const { Schema, model } = require('mongoose');

const profileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  dob: { type: Date, required: true },
  address: { type: String, required: true },
  profilePhoto: { type: String },
  qrCode: { type: String },
  class: { type: String }, // only for students
  section: { type: String }, // only for students
  rollNumber: { type: String }, // unique for students
  department: { type: String }, // teacher/staff
  staffType: { type: String, enum: ['TEACHING', 'NON_TEACHING'] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('Profile', profileSchema);
