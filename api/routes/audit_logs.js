const express = require('express');
const AuditLog = require('../models/audit_logs');
const router = express.Router();

// Get all audit logs
router.get('/', async (req, res) => {
  try {
    const logs = await AuditLog.find().populate('action_by');
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get audit log by ID
router.get('/:id', async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id).populate('action_by');
    if (!log) return res.status(404).json({ success: false, message: 'Audit log not found' });
    res.json({ success: true, log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new audit log
router.post('/', async (req, res) => {
  try {
    const log = new AuditLog(req.body);
    await log.save();
    res.status(201).json({ success: true, log });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update audit log
router.put('/:id', async (req, res) => {
  try {
    const log = await AuditLog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!log) return res.status(404).json({ success: false, message: 'Audit log not found' });
    res.json({ success: true, log });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete audit log
router.delete('/:id', async (req, res) => {
  try {
    const log = await AuditLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Audit log not found' });
    res.json({ success: true, message: 'Audit log deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
