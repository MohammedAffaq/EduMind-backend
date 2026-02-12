const express = require('express');
const Class = require('../models/Class');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/classes - Get all classes
router.get('/', requireAuth, async (req, res) => {
  try {
    const { academicYear, status, classTeacher, limit = 50, offset = 0 } = req.query;
    let query = {};

    if (academicYear) query.academicYear = academicYear;
    if (status) query.status = status;
    if (classTeacher) query.classTeacher = classTeacher;

    const classes = await Class.find(query)
      .populate('classTeacher', 'firstName lastName email')
      .populate('subjectTeachers.subject', 'name code')
      .populate('subjectTeachers.teacher', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ className: 1, section: 1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await Class.countDocuments(query);

    res.json({
      success: true,
      classes,
      total,
      hasMore: offset + parseInt(limit) < total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/classes/:id - Get class by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('classTeacher', 'firstName lastName email')
      .populate('subjectTeachers.subject', 'name code')
      .populate('subjectTeachers.teacher', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.json({ success: true, class: classData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/classes - Create new class
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const classData = {
      ...req.body,
      createdBy: req.user._id,
      academicYear: req.body.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
    };

    const newClass = new Class(classData);
    await newClass.save();

    const populatedClass = await Class.findById(newClass._id)
      .populate('classTeacher', 'firstName lastName email')
      .populate('subjectTeachers.subject', 'name code')
      .populate('subjectTeachers.teacher', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({ success: true, class: populatedClass });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Class with this name and section already exists for the academic year' });
    } else {
      res.status(400).json({ success: false, message: error.message });
    }
  }
});

// PUT /api/classes/:id - Update class
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('classTeacher', 'firstName lastName email')
    .populate('subjectTeachers.subject', 'name code')
    .populate('subjectTeachers.teacher', 'firstName lastName')
    .populate('createdBy', 'firstName lastName');

    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.json({ success: true, class: updatedClass });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Class with this name and section already exists for the academic year' });
    } else {
      res.status(400).json({ success: false, message: error.message });
    }
  }
});

// DELETE /api/classes/:id - Delete class
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const deletedClass = await Class.findByIdAndDelete(req.params.id);

    if (!deletedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/classes/:id/students/add - Add student to class
router.put('/:id/students/add', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (!classData.addStudent()) {
      return res.status(400).json({ success: false, message: 'Class is at maximum capacity' });
    }

    await classData.save();

    res.json({ success: true, class: classData, message: 'Student added to class' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/classes/:id/students/remove - Remove student from class
router.put('/:id/students/remove', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (!classData.removeStudent()) {
      return res.status(400).json({ success: false, message: 'No students to remove' });
    }

    await classData.save();

    res.json({ success: true, class: classData, message: 'Student removed from class' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/classes/teacher/:teacherId - Get classes by teacher
router.get('/teacher/:teacherId', requireAuth, async (req, res) => {
  try {
    const classes = await Class.find({
      $or: [
        { classTeacher: req.params.teacherId },
        { 'subjectTeachers.teacher': req.params.teacherId }
      ]
    })
    .populate('classTeacher', 'firstName lastName email')
    .populate('subjectTeachers.subject', 'name code')
    .populate('subjectTeachers.teacher', 'firstName lastName')
    .sort({ className: 1, section: 1 });

    res.json({ success: true, classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/classes/student/:studentId - Get student's class
router.get('/student/:studentId', requireAuth, async (req, res) => {
  try {
    // Check permissions - students can only see their own class, admins/teachers can see any
    if (req.user.role === 'student' && req.params.studentId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // This would need to be implemented based on student enrollment
    // For now, return empty as we don't have student-class relationship yet
    res.json({ success: true, class: null, message: 'Student class lookup not yet implemented' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/classes/stats/summary - Get class statistics
router.get('/stats/summary', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { academicYear } = req.query;
    const year = academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const stats = await Class.aggregate([
      { $match: { academicYear: year, status: 'active' } },
      {
        $group: {
          _id: null,
          totalClasses: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
          totalStrength: { $sum: '$currentStrength' },
          averageClassSize: { $avg: '$currentStrength' },
          classesAtCapacity: {
            $sum: {
              $cond: [
                { $eq: ['$currentStrength', '$capacity'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const summary = stats[0] || {
      totalClasses: 0,
      totalCapacity: 0,
      totalStrength: 0,
      averageClassSize: 0,
      classesAtCapacity: 0
    };

    res.json({ success: true, summary, academicYear: year });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/classes/meta/sections - Get available sections
router.get('/meta/sections', requireAuth, async (req, res) => {
  try {
    const sections = [
      { value: 'A', label: 'Section A' },
      { value: 'B', label: 'Section B' },
      { value: 'C', label: 'Section C' },
      { value: 'D', label: 'Section D' },
      { value: 'E', label: 'Section E' },
      { value: 'F', label: 'Section F' }
    ];

    res.json({ success: true, sections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
