const { Schema, model } = require('mongoose');

const gradeSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  examType: {
    type: String,
    enum: ['quiz', 'mid-term', 'final', 'unit-test', 'practical', 'project', 'assignment'],
    required: true
  },
  examId: { type: Schema.Types.ObjectId, ref: 'Exam' }, // Reference to exam if applicable
  marksObtained: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  percentage: { type: Number },
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F', 'Pass', 'Fail'],
    required: true
  },
  gradePoint: { type: Number, min: 0, max: 10 }, // GPA system
  remarks: String,
  academicYear: { type: String, required: true },
  term: { type: String, enum: ['term1', 'term2', 'term3'], required: true },
  assessmentDate: { type: Date, default: Date.now },
  isPublished: { type: Boolean, default: false },
  publishedAt: Date,
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  gradingScale: {
    A: { min: Number, max: Number },
    B: { min: Number, max: Number },
    C: { min: Number, max: Number },
    D: { min: Number, max: Number },
    F: { min: Number, max: Number }
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvalDate: Date
}, { timestamps: true });

// Indexes for efficient queries
gradeSchema.index({ studentId: 1, subjectId: 1, examType: 1, academicYear: 1 });
gradeSchema.index({ classId: 1, subjectId: 1, examType: 1 });
gradeSchema.index({ teacherId: 1 });
gradeSchema.index({ academicYear: 1, term: 1 });
gradeSchema.index({ isPublished: 1 });

// Calculate percentage before saving
gradeSchema.pre('save', function(next) {
  if (this.marksObtained && this.totalMarks) {
    this.percentage = (this.marksObtained / this.totalMarks) * 100;
  }
  next();
});

module.exports = model('Grade', gradeSchema);
