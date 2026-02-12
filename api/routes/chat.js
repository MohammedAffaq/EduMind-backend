const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const { requireAuth } = require('../middleware/auth');

// GET /api/chat/conversations - Get user's conversations
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (page - 1) * limit;

    let query = {
      participants: req.user.id,
      isActive: true
    };

    if (type) query.type = type;

    const conversations = await Conversation.find(query)
      .populate('participants', 'firstName lastName role')
      .populate('lastMessage')
      .populate('createdBy', 'firstName lastName')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = conv.getUnreadCount(req.user.id);
        return {
          ...conv.toObject(),
          unreadCount
        };
      })
    );

    const total = await Conversation.countDocuments(query);

    res.json({
      conversations: conversationsWithUnread,
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

// POST /api/chat/conversations - Create new conversation
router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const { participants, type, title, class: classId, subject: subjectId } = req.body;

    // Ensure current user is included in participants
    const allParticipants = [...new Set([...participants, req.user.id])];

    // Check if direct conversation already exists
    if (type === 'direct' && allParticipants.length === 2) {
      const existingConv = await Conversation.findOne({
        type: 'direct',
        participants: { $all: allParticipants, $size: 2 },
        isActive: true
      });

      if (existingConv) {
        return res.json(existingConv);
      }
    }

    const conversation = new Conversation({
      participants: allParticipants,
      type: type || 'direct',
      title,
      class: classId,
      subject: subjectId,
      createdBy: req.user.id
    });

    await conversation.save();

    // Populate and return
    await conversation.populate('participants', 'firstName lastName role');
    await conversation.populate('createdBy', 'firstName lastName');

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/chat/conversations/:id - Get conversation details
router.get('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'firstName lastName role')
      .populate('lastMessage')
      .populate('createdBy', 'firstName lastName');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.isParticipant(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/chat/conversations/:id/messages - Get conversation messages
router.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.isParticipant(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await ChatMessage.find({ conversation: req.params.id })
      .populate('sender', 'firstName lastName role')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ChatMessage.countDocuments({ conversation: req.params.id });

    // Mark messages as read
    await ChatMessage.updateMany(
      {
        conversation: req.params.id,
        sender: { $ne: req.user.id },
        'readBy.user': { $ne: req.user.id }
      },
      {
        $push: {
          readBy: {
            user: req.user.id,
            readAt: new Date()
          }
        }
      }
    );

    // Update conversation unread count
    conversation.updateUnreadCount(req.user.id, 0);
    await conversation.save();

    res.json({
      messages: messages.reverse(), // Return in chronological order
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

// POST /api/chat/conversations/:id/messages - Send message
router.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    const { content, messageType, attachments, replyTo } = req.body;

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.isParticipant(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const message = new ChatMessage({
      conversation: req.params.id,
      sender: req.user.id,
      content,
      messageType: messageType || 'text',
      attachments: attachments || [],
      replyTo
    });

    await message.save();

    // Populate sender info
    await message.populate('sender', 'firstName lastName role');
    if (replyTo) {
      await message.populate('replyTo');
    }

    // Update conversation's last message
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    conversation.messageCount += 1;

    // Update unread counts for other participants
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user.id) {
        conversation.updateUnreadCount(participantId, conversation.getUnreadCount(participantId) + 1);
      }
    });

    await conversation.save();

    // Emit socket event
    if (global.io) {
      conversation.participants.forEach(participantId => {
        if (participantId.toString() !== req.user.id) {
          global.io.to(`user_${participantId}`).emit('chat_message', {
            conversation: req.params.id,
            message: message
          });
        }
      });
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/chat/messages/:id - Edit message
router.put('/messages/:id', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;

    const message = await ChatMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    message.content = content;
    message.edited = true;
    message.editedAt = new Date();
    message.originalContent = message.originalContent || message.content;

    await message.save();

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/chat/messages/:id - Delete message
router.delete('/messages/:id', requireAuth, async (req, res) => {
  try {
    const message = await ChatMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    message.deleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user.id;

    await message.save();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/chat/messages/:id/reactions - Add reaction to message
router.post('/messages/:id/reactions', requireAuth, async (req, res) => {
  try {
    const { emoji } = req.body;

    const message = await ChatMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.user.toString() === req.user.id && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(
        r => !(r.user.toString() === req.user.id && r.emoji === emoji)
      );
    } else {
      // Add reaction
      message.reactions.push({
        emoji,
        user: req.user.id,
        reactedAt: new Date()
      });
    }

    await message.save();

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/chat/unread-count - Get total unread messages count
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
      isActive: true
    });

    let totalUnread = 0;
    conversations.forEach(conv => {
      totalUnread += conv.getUnreadCount(req.user.id);
    });

    res.json({ count: totalUnread });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
