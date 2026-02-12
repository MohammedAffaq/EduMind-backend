const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const documentSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  url: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['academic', 'administrative', 'financial', 'policies', 'forms', 'certificates', 'reports', 'other'],
    required: true
  },
  subCategory: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  accessLevel: {
    type: String,
    enum: ['public', 'staff', 'teachers', 'students', 'parents', 'admin'],
    default: 'staff'
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'archived'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  expiryDate: {
    type: Date
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloadedAt: {
    type: Date
  },
  version: {
    type: Number,
    default: 1
  },
  parentDocumentId: {
    type: Schema.Types.ObjectId,
    ref: 'Document'
  },
  isLatestVersion: {
    type: Boolean,
    default: true
  },
  checksum: {
    type: String,
    trim: true
  },
  metadata: {
    pages: Number,
    language: String,
    author: String,
    created: Date,
    modified: Date
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
documentSchema.index({ category: 1 });
documentSchema.index({ accessLevel: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Pre-save middleware to update updatedAt
documentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for checking if document is expired
documentSchema.virtual('isExpired').get(function() {
  return this.expiryDate && new Date() > this.expiryDate;
});

// Virtual for checking if document is accessible to user
documentSchema.methods.isAccessibleTo = function(userRole) {
  const roleHierarchy = {
    'admin': 6,
    'teachers': 5,
    'staff': 4,
    'students': 3,
    'parents': 2,
    'public': 1
  };

  const docLevel = roleHierarchy[this.accessLevel] || 0;
  const userLevel = roleHierarchy[userRole] || 0;

  return userLevel >= docLevel;
};

// Method to approve document
documentSchema.methods.approve = function(approvedBy) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

// Method to reject document
documentSchema.methods.reject = function(rejectionReason, rejectedBy) {
  this.status = 'rejected';
  this.rejectionReason = rejectionReason;
  this.approvedBy = rejectedBy;
  this.approvedAt = new Date();
  return this.save();
};

// Method to increment download count
documentSchema.methods.recordDownload = function() {
  this.downloadCount += 1;
  this.lastDownloadedAt = new Date();
  return this.save();
};

// Method to create new version
documentSchema.methods.createVersion = async function(newDocumentData) {
  // Mark current version as not latest
  this.isLatestVersion = false;
  await this.save();

  // Create new version
  const newVersion = new this.constructor({
    ...newDocumentData,
    version: this.version + 1,
    parentDocumentId: this._id,
    isLatestVersion: true
  });

  return newVersion.save();
};

// Static method to get documents accessible to user
documentSchema.statics.getAccessibleTo = function(userRole, category = null) {
  const query = { status: 'approved' };

  if (category) query.category = category;

  // Define access levels based on user role
  const accessLevels = {
    'admin': ['public', 'staff', 'teachers', 'students', 'parents', 'admin'],
    'teachers': ['public', 'staff', 'teachers'],
    'staff': ['public', 'staff'],
    'students': ['public', 'students'],
    'parents': ['public', 'parents']
  };

  const allowedLevels = accessLevels[userRole] || ['public'];
  query.accessLevel = { $in: allowedLevels };

  return this.find(query)
    .populate('uploadedBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method to get documents by category
documentSchema.statics.getByCategory = function(category, userRole = null) {
  let query = { category, status: 'approved' };

  if (userRole) {
    const accessLevels = {
      'admin': ['public', 'staff', 'teachers', 'students', 'parents', 'admin'],
      'teachers': ['public', 'staff', 'teachers'],
      'staff': ['public', 'staff'],
      'students': ['public', 'students'],
      'parents': ['public', 'parents']
    };

    const allowedLevels = accessLevels[userRole] || ['public'];
    query.accessLevel = { $in: allowedLevels };
  }

  return this.find(query)
    .populate('uploadedBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method to get document versions
documentSchema.statics.getVersions = function(parentDocumentId) {
  return this.find({
    $or: [
      { _id: parentDocumentId },
      { parentDocumentId: parentDocumentId }
    ]
  })
  .populate('uploadedBy', 'firstName lastName')
  .sort({ version: -1 });
};

// Static method to search documents
documentSchema.statics.search = function(searchTerm, userRole = null, category = null) {
  let query = {
    status: 'approved',
    $text: { $search: searchTerm }
  };

  if (category) query.category = category;

  if (userRole) {
    const accessLevels = {
      'admin': ['public', 'staff', 'teachers', 'students', 'parents', 'admin'],
      'teachers': ['public', 'staff', 'teachers'],
      'staff': ['public', 'staff'],
      'students': ['public', 'students'],
      'parents': ['public', 'parents']
    };

    const allowedLevels = accessLevels[userRole] || ['public'];
    query.accessLevel = { $in: allowedLevels };
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('uploadedBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName')
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 });
};

module.exports = mongoose.model('Document', documentSchema);
