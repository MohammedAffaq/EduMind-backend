const express = require('express');
const router = express.Router();
const { Trip, Vehicle } = require('../models/transportModels');
// Assuming a User model exists at ../models/User.js
// const User = require('../models/User'); 
const { requireAuth } = require('../middleware/auth');

/**
 * @route   GET /api/trips/my
 * @desc    Get all trips for the logged-in driver
 * @access  Private (Driver)
 */
router.get('/trips/my', requireAuth, async (req, res) => {
  try {
    // Find trips assigned to the logged-in driver
    const trips = await Trip.find({ driverId: req.user.id })
      .populate('vehicleId', 'vehicleNumber routeName')
      .sort({ date: -1 });
      
    res.json({ success: true, trips });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PATCH /api/trips/:id/start
 * @desc    Start a trip. NOTE: Design doc specifies POST, but PATCH is more RESTful and used in frontend code.
 * @access  Private (Driver)
 */
router.patch('/trips/:id/start', requireAuth, async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, driverId: req.user.id });

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found or you are not authorized for this trip.' });
    }

    if (trip.status !== 'Not Started') {
        return res.status(400).json({ success: false, error: `Trip cannot be started as it is already ${trip.status}.` });
    }

    trip.status = 'In Progress';
    trip.startTime = new Date();
    await trip.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('trip:update', { trip });
    }

    res.json({ success: true, trip });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ success: false, error: 'Trip not found.' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PATCH /api/trips/:id/end
 * @desc    End a trip
 * @access  Private (Driver)
 */
router.patch('/trips/:id/end', requireAuth, async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, driverId: req.user.id });

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found or you are not authorized for this trip.' });
    }

    if (trip.status === 'Completed' || trip.status === 'Not Started') {
        return res.status(400).json({ success: false, error: `Trip cannot be ended as it is ${trip.status}.` });
    }

    trip.status = 'Completed';
    trip.endTime = new Date();
    await trip.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('trip:update', { trip });
    }

    res.json({ success: true, trip });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ success: false, error: 'Trip not found.' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/vehicles/my
 * @desc    Get vehicle assigned to the logged-in driver
 * @access  Private (Driver)
 */
router.get('/vehicles/my', requireAuth, async (req, res) => {
  try {
    // Find vehicle where the assignedDriver matches the logged-in user's ID
    const vehicle = await Vehicle.findOne({ assignedDriver: req.user.id });

    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'No vehicle is assigned to you.' });
    }

    res.json({ success: true, vehicle });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;