const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 9️⃣ Visitor Schema
const VisitorSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    required: true
  },
  inTime: {
    type: Date,
    default: Date.now
  },
  outTime: {
    type: Date
  },
  contact: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['In', 'Out'],
    default: 'In'
  }
});

const Visitor = mongoose.model('Visitor', VisitorSchema);
module.exports = { Visitor };