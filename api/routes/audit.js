const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');
const router = express.Router();

// GET /api/audit?limit=50
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(limit).populate('actionBy', 'firstName lastName email');
    res.json({ success: true, logs });
  } catch (err) {
    console.error('Audit list error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;