const express = require('express');
const Scholarship = require('../models/Scholarship');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/scholarships - Get scholarships
router.get('/', requireAuth, async (req, res) => {
  try {
    const { type, status, academicYear, category, limit = 50, offset = 0 } = req.query;
    let query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (academicYear) query.academicYear = academicYear;
    if (category) query.category = category;

    const scholarships = await Scholarship.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('awards.studentId', 'firstName lastName email rollNumber')
      .populate('awards.awardedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await Scholarship.countDocuments(query);

    res.json({
      success: true,
      scholarships,
      total,
      hasMore: offset + parseInt(limit) < total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/scholarships/:id - Get scholarship by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const scholarship = await Scholarship.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('awards.studentId', 'firstName lastName email rollNumber')
      .populate('awards.awardedBy', 'firstName lastName');

    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found' });
    }

    res.json({ success: true, scholarship });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/scholarships - Create new scholarship
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const scholarshipData = {
      ...req.body,
      createdBy: req.user._id,
      academicYear: req.body.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
    };

    const newScholarship = new Scholarship(scholarshipData);
    await newScholarship.save();

    const populatedScholarship = await Scholarship.findById(newScholarship._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({ success: true, scholarship: populatedScholarship });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/scholarships/:id - Update scholarship
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const updatedScholarship = await Scholarship.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName');

    if (!updatedScholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found' });
    }

    res.json({ success: true, scholarship: updatedScholarship });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/scholarships/:id - Delete scholarship
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const deletedScholarship = await Scholarship.findByIdAndDelete(req.params.id);

    if (!deletedScholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found' });
    }

    res.json({ success: true, message: 'Scholarship deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/scholarships/:id/approve - Approve scholarship
router.put('/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const scholarship = await Scholarship.findById(req.params.id);

    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found' });
    }

    scholarship.status = 'active';
    scholarship.approvedBy = req.user._id;
    scholarship.approvalDate = new Date();
    await scholarship.save();

    res.json({ success: true, message: 'Scholarship approved successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/scholarships/:id/awards - Award scholarship to student
router.post('/:id/awards', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { studentId, amount, remarks } = req.body;
    const scholarship = await Scholarship.findById(req.params.id);

    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found' });
    }

    if (scholarship.awardedCount >= scholarship.availableSlots) {
      return res.status(400).json({ success: false, message: 'No available slots for this scholarship' });
    }

    // Check if student already has this scholarship
    const existingAward = scholarship.awards.find(award => award.studentId.toString() === studentId);
    if (existingAward) {
      return res.status(400).json({ success: false, message: 'Student already awarded this scholarship' });
    }

    scholarship.awards.push({
      studentId,
      awardedBy: req.user._id,
      amount,
      remarks
    });

    scholarship.awardedCount = scholarship.awards.length;
    scholarship.updateBudgetUtilization();
    await scholarship.save();

    const populatedScholarship = await Scholarship.findById(scholarship._id)
      .populate('awards.studentId', 'firstName lastName email rollNumber')
      .populate('awards.awardedBy', 'firstName lastName');

    res.json({ success: true, scholarship: populatedScholarship });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/scholarships/:id/awards/:awardId - Update award status
router.put('/:id/awards/:awardId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const scholarship = await Scholarship.findById(req.params.id);

    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found' });
    }

    const award = scholarship.awards.id(req.params.awardId);
    if (!award) {
      return res.status(404).json({ success: false, message: 'Award not found' });
    }

    award.status = status;
    if (remarks) award.remarks = remarks;
    await scholarship.save();

    res.json({ success: true, message: 'Award status updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/scholarships/student/:studentId - Get student's scholarships
router.get('/student/:studentId', requireAuth, async (req, res) => {
  try {
    // Check permissions - students can only see their own, admins can see any
    if (req.user.role !== 'admin' && req.params.studentId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const scholarships = await Scholarship.find({
      'awards.studentId': req.params.studentId,
      'awards.status': 'active'
    })
    .populate('awards.studentId', 'firstName lastName email rollNumber')
    .populate('awards.awardedBy', 'firstName lastName');

    res.json({ success: true, scholarships });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/scholarships/stats/summary - Get scholarship statistics
router.get('/stats/summary', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { academicYear } = req.query;
    const year = academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const stats = await Scholarship.aggregate([
      { $match: { academicYear: year } },
      {
        $group: {
          _id: null,
          totalScholarships: { $sum: 1 },
          activeScholarships: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalBudget: { $sum: '$budget.allocated' },
          utilizedBudget: { $sum: '$budget.utilized' },
          totalAwards: { $sum: { $size: '$awards' } },
          activeAwards: {
            $sum: {
              $size: {
                $filter: {
                  input: '$awards',
                  cond: { $eq: ['$$this.status', 'active'] }
                }
              }
            }
          }
        }
      }
    ]);

    const summary = stats[0] || {
      totalScholarships: 0,
      activeScholarships: 0,
      totalBudget: 0,
      utilizedBudget: 0,
      totalAwards: 0,
      activeAwards: 0
    };

    res.json({ success: true, summary, academicYear: year });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/scholarships/meta/types - Get scholarship types
router.get('/meta/types', requireAuth, async (req, res) => {
  try {
    const types = [
      { value: 'merit', label: 'Merit-based' },
      { value: 'need_based', label: 'Need-based' },
      { value: 'sports', label: 'Sports' },
      { value: 'cultural', label: 'Cultural' },
      { value: 'special_achievement', label: 'Special Achievement' },
      { value: 'sibling', label: 'Sibling' },
      { value: 'staff_ward', label: 'Staff Ward' },
      { value: 'other', label: 'Other' }
    ];

    res.json({ success: true, types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/scholarships/meta/categories - Get scholarship categories
router.get('/meta/categories', requireAuth, async (req, res) => {
  try {
    const categories = [
      { value: 'full_fee', label: 'Full Fee Waiver' },
      { value: 'partial_fee', label: 'Partial Fee Waiver' },
      { value: 'transportation', label: 'Transportation' },
      { value: 'books', label: 'Books & Stationery' },
      { value: 'uniform', label: 'Uniform' },
      { value: 'other', label: 'Other' }
    ];

    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
