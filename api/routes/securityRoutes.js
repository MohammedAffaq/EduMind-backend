const express = require('express');
const router = express.Router();
const { Incident } = require('../models/securityModels');
const { Visitor } = require('../models/receptionModels');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/visitors - Get all visitors (Security view)
router.get('/visitors', requireAuth, requireRole(['admin', 'security', 'receptionist']), async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ inTime: -1 }).limit(100);
    res.json({ success: true, visitors });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// POST /api/incidents - Report an incident
router.post('/incidents', requireAuth, requireRole(['admin', 'security']), async (req, res) => {
  try {
    const { description, reportedTo } = req.body;
    const incident = new Incident({
      securityId: req.user.id,
      description,
      reportedTo
    });
    await incident.save();
    res.json({ success: true, incident });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// GET /api/incidents - Get incidents
router.get('/incidents', requireAuth, requireRole(['admin', 'security']), async (req, res) => {
  try {
    const incidents = await Incident.find()
      .populate('securityId', 'firstName lastName')
      .populate('reportedTo', 'firstName lastName')
      .sort({ time: -1 });
    res.json({ success: true, incidents });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;