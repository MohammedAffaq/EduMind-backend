const express = require('express');
const Attendance = require('../models/Attendance');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');

const router = express.Router();

// Get today's attendance for current user
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      user: req.user.id,
      date: { $gte: today, $lt: tomorrow }
    });

    res.json(attendance || { status: 'Not Checked In' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check in
router.post('/check-in', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      user: req.user.id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    const attendance = new Attendance({
      user: req.user.id,
      checkInTime: new Date(),
      status: 'Present'
    });

    await attendance.save();

    // Log activity
    await Activity.create({
      user: req.user.id,
      action: 'Checked in for work',
      type: 'attendance',
      details: { attendanceId: attendance._id }
    });

    res.status(201).json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Check out
router.post('/check-out', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOneAndUpdate(
      {
        user: req.user.id,
        date: { $gte: today, $lt: tomorrow },
        checkOutTime: { $exists: false }
      },
      {
        checkOutTime: new Date(),
        status: 'Completed'
      },
      { new: true }
    );

    if (!attendance) {
      return res.status(400).json({ message: 'No active check-in found or already checked out' });
    }

    // Calculate hours worked
    const hoursWorked = (attendance.checkOutTime - attendance.checkInTime) / (1000 * 60 * 60);

    // Log activity
    await Activity.create({
      user: req.user.id,
      action: `Checked out after ${hoursWorked.toFixed(2)} hours`,
      type: 'attendance',
      details: { attendanceId: attendance._id, hoursWorked }
    });

    res.json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get attendance history
router.get('/history', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { user: req.user.id };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(30);

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance summary
router.get('/summary', auth, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendance = await Attendance.find({
      user: req.user.id,
      date: { $gte: thirtyDaysAgo }
    });

    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'Present').length;
    const absentDays = totalDays - presentDays;

    res.json({
      totalDays,
      presentDays,
      absentDays,
      attendancePercentage: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// QR scan attendance marking
router.post('/qr-scan', auth, async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ message: 'QR data is required' });
    }

    // Parse QR data (format: ID:Name:Role:AdditionalInfo)
    const [userId, name, role, additionalInfo] = qrData.split(':');

    if (!userId) {
      return res.status(400).json({ message: 'Invalid QR code format' });
    }

    // Find user by ID (assuming userId is the unique identifier)
    const User = require('../models/User');
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already marked present today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      user: user._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance && existingAttendance.status === 'Present') {
      return res.status(400).json({ message: 'Attendance already marked for today' });
    }

    // Mark attendance as present
    const attendance = await Attendance.findOneAndUpdate(
      {
        user: user._id,
        date: { $gte: today, $lt: tomorrow }
      },
      {
        checkInTime: new Date(),
        status: 'Present'
      },
      { upsert: true, new: true }
    );

    // Log activity
    await Activity.create({
      user: user._id,
      action: 'Attendance marked via QR scan',
      type: 'attendance',
      details: { attendanceId: attendance._id, scannedBy: req.user.id }
    });

    res.json({
      message: 'Attendance marked successfully',
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role || role
      },
      attendance
    });

  } catch (error) {
    console.error('QR scan attendance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
