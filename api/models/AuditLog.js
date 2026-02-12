const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditLogSchema = new Schema({
  actionBy: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  module: String,
  resourceId: Schema.Types.ObjectId,
  details: Object,
  ip: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);