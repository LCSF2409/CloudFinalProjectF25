const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
    inventoryId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    productName: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Accessories', 'Electronics', 'Furniture', 'Printing', 'Audio', 'Office', 'Storage']
    },
    supplier: {
        type: String,
        required: [true, 'Supplier is required'],
        trim: true,
        maxlength: [100, 'Supplier name cannot exceed 100 characters']
    },
    stock: {
        type: String,
        required: [true, 'Stock status is required'],
        enum: ['In stock', 'Out of stock'],
        default: 'In stock'
    },
    costUnit: {
        type: Number,
        required: [true, 'Cost per unit is required'],
        min: [0, 'Cost cannot be negative'],
        max: [1000000, 'Cost cannot exceed $1,000,000']
    },
    warehouse: {
        type: String,
        required: [true, 'Warehouse is required'],
        trim: true,
        uppercase: true,
        maxlength: [20, 'Warehouse code cannot exceed 20 characters']
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

// Add this to your Inventory model or create a separate counter model
const CounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', CounterSchema);

// Update the pre-save hook:
InventorySchema.pre('save', async function(next) {
    if (!this.inventoryId) {
        try {
            const counter = await Counter.findByIdAndUpdate(
                { _id: `userId_${this.userId}` },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            
            this.inventoryId = `INV-${counter.seq.toString().padStart(3, '0')}`;
        } catch (error) {
            console.error('Error with counter:', error);
            this.inventoryId = `INV-${Date.now().toString().slice(-9)}`;
        }
    }
    next();
});

// Add index for faster queries
InventorySchema.index({ userId: 1, inventoryId: 1 }, { unique: true });
InventorySchema.index({ userId: 1, lastUpdated: -1 });

module.exports = mongoose.model('Inventory', InventorySchema);