const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const Inventory = require('../models/Inventory');


const generateInventoryId = async (userId) => {
    try {
        // Get the highest existing inventory ID for this user
        const lastItem = await Inventory.findOne({ userId })
            .sort({ inventoryId: -1 }) // Sort descending
            .select('inventoryId');
        
        let nextNumber = 1;
        
        if (lastItem && lastItem.inventoryId) {
            // Extract the number from the last ID (e.g., "INV-001" -> 1)
            const match = lastItem.inventoryId.match(/INV-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }
        
        // Format with leading zeros (e.g., 1 -> "001", 25 -> "025")
        const paddedNumber = nextNumber.toString().padStart(3, '0');
        return `INV-${paddedNumber}`;
    } catch (error) {
        console.error('Error generating inventory ID:', error);
        // Fallback: use timestamp
        return `INV-${Date.now().toString().slice(-6)}`;
    }
};

// @route   GET /api/items
// @desc    Get all inventory items for logged-in user
router.get('/', auth, async (req, res) => {
    try {
        const items = await Inventory.find({ userId: req.user.id })
            .sort({ lastUpdated: -1 })
            .select('-__v');
        
        res.json({ 
            success: true,
            count: items.length,
            data: items 
        });
    } catch (err) {
        console.error('Error fetching items:', err.message);
        res.status(500).json({ 
            success: false,
            message: 'Server error while fetching items' 
        });
    }
});

// @route   GET /api/items/search
// @desc    Search inventory items
router.get('/search', auth, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Search query is required' 
            });
        }

        const items = await Inventory.find({
            userId: req.user.id,
            $or: [
                { productName: { $regex: q, $options: 'i' } },
                { category: { $regex: q, $options: 'i' } },
                { supplier: { $regex: q, $options: 'i' } },
                { inventoryId: { $regex: q, $options: 'i' } }
            ]
        }).sort({ lastUpdated: -1 });

        res.json({ 
            success: true,
            count: items.length,
            data: items 
        });
    } catch (err) {
        console.error('Search error:', err.message);
        res.status(500).json({ 
            success: false,
            message: 'Server error during search' 
        });
    }
});

// @route   GET /api/items/:id
// @desc    Get single inventory item
router.get('/:id', auth, async (req, res) => {
    try {
        const item = await Inventory.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!item) {
            return res.status(404).json({ 
                success: false,
                message: 'Item not found' 
            });
        }

        res.json({ 
            success: true,
            data: item 
        });
    } catch (err) {
        console.error('Error fetching item:', err.message);
        res.status(500).json({ 
            success: false,
            message: 'Server error while fetching item' 
        });
    }
});

// @route   POST /api/items
// @desc    Create a new inventory item
router.post('/', [
    auth,
    [
        check('productName', 'Product name is required').not().isEmpty(),
        check('category', 'Category is required').not().isEmpty(),
        check('supplier', 'Supplier is required').not().isEmpty(),
        check('costUnit', 'Cost per unit must be a positive number').isFloat({ min: 0 }),
        check('warehouse', 'Warehouse is required').not().isEmpty()
    ]
], async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            errors: errors.array() 
        });
    }

    const { productName, category, supplier, stock, costUnit, warehouse } = req.body;

    try {
        // Generate inventory ID
        const inventoryId = await generateInventoryId(req.user.id);
        
        // Create new item
        const newItem = new Inventory({
            inventoryId,
            productName,
            category,
            supplier,
            stock: stock || 'In stock',
            costUnit: parseFloat(costUnit),
            warehouse: warehouse.toUpperCase(),
            userId: req.user.id
        });

        const item = await newItem.save();
        
        res.status(201).json({ 
            success: true,
            data: item,
            message: 'Item created successfully!' 
        });
    } catch (err) {
        console.error('Error creating item:', err.message);
        
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                success: false,
                message: Object.values(err.errors).map(e => e.message).join(', ')
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Server error while creating item' 
        });
    }
});

// @route   PUT /api/items/:id
// @desc    Update an inventory item
router.put('/:id', [
    auth,
    [
        check('productName', 'Product name is required').optional().not().isEmpty(),
        check('category', 'Category is required').optional().not().isEmpty(),
        check('supplier', 'Supplier is required').optional().not().isEmpty(),
        check('costUnit', 'Cost must be a positive number').optional().isFloat({ min: 0 }),
        check('warehouse', 'Warehouse is required').optional().not().isEmpty()
    ]
], async (req, res) => {
    // validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            errors: errors.array() 
        });
    }

    try {
        // find item and check ownership
        let item = await Inventory.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ 
                success: false,
                message: 'Item not found' 
            });
        }

        // check if user owns the item
        if (item.userId.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                message: 'Not authorized to update this item' 
            });
        }

        // prepare update data
        const updateData = { ...req.body };
        if (updateData.warehouse) {
            updateData.warehouse = updateData.warehouse.toUpperCase();
        }
        if (updateData.costUnit) {
            updateData.costUnit = parseFloat(updateData.costUnit);
        }
        updateData.lastUpdated = Date.now();

        // update item
        item = await Inventory.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.json({ 
            success: true,
            data: item,
            message: 'Item updated successfully!' 
        });
    } catch (err) {
        console.error('Error updating item:', err.message);
        
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                success: false,
                message: Object.values(err.errors).map(e => e.message).join(', ')
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Server error while updating item' 
        });
    }
});

// @route   DELETE /api/items/:id
// @desc    Delete an inventory item
router.delete('/:id', auth, async (req, res) => {
    try {
        console.log('🗑️ Delete request for item ID:', req.params.id);
        console.log('Request method:', req.method);
        console.log('Request headers:', req.headers);
        
        // check if ID is provided
        if (!req.params.id || req.params.id === 'undefined') {
            return res.status(400).json({ 
                success: false,
                message: 'Item ID is required' 
            });
        }

        // find item
        const item = await Inventory.findById(req.params.id);
        
        if (!item) {
            console.log('❌ Item not found with ID:', req.params.id);
            return res.status(404).json({ 
                success: false,
                message: 'Item not found' 
            });
        }

        // check if user owns the item
        if (item.userId.toString() !== req.user.id) {
            console.log('❌ Authorization failed:');
            console.log('   Item userId:', item.userId.toString());
            console.log('   Request userId:', req.user.id);
            return res.status(403).json({ 
                success: false,
                message: 'Not authorized to delete this item' 
            });
        }

        // delete item
        await Inventory.findByIdAndDelete(req.params.id);
        console.log('✅ Item deleted successfully:', item.inventoryId);

        res.json({ 
            success: true,
            message: 'Item deleted successfully!' 
        });
    } catch (err) {
        console.error('❌ Error deleting item:', err.message);
        
        // handle invalid ID format
        if (err.name === 'CastError') {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid item ID format' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Server error while deleting item' 
        });
    }
});

// @route   GET /api/items/stats/summary
// @desc    Get inventory statistics
router.get('/stats/summary', auth, async (req, res) => {
    try {
        const totalItems = await Inventory.countDocuments({ userId: req.user.id });
        const inStockItems = await Inventory.countDocuments({ 
            userId: req.user.id, 
            stock: 'In stock' 
        });
        const outOfStockItems = await Inventory.countDocuments({ 
            userId: req.user.id, 
            stock: 'Out of stock' 
        });
        
        const totalValue = await Inventory.aggregate([
            { $match: { userId: req.user.id, stock: 'In stock' } },
            { $group: { _id: null, total: { $sum: '$costUnit' } } }
        ]);

        const categoryStats = await Inventory.aggregate([
            { $match: { userId: req.user.id } },
            { $group: { 
                _id: '$category', 
                count: { $sum: 1 },
                totalValue: { $sum: '$costUnit' }
            }},
            { $sort: { count: -1 } }
        ]);

        res.json({ 
            success: true,
            data: {
                totalItems,
                inStockItems,
                outOfStockItems,
                totalValue: totalValue.length > 0 ? totalValue[0].total : 0,
                categoryStats
            }
        });
    } catch (err) {
        console.error('Stats error:', err.message);
        res.status(500).json({ 
            success: false,
            message: 'Server error while fetching statistics' 
        });
    }
});

module.exports = router;