const express = require('express');
const router = express.Router();
const { Fee } = require('../models/financeModels');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/fees - Get all fee records
router.get('/fees', requireAuth, requireRole(['admin', 'accountant']), async (req, res) => {
  try {
    const fees = await Fee.find()
      .populate('studentId', 'firstName lastName email rollNumber')
      .sort({ date: -1 });
    res.json({ success: true, fees });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// POST /api/fees/collect - Collect a fee
router.post('/fees/collect', requireAuth, requireRole(['admin', 'accountant']), async (req, res) => {
  try {
    const { studentId, amount, paymentMode, description, status } = req.body;

    const fee = new Fee({
      studentId,
      amount,
      paymentMode,
      description,
      status: status || 'Paid',
      date: new Date()
    });

    await fee.save();
    res.json({ success: true, fee });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// GET /api/fees/reports - Get fee reports
router.get('/fees/reports', requireAuth, requireRole(['admin', 'accountant']), async (req, res) => {
  try {
    // Calculate total collected
    const totalCollected = await Fee.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Get recent transactions
    const recentTransactions = await Fee.find({ status: 'Paid' })
      .sort({ date: -1 })
      .limit(5)
      .populate('studentId', 'firstName lastName');

    res.json({ success: true, totalCollected: totalCollected[0]?.total || 0, recentTransactions });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;