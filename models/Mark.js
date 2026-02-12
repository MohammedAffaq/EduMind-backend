const mongoose = require('mongoose');

const MarkSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  studentId: { type: String },
  examType: { type: String },
  subjects: { type: Array },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mark', MarkSchema);