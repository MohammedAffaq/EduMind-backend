const { Schema, model } = require('mongoose');

const studentProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  },
  medicalInfo: {
    bloodGroup: String,
    allergies: [String],
    medications: [String],
    conditions: [String]
  },
  admissionDate: { type: Date, default: Date.now },
  enrollmentStatus: { type: String, enum: ['active', 'inactive', 'graduated', 'transferred'], default: 'active' },
  previousSchool: String,
  guardianId: { type: Schema.Types.ObjectId, ref: 'User' }, // Parent reference
  classId: { type: Schema.Types.ObjectId, ref: 'Class' },
  rollNumber: String,
  section: String,
  academicYear: { type: String, required: true }, // e.g., "2023-2024"
  achievements: [{
    title: String,
    description: String,
    date: Date,
    awardedBy: String
  }],
  extracurricular: [{
    activity: String,
    role: String,
    duration: String
  }],
  documents: [{
    type: { type: String, enum: ['birth_certificate', 'marksheet', 'transfer_certificate', 'medical_certificate', 'other'] },
    fileName: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Indexes for efficient queries
studentProfileSchema.index({ userId: 1 });
studentProfileSchema.index({ classId: 1 });
studentProfileSchema.index({ guardianId: 1 });
studentProfileSchema.index({ enrollmentStatus: 1 });

module.exports = model('StudentProfile', studentProfileSchema);
