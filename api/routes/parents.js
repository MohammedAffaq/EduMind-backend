const express = require('express');
const ParentProfile = require('../models/ParentProfile');
const StudentProfile = require('../models/StudentProfile');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const Exam = require('../models/Exam');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/parents/:id/children - View children details
router.get('/:id/children', auth.requireAuth, async (req, res) => {
  try {
    const parentId = req.params.id;

    // Check if user can access this data
    if (req.user.role !== 'admin' && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parentProfile = await ParentProfile.findOne({ userId: parentId })
      .populate('children.studentId', 'firstName lastName email role className rollNumber');

    if (!parentProfile) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }

    res.json({
      success: true,
      children: parentProfile.children
    });
  } catch (error) {
    console.error('Error fetching parent children:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/parents/:id/children/:childId/grades - View child's grades
router.get('/:id/children/:childId/grades', auth.requireAuth, async (req, res) => {
  try {
    const parentId = req.params.id;
    const childId = req.params.childId;

    // Check if user can access this data
    if (req.user.role !== 'admin' && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify the child belongs to this parent
    const parentProfile = await ParentProfile.findOne({
      userId: parentId,
      'children.studentId': childId
    });

    if (!parentProfile) {
      return res.status(403).json({ error: 'Child not found or access denied' });
    }

    const { academicYear, term, subjectId } = req.query;

    const query = { studentId: childId };
    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;
    if (subjectId) query.subjectId = subjectId;

    const grades = await Grade.find(query)
      .populate('subjectId', 'name code')
      .populate('teacherId', 'firstName lastName')
      .sort({ assessmentDate: -1 });

    res.json({
      success: true,
      grades
    });
  } catch (error) {
    console.error('Error fetching child grades:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/parents/:id/children/:childId/attendance - View child's attendance
router.get('/:id/children/:childId/attendance', auth.requireAuth, async (req, res) => {
  try {
    const parentId = req.params.id;
    const childId = req.params.childId;

    // Check if user can access this data
    if (req.user.role !== 'admin' && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify the child belongs to this parent
    const parentProfile = await ParentProfile.findOne({
      userId: parentId,
      'children.studentId': childId
    });

    if (!parentProfile) {
      return res.status(403).json({ error: 'Child not found or access denied' });
    }

    const { month, year, subjectId } = req.query;

    const query = { studentId: childId };
    if (subjectId) query.subjectId = subjectId;

    // Filter by month/year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    const attendance = await Attendance.find(query)
      .populate('subjectId', 'name code')
      .populate('teacherId', 'firstName lastName')
      .sort({ date: -1 });

    // Calculate attendance statistics
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    res.json({
      success: true,
      attendance,
      statistics: {
        totalDays,
        presentDays,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching child attendance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/parents/:id/children/:childId/assignments - View child's assignments
router.get('/:id/children/:childId/assignments', auth.requireAuth, async (req, res) => {
  try {
    const parentId = req.params.id;
    const childId = req.params.childId;

    // Check if user can access this data
    if (req.user.role !== 'admin' && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get child's class
    const studentProfile = await StudentProfile.findOne({ userId: childId });
    if (!studentProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const { status, subjectId } = req.query;

    const query = { classId: studentProfile.classId };
    if (status) query.status = status;
    if (subjectId) query.subjectId = subjectId;

    const assignments = await Assignment.find(query)
      .populate('subjectId', 'name code')
      .populate('teacherId', 'firstName lastName')
      .sort({ dueDate: 1 });

    // Check which assignments the child has submitted
    const submittedAssignments = await AssignmentSubmission.find({
      studentId: childId,
      assignmentId: { $in: assignments.map(a => a._id) }
    }).select('assignmentId status submittedAt');

    const assignmentsWithSubmission = assignments.map(assignment => {
      const submission = submittedAssignments.find(s => s.assignmentId.toString() === assignment._id.toString());
      return {
        ...assignment.toObject(),
        submission: submission || null
      };
    });

    res.json({
      success: true,
      assignments: assignmentsWithSubmission
    });
  } catch (error) {
    console.error('Error fetching child assignments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/parents/:id/children/:childId/reports - View academic reports
router.get('/:id/children/:childId/reports', auth.requireAuth, async (req, res) => {
  try {
    const parentId = req.params.id;
    const childId = req.params.childId;

    // Check if user can access this data
    if (req.user.role !== 'admin' && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify the child belongs to this parent
    const parentProfile = await ParentProfile.findOne({
      userId: parentId,
      'children.studentId': childId
    });

    if (!parentProfile) {
      return res.status(403).json({ error: 'Child not found or access denied' });
    }

    const { academicYear, term } = req.query;

    // Get grades for the specified period
    const gradesQuery = { studentId: childId };
    if (academicYear) gradesQuery.academicYear = academicYear;
    if (term) gradesQuery.term = term;

    const grades = await Grade.find(gradesQuery)
      .populate('subjectId', 'name code')
      .sort({ subjectId: 1 });

    // Get attendance for the period
    const attendanceQuery = { studentId: childId };
    if (academicYear) {
      const yearStart = new Date(`${academicYear.split('-')[0]}-04-01`);
      const yearEnd = new Date(`${academicYear.split('-')[1]}-03-31`);
      attendanceQuery.date = { $gte: yearStart, $lte: yearEnd };
    }

    const attendanceRecords = await Attendance.find(attendanceQuery);

    // Calculate report data
    const subjects = {};
    grades.forEach(grade => {
      const subjectName = grade.subjectId.name;
      if (!subjects[subjectName]) {
        subjects[subjectName] = {
          subject: subjectName,
          grades: [],
          averagePercentage: 0
        };
      }
      subjects[subjectName].grades.push(grade);
    });

    // Calculate averages
    Object.keys(subjects).forEach(subjectName => {
      const subjectGrades = subjects[subjectName].grades;
      const totalPercentage = subjectGrades.reduce((sum, grade) => sum + grade.percentage, 0);
      subjects[subjectName].averagePercentage = totalPercentage / subjectGrades.length;
    });

    // Attendance summary
    const totalAttendance = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
    const attendancePercentage = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

    res.json({
      success: true,
      report: {
        studentId: childId,
        academicYear: academicYear || 'current',
        term: term || 'all',
        subjects: Object.values(subjects),
        attendance: {
          totalDays: totalAttendance,
          presentDays: presentCount,
          percentage: Math.round(attendancePercentage * 100) / 100
        },
        overallGrade: calculateOverallGrade(Object.values(subjects))
      }
    });
  } catch (error) {
    console.error('Error generating academic report:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to calculate overall grade
function calculateOverallGrade(subjects) {
  if (subjects.length === 0) return 'N/A';

  const averagePercentage = subjects.reduce((sum, subject) => sum + subject.averagePercentage, 0) / subjects.length;

  if (averagePercentage >= 90) return 'A+';
  if (averagePercentage >= 80) return 'A';
  if (averagePercentage >= 70) return 'B+';
  if (averagePercentage >= 60) return 'B';
  if (averagePercentage >= 50) return 'C';
  if (averagePercentage >= 40) return 'D';
  return 'F';
}

// GET /api/parents/:id/children/:childId/fees - View fee payment status
router.get('/:id/children/:childId/fees', auth.requireAuth, async (req, res) => {
  try {
    const parentId = req.params.id;
    const childId = req.params.childId;

    // Check if user can access this data
    if (req.user.role !== 'admin' && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify the child belongs to this parent
    const parentProfile = await ParentProfile.findOne({
      userId: parentId,
      'children.studentId': childId
    });

    if (!parentProfile) {
      return res.status(403).json({ error: 'Child not found or access denied' });
    }

    // This would integrate with the Fee and Payment models when implemented
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Fee management system not yet implemented',
      fees: []
    });
  } catch (error) {
    console.error('Error fetching fee information:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/parents/:id/messages - Send messages to teachers
router.post('/:id/messages', auth.requireAuth, async (req, res) => {
  try {
    const parentId = req.params.id;
    const { teacherId, subject, message, priority } = req.body;

    // Check if user can send messages
    if (req.user.role !== 'admin' && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // This would integrate with the Message model when implemented
    // For now, create a notification
    const Notification = require('../models/Notification');

    await Notification.create({
      type: 'user',
      title: `Message from Parent: ${subject}`,
      message: message,
      recipient: teacherId,
      sender: parentId,
      priority: priority || 'medium'
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/parents/:id/messages - View communication history
router.get('/:id/messages', auth.requireAuth, async (req, res) => {
  try {
    const parentId = req.params.id;

    // Check if user can access this data
    if (req.user.role !== 'admin' && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // This would integrate with the Message model when implemented
    // For now, return notifications
    const Notification = require('../models/Notification');

    const messages = await Notification.find({
      $or: [
        { sender: parentId },
        { recipient: parentId }
      ]
    })
    .populate('sender', 'firstName lastName role')
    .populate('recipient', 'firstName lastName role')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/parents/:id/appointments - Request parent-teacher meetings
router.post('/:id/appointments', auth.requireAuth, async (req, res) => {
  try {
    const parentId = req.params.id;
    const { teacherId, childId, requestedDate, requestedTime, purpose, notes } = req.body;

    // Check if user can request appointments
    if (req.user.role !== 'admin' && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify the child belongs to this parent
    const parentProfile = await ParentProfile.findOne({
      userId: parentId,
      'children.studentId': childId
    });

    if (!parentProfile) {
      return res.status(403).json({ error: 'Child not found or access denied' });
    }

    // This would integrate with the Appointment/Event model when implemented
    // For now, create a notification to the teacher
    const Notification = require('../models/Notification');

    await Notification.create({
      type: 'user',
      title: 'Parent-Teacher Meeting Request',
      message: `Meeting requested for ${new Date(requestedDate).toLocaleDateString()} at ${requestedTime}. Purpose: ${purpose}`,
      recipient: teacherId,
      sender: parentId,
      priority: 'high'
    });

    res.status(201).json({
      success: true,
      message: 'Appointment request sent successfully'
    });
  } catch (error) {
    console.error('Error requesting appointment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/parents/:id/notifications - Parent notifications
router.get('/:id/notifications', auth.requireAuth, async (req, res) => {
  try {
    const parentId = req.params.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    // Check if user can access this data
    if (req.user.role !== 'admin' && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const Notification = require('../models/Notification');

    const query = { recipient: parentId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/parents/:id/preferences - Update notification preferences
router.patch('/:id/preferences', auth.requireAuth, async (req, res) => {
  try {
    const parentId = req.params.id;
    const { email, sms, phone, newsletter } = req.body;

    // Check if user can update preferences
    if (req.user.role !== 'admin' && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parentProfile = await ParentProfile.findOne({ userId: parentId });

    if (!parentProfile) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }

    parentProfile.communicationPreferences = {
      email: email !== undefined ? email : parentProfile.communicationPreferences.email,
      sms: sms !== undefined ? sms : parentProfile.communicationPreferences.sms,
      phone: phone !== undefined ? phone : parentProfile.communicationPreferences.phone,
      newsletter: newsletter !== undefined ? newsletter : parentProfile.communicationPreferences.newsletter
    };

    await parentProfile.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: parentProfile.communicationPreferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/parents/:id/feedback - Submit feedback
router.post('/:id/feedback', auth.requireAuth, async (req, res) => {
  try {
    const parentId = req.params.id;
    const { rating, category, subject, comments, anonymous } = req.body;

    // Check if user can submit feedback
    if (req.user.role !== 'admin' && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parentProfile = await ParentProfile.findOne({ userId: parentId });

    if (!parentProfile) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }

    // This would integrate with the Feedback model when implemented
    // For now, store in parent profile
    parentProfile.feedbackHistory.push({
      rating,
      comments,
      date: new Date()
    });

    await parentProfile.save();

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
