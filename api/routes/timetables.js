const express = require('express');
const Timetable = require('../models/Timetable');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/timetables - Get all timetables
router.get('/', requireAuth, async (req, res) => {
  try {
    const { classId, academicYear, term, isActive } = req.query;
    const query = {};

    if (classId) query.classId = classId;
    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const timetables = await Timetable.find(query)
      .populate('classId', 'className section classTeacher')
      .populate('entries.subject', 'name code')
      .populate('entries.teacher', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ academicYear: -1, term: 1 });

    res.json({ success: true, timetables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/timetables/:id - Get timetable by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate('classId', 'className section classTeacher')
      .populate('entries.subject', 'name code')
      .populate('entries.teacher', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!timetable) {
      return res.status(404).json({ success: false, message: 'Timetable not found' });
    }

    res.json({ success: true, timetable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/timetables - Create new timetable (Admin/Teacher)
router.post('/', requireAuth, async (req, res) => {
  try {
    // Check if user is admin or teacher
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const timetableData = { ...req.body, createdBy: req.user._id };
    const newTimetable = new Timetable(timetableData);
    await newTimetable.save();

    const populatedTimetable = await Timetable.findById(newTimetable._id)
      .populate('classId', 'className section classTeacher')
      .populate('entries.subject', 'name code')
      .populate('entries.teacher', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({ success: true, timetable: populatedTimetable });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Timetable already exists for this class, academic year, and term' });
    } else {
      res.status(400).json({ success: false, message: error.message });
    }
  }
});

// PUT /api/timetables/:id - Update timetable (Admin/Teacher)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    // Check if user is admin or teacher
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedTimetable = await Timetable.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('classId', 'className section classTeacher')
    .populate('entries.subject', 'name code')
    .populate('entries.teacher', 'firstName lastName')
    .populate('createdBy', 'firstName lastName');

    if (!updatedTimetable) {
      return res.status(404).json({ success: false, message: 'Timetable not found' });
    }

    res.json({ success: true, timetable: updatedTimetable });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Timetable already exists for this class, academic year, and term' });
    } else {
      res.status(400).json({ success: false, message: error.message });
    }
  }
});

// DELETE /api/timetables/:id - Delete timetable (Admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const deletedTimetable = await Timetable.findByIdAndDelete(req.params.id);

    if (!deletedTimetable) {
      return res.status(404).json({ success: false, message: 'Timetable not found' });
    }

    res.json({ success: true, message: 'Timetable deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/timetables/:id/toggle - Toggle timetable active status (Admin/Teacher)
router.put('/:id/toggle', requireAuth, async (req, res) => {
  try {
    // Check if user is admin or teacher
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({ success: false, message: 'Timetable not found' });
    }

    timetable.isActive = !timetable.isActive;
    timetable.updatedAt = new Date();
    await timetable.save();

    res.json({ success: true, timetable, message: `Timetable ${timetable.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/timetables/class/:classId - Get timetable for a specific class
router.get('/class/:classId', requireAuth, async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    const query = { classId: req.params.classId };

    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;

    const timetable = await Timetable.findOne(query)
      .populate('classId', 'className section classTeacher')
      .populate('entries.subject', 'name code')
      .populate('entries.teacher', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!timetable) {
      return res.status(404).json({ success: false, message: 'Timetable not found for this class' });
    }

    res.json({ success: true, timetable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/timetables/teacher/:teacherId - Get teacher's schedule
router.get('/teacher/:teacherId', requireAuth, async (req, res) => {
  try {
    const { dayOfWeek } = req.query;

    const timetables = await Timetable.getTeacherSchedule(req.params.teacherId, dayOfWeek);

    res.json({ success: true, timetables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/timetables/room/:room - Get room schedule
router.get('/room/:room', requireAuth, async (req, res) => {
  try {
    const { dayOfWeek } = req.query;

    const timetables = await Timetable.getRoomSchedule(req.params.room, dayOfWeek);

    res.json({ success: true, timetables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/timetables/meta/days - Get days of week
router.get('/meta/days', requireAuth, async (req, res) => {
  try {
    const days = [
      { value: 1, label: 'Monday' },
      { value: 2, label: 'Tuesday' },
      { value: 3, label: 'Wednesday' },
      { value: 4, label: 'Thursday' },
      { value: 5, label: 'Friday' },
      { value: 6, label: 'Saturday' },
      { value: 7, label: 'Sunday' }
    ];

    res.json({ success: true, days });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/timetables/meta/terms - Get terms
router.get('/meta/terms', requireAuth, async (req, res) => {
  try {
    const terms = [
      { value: 'Term 1', label: 'Term 1' },
      { value: 'Term 2', label: 'Term 2' },
      { value: 'Term 3', label: 'Term 3' }
    ];

    res.json({ success: true, terms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
