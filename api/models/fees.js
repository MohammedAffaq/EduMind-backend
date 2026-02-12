const express = require('express');
const router = express.Router();

// Get all fees
router.get('/', (req, res) => {
  res.status(200).json({ success: true, fees: [] });
});

module.exports = router;