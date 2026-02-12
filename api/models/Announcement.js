const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const announcementSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  summary: {
    type: String,
    trim: true,
    maxlength: 200
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['academic', 'administrative', 'events', 'holidays', 'exams', 'general'],
    default: 'general'
  },
  targetAudience: {
    type: String,
    enum: ['all', 'students', 'teachers', 'parents', 'staff'],
    default: 'all'
  },
  targetClasses: [{
    type: Schema.Types.ObjectId,
    ref: 'Class'
  }],
  targetUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
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
  isPublished: {
    type: Boolean,
    default: false
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
announcementSchema.index({ targetAudience: 1 });
announcementSchema.index({ category: 1 });
announcementSchema.index({ isPublished: 1, isActive: 1 });
announcementSchema.index({ publishDate: -1 });
announcementSchema.index({ expiryDate: 1 });

// Pre-save middleware to update updatedAt
announcementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for checking if expired
announcementSchema.virtual('isExpired').get(function() {
  return this.expiryDate && new Date() > this.expiryDate;
});

// Method to publish announcement
announcementSchema.methods.publish = function() {
  this.isPublished = true;
  this.publishDate = new Date();
  return this.save();
};

// Method to increment view count
announcementSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

// Static method to get active announcements
announcementSchema.statics.getActive = function(targetAudience = 'all', classId = null) {
  const query = {
    isPublished: true,
    isActive: true,
    $or: [
      { targetAudience: 'all' },
      { targetAudience: targetAudience }
    ]
  };

  // If classId provided, include announcements targeted to that class
  if (classId) {
    query.$or.push({ targetClasses: classId });
  }

  // Exclude expired announcements
  const now = new Date();
  query.$or = query.$or.map(condition => ({
    ...condition,
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gt: now } }
    ]
  }));

  return this.find(query)
    .populate('createdBy', 'firstName lastName')
    .populate('targetClasses', 'className section')
    .sort({ priority: -1, publishDate: -1 });
};

// Static method to get announcements by category
announcementSchema.statics.getByCategory = function(category, limit = 10) {
  return this.find({
    category,
    isPublished: true,
    isActive: true
  })
  .populate('createdBy', 'firstName lastName')
  .sort({ publishDate: -1 })
  .limit(limit);
};

// Static method to get urgent announcements
announcementSchema.statics.getUrgent = function() {
  return this.find({
    priority: { $in: ['high', 'urgent'] },
    isPublished: true,
    isActive: true
  })
  .populate('createdBy', 'firstName lastName')
  .sort({ publishDate: -1 });
};

module.exports = mongoose.model('Announcement', announcementSchema);
