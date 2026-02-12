const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const Fee = require('../models/Fee');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create payment order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { amount, studentId, feeId, description } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    // Verify student exists and user has permission
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if user is parent of the student or admin
    const isParent = req.user.role === 'parent' && student.parentId?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isStudent = req.user.role === 'student' && req.user.id === studentId;

    if (!isParent && !isAdmin && !isStudent) {
      return res.status(403).json({ message: 'Unauthorized to make payment for this student' });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paisa
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        studentId,
        feeId: feeId || null,
        description: description || 'School fee payment',
        userId: req.user.id
      }
    };

    const order = await razorpay.orders.create(options);

    // Create transaction record
    const transaction = new Transaction({
      studentId,
      parentId: student.parentId || req.user.id,
      amount,
      orderId: order.id,
      gateway: 'Razorpay',
      status: 'PENDING',
      currency: 'INR',
      feeId,
      description: description || 'School fee payment',
      createdBy: req.user.id
    });

    await transaction.save();

    res.json({
      order,
      transactionId: transaction._id,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
});

// Verify payment
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Update transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transaction.status = 'SUCCESS';
    transaction.paymentId = razorpay_payment_id;
    transaction.razorpaySignature = razorpay_signature;
    transaction.paidAt = new Date();
    await transaction.save();

    // Update fee status if feeId exists
    if (transaction.feeId) {
      const fee = await Fee.findById(transaction.feeId);
      if (fee) {
        // Add payment to fee's payments array
        fee.payments.push({
          amount: transaction.amount,
          date: new Date(),
          method: 'online',
          transactionId: transaction._id,
          paymentId: razorpay_payment_id
        });

        // Update balance and status
        fee.balance -= transaction.amount;
        if (fee.balance <= 0) {
          fee.status = 'paid';
          fee.balance = 0;
        } else if (fee.balance < fee.totalAmount) {
          fee.status = 'partially_paid';
        }

        await fee.save();
      }
    }

    res.json({
      message: 'Payment verified successfully',
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        status: transaction.status,
        paymentId: razorpay_payment_id
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

// Get payment history for a student
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify permissions
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const isParent = req.user.role === 'parent' && student.parentId?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isStudent = req.user.role === 'student' && req.user.id === studentId;

    if (!isParent && !isAdmin && !isStudent) {
      return res.status(403).json({ message: 'Unauthorized to view payments for this student' });
    }

    const transactions = await Transaction.find({ studentId })
      .populate('studentId', 'firstName lastName')
      .populate('parentId', 'firstName lastName')
      .populate('feeId', 'term dueDate')
      .sort({ createdAt: -1 });

    res.json({ transactions });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Failed to fetch payment history' });
  }
});

// Get all transactions (admin only)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { page = 1, limit = 10, status, studentId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (studentId) query.studentId = studentId;

    const transactions = await Transaction.find(query)
      .populate('studentId', 'firstName lastName studentId')
      .populate('parentId', 'firstName lastName')
      .populate('feeId', 'term dueDate')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalTransactions: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// Get payment statistics (admin only)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalRevenue = await Transaction.aggregate([
      { $match: { status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const monthlyRevenue = await Transaction.aggregate([
      { $match: { status: 'SUCCESS' } },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' }
          },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      statusBreakdown: stats,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue
    });

  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ message: 'Failed to fetch payment statistics' });
  }
});

module.exports = router;
