const { Schema, model } = require('mongoose');

const paymentSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  feeStructureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure' },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'online', 'card', 'upi', 'wallet'],
    required: true
  },
  paymentDate: { type: Date, default: Date.now },
  transactionId: String,
  referenceNumber: String,
  bankDetails: {
    bankName: String,
    branchName: String,
    accountNumber: String,
    ifscCode: String,
    chequeNumber: String,
    chequeDate: Date
  },
  onlinePaymentDetails: {
    gateway: String, // e.g., "Razorpay", "PayU"
    gatewayTransactionId: String,
    paymentStatus: String,
    gatewayResponse: Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentFor: [{
    feeComponent: String,
    amount: Number,
    period: String, // e.g., "April 2024", "Q1 2024"
    academicYear: String
  }],
  discountsApplied: [{
    discountId: String,
    discountName: String,
    amount: Number,
    type: String
  }],
  lateFees: {
    amount: Number,
    reason: String
  },
  totalPaid: { type: Number, required: true },
  outstandingAmount: { type: Number, default: 0 },
  receiptNumber: { type: String, unique: true },
  receiptGenerated: { type: Boolean, default: false },
  receiptUrl: String,
  collectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verificationDate: Date,
  notes: String,
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  refundDetails: {
    refundAmount: Number,
    refundDate: Date,
    refundReason: String,
    refundMethod: String,
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  academicYear: { type: String, required: true },
  term: { type: String, enum: ['term1', 'term2', 'term3'] }
}, { timestamps: true });

// Indexes for efficient queries
paymentSchema.index({ studentId: 1, paymentDate: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ receiptNumber: 1 }, { unique: true });
paymentSchema.index({ academicYear: 1 });
paymentSchema.index({ collectedBy: 1 });
paymentSchema.index({ paymentMethod: 1 });

// Auto-generate receipt number
paymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.receiptNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Find the last receipt number for this month
    const lastPayment = await this.constructor.findOne({
      receiptNumber: new RegExp(`^RCP${year}${month}`)
    }).sort({ receiptNumber: -1 });

    let sequence = 1;
    if (lastPayment && lastPayment.receiptNumber) {
      const lastSequence = parseInt(lastPayment.receiptNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    this.receiptNumber = `RCP${year}${month}${String(sequence).padStart(4, '0')}`;
  }
  next();
});

module.exports = model('Payment', paymentSchema);
