const express = require('express');
const router = express.Router();
const { Book, BookTransaction } = require('../models/libraryModels');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/books - Get all books
router.get('/books', requireAuth, async (req, res) => {
  try {
    const books = await Book.find().sort({ title: 1 });
    res.json({ success: true, books });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// POST /api/books - Add a new book
router.post('/books', requireAuth, requireRole(['admin', 'librarian']), async (req, res) => {
  try {
    const { title, author, category, isbn } = req.body;
    const book = new Book({ title, author, category, isbn });
    await book.save();
    res.json({ success: true, book });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// POST /api/books/issue - Issue a book to a student
router.post('/books/issue', requireAuth, requireRole(['admin', 'librarian']), async (req, res) => {
  try {
    const { bookId, studentId, dueDate } = req.body;

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ success: false, error: 'Book not found' });
    if (!book.available) return res.status(400).json({ success: false, error: 'Book is already issued' });

    const transaction = new BookTransaction({
      bookId,
      studentId,
      issueDate: new Date(),
      dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Default 14 days
    });

    await transaction.save();
    
    // Mark book as unavailable
    book.available = false;
    await book.save();

    res.json({ success: true, transaction });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// POST /api/books/return - Return a book
router.post('/books/return', requireAuth, requireRole(['admin', 'librarian']), async (req, res) => {
  try {
    const { transactionId, fineAmount } = req.body;

    const transaction = await BookTransaction.findById(transactionId);
    if (!transaction) return res.status(404).json({ success: false, error: 'Transaction not found' });
    if (transaction.returnDate) return res.status(400).json({ success: false, error: 'Book already returned' });

    transaction.returnDate = new Date();
    transaction.fineAmount = fineAmount || 0;
    await transaction.save();

    // Mark book as available
    const book = await Book.findById(transaction.bookId);
    if (book) {
      book.available = true;
      await book.save();
    }

    res.json({ success: true, transaction });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// GET /api/books/overdue - Get overdue books
router.get('/books/overdue', requireAuth, requireRole(['admin', 'librarian']), async (req, res) => {
  try {
    const overdueTransactions = await BookTransaction.find({
      returnDate: null,
      dueDate: { $lt: new Date() }
    }).populate('bookId', 'title').populate('studentId', 'firstName lastName email');

    res.json({ success: true, overdueTransactions });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;