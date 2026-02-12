const { Schema, model } = require('mongoose');

const stopSchema = new Schema({
  name: { type: String, required: true },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  pickupTime: String, // HH:MM format
  dropTime: String, // HH:MM format
  estimatedDuration: Number, // minutes from previous stop
  distance: Number, // km from previous stop
  order: { type: Number, required: true }, // sequence in route
  isActive: { type: Boolean, default: true }
}, { _id: false });

const routeSchema = new Schema({
  routeNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['pickup', 'drop', 'both'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'suspended'],
    default: 'active'
  },
  zone: {
    type: String,
    enum: ['north', 'south', 'east', 'west', 'central', 'suburban'],
    required: true
  },
  distance: { type: Number, required: true }, // total distance in km
  estimatedDuration: { type: Number, required: true }, // total duration in minutes
  startPoint: {
    name: String,
    latitude: Number,
    longitude: Number,
    address: String
  },
  endPoint: {
    name: String,
    latitude: Number,
    longitude: Number,
    address: String
  },
  stops: [stopSchema],
  assignedVehicles: [{
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    isPrimary: { type: Boolean, default: false },
    schedule: {
      startTime: String, // HH:MM
      endTime: String, // HH:MM
      daysOfWeek: [Number] // 0-6 for Sunday-Saturday
    }
  }],
  capacity: {
    maxStudents: { type: Number, required: true },
    currentStudents: { type: Number, default: 0 },
    bufferPercentage: { type: Number, default: 10 } // buffer for unexpected additions
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekdays', 'weekends', 'custom'],
      default: 'weekdays'
    },
    daysOfWeek: [Number], // 0-6 for Sunday-Saturday
    startDate: Date,
    endDate: Date,
    exceptions: [{
      date: Date,
      type: {
        type: String,
        enum: ['holiday', 'maintenance', 'special_event', 'weather']
      },
      reason: String
    }]
  },
  fare: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
      default: 'monthly'
    },
    discounts: [{
      type: {
        type: String,
        enum: ['sibling', 'early_bird', 'loyalty', 'financial_aid']
      },
      percentage: Number,
      description: String
    }]
  },
  performance: {
    onTimePercentage: { type: Number, default: 100 },
    averageDelay: { type: Number, default: 0 }, // minutes
    totalTrips: { type: Number, default: 0 },
    completedTrips: { type: Number, default: 0 },
    cancelledTrips: { type: Number, default: 0 },
    studentSatisfaction: { type: Number, min: 1, max: 5 }
  },
  emergencyContacts: [{
    name: String,
    phone: String,
    relationship: String,
    priority: { type: Number, default: 1 }
  }],
  requirements: {
    specialNeeds: { type: Boolean, default: false },
    wheelchairAccessible: { type: Boolean, default: false },
    medicalEquipment: { type: Boolean, default: false },
    languageSupport: [String], // languages spoken by staff
    other: [String]
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: String
}, { timestamps: true });

// Indexes for efficient queries
routeSchema.index({ routeNumber: 1 });
routeSchema.index({ type: 1 });
routeSchema.index({ zone: 1 });
routeSchema.index({ status: 1 });
routeSchema.index({ 'assignedVehicles.vehicleId': 1 });
routeSchema.index({ 'schedule.daysOfWeek': 1 });
routeSchema.index({ 'stops.order': 1 });

// Virtual for available capacity
routeSchema.virtual('availableCapacity').get(function() {
  return Math.max(0, this.capacity.maxStudents - this.capacity.currentStudents);
});

// Virtual for utilization percentage
routeSchema.virtual('utilizationPercentage').get(function() {
  if (this.capacity.maxStudents === 0) return 0;
  return Math.round((this.capacity.currentStudents / this.capacity.maxStudents) * 100);
});

// Instance method to add student to route
routeSchema.methods.addStudent = function() {
  if (this.capacity.currentStudents >= this.capacity.maxStudents) {
    throw new Error('Route is at maximum capacity');
  }
  this.capacity.currentStudents++;
  return this.save();
};

// Instance method to remove student from route
routeSchema.methods.removeStudent = function() {
  if (this.capacity.currentStudents <= 0) {
    throw new Error('No students currently assigned to this route');
  }
  this.capacity.currentStudents--;
  return this.save();
};

// Instance method to assign vehicle
routeSchema.methods.assignVehicle = function(vehicleId, schedule, isPrimary = false) {
  // Remove existing primary if setting new one
  if (isPrimary) {
    this.assignedVehicles.forEach(vehicle => {
      vehicle.isPrimary = false;
    });
  }

  // Check if vehicle already assigned
  const existingIndex = this.assignedVehicles.findIndex(v => v.vehicleId.toString() === vehicleId.toString());

  if (existingIndex >= 0) {
    this.assignedVehicles[existingIndex].isPrimary = isPrimary;
    this.assignedVehicles[existingIndex].schedule = schedule;
  } else {
    this.assignedVehicles.push({
      vehicleId,
      isPrimary,
      schedule
    });
  }

  return this.save();
};

// Instance method to check if route operates on given date
routeSchema.methods.operatesOnDate = function(date) {
  const dayOfWeek = date.getDay(); // 0-6

  // Check if day is in schedule
  if (!this.schedule.daysOfWeek.includes(dayOfWeek)) {
    return false;
  }

  // Check for exceptions
  const dateStr = date.toISOString().split('T')[0];
  const exception = this.schedule.exceptions.find(exc =>
    exc.date.toISOString().split('T')[0] === dateStr
  );

  if (exception) {
    return false; // Route doesn't operate on exception dates
  }

  // Check date range
  if (this.schedule.startDate && date < this.schedule.startDate) {
    return false;
  }

  if (this.schedule.endDate && date > this.schedule.endDate) {
    return false;
  }

  return true;
};

// Static method to get routes by zone
routeSchema.statics.getRoutesByZone = function(zone) {
  return this.find({ zone, status: 'active' })
    .populate('assignedVehicles.vehicleId', 'registrationNumber make model')
    .sort({ routeNumber: 1 });
};

// Static method to get underutilized routes
routeSchema.statics.getUnderutilizedRoutes = function(threshold = 50) {
  return this.find({
    status: 'active',
    $expr: {
      $lt: [
        { $multiply: [{ $divide: ['$capacity.currentStudents', '$capacity.maxStudents'] }, 100] },
        threshold
      ]
    }
  });
};

// Static method to get routes for student pickup/drop
routeSchema.statics.getRoutesForStudent = function(studentLocation, routeType = 'pickup') {
  // This would typically use geospatial queries
  // For now, return routes in the same zone
  return this.find({
    type: { $in: routeType === 'both' ? ['pickup', 'drop', 'both'] : [routeType] },
    status: 'active'
  })
  .populate('assignedVehicles.vehicleId', 'registrationNumber make model capacity')
  .sort({ distance: 1 });
};

module.exports = model('Route', routeSchema);
