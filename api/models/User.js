const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'staff', 'student', 'parent'],
      required: true
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role'
    },
    isActive: {
      type: Boolean,
      default: false
    },
    isFirstLogin: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: String,
      enum: ['SELF', 'ADMIN', 'TEACHER'],
      default: 'SELF'
    },
    otp: String,
    otpExpires: Date,
    firstName: String,
    lastName: String,
    staffType: {
      type: String,
      enum: ['teaching', 'non-teaching']
    },
    designation: String,
    subject: String,
    rollNumber: String,
    className: String,
    children: [{
      name: String,
      className: String
    }],
    relationship: String,
    dob: Date,
    documents: String
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });

module.exports = model('User', userSchema);

