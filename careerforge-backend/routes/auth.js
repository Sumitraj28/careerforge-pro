const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

// @route   POST /api/auth/register
router.post('/register', authController.registerUser);

// @route   POST /api/auth/login
router.post('/login', authController.loginUser);

// @route   POST /api/auth/google
router.post('/google', authController.googleAuth);

// @route   GET /api/auth/me
router.get('/me', authMiddleware, authController.getMe);

// @route   GET /api/user/profile
router.get('/profile', authController.getProfile);

module.exports = router;
