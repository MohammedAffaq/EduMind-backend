const express = require('express');
const Subject = require('../models/Subject');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/subjects - Get all subjects
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, gradeLevel, isActive } = req.query;
    const query = {};

    if (category) query.category = category;
    if (gradeLevel) query.gradeLevel = gradeLevel;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const subjects = await Subject.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ name: 1 });

    res.json({ success: true, subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/subjects/:id - Get subject by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/subjects - Create new subject (Admin only)
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const subjectData = { ...req.body, createdBy: req.user._id };
    const newSubject = new Subject(subjectData);
    await newSubject.save();

    const populatedSubject = await Subject.findById(newSubject._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({ success: true, subject: populatedSubject });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Subject code already exists' });
    } else {
      res.status(400).json({ success: false, message: error.message });
    }
  }
});

// PUT /api/subjects/:id - Update subject (Admin only)
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const updatedSubject = await Subject.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName');

    if (!updatedSubject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ success: true, subject: updatedSubject });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Subject code already exists' });
    } else {
      res.status(400).json({ success: false, message: error.message });
    }
  }
});

// DELETE /api/subjects/:id - Delete subject (Admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const deletedSubject = await Subject.findByIdAndDelete(req.params.id);

    if (!deletedSubject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/subjects/:id/toggle - Toggle subject active status (Admin only)
router.put('/:id/toggle', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    subject.isActive = !subject.isActive;
    subject.updatedAt = new Date();
    await subject.save();

    res.json({ success: true, subject, message: `Subject ${subject.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/subjects/categories - Get subject categories
router.get('/meta/categories', requireAuth, async (req, res) => {
  try {
    const categories = [
      { value: 'core', label: 'Core Subject' },
      { value: 'elective', label: 'Elective Subject' },
      { value: 'language', label: 'Language' },
      { value: 'practical', label: 'Practical' },
      { value: 'theory', label: 'Theory' }
    ];

    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/subjects/grade-levels - Get grade levels
router.get('/meta/grade-levels', requireAuth, async (req, res) => {
  try {
    const gradeLevels = [
      { value: 'primary', label: 'Primary (1-5)' },
      { value: 'secondary', label: 'Secondary (6-10)' },
      { value: 'higher_secondary', label: 'Higher Secondary (11-12)' },
      { value: 'all', label: 'All Grades' }
    ];

    res.json({ success: true, gradeLevels });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
