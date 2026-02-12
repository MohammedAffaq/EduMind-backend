const express = require('express');
const Document = require('../models/Document');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/documents - Get documents
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, status, limit = 20, offset = 0 } = req.query;
    let query = {};

    if (category) query.category = category;
    if (status) query.status = status;

    // Get documents accessible to user
    const documents = await Document.getAccessibleTo(req.user.role, category);

    // Apply pagination
    const paginatedDocuments = documents.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      documents: paginatedDocuments,
      total: documents.length,
      hasMore: offset + parseInt(limit) < documents.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/documents/:id - Get document by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Check access permissions
    if (!document.isAccessibleTo(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, document });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/documents - Upload new document
router.post('/', requireAuth, async (req, res) => {
  try {
    const documentData = {
      ...req.body,
      uploadedBy: req.user._id
    };

    const newDocument = new Document(documentData);
    await newDocument.save();

    const populatedDocument = await Document.findById(newDocument._id)
      .populate('uploadedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    res.status(201).json({ success: true, document: populatedDocument });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/documents/:id - Update document
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Check permissions - only uploader or admin can update
    if (req.user.role !== 'admin' && document.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('uploadedBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName');

    res.json({ success: true, document: updatedDocument });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/documents/:id - Delete document
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Check permissions - only uploader or admin can delete
    if (req.user.role !== 'admin' && document.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Document.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/documents/:id/approve - Approve document (Admin only)
router.put('/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await document.approve(req.user._id);

    res.json({ success: true, message: 'Document approved successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/documents/:id/reject - Reject document (Admin only)
router.put('/:id/reject', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await document.reject(rejectionReason, req.user._id);

    res.json({ success: true, message: 'Document rejected' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/documents/:id/download - Record download
router.put('/:id/download', requireAuth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Check access permissions
    if (!document.isAccessibleTo(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await document.recordDownload();

    res.json({ success: true, message: 'Download recorded' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/documents/search - Search documents
router.get('/search/query', requireAuth, async (req, res) => {
  try {
    const { q, category, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const documents = await Document.search(q, req.user.role, category);

    res.json({ success: true, documents: documents.slice(0, limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/documents/versions/:parentId - Get document versions
router.get('/versions/:parentId', requireAuth, async (req, res) => {
  try {
    const versions = await Document.getVersions(req.params.parentId);

    // Check if user has access to at least one version
    const hasAccess = versions.some(doc => doc.isAccessibleTo(req.user.role));

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, versions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/documents/:id/version - Create new version
router.post('/:id/version', requireAuth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Check permissions - only uploader or admin can create versions
    if (req.user.role !== 'admin' && document.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const versionData = {
      ...req.body,
      uploadedBy: req.user._id,
      parentDocumentId: document._id
    };

    const newVersion = await document.createVersion(versionData);

    const populatedVersion = await Document.findById(newVersion._id)
      .populate('uploadedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    res.status(201).json({ success: true, document: populatedVersion });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/documents/categories - Get document categories
router.get('/meta/categories', requireAuth, async (req, res) => {
  try {
    const categories = [
      { value: 'academic', label: 'Academic Documents' },
      { value: 'administrative', label: 'Administrative Documents' },
      { value: 'financial', label: 'Financial Documents' },
      { value: 'policies', label: 'Policies & Procedures' },
      { value: 'forms', label: 'Forms & Applications' },
      { value: 'certificates', label: 'Certificates' },
      { value: 'reports', label: 'Reports' },
      { value: 'other', label: 'Other' }
    ];

    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/documents/access-levels - Get access levels
router.get('/meta/access-levels', requireAuth, async (req, res) => {
  try {
    const accessLevels = [
      { value: 'public', label: 'Public' },
      { value: 'staff', label: 'Staff Only' },
      { value: 'teachers', label: 'Teachers Only' },
      { value: 'students', label: 'Students Only' },
      { value: 'parents', label: 'Parents Only' },
      { value: 'admin', label: 'Admin Only' }
    ];

    res.json({ success: true, accessLevels });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
