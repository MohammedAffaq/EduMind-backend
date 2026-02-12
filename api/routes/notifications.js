const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/notifications - Get notifications for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, priority, isRead } = req.query;
    const skip = (page - 1) * limit;

    let query = {
      $or: [
        { targetUsers: req.user.id },
        { targetRoles: { $in: [req.user.role] } },
        { isBroadcast: true }
      ],
      isActive: true
    };

    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (isRead !== undefined) {
      const readStatus = isRead === 'true';
      if (readStatus) {
        query['readBy.user'] = req.user.id;
      } else {
        query['readBy.user'] = { $ne: req.user.id };
      }
    }

    const notifications = await Notification.find(query)
      .populate('sentBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);

    // Mark notifications as read
    await Notification.updateMany(
      {
        _id: { $in: notifications.map(n => n._id) },
        'readBy.user': { $ne: req.user.id }
      },
      {
        $push: {
          readBy: {
            user: req.user.id,
            readAt: new Date()
          }
        }
      }
    );

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/notifications/broadcast - Create broadcast notification (Admin only)
router.post('/broadcast', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { title, message, type, priority, targetRoles, expiresAt } = req.body;

    const notification = new Notification({
      title,
      message,
      type: type || 'announcement',
      priority: priority || 'medium',
      targetRoles: targetRoles || ['admin', 'teacher', 'student', 'staff', 'parent'],
      isBroadcast: true,
      sentBy: req.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });

    await notification.save();

    // Emit socket event for real-time notifications
    if (global.io) {
      global.io.emit('notification', {
        type: 'broadcast',
        notification: {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          createdAt: notification.createdAt
        }
      });
    }

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/notifications - Create targeted notification
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, message, type, priority, targetUsers, targetRoles, expiresAt } = req.body;

    const notification = new Notification({
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      targetUsers: targetUsers || [],
      targetRoles: targetRoles || [],
      sentBy: req.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });

    await notification.save();

    // Emit socket event for targeted users
    if (global.io) {
      const targetUserIds = targetUsers || [];
      // Emit to specific users if targetUsers provided
      targetUserIds.forEach(userId => {
        global.io.to(`user_${userId}`).emit('notification', {
          type: 'targeted',
          notification: {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            priority: notification.priority,
            createdAt: notification.createdAt
          }
        });
      });
    }

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if user can read this notification
    const canRead = notification.targetUsers.includes(req.user.id) ||
                    notification.targetRoles.includes(req.user.role) ||
                    notification.isBroadcast;

    if (!canRead) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if already read
    const alreadyRead = notification.readBy.some(read => read.user.toString() === req.user.id);

    if (!alreadyRead) {
      notification.readBy.push({
        user: req.user.id,
        readAt: new Date()
      });
      await notification.save();
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/notifications/:id - Delete notification (Admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.deleteOne();
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/notifications/unread-count - Get unread notifications count
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      $or: [
        { targetUsers: req.user.id },
        { targetRoles: { $in: [req.user.role] } },
        { isBroadcast: true }
      ],
      isActive: true,
      'readBy.user': { $ne: req.user.id }
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
