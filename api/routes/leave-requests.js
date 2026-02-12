const express = require('express');
const LeaveRequest = require('../models/LeaveRequest');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/leave-requests - Get leave requests
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, userId, startDate, endDate, limit = 50, offset = 0 } = req.query;
    let query = {};

    // Role-based filtering
    if (req.user.role === 'admin') {
      // Admin can see all
      if (userId) query.userId = userId;
    } else if (req.user.role === 'teacher' || req.user.role === 'staff') {
      // Teachers and staff can see their own and those they approve
      query.$or = [
        { userId: req.user._id },
        { approvedBy: req.user._id }
      ];
    } else {
      // Students can only see their own
      query.userId = req.user._id;
    }

    if (status) query.status = status;
    if (startDate && endDate) {
      query.$or = query.$or || [];
      query.$or.push(
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
      );
    }

    const leaveRequests = await LeaveRequest.find(query)
      .populate('userId', 'firstName lastName email role')
      .populate('approvedBy', 'firstName lastName')
      .populate('substituteTeacher', 'firstName lastName')
      .populate('comments.userId', 'firstName lastName')
      .sort({ appliedDate: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await LeaveRequest.countDocuments(query);

    res.json({
      success: true,
      leaveRequests,
      total,
      hasMore: offset + parseInt(limit) < total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/leave-requests/:id - Get leave request by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('userId', 'firstName lastName email role')
      .populate('approvedBy', 'firstName lastName')
      .populate('substituteTeacher', 'firstName lastName')
      .populate('comments.userId', 'firstName lastName');

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' &&
        leaveRequest.userId.toString() !== req.user._id.toString() &&
        leaveRequest.approvedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, leaveRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/leave-requests - Create new leave request
router.post('/', requireAuth, async (req, res) => {
  try {
    const leaveData = {
      ...req.body,
      userId: req.user._id,
      academicYear: req.body.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
    };

    // Calculate total days
    const startDate = new Date(leaveData.startDate);
    const endDate = new Date(leaveData.endDate);
    const diffTime = Math.abs(endDate - startDate);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    leaveData.totalDays = leaveData.isHalfDay ? totalDays - 0.5 : totalDays;

    const leaveRequest = new LeaveRequest(leaveData);
    await leaveRequest.save();

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('userId', 'firstName lastName email role')
      .populate('substituteTeacher', 'firstName lastName');

    res.status(201).json({ success: true, leaveRequest: populatedRequest });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/leave-requests/:id - Update leave request
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // Only the requester can update pending requests
    if (leaveRequest.userId.toString() !== req.user._id.toString() || leaveRequest.status !== 'pending') {
      return res.status(403).json({ success: false, message: 'Cannot update this leave request' });
    }

    // Recalculate total days if dates changed
    if (req.body.startDate || req.body.endDate || req.body.isHalfDay !== undefined) {
      const startDate = new Date(req.body.startDate || leaveRequest.startDate);
      const endDate = new Date(req.body.endDate || leaveRequest.endDate);
      const diffTime = Math.abs(endDate - startDate);
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const isHalfDay = req.body.isHalfDay !== undefined ? req.body.isHalfDay : leaveRequest.isHalfDay;
      req.body.totalDays = isHalfDay ? totalDays - 0.5 : totalDays;
    }

    const updatedRequest = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('userId', 'firstName lastName email role')
    .populate('substituteTeacher', 'firstName lastName');

    res.json({ success: true, leaveRequest: updatedRequest });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/leave-requests/:id/approve - Approve leave request
router.put('/:id/approve', requireAuth, async (req, res) => {
  try {
    const { comments } = req.body;
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // Check if user can approve (admin or designated approver)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await leaveRequest.approve(req.user._id, comments);

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('userId', 'firstName lastName email role')
      .populate('approvedBy', 'firstName lastName')
      .populate('comments.userId', 'firstName lastName');

    res.json({ success: true, leaveRequest: populatedRequest });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/leave-requests/:id/reject - Reject leave request
router.put('/:id/reject', requireAuth, async (req, res) => {
  try {
    const { rejectionReason, comments } = req.body;
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // Check if user can reject (admin or designated approver)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await leaveRequest.reject(req.user._id, rejectionReason, comments);

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('userId', 'firstName lastName email role')
      .populate('approvedBy', 'firstName lastName')
      .populate('comments.userId', 'firstName lastName');

    res.json({ success: true, leaveRequest: populatedRequest });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/leave-requests/:id - Cancel leave request
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // Only the requester can cancel pending requests
    if (leaveRequest.userId.toString() !== req.user._id.toString() || leaveRequest.status !== 'pending') {
      return res.status(403).json({ success: false, message: 'Cannot cancel this leave request' });
    }

    leaveRequest.status = 'cancelled';
    await leaveRequest.save();

    res.json({ success: true, message: 'Leave request cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/leave-requests/balance/:userId - Get leave balance
router.get('/balance/:userId', requireAuth, async (req, res) => {
  try {
    const { academicYear } = req.query;

    // Check permissions
    if (req.user.role !== 'admin' && req.params.userId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const balance = await LeaveRequest.getLeaveBalance(
      req.params.userId,
      academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
    );

    res.json({ success: true, balance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/leave-requests/stats/summary - Get leave statistics
router.get('/stats/summary', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { academicYear } = req.query;
    const year = academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const stats = await LeaveRequest.aggregate([
      { $match: { academicYear: year } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    const summary = {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      totalDaysApproved: 0
    };

    stats.forEach(stat => {
      summary[stat._id] = stat.count;
      if (stat._id === 'approved') {
        summary.totalDaysApproved = stat.totalDays;
      }
    });

    res.json({ success: true, summary, academicYear: year });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/leave-requests/meta/types - Get leave types
router.get('/meta/types', requireAuth, async (req, res) => {
  try {
    const leaveTypes = [
      { value: 'sick', label: 'Sick Leave' },
      { value: 'casual', label: 'Casual Leave' },
      { value: 'annual', label: 'Annual Leave' },
      { value: 'maternity', label: 'Maternity Leave' },
      { value: 'paternity', label: 'Paternity Leave' },
      { value: 'emergency', label: 'Emergency Leave' },
      { value: 'other', label: 'Other' }
    ];

    res.json({ success: true, leaveTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
