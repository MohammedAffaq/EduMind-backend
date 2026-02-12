const { Schema, model } = require('mongoose');

const passwordHistorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  oldPasswordHash: { type: String, required: true },
  changedAt: { type: Date, default: Date.now }
});

// Indexes
passwordHistorySchema.index({ userId: 1 });
passwordHistorySchema.index({ changedAt: 1 });

module.exports = model('PasswordHistory', passwordHistorySchema);
