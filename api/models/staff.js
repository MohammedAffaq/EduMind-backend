const { Schema, model } = require('mongoose');

const staffSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  staffType: { type: String, enum: ['TEACHING', 'NON_TEACHING'], required: true },
  department: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
staffSchema.index({ userId: 1 }, { unique: true });

module.exports = model('Staff', staffSchema);
