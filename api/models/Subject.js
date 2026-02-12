const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subjectSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['core', 'elective', 'language', 'practical', 'theory'],
    default: 'core'
  },
  gradeLevel: {
    type: String,
    enum: ['primary', 'secondary', 'higher_secondary', 'all'],
    default: 'all'
  },
  credits: {
    type: Number,
    default: 1,
    min: 0,
    max: 10
  },
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
subjectSchema.index({ code: 1 }, { unique: true });
subjectSchema.index({ name: 1 });
subjectSchema.index({ category: 1 });
subjectSchema.index({ isActive: 1 });

// Pre-save middleware to update updatedAt
subjectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for display name
subjectSchema.virtual('displayName').get(function() {
  return `${this.code} - ${this.name}`;
});

// Method to check if subject can be assigned to a class
subjectSchema.methods.canAssignToGrade = function(gradeLevel) {
  return this.gradeLevel === 'all' || this.gradeLevel === gradeLevel;
};

module.exports = mongoose.model('Subject', subjectSchema);
