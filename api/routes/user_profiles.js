const express = require('express');
const UserProfile = require('../models/user_profiles');
const router = express.Router();

// Get all user profiles
router.get('/', async (req, res) => {
  try {
    const profiles = await UserProfile.find().populate('user_id');
    res.json({ success: true, profiles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user profile by ID
router.get('/:id', async (req, res) => {
  try {
    const profile = await UserProfile.findById(req.params.id).populate('user_id');
    if (!profile) return res.status(404).json({ success: false, message: 'User profile not found' });
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new user profile
router.post('/', async (req, res) => {
  try {
    const profile = new UserProfile(req.body);
    await profile.save();
    res.status(201).json({ success: true, profile });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update user profile
router.put('/:id', async (req, res) => {
  try {
    const profile = await UserProfile.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!profile) return res.status(404).json({ success: false, message: 'User profile not found' });
    res.json({ success: true, profile });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete user profile
router.delete('/:id', async (req, res) => {
  try {
    const profile = await UserProfile.findByIdAndDelete(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'User profile not found' });
    res.json({ success: true, message: 'User profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
