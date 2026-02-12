const { Schema, model } = require('mongoose');

const qrScanSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scanTime: { type: Date, required: true },
  location: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
qrScanSchema.index({ userId: 1 });
qrScanSchema.index({ scanTime: 1 });

module.exports = model('QRScan', qrScanSchema);
