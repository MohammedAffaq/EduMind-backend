const express = require('express');
const OtpVerification = require('../models/otp_verifications');
const router = express.Router();

// Get all OTP verifications
router.get('/', async (req, res) => {
  try {
    const otps = await OtpVerification.find().populate('user_id');
    res.json({ success: true, otps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get OTP verification by ID
router.get('/:id', async (req, res) => {
  try {
    const otp = await OtpVerification.findById(req.params.id).populate('user_id');
    if (!otp) return res.status(404).json({ success: false, message: 'OTP verification not found' });
    res.json({ success: true, otp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new OTP verification
router.post('/', async (req, res) => {
  try {
    const otp = new OtpVerification(req.body);
    await otp.save();
    res.status(201).json({ success: true, otp });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update OTP verification
router.put('/:id', async (req, res) => {
  try {
    const otp = await OtpVerification.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!otp) return res.status(404).json({ success: false, message: 'OTP verification not found' });
    res.json({ success: true, otp });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete OTP verification
router.delete('/:id', async (req, res) => {
  try {
    const otp = await OtpVerification.findByIdAndDelete(req.params.id);
    if (!otp) return res.status(404).json({ success: false, message: 'OTP verification not found' });
    res.json({ success: true, message: 'OTP verification deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
