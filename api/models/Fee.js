const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  feeStructure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeStructure',
    required: true
  },
  academicYear: {
    type: String,
    required: true,
    trim: true
  },
  term: {
    type: String,
    enum: ['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Annual'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'partially_paid', 'paid', 'overdue', 'waived'],
    default: 'pending'
  },
  payments: [{
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  balance: {
    type: Number,
    default: function() {
      return this.amount;
    },
    min: 0
  },
  discounts: [{
    type: {
      type: String,
      enum: ['scholarship', 'sibling', 'merit', 'financial_aid', 'other']
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      trim: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  lateFees: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      trim: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  totalLateFees: {
    type: Number,
    default: 0,
    min: 0
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'notification']
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'pending'],
      default: 'sent'
    }
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  notes: {
    type: String,
    trim: true
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
feeSchema.index({ student: 1 });
feeSchema.index({ feeStructure: 1 });
feeSchema.index({ academicYear: 1 });
feeSchema.index({ dueDate: 1 });
feeSchema.index({ status: 1 });
feeSchema.index({ 'payments.payment': 1 });

// Virtual for checking if fee is overdue
feeSchema.virtual('isOverdue').get(function() {
  return this.dueDate < new Date() && this.status !== 'paid' && this.status !== 'waived';
});

// Virtual for checking if fee is upcoming (due within 7 days)
feeSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return this.dueDate > now && this.dueDate <= sevenDaysFromNow && this.status !== 'paid';
});

// Pre-save middleware to update balance
feeSchema.pre('save', function(next) {
  this.balance = this.amount + this.totalLateFees - this.totalDiscount - this.totalPaid;
  next();
});

module.exports = mongoose.model('Fee', feeSchema);
