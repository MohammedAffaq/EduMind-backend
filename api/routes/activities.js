const express = require('express');
const LoginActivity = require('../models/LoginActivity');
const Notification = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/activities/login (admin only)
router.get('/login', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { role, date, page = 1, limit = 20 } = req.query;

    let query = {};

    // Filter by role if specified
    if (role && role !== 'all') {
      // In production, you might want to join with User model
      // For now, we'll skip this filter as LoginActivity doesn't store role directly
    }

    // Filter by date if specified
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.loginTime = { $gte: startDate, $lt: endDate };
    }

    const activities = await LoginActivity.find(query)
      .populate('userId', 'firstName lastName email role')
      .sort({ loginTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await LoginActivity.countDocuments(query);

    res.json({
      success: true,
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching login activities:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/activities/notifications
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    let query = { recipient: req.user._id };

    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/activities/notifications/:id/read
router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/activities/notifications/:id (admin only)
router.delete('/notifications/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
