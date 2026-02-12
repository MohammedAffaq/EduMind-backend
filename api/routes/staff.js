const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * @route   GET /api/staff/attendance/report
 * @desc    Generate monthly attendance report for non-teaching staff
 * @access  Private (Admin)
 */
router.get('/attendance/report', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, error: 'Month and year are required.' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of the month

    // 1. Find all non-teaching staff
    const staffMembers = await User.find({ role: 'staff' }).select('firstName lastName email designation staffType');

    // 2. Aggregate attendance for the requested period
    const reportData = await Promise.all(staffMembers.map(async (staff) => {
      const attendanceRecords = await Attendance.find({
        userId: staff._id,
        date: { $gte: startDate, $lte: endDate }
      });

      const stats = {
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        halfDay: 0,
        totalWorkingDays: 0 // You might calculate this based on business logic (excluding weekends/holidays)
      };

      // Simple aggregation
      attendanceRecords.forEach(record => {
        if (stats[record.status.toLowerCase()]) { // Assuming status is stored like 'Present', 'Absent'
             stats[record.status.toLowerCase()]++;
        } else if (record.status === 'Present') {
             stats.present++;
        } else if (record.status === 'Absent') {
             stats.absent++;
        }
      });
      
      // Calculate total days recorded (simple version)
      stats.totalWorkingDays = attendanceRecords.length; 
      
      // Calculate percentage
      const presentDays = stats.present + (stats.late * 1) + (stats.halfDay * 0.5); // Weighting logic
      const attendancePercentage = stats.totalWorkingDays > 0 
        ? ((presentDays / stats.totalWorkingDays) * 100).toFixed(1) 
        : 0;

      return {
        staffId: staff._id,
        name: `${staff.firstName} ${staff.lastName}`,
        designation: staff.designation || staff.staffType,
        stats,
        attendancePercentage,
        details: attendanceRecords.map(r => ({
          date: r.date,
          status: r.status,
          checkIn: r.checkIn,
          checkOut: r.checkOut
        }))
      };
    }));

    res.json({ 
      success: true, 
      period: { month, year },
      report: reportData 
    });
  } catch (err) {
    console.error('Attendance report error:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;