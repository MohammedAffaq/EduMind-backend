const { Schema, model } = require('mongoose');

const teacherProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  employeeId: { type: String, required: true, unique: true },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  contactInfo: {
    personalPhone: String,
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String
    }
  },
  qualifications: [{
    degree: String,
    institution: String,
    yearOfCompletion: Number,
    grade: String,
    specialization: String
  }],
  experience: [{
    institution: String,
    position: String,
    startDate: Date,
    endDate: Date,
    subjects: [String]
  }],
  subjects: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
  classes: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
  department: String,
  designation: { type: String, default: 'Teacher' },
  joiningDate: { type: Date, required: true },
  employmentStatus: { type: String, enum: ['active', 'inactive', 'terminated', 'retired'], default: 'active' },
  salary: {
    basic: Number,
    allowances: Number,
    deductions: Number,
    netSalary: Number
  },
  performanceReviews: [{
    reviewId: { type: Schema.Types.ObjectId, ref: 'PerformanceReview' },
    rating: { type: Number, min: 1, max: 5 },
    comments: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewDate: Date
  }],
  certifications: [{
    title: String,
    issuingAuthority: String,
    issueDate: Date,
    expiryDate: Date,
    certificateNumber: String
  }],
  professionalDevelopment: [{
    activity: String,
    provider: String,
    date: Date,
    hours: Number,
    certificate: String
  }],
  workload: {
    totalPeriods: { type: Number, default: 0 },
    maxPeriods: { type: Number, default: 30 }
  }
}, { timestamps: true });

// Indexes for efficient queries
teacherProfileSchema.index({ userId: 1 });
teacherProfileSchema.index({ employeeId: 1 });
teacherProfileSchema.index({ subjects: 1 });
teacherProfileSchema.index({ classes: 1 });
teacherProfileSchema.index({ employmentStatus: 1 });

module.exports = model('TeacherProfile', teacherProfileSchema);
