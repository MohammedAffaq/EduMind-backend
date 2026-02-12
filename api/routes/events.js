const express = require('express');
const Event = require('../models/Event');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/events - Get events
router.get('/', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, type, status, limit = 50 } = req.query;
    let query = {};

    if (startDate && endDate) {
      query = Event.getInDateRange(new Date(startDate), new Date(endDate), req.user._id);
    } else if (type) {
      query = Event.getByType(type, limit);
    } else {
      query = Event.getUpcoming(limit, req.user._id);
    }

    // Apply status filter if provided
    if (status) {
      query = query.where('status').equals(status);
    }

    const events = await query;

    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/events/:id - Get event by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'firstName lastName email')
      .populate('participants.userId', 'firstName lastName email')
      .populate('targetClasses', 'className section')
      .populate('createdBy', 'firstName lastName');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/events - Create new event
router.post('/', requireAuth, async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      organizer: req.user._id,
      createdBy: req.user._id
    };

    const newEvent = new Event(eventData);
    await newEvent.save();

    const populatedEvent = await Event.findById(newEvent._id)
      .populate('organizer', 'firstName lastName email')
      .populate('participants.userId', 'firstName lastName email')
      .populate('targetClasses', 'className section')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({ success: true, event: populatedEvent });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Event conflict detected' });
    } else {
      res.status(400).json({ success: false, message: error.message });
    }
  }
});

// PUT /api/events/:id - Update event
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('organizer', 'firstName lastName email')
    .populate('participants.userId', 'firstName lastName email')
    .populate('targetClasses', 'className section')
    .populate('createdBy', 'firstName lastName');

    res.json({ success: true, event: updatedEvent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/events/:id - Delete event
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/events/:id/publish - Publish event
router.put('/:id/publish', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await event.publish();

    res.json({ success: true, message: 'Event published successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/events/:id/participants - Add participant
router.post('/:id/participants', requireAuth, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    await event.addParticipant(userId, role);

    res.json({ success: true, message: 'Participant added successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/events/:id/participants/:userId/status - Update participant status
router.put('/:id/participants/:userId/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if user can update this status
    const isOrganizer = event.organizer.toString() === req.user._id.toString();
    const isParticipant = req.params.userId === req.user._id.toString();

    if (!isOrganizer && !isParticipant) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await event.updateParticipantStatus(req.params.userId, status);

    res.json({ success: true, message: 'Participant status updated' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/events/user/:userId - Get user's events
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    // Check permissions - users can only see their own events unless admin
    if (req.user.role !== 'admin' && req.params.userId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { status } = req.query;
    const events = await Event.getUserEvents(req.params.userId, status);

    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/events/calendar - Get events for calendar view
router.get('/calendar/range', requireAuth, async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required' });
    }

    const events = await Event.getInDateRange(new Date(start), new Date(end), req.user._id);

    // Format for calendar display
    const calendarEvents = events.map(event => ({
      id: event._id,
      title: event.title,
      start: event.startDate,
      end: event.endDate,
      allDay: event.isAllDay,
      backgroundColor: getEventColor(event.eventType),
      extendedProps: {
        type: event.eventType,
        location: event.location,
        organizer: event.organizer.firstName + ' ' + event.organizer.lastName
      }
    }));

    res.json({ success: true, events: calendarEvents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function to get event colors
function getEventColor(eventType) {
  const colors = {
    academic: '#3B82F6',    // blue
    sports: '#10B981',      // green
    cultural: '#F59E0B',    // yellow
    holiday: '#EF4444',     // red
    meeting: '#8B5CF6',     // purple
    ceremony: '#F97316',    // orange
    workshop: '#06B6D4',    // cyan
    competition: '#84CC16', // lime
    other: '#6B7280'        // gray
  };
  return colors[eventType] || colors.other;
}

// GET /api/events/types - Get event types
router.get('/meta/types', requireAuth, async (req, res) => {
  try {
    const types = [
      { value: 'academic', label: 'Academic' },
      { value: 'sports', label: 'Sports' },
      { value: 'cultural', label: 'Cultural' },
      { value: 'holiday', label: 'Holiday' },
      { value: 'meeting', label: 'Meeting' },
      { value: 'ceremony', label: 'Ceremony' },
      { value: 'workshop', label: 'Workshop' },
      { value: 'competition', label: 'Competition' },
      { value: 'other', label: 'Other' }
    ];

    res.json({ success: true, types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
