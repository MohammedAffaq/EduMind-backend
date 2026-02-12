const { Schema, model } = require('mongoose');

const driverSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  licenseNumber: { type: String, unique: true },
  vehicleNumber: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
driverSchema.index({ userId: 1 }, { unique: true });
driverSchema.index({ licenseNumber: 1 }, { unique: true });

module.exports = model('Driver', driverSchema);
