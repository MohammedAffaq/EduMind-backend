const { Schema, model } = require('mongoose');

const driverAssignmentSchema = new Schema({
  driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  routeId: { type: Schema.Types.ObjectId, ref: 'Route', required: true },
  assignmentType: {
    type: String,
    enum: ['primary', 'backup', 'temporary', 'relief'],
    default: 'primary'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'completed'],
    default: 'active'
  },
  schedule: {
    startDate: { type: Date, required: true },
    endDate: Date,
    daysOfWeek: [Number], // 0-6 for Sunday-Saturday
    startTime: { type: String, required: true }, // HH:MM format
    endTime: { type: String, required: true }, // HH:MM format
    breakDuration: { type: Number, default: 30 }, // minutes
    overtimeAllowed: { type: Boolean, default: false },
    maxOvertimeHours: { type: Number, default: 2 }
  },
  responsibilities: {
    preTripInspection: { type: Boolean, default: true },
    studentManagement: { type: Boolean, default: true },
    emergencyResponse: { type: Boolean, default: true },
    vehicleMaintenance: { type: Boolean, default: false },
    routeOptimization: { type: Boolean, default: false },
    parentCommunication: { type: Boolean, default: true },
    other: [String]
  },
  performance: {
    onTimeDepartures: { type: Number, default: 100 }, // percentage
    onTimeArrivals: { type: Number, default: 100 }, // percentage
    safetyIncidents: { type: Number, default: 0 },
    studentComplaints: { type: Number, default: 0 },
    vehicleCondition: { type: Number, min: 1, max: 5, default: 5 }, // rating
    overallRating: { type: Number, min: 1, max: 5, default: 5 }
  },
  compensation: {
    baseSalary: { type: Number, required: true },
    overtimeRate: Number,
    incentives: {
      onTimeBonus: Number,
      safetyBonus: Number,
      performanceBonus: Number
    },
    deductions: {
      latePenalty: Number,
      incidentPenalty: Number
    },
    currency: { type: String, default: 'INR' }
  },
  documents: {
    license: {
      number: String,
      expiryDate: Date,
      type: {
        type: String,
        enum: ['light_motor_vehicle', 'heavy_motor_vehicle', 'transport_vehicle']
      }
    },
    trainingCertificates: [{
      certificateName: String,
      issuedBy: String,
      issueDate: Date,
      expiryDate: Date,
      certificateNumber: String
    }],
    backgroundCheck: {
      completed: { type: Boolean, default: false },
      completionDate: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      }
    }
  },
  emergencyContacts: [{
    name: String,
    relationship: String,
    phone: String,
    priority: { type: Number, default: 1 }
  }],
  notes: String,
  assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Indexes for efficient queries
driverAssignmentSchema.index({ driverId: 1 });
driverAssignmentSchema.index({ vehicleId: 1 });
driverAssignmentSchema.index({ routeId: 1 });
driverAssignmentSchema.index({ status: 1 });
driverAssignmentSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });
driverAssignmentSchema.index({ 'schedule.daysOfWeek': 1 });

// Compound indexes
driverAssignmentSchema.index({ driverId: 1, status: 1 });
driverAssignmentSchema.index({ vehicleId: 1, 'schedule.startDate': 1 });
driverAssignmentSchema.index({ routeId: 1, assignmentType: 1 });

// Virtual for assignment duration
driverAssignmentSchema.virtual('duration').get(function() {
  if (!this.schedule.endDate) return null;
  const diffTime = Math.abs(this.schedule.endDate - this.schedule.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // days
});

// Virtual for working hours per day
driverAssignmentSchema.virtual('workingHoursPerDay').get(function() {
  const start = this.schedule.startTime.split(':');
  const end = this.schedule.endTime.split(':');
  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
  const totalMinutes = endMinutes - startMinutes - this.schedule.breakDuration;
  return Math.max(0, totalMinutes / 60); // hours
});

// Instance method to check if assignment is active on date
driverAssignmentSchema.methods.isActiveOnDate = function(date) {
  // Check date range
  if (date < this.schedule.startDate) return false;
  if (this.schedule.endDate && date > this.schedule.endDate) return false;

  // Check day of week
  const dayOfWeek = date.getDay();
  if (!this.schedule.daysOfWeek.includes(dayOfWeek)) return false;

  return this.status === 'active';
};

// Instance method to calculate daily compensation
driverAssignmentSchema.methods.calculateDailyCompensation = function(overtimeHours = 0, performanceRating = 5) {
  let total = this.compensation.baseSalary;

  // Add overtime if allowed
  if (this.schedule.overtimeAllowed && overtimeHours > 0 && this.compensation.overtimeRate) {
    const allowedOvertime = Math.min(overtimeHours, this.schedule.maxOvertimeHours || 2);
    total += allowedOvertime * this.compensation.overtimeRate;
  }

  // Add incentives based on performance
  if (this.compensation.incentives) {
    const { onTimeBonus, safetyBonus, performanceBonus } = this.compensation.incentives;

    // On-time bonus (if >95% on-time rating)
    if (this.performance.onTimeDepartures > 95 && onTimeBonus) {
      total += onTimeBonus;
    }

    // Safety bonus (if no incidents)
    if (this.performance.safetyIncidents === 0 && safetyBonus) {
      total += safetyBonus;
    }

    // Performance bonus based on rating
    if (performanceRating >= 4 && performanceBonus) {
      total += performanceBonus * (performanceRating / 5);
    }
  }

  return total;
};

// Instance method to update performance metrics
driverAssignmentSchema.methods.updatePerformance = function(metrics) {
  Object.assign(this.performance, metrics);
  this.lastModifiedBy = this.assignedBy; // Update with current user context
  return this.save();
};

// Instance method to extend assignment
driverAssignmentSchema.methods.extendAssignment = function(newEndDate, modifiedBy) {
  this.schedule.endDate = newEndDate;
  this.lastModifiedBy = modifiedBy;
  return this.save();
};

// Static method to get active assignments for driver
driverAssignmentSchema.statics.getActiveAssignmentsForDriver = function(driverId, date = new Date()) {
  return this.find({
    driverId,
    status: 'active',
    'schedule.startDate': { $lte: date },
    $or: [
      { 'schedule.endDate': { $exists: false } },
      { 'schedule.endDate': { $gte: date } }
    ]
  })
  .populate('vehicleId', 'registrationNumber make model')
  .populate('routeId', 'routeNumber name zone')
  .sort({ 'schedule.startDate': -1 });
};

// Static method to get assignments for vehicle
driverAssignmentSchema.statics.getAssignmentsForVehicle = function(vehicleId, date = new Date()) {
  return this.find({
    vehicleId,
    status: 'active',
    'schedule.startDate': { $lte: date },
    $or: [
      { 'schedule.endDate': { $exists: false } },
      { 'schedule.endDate': { $gte: date } }
    ]
  })
  .populate('driverId', 'firstName lastName phone')
  .populate('routeId', 'routeNumber name')
  .sort({ 'schedule.startDate': -1 });
};

// Static method to get assignments for route
driverAssignmentSchema.statics.getAssignmentsForRoute = function(routeId, date = new Date()) {
  return this.find({
    routeId,
    status: 'active',
    'schedule.startDate': { $lte: date },
    $or: [
      { 'schedule.endDate': { $exists: false } },
      { 'schedule.endDate': { $gte: date } }
    ]
  })
  .populate('driverId', 'firstName lastName phone')
  .populate('vehicleId', 'registrationNumber make model')
  .sort({ assignmentType: 1, 'schedule.startDate': -1 });
};

// Static method to check for scheduling conflicts
driverAssignmentSchema.statics.checkSchedulingConflicts = function(driverId, startDate, endDate, daysOfWeek, excludeAssignmentId = null) {
  const query = {
    driverId,
    status: 'active',
    'schedule.daysOfWeek': { $in: daysOfWeek },
    $or: [
      {
        'schedule.startDate': { $lte: endDate },
        'schedule.endDate': { $gte: startDate }
      },
      {
        'schedule.startDate': { $lte: endDate },
        'schedule.endDate': { $exists: false }
      }
    ]
  };

  if (excludeAssignmentId) {
    query._id = { $ne: excludeAssignmentId };
  }

  return this.find(query);
};

module.exports = model('DriverAssignment', driverAssignmentSchema);
