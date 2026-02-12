const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 🔟 Incident Schema
const IncidentSchema = new Schema({
  securityId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  time: {
    type: Date,
    default: Date.now
  },
  reportedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['Reported', 'Investigating', 'Resolved'],
    default: 'Reported'
  }
});

const Incident = mongoose.model('Incident', IncidentSchema);
module.exports = { Incident };