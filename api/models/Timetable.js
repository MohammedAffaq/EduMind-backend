const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const timetableEntrySchema = new Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 1,
    max: 7 // 1 = Monday, 7 = Sunday
  },
  periodNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  startTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  endTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  subject: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: String,
    trim: true
  }
});

const timetableSchema = new Schema({
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  academicYear: {
    type: String,
    required: true,
    default: () => {
      const year = new Date().getFullYear();
      return `${year}-${year + 1}`;
    }
  },
  term: {
    type: String,
    enum: ['Term 1', 'Term 2', 'Term 3'],
    required: true
  },
  entries: [timetableEntrySchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
timetableSchema.index({ classId: 1, academicYear: 1, term: 1 }, { unique: true });
timetableSchema.index({ 'entries.dayOfWeek': 1, 'entries.periodNumber': 1 });

// Pre-save middleware to update updatedAt
timetableSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to get timetable for a specific day
timetableSchema.methods.getDaySchedule = function(dayOfWeek) {
  return this.entries.filter(entry => entry.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.periodNumber - b.periodNumber);
};

// Method to get timetable for a specific period
timetableSchema.methods.getPeriodSchedule = function(periodNumber) {
  return this.entries.filter(entry => entry.periodNumber === periodNumber);
};

// Method to check for conflicts
timetableSchema.methods.hasConflict = function(newEntry) {
  return this.entries.some(entry =>
    entry.dayOfWeek === newEntry.dayOfWeek &&
    entry.periodNumber === newEntry.periodNumber
  );
};

// Static method to get teacher schedule
timetableSchema.statics.getTeacherSchedule = function(teacherId, dayOfWeek = null) {
  const query = { 'entries.teacher': teacherId };
  if (dayOfWeek) {
    query['entries.dayOfWeek'] = dayOfWeek;
  }
  return this.find(query).populate('classId', 'className section');
};

// Static method to get room schedule
timetableSchema.statics.getRoomSchedule = function(room, dayOfWeek = null) {
  const query = { 'entries.room': room };
  if (dayOfWeek) {
    query['entries.dayOfWeek'] = dayOfWeek;
  }
  return this.find(query).populate('classId', 'className section');
};

module.exports = mongoose.model('Timetable', timetableSchema);
