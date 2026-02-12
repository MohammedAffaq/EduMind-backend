const { Schema, model } = require('mongoose');

const studentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  class: { type: String },
  section: { type: String },
  rollNumber: { type: String, unique: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
studentSchema.index({ userId: 1 }, { unique: true });
studentSchema.index({ rollNumber: 1 }, { unique: true });

module.exports = model('Student', studentSchema);
