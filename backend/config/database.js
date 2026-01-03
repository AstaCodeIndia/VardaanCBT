// backend/config/database.js - SUPABASE VERSION
const { Sequelize } = require('sequelize');

// Option 1: Using DATABASE_URL (Recommended for Supabase)
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Required for Supabase
    }
  },
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test connection
sequelize.authenticate()
  .then(() => console.log('✅ Supabase database connected successfully'))
  .catch(err => console.error('❌ Unable to connect to Supabase database:', err.message));

module.exports = { sequelize };
