const express = require('express');
const LoginLog = require('../models/login_logs');
const router = express.Router();

// Get all login logs
router.get('/', async (req, res) => {
  try {
    const logs = await LoginLog.find().populate('user_id');
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get login log by ID
router.get('/:id', async (req, res) => {
  try {
    const log = await LoginLog.findById(req.params.id).populate('user_id');
    if (!log) return res.status(404).json({ success: false, message: 'Login log not found' });
    res.json({ success: true, log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new login log
router.post('/', async (req, res) => {
  try {
    const log = new LoginLog(req.body);
    await log.save();
    res.status(201).json({ success: true, log });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update login log
router.put('/:id', async (req, res) => {
  try {
    const log = await LoginLog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!log) return res.status(404).json({ success: false, message: 'Login log not found' });
    res.json({ success: true, log });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete login log
router.delete('/:id', async (req, res) => {
  try {
    const log = await LoginLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Login log not found' });
    res.json({ success: true, message: 'Login log deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
