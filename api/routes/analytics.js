const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Trip = require('../models/Trip');

const router = express.Router();

// Protected analytics (admin only)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Users by role
    const users = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Trips by status
    const tripsByStatus = await Trip.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Recent trips
    const recentTrips = await Trip.find({}).sort({ createdAt: -1 }).limit(5).populate('driverId', 'firstName lastName');

    // Simple revenue sample (could come from payments collection)
    const revenue = {
      tuition: 75000,
      transport: 15000,
      other: 10000
    };

    res.json({ success: true, usersByRole: users, tripsByStatus, recentTrips, revenue });
  } catch (err) {
    console.error('Analytics error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router; 