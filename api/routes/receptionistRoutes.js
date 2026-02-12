const express = require('express');
const router = express.Router();
const { Visitor } = require('../models/receptionModels');
const { requireAuth, requireRole } = require('../middleware/auth');

// POST /api/visitors - Add a new visitor
router.post('/visitors', requireAuth, requireRole(['admin', 'receptionist', 'security']), async (req, res) => {
  try {
    const { name, purpose, contact } = req.body;
    const visitor = new Visitor({ name, purpose, contact });
    await visitor.save();
    res.json({ success: true, visitor });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// GET /api/visitors/today - Get today's visitors
router.get('/visitors/today', requireAuth, requireRole(['admin', 'receptionist', 'security']), async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const visitors = await Visitor.find({
      inTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ inTime: -1 });

    res.json({ success: true, visitors });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// PATCH /api/visitors/:id/checkout - Mark visitor as checked out
router.patch('/visitors/:id/checkout', requireAuth, requireRole(['admin', 'receptionist', 'security']), async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, error: 'Visitor not found' });
    
    visitor.outTime = new Date();
    visitor.status = 'Out';
    await visitor.save();
    res.json({ success: true, visitor });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;