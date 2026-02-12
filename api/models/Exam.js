const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const examSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  teacherId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  examType: {
    type: String,
    enum: ['quiz', 'midterm', 'final', 'unit_test', 'practical', 'project'],
    required: true
  },
  examDate: {
    type: Date,
    required: true
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
  duration: {
    type: Number, // in minutes
    required: true,
    min: 15,
    max: 480
  },
  totalMarks: {
    type: Number,
    default: 100,
    min: 1,
    max: 1000
  },
  passingMarks: {
    type: Number,
    min: 0
  },
  room: {
    type: String,
    trim: true
  },
  instructions: {
    type: String,
    trim: true
  },
  syllabus: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
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
examSchema.index({ classId: 1, subjectId: 1 });
examSchema.index({ teacherId: 1 });
examSchema.index({ examDate: 1 });
examSchema.index({ status: 1 });
examSchema.index({ examType: 1 });

// Pre-save middleware to update updatedAt and calculate passing marks
examSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // Auto-calculate passing marks if not set (usually 35% of total)
  if (!this.passingMarks) {
    this.passingMarks = Math.ceil(this.totalMarks * 0.35);
  }

  next();
});

// Virtual for checking if exam is upcoming
examSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const examStart = new Date(this.examDate);
  const [hours, minutes] = this.startTime.split(':');
  examStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return examStart > now;
});

// Virtual for checking if exam is ongoing
examSchema.virtual('isOngoing').get(function() {
  const now = new Date();
  const examStart = new Date(this.examDate);
  const [startHours, startMinutes] = this.startTime.split(':');
  examStart.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

  const examEnd = new Date(this.examDate);
  const [endHours, endMinutes] = this.endTime.split(':');
  examEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

  return now >= examStart && now <= examEnd;
});

// Method to get exam results summary
examSchema.methods.getResultsSummary = async function() {
  const Grade = mongoose.model('Grade');
  const grades = await Grade.find({ examId: this._id });

  if (grades.length === 0) {
    return {
      totalStudents: 0,
      submitted: 0,
      averageScore: 0,
      passRate: 0,
      highestScore: 0,
      lowestScore: 0
    };
  }

  const scores = grades.map(g => g.marks);
  const passed = grades.filter(g => g.marks >= this.passingMarks).length;

  return {
    totalStudents: grades.length,
    submitted: grades.length,
    averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    passRate: (passed / grades.length) * 100,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores)
  };
};

// Static method to get exams by class
examSchema.statics.getByClass = function(classId, status = null) {
  const query = { classId };
  if (status) query.status = status;

  return this.find(query)
    .populate('subjectId', 'name code')
    .populate('teacherId', 'firstName lastName')
    .sort({ examDate: 1, startTime: 1 });
};

// Static method to get exams by teacher
examSchema.statics.getByTeacher = function(teacherId, status = null) {
  const query = { teacherId };
  if (status) query.status = status;

  return this.find(query)
    .populate('classId', 'className section')
    .populate('subjectId', 'name code')
    .sort({ examDate: 1, startTime: 1 });
};

// Static method to get upcoming exams
examSchema.statics.getUpcoming = function(classId = null, days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const query = {
    examDate: { $gte: new Date(), $lte: futureDate },
    status: { $in: ['scheduled', 'ongoing'] }
  };

  if (classId) query.classId = classId;

  return this.find(query)
    .populate('classId', 'className section')
    .populate('subjectId', 'name code')
    .populate('teacherId', 'firstName lastName')
    .sort({ examDate: 1, startTime: 1 });
};

module.exports = mongoose.model('Exam', examSchema);
