const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await User.create({
      email,
      password
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        email: user.email,
        plan: user.plan,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ error: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Auth user & get token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        email: user.email,
        plan: user.plan,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/google
// @desc    Auth user with Google token
const axios = require('axios');
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'No token provided' });

    // Verify token with Google's tokeninfo endpoint
    const response = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const { email, name } = response.data;
    if (!email) return res.status(400).json({ error: 'Failed to retrieve email from Google' });

    let user = await User.findOne({ email });
    
    if (!user) {
      // Create user without password (or with random password since they use Google)
      user = await User.create({
        email,
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
      });
    }

    res.json({
      _id: user._id,
      email: user.email,
      plan: user.plan,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Google auth error:', error.message);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

// @route   GET /api/auth/me
// @desc    Get user profile
const authMiddleware = require('../middleware/authMiddleware');
router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// @route   GET /api/user/profile
router.get('/profile', async (req, res) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ error: 'Not authorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      name: user.name,
      email: user.email,
      plan: user.plan,
      resumeCount: user.resumeCount
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
