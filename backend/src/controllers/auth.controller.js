/**
 * Authentication Controller
 * Handles authentication HTTP requests
 */

const authService = require('../services/auth.service');
const AsyncHandler = require('../core/AsyncHandler');
const ApiResponse = require('../core/ApiResponse');
const ApiError = require('../core/ApiError');
const { StatusCodes } = require('../core/StatusCodes');

/**
 * Sign Up - Create new account
 * POST /api/auth/signup
 */
const signUp = AsyncHandler(async (req, res) => {
  const { email, phone, password, firstName, lastName } = req.body;

  const result = await authService.signUp({
    email,
    phone,
    password,
    firstName,
    lastName
  });

  return ApiResponse.success(
    res,
    result,
    'Account created successfully. Please verify your email and phone.',
    StatusCodes.CREATED
  );
});

/**
 * Login - Authenticate user
 * POST /api/auth/login
 */
const login = AsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login({ email, password });

  return ApiResponse.success(
    res,
    result,
    'Login successful',
    StatusCodes.OK
  );
});

/**
 * Verify Email OTP
 * POST /api/auth/verify-email
 */
const verifyEmail = AsyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw ApiError.badRequest('Email and OTP are required');
  }

  const result = await authService.verifyEmailOTP(email, otp);

  return ApiResponse.success(
    res,
    result,
    'Email verified successfully',
    StatusCodes.OK
  );
});

/**
 * Verify Phone OTP
 * POST /api/auth/verify-phone
 */
const verifyPhone = AsyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw ApiError.badRequest('Phone and OTP are required');
  }

  const result = await authService.verifyPhoneOTP(phone, otp);

  return ApiResponse.success(
    res,
    result,
    'Phone verified successfully',
    StatusCodes.OK
  );
});

/**
 * Resend Email OTP
 * POST /api/auth/resend-email-otp
 */
const resendEmailOTP = AsyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw ApiError.badRequest('Email is required');
  }

  const result = await authService.resendEmailOTP(email);

  return ApiResponse.success(
    res,
    result,
    'OTP sent successfully',
    StatusCodes.OK
  );
});

/**
 * Resend Phone OTP
 * POST /api/auth/resend-phone-otp
 */
const resendPhoneOTP = AsyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    throw ApiError.badRequest('Phone is required');
  }

  const result = await authService.resendPhoneOTP(phone);

  return ApiResponse.success(
    res,
    result,
    'OTP sent successfully',
    StatusCodes.OK
  );
});

/**
 * Get User Profile
 * GET /api/auth/profile
 */
const getProfile = AsyncHandler(async (req, res) => {
  const userId = req.user.userId; // From auth middleware

  const result = await authService.getUserProfile(userId);

  return ApiResponse.success(
    res,
    result,
    'Profile retrieved successfully',
    StatusCodes.OK
  );
});

/**
 * Logout (client-side token removal)
 * POST /api/auth/logout
 */
const logout = AsyncHandler(async (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  // Optionally implement token blacklist here for added security

  return ApiResponse.success(
    res,
    { success: true },
    'Logged out successfully',
    StatusCodes.OK
  );
});

module.exports = {
  signUp,
  login,
  verifyEmail,
  verifyPhone,
  resendEmailOTP,
  resendPhoneOTP,
  getProfile,
  logout
};
