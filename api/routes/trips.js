const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const { requireAuth } = require('../middleware/auth');

// Helper: Calculate distance between two coordinates in km (Haversine formula)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// GET /api/trips - List all trips
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('driverId', 'firstName lastName')
      .populate('vehicleId', 'vehicleNumber routeName')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, trips });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// POST /api/trips - Create a new trip
router.post('/', async (req, res) => {
  try {
    const { driverId, vehicleId, routeName, vehicleNumber, date, stops } = req.body;
    
    const trip = new Trip({
      driverId,
      vehicleId,
      routeName,
      vehicleNumber,
      date: date || new Date(),
      stops: stops || [],
      status: 'not-started'
    });

    await trip.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('trip:update', { trip });
    }

    res.json({ success: true, trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// PATCH /api/trips/:id/location - Update trip location (Live Tracking)
router.patch('/:id/location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    trip.currentLocation = { lat, lng };

    // Check proximity to stops
    const PROXIMITY_THRESHOLD_KM = 1.0; // Notify when within 1km
    let notificationSent = false;

    if (trip.stops && trip.stops.length > 0) {
      for (const stop of trip.stops) {
        if (!stop.isReached && stop.coordinates && stop.coordinates.lat) {
          const dist = getDistanceFromLatLonInKm(lat, lng, stop.coordinates.lat, stop.coordinates.lng);
          
          if (dist <= PROXIMITY_THRESHOLD_KM) {
            stop.isReached = true;
            notificationSent = true;

            // Emit event to notify parents
            const io = req.app.get('io');
            if (io) {
              io.emit('bus-proximity', {
                tripId: trip._id,
                stopName: stop.name,
                message: `Bus is approaching ${stop.name}`,
                timestamp: new Date()
              });
            }
          }
        }
      }
    }

    await trip.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('trip:location', { tripId: trip._id, location: { lat, lng } });
    }

    res.json({ success: true, location: trip.currentLocation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;