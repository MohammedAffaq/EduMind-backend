const { Schema, model } = require('mongoose');

const qrScanSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scannedAt: { type: Date, required: true },
  location: { type: String, required: true }
});

module.exports = model('QRScan', qrScanSchema);
