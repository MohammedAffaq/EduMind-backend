const { Schema, model } = require('mongoose');

const auditLogSchema = new Schema({
  action_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entity_id: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Indexes
auditLogSchema.index({ action_by: 1 });
auditLogSchema.index({ timestamp: 1 });

module.exports = model('AuditLog', auditLogSchema);
