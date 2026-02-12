const express = require('express');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Assignment = require('../models/Assignment');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/assignment-submissions - Get submissions (Teacher/Admin/Student)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { assignmentId, studentId } = req.query;
    const query = {};

    if (assignmentId) query.assignmentId = assignmentId;
    if (studentId) query.studentId = studentId;

    // Role-based filtering
    if (req.user.role === 'student') {
      query.studentId = req.user._id;
    } else if (req.user.role === 'teacher') {
      // Teachers can see submissions for their assignments
      const assignments = await Assignment.find({ teacherId: req.user._id }).select('_id');
      const assignmentIds = assignments.map(a => a._id);
      query.assignmentId = { $in: assignmentIds };
    }
    // Admin can see all

    const submissions = await AssignmentSubmission.find(query)
      .populate('assignmentId', 'title dueDate totalMarks')
      .populate('studentId', 'firstName lastName email rollNumber')
      .populate('gradedBy', 'firstName lastName')
      .sort({ submittedAt: -1 });

    res.json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/assignment-submissions/:id - Get submission by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findById(req.params.id)
      .populate('assignmentId', 'title dueDate totalMarks instructions')
      .populate('studentId', 'firstName lastName email rollNumber')
      .populate('gradedBy', 'firstName lastName');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Check permissions
    if (req.user.role === 'student' && submission.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (req.user.role === 'teacher') {
      const assignment = await Assignment.findById(submission.assignmentId);
      if (assignment.teacherId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/assignment-submissions - Submit assignment (Student)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can submit assignments' });
    }

    const { assignmentId, content, attachments } = req.body;

    // Check if assignment exists and is published
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment || !assignment.isPublished || !assignment.isActive) {
      return res.status(404).json({ success: false, message: 'Assignment not found or not available' });
    }

    // Check if student is in the correct class
    const StudentProfile = require('../models/StudentProfile');
    const studentProfile = await StudentProfile.findOne({ userId: req.user._id });
    if (!studentProfile || studentProfile.classId.toString() !== assignment.classId.toString()) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this class' });
    }

    // Check if already submitted
    const existingSubmission = await AssignmentSubmission.findOne({
      assignmentId,
      studentId: req.user._id
    });

    if (existingSubmission) {
      return res.status(400).json({ success: false, message: 'You have already submitted this assignment' });
    }

    const submissionData = {
      assignmentId,
      studentId: req.user._id,
      content,
      attachments: attachments || []
    };

    const newSubmission = new AssignmentSubmission(submissionData);
    await newSubmission.save();

    const populatedSubmission = await AssignmentSubmission.findById(newSubmission._id)
      .populate('assignmentId', 'title dueDate totalMarks')
      .populate('studentId', 'firstName lastName email rollNumber');

    res.status(201).json({ success: true, submission: populatedSubmission });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/assignment-submissions/:id - Update submission (Student - only before due date)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const submission = await AssignmentSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (submission.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if assignment is still open for submission
    const assignment = await Assignment.findById(submission.assignmentId);
    if (new Date() > assignment.dueDate) {
      return res.status(400).json({ success: false, message: 'Cannot update submission after due date' });
    }

    const { content, attachments } = req.body;
    submission.content = content;
    submission.attachments = attachments || submission.attachments;
    submission.updatedAt = new Date();

    await submission.save();

    const populatedSubmission = await AssignmentSubmission.findById(submission._id)
      .populate('assignmentId', 'title dueDate totalMarks')
      .populate('studentId', 'firstName lastName email rollNumber');

    res.json({ success: true, submission: populatedSubmission });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/assignment-submissions/:id/grade - Grade submission (Teacher/Admin)
router.put('/:id/grade', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const submission = await AssignmentSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Check if teacher is assigned to this assignment
    if (req.user.role === 'teacher') {
      const assignment = await Assignment.findById(submission.assignmentId);
      if (assignment.teacherId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const { marks, feedback } = req.body;

    if (marks < 0) {
      return res.status(400).json({ success: false, message: 'Marks cannot be negative' });
    }

    await submission.grade(marks, feedback, req.user._id);

    const populatedSubmission = await AssignmentSubmission.findById(submission._id)
      .populate('assignmentId', 'title dueDate totalMarks')
      .populate('studentId', 'firstName lastName email rollNumber')
      .populate('gradedBy', 'firstName lastName');

    res.json({ success: true, submission: populatedSubmission });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/assignment-submissions/:id - Delete submission (Student - only before grading)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const submission = await AssignmentSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (submission.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Cannot delete if already graded
    if (submission.isGraded) {
      return res.status(400).json({ success: false, message: 'Cannot delete graded submission' });
    }

    await AssignmentSubmission.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Submission deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/assignment-submissions/assignment/:assignmentId - Get all submissions for an assignment
router.get('/assignment/:assignmentId', requireAuth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // Check permissions
    if (req.user.role === 'teacher' && assignment.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const submissions = await AssignmentSubmission.getByAssignment(req.params.assignmentId);

    res.json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/assignment-submissions/student/:studentId - Get student's submissions
router.get('/student/:studentId', requireAuth, async (req, res) => {
  try {
    // Check permissions - students can only see their own, teachers/admins can see any
    if (req.user.role === 'student' && req.params.studentId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const submissions = await AssignmentSubmission.getByStudent(req.params.studentId);

    res.json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
