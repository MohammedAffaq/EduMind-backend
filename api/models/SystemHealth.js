const { Schema, model } = require('mongoose');

const systemHealthSchema = new Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  service: { type: String, required: true }, // 'api', 'database', 'email', 'file-storage', etc.
  status: {
    type: String,
    enum: ['healthy', 'degraded', 'unhealthy', 'down'],
    required: true
  },
  responseTime: Number, // in milliseconds
  memoryUsage: {
    used: Number, // MB
    total: Number, // MB
    percentage: Number
  },
  cpuUsage: Number, // percentage
  diskUsage: {
    used: Number, // GB
    total: Number, // GB
    percentage: Number
  },
  databaseConnections: {
    active: Number,
    idle: Number,
    total: Number
  },
  errorCount: { type: Number, default: 0 },
  warningCount: { type: Number, default: 0 },
  uptime: Number, // seconds
  version: String, // service version
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'development'
  },
  details: Schema.Types.Mixed, // Additional service-specific metrics
  alerts: [{
    type: {
      type: String,
      enum: ['error', 'warning', 'info']
    },
    message: String,
    code: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Indexes for efficient queries
systemHealthSchema.index({ service: 1, timestamp: -1 });
systemHealthSchema.index({ status: 1 });
systemHealthSchema.index({ timestamp: -1 });

// Static method to get latest health status for all services
systemHealthSchema.statics.getLatestHealthStatus = function() {
  return this.aggregate([
    {
      $sort: { timestamp: -1 }
    },
    {
      $group: {
        _id: '$service',
        latest: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latest' }
    },
    {
      $sort: { service: 1 }
    }
  ]);
};

// Static method to get health history for a service
systemHealthSchema.statics.getHealthHistory = function(service, hours = 24) {
  const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
  return this.find({
    service,
    timestamp: { $gte: since }
  }).sort({ timestamp: -1 });
};

// Static method to get overall system health
systemHealthSchema.statics.getOverallHealth = async function() {
  const latestStatuses = await this.getLatestHealthStatus();

  const summary = {
    timestamp: new Date(),
    overallStatus: 'healthy',
    services: latestStatuses.length,
    healthy: 0,
    degraded: 0,
    unhealthy: 0,
    down: 0,
    responseTime: {
      average: 0,
      min: Infinity,
      max: 0
    },
    uptime: {
      average: 0,
      min: Infinity,
      max: 0
    }
  };

  let totalResponseTime = 0;
  let totalUptime = 0;

  for (const status of latestStatuses) {
    // Count status types
    summary[status.status]++;

    // Update overall status (worst status wins)
    const statusPriority = { healthy: 1, degraded: 2, unhealthy: 3, down: 4 };
    if (statusPriority[status.status] > statusPriority[summary.overallStatus]) {
      summary.overallStatus = status.status;
    }

    // Calculate response time stats
    if (status.responseTime) {
      totalResponseTime += status.responseTime;
      summary.responseTime.min = Math.min(summary.responseTime.min, status.responseTime);
      summary.responseTime.max = Math.max(summary.responseTime.max, status.responseTime);
    }

    // Calculate uptime stats
    if (status.uptime) {
      totalUptime += status.uptime;
      summary.uptime.min = Math.min(summary.uptime.min, status.uptime);
      summary.uptime.max = Math.max(summary.uptime.max, status.uptime);
    }
  }

  // Calculate averages
  if (latestStatuses.length > 0) {
    summary.responseTime.average = Math.round(totalResponseTime / latestStatuses.length);
    summary.uptime.average = Math.round(totalUptime / latestStatuses.length);
  }

  // Handle edge cases
  if (summary.responseTime.min === Infinity) summary.responseTime.min = 0;
  if (summary.uptime.min === Infinity) summary.uptime.min = 0;

  return summary;
};

// Static method to record health check
systemHealthSchema.statics.recordHealthCheck = async function(serviceData) {
  const healthRecord = new this(serviceData);
  return healthRecord.save();
};

// Instance method to add alert
systemHealthSchema.methods.addAlert = function(type, message, code = '') {
  this.alerts.push({
    type,
    message,
    code,
    timestamp: new Date()
  });

  // Update error/warning counts
  if (type === 'error') this.errorCount++;
  if (type === 'warning') this.warningCount++;

  return this.save();
};

module.exports = model('SystemHealth', systemHealthSchema);
