const { Schema, model } = require('mongoose');

const inventoryItemSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: ['books', 'stationery', 'furniture', 'equipment', 'electronics', 'sports', 'laboratory', 'cleaning', 'other'],
    required: true
  },
  itemCode: { type: String, required: true, unique: true },
  barcode: String,
  supplier: {
    name: String,
    contact: String,
    email: String
  },
  unit: { type: String, default: 'pieces' }, // pieces, kg, liters, etc.
  currentStock: { type: Number, required: true, min: 0 },
  minimumStock: { type: Number, default: 0 },
  maximumStock: Number,
  reorderPoint: { type: Number, default: 0 },
  unitCost: { type: Number, min: 0 },
  sellingPrice: Number,
  currency: { type: String, default: 'INR' },
  location: {
    warehouse: String,
    shelf: String,
    bin: String,
    room: String
  },
  condition: {
    type: String,
    enum: ['new', 'good', 'fair', 'poor', 'damaged'],
    default: 'new'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued', 'out_of_stock'],
    default: 'active'
  },
  expiryDate: Date,
  batchNumber: String,
  serialNumbers: [String],
  tags: [String],
  images: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  specifications: Schema.Types.Mixed, // Additional technical specs
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedAt: Date
}, { timestamps: true });

const inventoryTransactionSchema = new Schema({
  itemId: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
  transactionType: {
    type: String,
    enum: ['purchase', 'sale', 'issue', 'return', 'adjustment', 'transfer', 'write_off', 'donation'],
    required: true
  },
  quantity: { type: Number, required: true },
  unitCost: Number,
  totalCost: Number,
  transactionDate: { type: Date, default: Date.now },
  reference: String, // Invoice number, issue slip, etc.
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User' }, // For issues/returns
  recipientType: { type: String, enum: ['student', 'teacher', 'staff', 'department'] },
  department: String,
  class: { type: Schema.Types.ObjectId, ref: 'Class' },
  notes: String,
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  relatedTransaction: { type: Schema.Types.ObjectId, ref: 'InventoryTransaction' }, // For returns/adjustments
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date
}, { timestamps: true });

const inventorySchema = new Schema({
  item: inventoryItemSchema,
  transactions: [inventoryTransactionSchema]
});

// Indexes for efficient queries
inventorySchema.index({ 'item.category': 1 });
inventorySchema.index({ 'item.itemCode': 1 });
inventorySchema.index({ 'item.barcode': 1 });
inventorySchema.index({ 'item.status': 1 });
inventorySchema.index({ 'item.currentStock': 1 });
inventorySchema.index({ 'item.minimumStock': 1 });
inventorySchema.index({ 'item.expiryDate': 1 });
inventorySchema.index({ 'item.tags': 1 });

// Transaction indexes
inventorySchema.index({ 'transactions.transactionDate': -1 });
inventorySchema.index({ 'transactions.performedBy': 1 });
inventorySchema.index({ 'transactions.recipient': 1 });
inventorySchema.index({ 'transactions.transactionType': 1 });

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  const stock = this.item.currentStock;
  const minStock = this.item.minimumStock;
  const reorderPoint = this.item.reorderPoint;

  if (stock <= 0) return 'out_of_stock';
  if (stock <= reorderPoint) return 'low_stock';
  if (stock <= minStock) return 'minimum_reached';
  return 'in_stock';
});

// Virtual for total value
inventorySchema.virtual('totalValue').get(function() {
  return this.item.currentStock * (this.item.unitCost || 0);
});

// Instance method to add stock
inventorySchema.methods.addStock = function(quantity, unitCost, performedBy, reference = '', notes = '') {
  this.item.currentStock += quantity;
  this.item.lastUpdatedBy = performedBy;
  this.item.lastUpdatedAt = new Date();

  const transaction = {
    transactionType: 'purchase',
    quantity,
    unitCost,
    totalCost: quantity * unitCost,
    reference,
    performedBy,
    notes
  };

  this.transactions.push(transaction);
  return this.save();
};

// Instance method to remove stock
inventorySchema.methods.removeStock = function(quantity, transactionType, performedBy, recipient = null, recipientType = '', reference = '', notes = '') {
  if (this.item.currentStock < quantity) {
    throw new Error('Insufficient stock');
  }

  this.item.currentStock -= quantity;
  this.item.lastUpdatedBy = performedBy;
  this.item.lastUpdatedAt = new Date();

  const transaction = {
    transactionType,
    quantity: -quantity, // Negative for removal
    performedBy,
    recipient,
    recipientType,
    reference,
    notes
  };

  this.transactions.push(transaction);
  return this.save();
};

// Instance method to adjust stock
inventorySchema.methods.adjustStock = function(newQuantity, performedBy, reason = '', reference = '') {
  const adjustment = newQuantity - this.item.currentStock;

  this.item.currentStock = newQuantity;
  this.item.lastUpdatedBy = performedBy;
  this.item.lastUpdatedAt = new Date();

  const transaction = {
    transactionType: 'adjustment',
    quantity: adjustment,
    performedBy,
    notes: reason,
    reference
  };

  this.transactions.push(transaction);
  return this.save();
};

// Instance method to check if reorder needed
inventorySchema.methods.needsReorder = function() {
  return this.item.currentStock <= this.item.reorderPoint;
};

// Static method to get low stock items
inventorySchema.statics.getLowStockItems = function() {
  return this.find({
    'item.status': 'active',
    $expr: { $lte: ['$item.currentStock', '$item.reorderPoint'] }
  })
  .populate('item.createdBy', 'firstName lastName')
  .populate('item.lastUpdatedBy', 'firstName lastName');
};

// Static method to get inventory summary
inventorySchema.statics.getInventorySummary = function() {
  return this.aggregate([
    {
      $match: { 'item.status': 'active' }
    },
    {
      $group: {
        _id: '$item.category',
        totalItems: { $sum: 1 },
        totalStock: { $sum: '$item.currentStock' },
        totalValue: { $sum: { $multiply: ['$item.currentStock', '$item.unitCost'] } },
        lowStockItems: {
          $sum: {
            $cond: [
              { $lte: ['$item.currentStock', '$item.reorderPoint'] },
              1,
              0
            ]
          }
        },
        outOfStockItems: {
          $sum: {
            $cond: [
              { $lte: ['$item.currentStock', 0] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

// Static method to get transaction history
inventorySchema.statics.getTransactionHistory = function(itemId, startDate, endDate, transactionType = null) {
  const matchConditions = {
    'transactions.itemId': itemId
  };

  if (startDate && endDate) {
    matchConditions['transactions.transactionDate'] = {
      $gte: startDate,
      $lte: endDate
    };
  }

  if (transactionType) {
    matchConditions['transactions.transactionType'] = transactionType;
  }

  return this.aggregate([
    { $unwind: '$transactions' },
    { $match: matchConditions },
    {
      $lookup: {
        from: 'users',
        localField: 'transactions.performedBy',
        foreignField: '_id',
        as: 'performedBy'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'transactions.recipient',
        foreignField: '_id',
        as: 'recipient'
      }
    },
    {
      $project: {
        transaction: '$transactions',
        item: 1,
        performedBy: { $arrayElemAt: ['$performedBy', 0] },
        recipient: { $arrayElemAt: ['$recipient', 0] }
      }
    },
    { $sort: { 'transaction.transactionDate': -1 } }
  ]);
};

module.exports = model('Inventory', inventorySchema);
