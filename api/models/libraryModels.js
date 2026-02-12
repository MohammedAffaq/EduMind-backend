const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 7️⃣ Book Schema
const BookSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  isbn: {
    type: String,
    unique: true,
    sparse: true
  },
  available: {
    type: Boolean,
    default: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

// 8️⃣ BookTransaction Schema
const BookTransactionSchema = new Schema({
  bookId: {
    type: Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  returnDate: {
    type: Date
  },
  dueDate: {
    type: Date,
    required: true
  },
  fineAmount: { type: Number, default: 0 }
});

const Book = mongoose.model('Book', BookSchema);
const BookTransaction = mongoose.model('BookTransaction', BookTransactionSchema);

module.exports = { Book, BookTransaction };