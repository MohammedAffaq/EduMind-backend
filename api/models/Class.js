const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const classSchema = new Schema({
  className: {
    type: String,
    required: true,
    unique: true
  },
  section: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D', 'E', 'F']
  },
  classTeacher: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subjectTeachers: [{
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],
  academicYear: {
    type: String,
    required: true,
    default: () => {
      const year = new Date().getFullYear();
      return `${year}-${year + 1}`;
    }
  },
  capacity: {
    type: Number,
    default: 40,
    min: 1,
    max: 60
  },
  currentStrength: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
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
classSchema.index({ className: 1, section: 1, academicYear: 1 }, { unique: true });
classSchema.index({ classTeacher: 1 });
classSchema.index({ status: 1 });

// Pre-save middleware to update updatedAt
classSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for full class name (e.g., "Class 10-A")
classSchema.virtual('fullName').get(function() {
  return `${this.className}-${this.section}`;
});

// Method to check if class is at capacity
classSchema.methods.isAtCapacity = function() {
  return this.currentStrength >= this.capacity;
};

// Method to add student to class
classSchema.methods.addStudent = function() {
  if (!this.isAtCapacity()) {
    this.currentStrength += 1;
    return true;
  }
  return false;
};

// Method to remove student from class
classSchema.methods.removeStudent = function() {
  if (this.currentStrength > 0) {
    this.currentStrength -= 1;
    return true;
  }
  return false;
};

module.exports = mongoose.model('Class', classSchema);
