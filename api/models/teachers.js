const { Schema, model } = require('mongoose');

const teacherSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String },
  designation: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
teacherSchema.index({ userId: 1 }, { unique: true });

module.exports = model('Teacher', teacherSchema);
