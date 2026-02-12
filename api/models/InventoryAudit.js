const mongoose = require('mongoose');

const inventoryAuditSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  auditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  previousQuantity: { type: Number, required: true },
  currentQuantity: { type: Number, required: true },
  difference: { type: Number, required: true },
  notes: { type: String },
  auditDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InventoryAudit', inventoryAuditSchema);
