/**
 * Authentication Routes
 * Defines auth-related API endpoints
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @route   POST /api/auth/signup
 * @desc    Create new user account
 * @access  Public
 * @body    { email, phone, password, firstName, lastName }
 */
router.post('/signup', authController.signUp);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 * @body    { email, password }
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with OTP
 * @access  Public
 * @body    { email, otp }
 */
router.post('/verify-email', authController.verifyEmail);

/**
 * @route   POST /api/auth/verify-phone
 * @desc    Verify phone with OTP
 * @access  Public
 * @body    { phone, otp }
 */
router.post('/verify-phone', authController.verifyPhone);

/**
 * @route   POST /api/auth/resend-email-otp
 * @desc    Resend email verification OTP
 * @access  Public
 * @body    { email }
 */
router.post('/resend-email-otp', authController.resendEmailOTP);

/**
 * @route   POST /api/auth/resend-phone-otp
 * @desc    Resend phone verification OTP
 * @access  Public
 * @body    { phone }
 */
router.post('/resend-phone-otp', authController.resendPhoneOTP);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Protected (requires authentication)
 */
router.get('/profile', authenticateToken, authController.getProfile);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Protected
 */
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
