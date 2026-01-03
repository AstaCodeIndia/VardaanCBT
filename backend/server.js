// backend/server.js - SUPABASE VERSION
require('dotenv').config(); // Load environment variables FIRST

const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./config/database');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (question images)
app.use('/questions', express.static(path.join(__dirname, 'questions')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'VardaanCBT API is running' });
});

// Database sync and server start
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase database');
    
    // Sync models with database (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synced successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 VardaanCBT Server running on http://localhost:${PORT}`);
      console.log(`📊 Using Supabase database`);
      console.log(`🔗 API Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('💡 Check your .env file and Supabase credentials');
    process.exit(1);
  }
};

startServer();

module.exports = app;