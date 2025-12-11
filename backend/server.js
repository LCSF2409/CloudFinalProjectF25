require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // ADD THIS

const app = express();

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://cloudfinalprojectf25-5.onrender.com']
        : 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    console.log('✅ MongoDB Connected');
    console.log('Database:', mongoose.connection.db?.databaseName);
})
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
});

// Import routes
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);

// 👇 SERVE FRONTEND IN PRODUCTION 👇
if (process.env.NODE_ENV === 'production') {
    const __dirname = path.resolve();
    
    // Serve static files from React app
    app.use(express.static(path.join(__dirname, '../frontend/build')));
    
    // Handle React routing, return all requests to React app
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
    });
} else {
    // Development route
    app.get('/', (req, res) => {
        res.json({ 
            message: 'Smart Inventory Tracker API - Development Mode',
            frontend: 'Run on http://localhost:3000'
        });
    });
}
// 👆 END OF ADDED SECTION 👆

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'inventory-tracker-api',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        message: 'API is working',
        timestamp: new Date().toISOString()
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});