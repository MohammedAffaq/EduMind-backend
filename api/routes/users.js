const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /api/users - Get all users (Admin only)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }


    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
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

// GET /api/users/:id - Get user by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user can access this profile
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Non-admin users can only update their own profile (limited fields)
    if (req.user.role !== 'admin') {
      const allowedFields = ['firstName', 'lastName', 'phone'];
      const updates = {};

      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      ).select('-password');

      return res.json(updatedUser);
    }

    // Admin can update all fields
    const {
      firstName, lastName, email, phone, role, staffType,
      designation, subject, rollNumber, className, children,
      relationship, status, isActive
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        firstName, lastName, email, phone, role, staffType,
        designation, subject, rollNumber, className, children,
        relationship, status, isActive
      },
      { new: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin users' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/:id/change-password - Change password
router.put('/:id/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Verify current password (skip for admin changing other users' passwords)
    if (req.user.role !== 'admin' || req.user.id === req.params.id) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
    }

    // Hash new password
    // NOTE: If we use user.password = newPassword and user.save(), the pre-save hook will hash it.
    // The current implementation hashes it manually and sets it.
    // Since we are fixing the double-hashing logic, we should probably stick to one method.
    // However, the 'pre' hook on User.js only runs if 'password' field is modified.
    // The previous code was setting 'passwordHash'.
    // Let's rely on the model hook for consistency!

    user.password = newPassword; // This triggers the pre-save hook
    user.isFirstLogin = false;
    await user.save();

    // Log password change
    const PasswordHistory = require('../models/password_history');
    await PasswordHistory.create({
      userId: user._id,
      changedAt: new Date(),
      changedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/:id/status - Update user status (Admin only)
router.put('/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status, isActive } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    user.isActive = isActive;
    await user.save();

    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/users/stats/summary - Get user statistics (Admin only)
router.get('/stats/summary', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: ['$isActive', 1, 0] }
          }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const pendingUsers = await User.countDocuments({ status: 'PENDING' });

    res.json({
      totalUsers,
      activeUsers,
      pendingUsers,
      byRole: stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
