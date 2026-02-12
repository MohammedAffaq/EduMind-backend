const express = require('express');
const AdminApproval = require('../models/admin_approvals');
const router = express.Router();

// Get all admin approvals
router.get('/', async (req, res) => {
  try {
    const approvals = await AdminApproval.find()
      .populate('user_id')
      .populate('requested_by')
      .populate('approved_by');
    res.json({ success: true, approvals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get admin approval by ID
router.get('/:id', async (req, res) => {
  try {
    const approval = await AdminApproval.findById(req.params.id)
      .populate('user_id')
      .populate('requested_by')
      .populate('approved_by');
    if (!approval) return res.status(404).json({ success: false, message: 'Admin approval not found' });
    res.json({ success: true, approval });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new admin approval
router.post('/', async (req, res) => {
  try {
    const approval = new AdminApproval(req.body);
    await approval.save();
    res.status(201).json({ success: true, approval });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update admin approval
router.put('/:id', async (req, res) => {
  try {
    const approval = await AdminApproval.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!approval) return res.status(404).json({ success: false, message: 'Admin approval not found' });
    res.json({ success: true, approval });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete admin approval
router.delete('/:id', async (req, res) => {
  try {
    const approval = await AdminApproval.findByIdAndDelete(req.params.id);
    if (!approval) return res.status(404).json({ success: false, message: 'Admin approval not found' });
    res.json({ success: true, message: 'Admin approval deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
