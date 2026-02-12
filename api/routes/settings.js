const express = require('express');
const Setting = require('../models/settings');
const router = express.Router();

// Get all settings
router.get('/', async (req, res) => {
  try {
    const settings = await Setting.find();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get setting by key
router.get('/:key', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ success: false, message: 'Setting not found' });
    res.json({ success: true, setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new setting
router.post('/', async (req, res) => {
  try {
    const setting = new Setting(req.body);
    await setting.save();
    res.status(201).json({ success: true, setting });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update setting by key
router.put('/:key', async (req, res) => {
  try {
    const setting = await Setting.findOneAndUpdate(
      { key: req.params.key },
      { value: req.body.value },
      { new: true, upsert: true }
    );
    res.json({ success: true, setting });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete setting by key
router.delete('/:key', async (req, res) => {
  try {
    const setting = await Setting.findOneAndDelete({ key: req.params.key });
    if (!setting) return res.status(404).json({ success: false, message: 'Setting not found' });
    res.json({ success: true, message: 'Setting deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
