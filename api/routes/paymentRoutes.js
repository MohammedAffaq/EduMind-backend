const express = require('express');
const router = express.Router();
const { Fee } = require('../models/financeModels');
const { requireAuth } = require('../middleware/auth');

// POST /api/payments/process
router.post('/process', requireAuth, async (req, res) => {
  try {
    const { studentId, amount, feeId, paymentMethod } = req.body;

    // 1. Simulate Payment Gateway Interaction
    // In a real app, you would integrate Stripe/Razorpay SDK here
    const isSuccessful = true; // Mock success
    const transactionId = 'TXN-' + Date.now() + Math.floor(Math.random() * 1000);

    if (!isSuccessful) {
      return res.status(400).json({ success: false, error: 'Payment Gateway Failed' });
    }

    // 2. Update Fee Record if feeId is provided
    if (feeId) {
      // Assuming you might want to update an existing fee record or create a new one
      // For this mock, let's assume we are paying off a specific fee record
      // or creating a new "Paid" record.
      
      // Let's create a new Fee record for the payment
      const newFee = new Fee({
        studentId,
        amount,
        paymentMode: paymentMethod || 'Online',
        status: 'Paid',
        date: new Date(),
        description: `Payment via Gateway (TXN: ${transactionId})`
      });
      
      await newFee.save();
    }

    res.json({ success: true, transactionId, message: 'Payment processed successfully' });
  } catch (err) {
    console.error('Payment processing error:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;