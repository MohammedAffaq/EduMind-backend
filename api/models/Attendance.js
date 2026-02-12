const { Schema, model } = require('mongoose');

const attendanceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  attendanceDate: { type: Date, required: true },
  checkInTime: { type: Date },
  status: { type: String, enum: ['PRESENT', 'ABSENT'], required: true },
  markedBy: { type: String, enum: ['QR', 'ADMIN'], default: 'QR' },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
attendanceSchema.index({ userId: 1, attendanceDate: 1 }, { unique: true });
attendanceSchema.index({ attendanceDate: 1 });
attendanceSchema.index({ status: 1 });

module.exports = model('Attendance', attendanceSchema);
