const express = require('express');
const QRScan = require('../models/qr_scans');
const router = express.Router();

// Get all QR scans
router.get('/', async (req, res) => {
  try {
    const scans = await QRScan.find()
      .populate('userId', 'firstName lastName email role')
      .sort({ scanTime: -1 });
    res.json({ success: true, scans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get QR scan by ID
router.get('/:id', async (req, res) => {
  try {
    const scan = await QRScan.findById(req.params.id)
      .populate('userId', 'firstName lastName email role');
    if (!scan) return res.status(404).json({ success: false, message: 'QR scan not found' });
    res.json({ success: true, scan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new QR scan (Mark attendance)
router.post('/', async (req, res) => {
  try {
    const { qrCode, location } = req.body;

    // Find user by QR code
    const User = require('../../models/User');
    const user = await User.findOne({ qrCode });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Invalid QR code' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is inactive' });
    }

    // Create QR scan record
    const scan = new QRScan({
      userId: user._id,
      scanTime: new Date(),
      location: location || 'School Entrance'
    });
    await scan.save();

    // Mark attendance as PRESENT
    const Attendance = require('../models/Attendance');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create or update attendance
    const attendance = await Attendance.findOneAndUpdate(
      { userId: user._id, attendanceDate: today },
      {
        userId: user._id,
        roleId: user.role,
        attendanceDate: today,
        checkInTime: new Date(),
        status: 'PRESENT',
        markedBy: 'QR'
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      scan,
      attendance,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      message: `Welcome ${user.firstName}! Attendance marked successfully.`
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update QR scan
router.put('/:id', async (req, res) => {
  try {
    const scan = await QRScan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!scan) return res.status(404).json({ success: false, message: 'QR scan not found' });
    res.json({ success: true, scan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete QR scan
router.delete('/:id', async (req, res) => {
  try {
    const scan = await QRScan.findByIdAndDelete(req.params.id);
    if (!scan) return res.status(404).json({ success: false, message: 'QR scan not found' });
    res.json({ success: true, message: 'QR scan deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
