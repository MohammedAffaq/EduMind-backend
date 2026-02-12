const express = require('express');
const Inventory = require('../models/Inventory');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/inventory - Get inventory items
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, status, search, limit = 50, offset = 0 } = req.query;
    let query = {};

    if (category) query['item.category'] = category;
    if (status) query['item.status'] = status;
    if (search) {
      query.$or = [
        { 'item.name': new RegExp(search, 'i') },
        { 'item.description': new RegExp(search, 'i') },
        { 'item.itemCode': new RegExp(search, 'i') }
      ];
    }

    const inventory = await Inventory.find(query)
      .populate('item.createdBy', 'firstName lastName')
      .populate('item.lastUpdatedBy', 'firstName lastName')
      .sort({ 'item.name': 1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await Inventory.countDocuments(query);

    res.json({
      success: true,
      inventory,
      total,
      hasMore: offset + parseInt(limit) < total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/inventory/:id - Get inventory item by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('item.createdBy', 'firstName lastName')
      .populate('item.lastUpdatedBy', 'firstName lastName');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/inventory - Add new inventory item
router.post('/', requireAuth, async (req, res) => {
  try {
    const itemData = {
      item: {
        ...req.body,
        createdBy: req.user._id
      },
      transactions: []
    };

    const newItem = new Inventory(itemData);
    await newItem.save();

    const populatedItem = await Inventory.findById(newItem._id)
      .populate('item.createdBy', 'firstName lastName');

    res.status(201).json({ success: true, item: populatedItem });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Item code already exists' });
    } else {
      res.status(400).json({ success: false, message: error.message });
    }
  }
});

// PUT /api/inventory/:id - Update inventory item
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    // Update item fields
    Object.assign(item.item, req.body);
    item.item.lastUpdatedBy = req.user._id;
    item.item.lastUpdatedAt = new Date();

    await item.save();

    const populatedItem = await Inventory.findById(item._id)
      .populate('item.createdBy', 'firstName lastName')
      .populate('item.lastUpdatedBy', 'firstName lastName');

    res.json({ success: true, item: populatedItem });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Item code already exists' });
    } else {
      res.status(400).json({ success: false, message: error.message });
    }
  }
});

// DELETE /api/inventory/:id - Delete inventory item
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const deletedItem = await Inventory.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    res.json({ success: true, message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/inventory/:id/stock/add - Add stock
router.post('/:id/stock/add', requireAuth, async (req, res) => {
  try {
    const { quantity, unitCost, reference, notes } = req.body;
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    await item.addStock(quantity, unitCost, req.user._id, reference, notes);

    res.json({ success: true, message: 'Stock added successfully', item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/inventory/:id/stock/remove - Remove stock
router.post('/:id/stock/remove', requireAuth, async (req, res) => {
  try {
    const { quantity, transactionType, recipient, recipientType, reference, notes } = req.body;
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    await item.removeStock(quantity, transactionType, req.user._id, recipient, recipientType, reference, notes);

    res.json({ success: true, message: 'Stock removed successfully', item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/inventory/:id/stock/adjust - Adjust stock
router.put('/:id/stock/adjust', requireAuth, async (req, res) => {
  try {
    const { newQuantity, reason, reference } = req.body;
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    await item.adjustStock(newQuantity, req.user._id, reason, reference);

    res.json({ success: true, message: 'Stock adjusted successfully', item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/inventory/transactions/:itemId - Get transaction history
router.get('/transactions/:itemId', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, transactionType } = req.query;

    const transactions = await Inventory.getTransactionHistory(
      req.params.itemId,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
      transactionType
    );

    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/inventory/low-stock - Get low stock items
router.get('/low-stock/all', requireAuth, async (req, res) => {
  try {
    const lowStockItems = await Inventory.getLowStockItems();
    res.json({ success: true, items: lowStockItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/inventory/summary - Get inventory summary
router.get('/summary/overview', requireAuth, async (req, res) => {
  try {
    const summary = await Inventory.getInventorySummary();
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/inventory/categories - Get item categories
router.get('/meta/categories', requireAuth, async (req, res) => {
  try {
    const categories = [
      { value: 'books', label: 'Books' },
      { value: 'stationery', label: 'Stationery' },
      { value: 'furniture', label: 'Furniture' },
      { value: 'equipment', label: 'Equipment' },
      { value: 'electronics', label: 'Electronics' },
      { value: 'sports', label: 'Sports' },
      { value: 'laboratory', label: 'Laboratory' },
      { value: 'cleaning', label: 'Cleaning' },
      { value: 'other', label: 'Other' }
    ];

    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/inventory/statuses - Get item statuses
router.get('/meta/statuses', requireAuth, async (req, res) => {
  try {
    const statuses = [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'discontinued', label: 'Discontinued' },
      { value: 'out_of_stock', label: 'Out of Stock' }
    ];

    res.json({ success: true, statuses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
