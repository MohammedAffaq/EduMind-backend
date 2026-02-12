const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['direct', 'group', 'announcement', 'system'],
    default: 'direct'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    archivedAt: {
      type: Date,
      default: Date.now
    }
  }],
  parentMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  threadId: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  tags: [{
    type: String,
    trim: true
  }],
  expiryDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
messageSchema.index({ senderId: 1 });
messageSchema.index({ recipientIds: 1 });
messageSchema.index({ threadId: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ isRead: 1 });
messageSchema.index({ messageType: 1 });

// Pre-save middleware to update updatedAt
messageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for checking if message is expired
messageSchema.virtual('isExpired').get(function() {
  return this.expiryDate && new Date() > this.expiryDate;
});

// Method to mark as read by a user
messageSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.some(read => read.userId.toString() === userId.toString())) {
    this.readBy.push({ userId, readAt: new Date() });
  }

  // Check if all recipients have read it
  const recipientIds = this.recipientIds.map(id => id.toString());
  const readUserIds = this.readBy.map(read => read.userId.toString());
  this.isRead = recipientIds.every(id => readUserIds.includes(id));

  return this.save();
};

// Method to archive for a user
messageSchema.methods.archiveForUser = function(userId) {
  if (!this.archivedBy.some(archive => archive.userId.toString() === userId.toString())) {
    this.archivedBy.push({ userId, archivedAt: new Date() });
  }
  return this.save();
};

// Static method to get conversation between two users
messageSchema.statics.getConversation = function(userId1, userId2, limit = 50) {
  return this.find({
    $or: [
      { senderId: userId1, recipientIds: userId2 },
      { senderId: userId2, recipientIds: userId1 }
    ]
  })
  .populate('senderId', 'firstName lastName email')
  .populate('recipientIds', 'firstName lastName email')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to get user's inbox
messageSchema.statics.getInbox = function(userId, includeArchived = false) {
  const query = {
    recipientIds: userId,
    messageType: { $ne: 'system' }
  };

  if (!includeArchived) {
    query.archivedBy = { $not: { $elemMatch: { userId } } };
  }

  return this.find(query)
    .populate('senderId', 'firstName lastName email')
    .populate('recipientIds', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

// Static method to get user's sent messages
messageSchema.statics.getSent = function(userId, includeArchived = false) {
  const query = { senderId: userId };

  if (!includeArchived) {
    query.archivedBy = { $not: { $elemMatch: { userId } } };
  }

  return this.find(query)
    .populate('senderId', 'firstName lastName email')
    .populate('recipientIds', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

// Static method to get unread count for user
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipientIds: userId,
    readBy: { $not: { $elemMatch: { userId } } },
    archivedBy: { $not: { $elemMatch: { userId } } },
    messageType: { $ne: 'system' }
  });
};

// Static method to get thread messages
messageSchema.statics.getThread = function(threadId) {
  return this.find({
    $or: [
      { _id: threadId },
      { threadId: threadId }
    ]
  })
  .populate('senderId', 'firstName lastName email')
  .populate('recipientIds', 'firstName lastName email')
  .sort({ createdAt: 1 });
};

module.exports = mongoose.model('Message', messageSchema);
