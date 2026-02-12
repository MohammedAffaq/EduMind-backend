const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 5️⃣ Fee Schema
const FeeSchema = new Schema({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Card', 'Online', 'Cheque', 'UPI'],
    required: true
  },
  status: {
    type: String,
    enum: ['Paid', 'Pending', 'Overdue'],
    default: 'Pending'
  },
  date: {
    type: Date,
    default: Date.now
  },
  description: String // e.g., "Tuition Fee - Term 1"
});

const Fee = mongoose.model('Fee', FeeSchema);
module.exports = { Fee };