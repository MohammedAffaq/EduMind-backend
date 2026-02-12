const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { requireAuth, requireRole } = require('../middleware/auth');

// 🧹 Cleaning / Peon Staff APIs

/**
 * @route   GET /api/tasks/my
 * @desc    Get tasks assigned to the logged-in staff member
 * @access  Private (Staff)
 */
router.get('/tasks/my', requireAuth, async (req, res) => {
  try {
    // Map 'assignedTo' from model to 'staffId' concept from design doc
    const tasks = await Task.find({ assignedTo: req.user.id })
      .populate('assignedBy', 'firstName lastName')
      .sort({ dueDate: 1, priority: -1 });
      
    // Transform to match design doc if needed, or return as is
    res.json({ success: true, tasks });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Update task status (e.g., Pending -> In Progress -> Completed)
 * @access  Private (Staff)
 */
router.patch('/tasks/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Find task assigned to this user
    const task = await Task.findOne({ _id: req.params.id, assignedTo: req.user.id });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found or unauthorized' });
    }

    task.status = status.toLowerCase(); // Ensure lowercase for enum match
    
    // If status is completed, set completion date
    if (task.status === 'completed') {
        task.completionDate = new Date();
    }
    
    await task.updateStatus(task.status, req.user.id, `Status updated to ${status}`);
    
    res.json({ success: true, task });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// 🧠 Admin Task Management APIs

/**
 * @route   POST /api/tasks
 * @desc    Assign a new task to a staff member
 * @access  Private (Admin)
 */
router.post('/tasks', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Map design doc fields (taskTitle, staffId) to Model fields (title, assignedTo)
    const { taskTitle, description, staffId, priority, dueDate, department } = req.body;

    const newTask = new Task({
      title: taskTitle,
      description,
      assignedTo: staffId,
      assignedBy: req.user.id,
      priority: priority || 'medium',
      dueDate: dueDate || new Date(),
      department: department || 'other',
      type: 'administrative', // Default type
      status: 'pending'
    });

    await newTask.save();
    res.json({ success: true, task: newTask });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks (Admin view)
 * @access  Private (Admin)
 */
router.get('/tasks', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('assignedTo', 'firstName lastName email')
      .populate('assignedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ success: true, tasks });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;