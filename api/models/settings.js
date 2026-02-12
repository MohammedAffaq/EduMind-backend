const { Schema, model } = require('mongoose');

const settingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
settingSchema.index({ key: 1 }, { unique: true });

module.exports = model('Setting', settingSchema);
