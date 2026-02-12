const express = require('express');
const Message = require('../models/Message');
const Announcement = require('../models/Announcement');
const Event = require('../models/Event');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/messages - Send message
router.post('/messages', auth.requireAuth, async (req, res) => {
  try {
    const { recipientId, subject, content, priority, category, attachments, threadId } = req.body;

    const message = new Message({
      senderId: req.user._id,
      recipientId,
      subject,
      content,
      priority: priority || 'medium',
      category: category || 'general',
      attachments,
      threadId,
      sentVia: 'web'
    });

    await message.save();

    // Populate sender and recipient info for response
    await message.populate('senderId', 'firstName lastName role');
    await message.populate('recipientId', 'firstName lastName role');

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages - View messages
router.get('/messages', auth.requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'inbox', status, category } = req.query;

    let query = {};

    if (type === 'inbox') {
      query.recipientId = req.user._id;
    } else if (type === 'sent') {
      query.senderId = req.user._id;
    } else if (type === 'all') {
      query.$or = [
        { senderId: req.user._id },
        { recipientId: req.user._id }
      ];
    }

    if (status) query.status = status;
    if (category) query.category = category;

    const messages = await Message.find(query)
      .populate('senderId', 'firstName lastName role')
      .populate('recipientId', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages/conversation/:userId - Get conversation with specific user
router.get('/messages/conversation/:userId', auth.requireAuth, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const { limit = 50 } = req.query;

    const messages = await Message.getConversation(req.user._id, otherUserId, limit);

    res.json({
      success: true,
      conversation: messages
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/messages/:id/read - Mark message as read
router.patch('/messages/:id/read', auth.requireAuth, async (req, res) => {
  try {
    const messageId = req.params.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user can read this message
    if (message.recipientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await message.markAsRead();

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/announcements - Create announcement
router.post('/announcements', auth.requireAuth, auth.requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, content, type, priority, targetAudience, expiresAt, attachments } = req.body;

    const announcement = new Announcement({
      title,
      content,
      type: type || 'general',
      priority: priority || 'medium',
      targetAudience,
      expiresAt,
      attachments,
      createdBy: req.user._id,
      status: 'active'
    });

    await announcement.save();

    res.status(201).json({
      success: true,
      announcement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/announcements - View announcements
router.get('/announcements', auth.requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, priority, status = 'active' } = req.query;

    const query = { status };

    // Filter by user role and target audience
    if (req.user.role !== 'admin') {
      query.$or = [
        { 'targetAudience.roles': req.user.role },
        { 'targetAudience.roles': { $exists: false } }, // Public announcements
        { 'targetAudience.specificUsers': req.user._id }
      ];
    }

    if (type) query.type = type;
    if (priority) query.priority = priority;

    // Filter out expired announcements
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ];

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Announcement.countDocuments(query);

    res.json({
      success: true,
      announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/events - Create event
router.post('/events', auth.requireAuth, auth.requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      organizer: {
        ...req.body.organizer,
        userId: req.user._id
      },
      createdBy: req.user._id
    };

    const event = new Event(eventData);
    await event.save();

    res.status(201).json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/events - View events
router.get('/events', auth.requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, eventType, category, status = 'published' } = req.query;

    const query = { status };

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    if (eventType) query.eventType = eventType;
    if (category) query.category = category;

    // Filter by user access
    if (req.user.role !== 'admin') {
      query.$or = [
        { visibility: 'public' },
        { 'targetAudience.roles': req.user.role },
        { 'targetAudience.specificUsers': req.user._id }
      ];
    }

    const events = await Event.find(query)
      .populate('organizer.userId', 'firstName lastName role')
      .populate('createdBy', 'firstName lastName')
      .sort({ startDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/events/upcoming - Get upcoming events
router.get('/events/upcoming', auth.requireAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const events = await Event.getUpcomingEvents(limit, req.user._id, req.user.role);

    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/events/:id/register - Register for event
router.post('/events/:id/register', auth.requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'published') {
      return res.status(400).json({ error: 'Event is not available for registration' });
    }

    // Check if user can attend
    if (!event.canUserAttend(req.user._id, req.user.role)) {
      return res.status(403).json({ error: 'You are not eligible to attend this event' });
    }

    const result = event.registerAttendee(req.user._id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    await event.save();

    res.json({
      success: true,
      message: result.waitlisted ? 'Added to waitlist' : 'Successfully registered for event',
      waitlisted: result.waitlisted || false
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/events/:id/attendees - Get event attendees (organizer only)
router.get('/events/:id/attendees', auth.requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is the organizer or admin
    if (event.organizer.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await event.populate('attendees.userId', 'firstName lastName email role');

    res.json({
      success: true,
      attendees: event.attendees,
      capacity: event.capacity
    });
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
