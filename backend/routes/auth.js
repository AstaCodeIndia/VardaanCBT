// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'vardaancbt_secret_key_change_in_production';

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const existingUser = await User.findOne({
      where: { [require('sequelize').Op.or]: [{ username }, { email }] }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const user = await User.create({ username, email, password, role: role || 'student' });
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, level: user.level }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ where: { username } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, level: user.level, profilePicture: user.profilePicture }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { email, username } = req.body;
    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updates = {};
    if (email) updates.email = email;
    if (username) updates.username = username;
    await user.update(updates);

    res.json({ success: true, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords required' });
    }

    const user = await User.findByPk(req.user.userId);
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }

    await user.update({ password: newPassword });
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;