const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  type: {
    type: String,
    enum: ['direct', 'group', 'class', 'announcement'],
    default: 'direct'
  },
  title: {
    type: String,
    trim: true,
    required: function() {
      return this.type === 'group' || this.type === 'class' || this.type === 'announcement';
    }
  },
  description: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  },
  lastMessageAt: {
    type: Date
  },
  messageCount: {
    type: Number,
    default: 0
  },
  unreadCount: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    }
  }],
  settings: {
    allowEveryoneToAdd: {
      type: Boolean,
      default: true
    },
    muteNotifications: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      muted: {
        type: Boolean,
        default: false
      }
    }],
    pinnedMessages: [{
      message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatMessage'
      },
      pinnedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      pinnedAt: {
        type: Date,
        default: Date.now
      }
    }]
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ type: 1 });
conversationSchema.index({ class: 1 });
conversationSchema.index({ subject: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ 'unreadCount.user': 1 });

// Virtual for checking if conversation is a direct message
conversationSchema.virtual('isDirectMessage').get(function() {
  return this.type === 'direct' && this.participants.length === 2;
});

// Virtual for checking if user is participant
conversationSchema.methods.isParticipant = function(userId) {
  return this.participants.some(participant => participant.toString() === userId.toString());
};

// Virtual for getting unread count for specific user
conversationSchema.methods.getUnreadCount = function(userId) {
  const unread = this.unreadCount.find(u => u.user.toString() === userId.toString());
  return unread ? unread.count : 0;
};

// Method to add participant
conversationSchema.methods.addParticipant = function(userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
  }
};

// Method to remove participant
conversationSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.toString() !== userId.toString());
};

// Method to update unread count
conversationSchema.methods.updateUnreadCount = function(userId, count) {
  const existing = this.unreadCount.find(u => u.user.toString() === userId.toString());
  if (existing) {
    existing.count = count;
  } else {
    this.unreadCount.push({ user: userId, count });
  }
};

module.exports = mongoose.model('Conversation', conversationSchema);
