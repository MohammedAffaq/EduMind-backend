const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  passengers: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    pickupPoint: {
      type: String,
      trim: true
    },
    dropPoint: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'picked_up', 'dropped_off', 'absent'],
      default: 'scheduled'
    },
    pickupTime: Date,
    dropTime: Date
  }],
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: {
    type: String,
    required: true
  },
  direction: {
    type: String,
    enum: ['to_school', 'from_school'],
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'delayed'],
    default: 'scheduled'
  },
  actualStartTime: Date,
  actualEndTime: Date,
  startLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  endLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  distance: {
    type: Number, // in kilometers
    min: 0
  },
  duration: {
    type: Number, // in minutes
    min: 0
  },
  fuelConsumed: {
    type: Number, // in liters
    min: 0
  },
  issues: [{
    type: {
      type: String,
      enum: ['mechanical', 'traffic', 'weather', 'student_absent', 'other']
    },
    description: {
      type: String,
      trim: true
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['delay', 'pickup', 'dropoff', 'issue']
    },
    message: String,
    sentTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    sentAt: {
      type: Date,
      default: Date.now
    }
  }],
  weather: {
    condition: String,
    temperature: Number,
    description: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
tripSchema.index({ route: 1 });
tripSchema.index({ vehicle: 1 });
tripSchema.index({ driver: 1 });
tripSchema.index({ scheduledDate: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ direction: 1 });
tripSchema.index({ 'passengers.student': 1 });

// Virtual for checking if trip is today
tripSchema.virtual('isToday').get(function() {
  const today = new Date();
  const tripDate = new Date(this.scheduledDate);
  return tripDate.toDateString() === today.toDateString();
});

// Virtual for checking if trip is upcoming
tripSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const tripDateTime = new Date(`${this.scheduledDate.toDateString()} ${this.scheduledTime}`);
  return tripDateTime > now;
});

// Virtual for checking if trip is delayed
tripSchema.virtual('isDelayed').get(function() {
  if (this.status !== 'scheduled') return false;
  const now = new Date();
  const scheduledDateTime = new Date(`${this.scheduledDate.toDateString()} ${this.scheduledTime}`);
  const delayThreshold = 15; // minutes
  return (now - scheduledDateTime) > (delayThreshold * 60 * 1000);
});

module.exports = mongoose.model('Trip', tripSchema);
