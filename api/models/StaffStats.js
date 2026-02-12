const mongoose = require('mongoose');

const staffStatsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  pendingTasks: { type: Number, default: 0 },
  requestsProcessed: { type: Number, default: 0 },
  hoursLogged: { type: Number, default: 0 },
  leaveBalance: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StaffStats', staffStatsSchema);
