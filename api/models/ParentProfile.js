const { Schema, model } = require('mongoose');

const parentProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  parentType: { type: String, enum: ['father', 'mother', 'guardian'], default: 'guardian' },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  occupation: String,
  employer: String,
  annualIncome: Number,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  contactInfo: {
    homePhone: String,
    workPhone: String,
    alternateEmail: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  children: [{
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    relationship: { type: String, enum: ['father', 'mother', 'guardian'], required: true },
    isPrimary: { type: Boolean, default: false },
    custodyDetails: String
  }],
  maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed'] },
  spouseDetails: {
    name: String,
    occupation: String,
    phone: String,
    email: String
  },
  communicationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    phone: { type: Boolean, default: false },
    newsletter: { type: Boolean, default: true }
  },
  involvementLevel: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  volunteerActivities: [{
    activity: String,
    date: Date,
    description: String
  }],
  feedbackHistory: [{
    feedbackId: { type: Schema.Types.ObjectId, ref: 'Feedback' },
    rating: { type: Number, min: 1, max: 5 },
    comments: String,
    date: Date
  }]
}, { timestamps: true });

// Indexes for efficient queries
parentProfileSchema.index({ userId: 1 });
parentProfileSchema.index({ 'children.studentId': 1 });
parentProfileSchema.index({ parentType: 1 });

module.exports = model('ParentProfile', parentProfileSchema);
