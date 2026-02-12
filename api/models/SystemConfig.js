const { Schema, model } = require('mongoose');

const systemConfigSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: Schema.Types.Mixed, // Can store any type of value
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'security', 'email', 'notifications', 'academic', 'financial', 'transportation', 'system'],
    required: true
  },
  description: String,
  isSystemCritical: { type: Boolean, default: false },
  requiresRestart: { type: Boolean, default: false },
  validationRules: {
    min: Number,
    max: Number,
    pattern: String,
    enum: [String],
    required: Boolean
  },
  lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lastModifiedAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
  changeHistory: [{
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    reason: String
  }]
}, { timestamps: true });

// Indexes for efficient queries
systemConfigSchema.index({ category: 1 });
systemConfigSchema.index({ isSystemCritical: 1 });
systemConfigSchema.index({ key: 1 });

// Virtual for formatted value
systemConfigSchema.virtual('formattedValue').get(function() {
  switch (this.type) {
    case 'boolean':
      return this.value ? 'Yes' : 'No';
    case 'object':
    case 'array':
      return JSON.stringify(this.value, null, 2);
    default:
      return String(this.value);
  }
});

// Instance method to update value with history tracking
systemConfigSchema.methods.updateValue = function(newValue, userId, reason = '') {
  // Validate the new value
  if (!this.validateValue(newValue)) {
    throw new Error('Invalid value for this configuration');
  }

  // Track change in history
  this.changeHistory.push({
    oldValue: this.value,
    newValue,
    changedBy: userId,
    reason
  });

  // Update the value
  this.value = newValue;
  this.lastModifiedBy = userId;
  this.lastModifiedAt = new Date();
  this.version++;

  return this.save();
};

// Instance method to validate value
systemConfigSchema.methods.validateValue = function(value) {
  const rules = this.validationRules;
  if (!rules) return true;

  // Check required
  if (rules.required && (value === null || value === undefined || value === '')) {
    return false;
  }

  // Check type-specific validations
  switch (this.type) {
    case 'number':
      if (typeof value !== 'number') return false;
      if (rules.min !== undefined && value < rules.min) return false;
      if (rules.max !== undefined && value > rules.max) return false;
      break;
    case 'string':
      if (typeof value !== 'string') return false;
      if (rules.min !== undefined && value.length < rules.min) return false;
      if (rules.max !== undefined && value.length > rules.max) return false;
      if (rules.pattern && !new RegExp(rules.pattern).test(value)) return false;
      break;
    case 'boolean':
      if (typeof value !== 'boolean') return false;
      break;
  }

  // Check enum values
  if (rules.enum && !rules.enum.includes(value)) {
    return false;
  }

  return true;
};

// Static method to get config by category
systemConfigSchema.statics.getByCategory = function(category) {
  return this.find({ category }).sort({ key: 1 });
};

// Static method to get critical configs
systemConfigSchema.statics.getCriticalConfigs = function() {
  return this.find({ isSystemCritical: true });
};

// Static method to bulk update configs
systemConfigSchema.statics.bulkUpdate = async function(updates, userId) {
  const results = [];
  for (const update of updates) {
    try {
      const config = await this.findOne({ key: update.key });
      if (config) {
        await config.updateValue(update.value, userId, update.reason);
        results.push({ key: update.key, success: true });
      } else {
        results.push({ key: update.key, success: false, error: 'Configuration not found' });
      }
    } catch (error) {
      results.push({ key: update.key, success: false, error: error.message });
    }
  }
  return results;
};

module.exports = model('SystemConfig', systemConfigSchema);
