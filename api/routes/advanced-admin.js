const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const SystemHealth = require('../models/SystemHealth');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// All routes require admin authentication
router.use(auth.requireAuth);
router.use(auth.requireRole('admin'));

// GET /api/advanced-admin/system-config - Get all system configurations
router.get('/system-config', async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};

    if (category) {
      query.category = category;
    }

    const configs = await SystemConfig.find(query)
      .populate('lastModifiedBy', 'firstName lastName')
      .sort({ category: 1, key: 1 });

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('Error fetching system config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system configuration'
    });
  }
});

// POST /api/advanced-admin/system-config - Create new system configuration
router.post('/system-config', async (req, res) => {
  try {
    const { key, value, type, category, description, isSystemCritical, requiresRestart, validationRules } = req.body;

    // Validate required fields
    if (!key || !type || !category) {
      return res.status(400).json({
        success: false,
        error: 'Key, type, and category are required'
      });
    }

    // Check if config already exists
    const existing = await SystemConfig.findOne({ key });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Configuration with this key already exists'
      });
    }

    const config = new SystemConfig({
      key,
      value,
      type,
      category,
      description,
      isSystemCritical,
      requiresRestart,
      validationRules,
      lastModifiedBy: req.user._id
    });

    await config.save();

    // Log audit
    await AuditLog.create({
      userId: req.user._id,
      action: 'CREATE',
      resourceType: 'SystemConfig',
      resourceId: config._id,
      details: { key, category, type },
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error creating system config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create system configuration'
    });
  }
});

// PATCH /api/advanced-admin/system-config/:key - Update system configuration
router.patch('/system-config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, reason } = req.body;

    const config = await SystemConfig.findOne({ key });
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }

    await config.updateValue(value, req.user._id, reason);

    // Log audit
    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE',
      resourceType: 'SystemConfig',
      resourceId: config._id,
      details: { key, oldValue: config.changeHistory[config.changeHistory.length - 1]?.oldValue, newValue: value },
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error updating system config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update system configuration'
    });
  }
});

// POST /api/advanced-admin/system-config/bulk-update - Bulk update configurations
router.post('/system-config/bulk-update', async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: 'Updates must be an array'
      });
    }

    const results = await SystemConfig.bulkUpdate(updates, req.user._id);

    // Log audit for bulk update
    await AuditLog.create({
      userId: req.user._id,
      action: 'BULK_UPDATE',
      resourceType: 'SystemConfig',
      details: { updateCount: updates.length, results },
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk updating system config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update system configuration'
    });
  }
});

// GET /api/advanced-admin/system-health - Get system health status
router.get('/system-health', async (req, res) => {
  try {
    const overallHealth = await SystemHealth.getOverallHealth();
    const latestStatuses = await SystemHealth.getLatestHealthStatus();

    res.json({
      success: true,
      data: {
        overall: overallHealth,
        services: latestStatuses
      }
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system health'
    });
  }
});

// GET /api/advanced-admin/system-health/:service - Get health history for specific service
router.get('/system-health/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const { hours = 24 } = req.query;

    const history = await SystemHealth.getHealthHistory(service, parseInt(hours));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching service health history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service health history'
    });
  }
});

// POST /api/advanced-admin/system-health/record - Record health check (internal use)
router.post('/system-health/record', async (req, res) => {
  try {
    const healthData = req.body;
    const record = await SystemHealth.recordHealthCheck(healthData);

    res.status(201).json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Error recording health check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record health check'
    });
  }
});

// GET /api/advanced-admin/users/advanced - Advanced user management with detailed filtering
router.get('/users/advanced', async (req, res) => {
  try {
    const {
      role,
      status,
      staffType,
      class: classFilter,
      department,
      lastLoginBefore,
      lastLoginAfter,
      createdBefore,
      createdAfter,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    let query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (staffType) query.staffType = staffType;
    if (classFilter) query.className = classFilter;
    if (department) query.department = department;

    // Date filters
    if (lastLoginBefore || lastLoginAfter) {
      query.lastLogin = {};
      if (lastLoginAfter) query.lastLogin.$gte = new Date(lastLoginAfter);
      if (lastLoginBefore) query.lastLogin.$lte = new Date(lastLoginBefore);
    }

    if (createdBefore || createdAfter) {
      query.createdAt = {};
      if (createdAfter) query.createdAt.$gte = new Date(createdAfter);
      if (createdBefore) query.createdAt.$lte = new Date(createdBefore);
    }

    // Search filter
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      select: '-passwordHash'
    };

    const users = await User.paginate(query, options);

    res.json({
      success: true,
      data: users.docs,
      pagination: {
        page: users.page,
        limit: users.limit,
        total: users.totalDocs,
        pages: users.totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching advanced user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch advanced user data'
    });
  }
});

// POST /api/advanced-admin/users/bulk-action - Perform bulk actions on users
router.post('/users/bulk-action', async (req, res) => {
  try {
    const { action, userIds, data } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          errors.push({ userId, error: 'User not found' });
          continue;
        }

        switch (action) {
          case 'activate':
            user.status = 'active';
            await user.save();
            results.push({ userId, action: 'activated' });
            break;

          case 'deactivate':
            user.status = 'inactive';
            await user.save();
            results.push({ userId, action: 'deactivated' });
            break;

          case 'change_role':
            if (!data.role) {
              errors.push({ userId, error: 'Role is required for role change' });
              continue;
            }
            user.role = data.role;
            if (data.role === 'staff' && data.staffType) {
              user.staffType = data.staffType;
            }
            await user.save();
            results.push({ userId, action: 'role_changed', newRole: data.role });
            break;

          case 'reset_password':
            // In a real implementation, this would send a password reset email
            // For now, we'll just log the action
            results.push({ userId, action: 'password_reset_initiated' });
            break;

          default:
            errors.push({ userId, error: 'Invalid action' });
        }

        // Log audit for each successful action
        await AuditLog.create({
          userId: req.user._id,
          action: 'BULK_USER_ACTION',
          resourceType: 'User',
          resourceId: userId,
          details: { action, data },
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

      } catch (error) {
        errors.push({ userId, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        successful: results,
        failed: errors
      }
    });
  } catch (error) {
    console.error('Error performing bulk user action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk user action'
    });
  }
});

// GET /api/advanced-admin/analytics/advanced - Advanced analytics with custom date ranges
router.get('/analytics/advanced', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      metrics = ['users', 'logins', 'activities'],
      groupBy = 'day'
    } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const analytics = {};

    // User metrics
    if (metrics.includes('users')) {
      analytics.users = {
        total: await User.countDocuments(),
        active: await User.countDocuments({ status: 'active' }),
        byRole: await User.aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ]),
        createdOverTime: await User.aggregate([
          {
            $match: {
              createdAt: dateFilter.$gte || dateFilter.$lte ? dateFilter : { $exists: true }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id': 1 } }
        ])
      };
    }

    // Login metrics
    if (metrics.includes('logins')) {
      const LoginActivity = require('../models/LoginActivity');
      analytics.logins = {
        total: await LoginActivity.countDocuments(dateFilter.timestamp ? { timestamp: dateFilter } : {}),
        successful: await LoginActivity.countDocuments({
          ...dateFilter.timestamp ? { timestamp: dateFilter } : {},
          success: true
        }),
        byDeviceType: await LoginActivity.aggregate([
          {
            $match: {
              timestamp: dateFilter.$gte || dateFilter.$lte ? dateFilter : { $exists: true }
            }
          },
          { $group: { _id: '$deviceType', count: { $sum: 1 } } }
        ])
      };
    }

    // Activity metrics
    if (metrics.includes('activities')) {
      analytics.activities = {
        total: await AuditLog.countDocuments(dateFilter.createdAt ? { createdAt: dateFilter } : {}),
        byAction: await AuditLog.aggregate([
          {
            $match: {
              createdAt: dateFilter.$gte || dateFilter.$lte ? dateFilter : { $exists: true }
            }
          },
          { $group: { _id: '$action', count: { $sum: 1 } } }
        ]),
        byResourceType: await AuditLog.aggregate([
          {
            $match: {
              createdAt: dateFilter.$gte || dateFilter.$lte ? dateFilter : { $exists: true }
            }
          },
          { $group: { _id: '$resourceType', count: { $sum: 1 } } }
        ])
      };
    }

    res.json({
      success: true,
      data: analytics,
      filters: { startDate, endDate, metrics, groupBy }
    });
  } catch (error) {
    console.error('Error fetching advanced analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch advanced analytics'
    });
  }
});

// GET /api/advanced-admin/backup/status - Get backup status
router.get('/backup/status', async (req, res) => {
  try {
    // In a real implementation, this would check actual backup status
    // For now, return mock data
    const backupStatus = {
      lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      status: 'completed',
      size: '2.5 GB',
      nextScheduled: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      retention: {
        daily: 7,
        weekly: 4,
        monthly: 12
      }
    };

    res.json({
      success: true,
      data: backupStatus
    });
  } catch (error) {
    console.error('Error fetching backup status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup status'
    });
  }
});

// POST /api/advanced-admin/backup/create - Create manual backup
router.post('/backup/create', async (req, res) => {
  try {
    // In a real implementation, this would trigger a backup process
    // For now, just log the action

    await AuditLog.create({
      userId: req.user._id,
      action: 'BACKUP_CREATED',
      resourceType: 'System',
      details: { type: 'manual' },
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Backup creation initiated',
      backupId: `backup_${Date.now()}`
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    });
  }
});

module.exports = router;
