const express = require('express');
const bcrypt = require('bcryptjs');
const admin = require('../config/firebase');
const User = require('../models/User');

const router = express.Router();

// ==================== SIGNUP ====================
router.post('/signup-direct', async (req, res) => {
  try {
    const { email, password, username, phone, vehicle, role } = req.body;
    if (!email || !password || !username || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    let firebaseUid = '';
    try {
      const firebaseUser = await admin.auth().createUser({ email, password, displayName: username });
      firebaseUid = firebaseUser.uid;
    } catch (fbErr) {
      firebaseUid = 'local_' + Date.now();
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({
      firebaseUid,
      email,
      username,
      phone: phone || '',
      vehicle: vehicle || '',
      role,
      password: hashed,
    });
    await newUser.save();

    // Create session
    req.session.userId = newUser._id.toString();
    req.session.user = {
      _id: newUser._id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
    };

    res.status(201).json({
      token: newUser._id.toString(),
      user: newUser,
      sessionId: req.sessionID,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== LOGIN ====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.password) {
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Wrong password' });
      }
    }

    // Create session — stores user data temporarily
    req.session.userId = user._id.toString();
    req.session.user = {
      _id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    res.json({
      token: user._id.toString(),
      user,
      sessionId: req.sessionID,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== GET SESSION (check if logged in) ====================
router.get('/session', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      loggedIn: true,
      user: req.session.user,
      token: req.session.userId,
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// ==================== LOGOUT ====================
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

// ==================== GET USER PROFILE ====================
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split('Bearer ')[1];
    const user = await User.findById(token).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== UPDATE FCM TOKEN ====================
router.post('/fcm-token', async (req, res) => {
  try {
    const { fcmToken, userId } = req.body;
    const user = await User.findById(userId);
    if (user) {
      user.fcmToken = fcmToken;
      await user.save();
    }
    res.json({ message: 'FCM token updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== UPDATE PROFILE ====================
router.put('/profile', async (req, res) => {
  try {
    const { userId, username, phone, vehicle } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (username) user.username = username;
    if (phone !== undefined) user.phone = phone;
    if (vehicle !== undefined) user.vehicle = vehicle;
    await user.save();

    // Update session too
    if (req.session.user) {
      req.session.user.username = user.username;
    }

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
