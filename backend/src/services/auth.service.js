/**
 * Authentication Service
 * Handles user registration, login, OTP verification
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getPool } = require('../config/database');
const ApiError = require('../core/ApiError');
const { StatusCodes } = require('../core/StatusCodes');
const logger = require('../config/winstonLogger');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const OTP_EXPIRY_MINUTES = 10;

/**
 * Generate OTP (6 digits)
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate JWT token
 */
function generateToken(userId, email) {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Hash password
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password
 */
async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Send OTP via Email using Nodemailer
 */
async function sendEmailOTP(email, otp) {
  try {
    const result = await sendOTPEmail(email, otp, OTP_EXPIRY_MINUTES);
    
    if (result.success) {
      logger.info(`✅ Email OTP sent to ${email}`);
    } else {
      logger.warn(`⚠️  Failed to send email OTP to ${email}: ${result.error || result.message}`);
      // Still log for development
      logger.info(`[OTP] Email OTP for ${email}: ${otp}`);
    }
    
    return result;
  } catch (error) {
    logger.error(`❌ Error sending email OTP to ${email}:`, error.message);
    // Fallback: log OTP for development
    logger.info(`[OTP] Email OTP for ${email}: ${otp}`);
    return { success: false, error: error.message };
  }
}

/**
 * Send OTP via SMS (mock - integrate with Twilio/AWS SNS)
 */
async function sendPhoneOTP(phone, otp) {
  // TODO: Integrate with SMS service (Twilio, AWS SNS, MSG91, etc.)
  logger.info(`[OTP] Phone OTP for ${phone}: ${otp}`);
  
  // For now, just log. In production, send actual SMS:
  // await sendSMS({
  //   to: phone,
  //   message: `Your verification code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`
  // });
  
  return { success: true };
}

/**
 * Sign Up - Create new user account
 */
const signUp = async (userData) => {
  try {
    const { email, phone, password, firstName, lastName } = userData;
    const pool = getPool();

    // Validate required fields
    if (!email || !phone || !password || !firstName) {
      throw ApiError.badRequest('Email, phone, password, and first name are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw ApiError.badRequest('Invalid email format');
    }

    // Validate phone format (Indian format)
    const phoneRegex = /^[+]?[0-9]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      throw ApiError.badRequest('Invalid phone format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw ApiError.badRequest('Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];
      if (existing.email === email) {
        throw ApiError.conflict('Email already registered');
      }
      if (existing.phone === phone) {
        throw ApiError.conflict('Phone number already registered');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate OTPs
    const emailOTP = generateOTP();
    const phoneOTP = generateOTP();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Create user (unverified)
    const result = await pool.query(
      `INSERT INTO users (
        email, phone, password, first_name, last_name,
        email_otp, phone_otp, otp_expires_at,
        email_verified, phone_verified, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, false, CURRENT_TIMESTAMP)
      RETURNING id, email, phone, first_name, last_name, email_verified, phone_verified`,
      [email, phone, hashedPassword, firstName, lastName || '', emailOTP, phoneOTP, otpExpiresAt]
    );

    const user = result.rows[0];

    // Send OTPs
    await sendEmailOTP(email, emailOTP);
    await sendPhoneOTP(phone, phoneOTP);

    logger.info(`[Auth] User registered: ${email}`);

    return {
      success: true,
      userId: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      emailVerified: user.email_verified,
      phoneVerified: user.phone_verified,
      message: 'Account created successfully. Please verify your email and phone.'
    };
  } catch (error) {
    logger.error('[Auth] Sign up failed:', error.message);
    throw error;
  }
};

/**
 * Login - Authenticate user
 */
const login = async (credentials) => {
  try {
    const { email, password } = credentials;
    const pool = getPool();

    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    // Find user
    const result = await pool.query(
      `SELECT id, email, phone, password, first_name, last_name, 
              email_verified, phone_verified, status
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const user = result.rows[0];

    // Check if account is active
    if (user.status !== 'active') {
      throw ApiError.forbidden('Account is inactive. Please contact support.');
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check if email is verified
    if (!user.email_verified) {
      throw ApiError.forbidden('Please verify your email before logging in');
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    logger.info(`[Auth] User logged in: ${email}`);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        emailVerified: user.email_verified,
        phoneVerified: user.phone_verified
      }
    };
  } catch (error) {
    logger.error('[Auth] Login failed:', error.message);
    throw error;
  }
};

/**
 * Verify Email OTP
 */
const verifyEmailOTP = async (email, otp) => {
  try {
    const pool = getPool();

    const result = await pool.query(
      `SELECT id, email_otp, otp_expires_at, email_verified 
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw ApiError.notFound('User not found');
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return {
        success: true,
        message: 'Email already verified'
      };
    }

    // Check OTP expiry
    if (new Date() > new Date(user.otp_expires_at)) {
      throw ApiError.badRequest('OTP expired. Please request a new one.');
    }

    // Verify OTP
    if (user.email_otp !== otp) {
      throw ApiError.badRequest('Invalid OTP');
    }

    // Update verification status
    await pool.query(
      `UPDATE users 
       SET email_verified = true, email_otp = NULL 
       WHERE id = $1`,
      [user.id]
    );

    logger.info(`[Auth] Email verified: ${email}`);

    // Get user details for welcome email
    const userDetails = await pool.query(
      'SELECT first_name FROM users WHERE id = $1',
      [user.id]
    );
    
    // Send welcome email (non-blocking)
    if (userDetails.rows.length > 0) {
      sendWelcomeEmail(email, userDetails.rows[0].first_name).catch(err => {
        logger.warn('Failed to send welcome email:', err.message);
      });
    }

    return {
      success: true,
      message: 'Email verified successfully'
    };
  } catch (error) {
    logger.error('[Auth] Email verification failed:', error.message);
    throw error;
  }
};

/**
 * Verify Phone OTP
 */
const verifyPhoneOTP = async (phone, otp) => {
  try {
    const pool = getPool();

    const result = await pool.query(
      `SELECT id, phone_otp, otp_expires_at, phone_verified 
       FROM users WHERE phone = $1`,
      [phone]
    );

    if (result.rows.length === 0) {
      throw ApiError.notFound('User not found');
    }

    const user = result.rows[0];

    if (user.phone_verified) {
      return {
        success: true,
        message: 'Phone already verified'
      };
    }

    // Check OTP expiry
    if (new Date() > new Date(user.otp_expires_at)) {
      throw ApiError.badRequest('OTP expired. Please request a new one.');
    }

    // Verify OTP
    if (user.phone_otp !== otp) {
      throw ApiError.badRequest('Invalid OTP');
    }

    // Update verification status
    await pool.query(
      `UPDATE users 
       SET phone_verified = true, phone_otp = NULL 
       WHERE id = $1`,
      [user.id]
    );

    logger.info(`[Auth] Phone verified: ${phone}`);

    return {
      success: true,
      message: 'Phone verified successfully'
    };
  } catch (error) {
    logger.error('[Auth] Phone verification failed:', error.message);
    throw error;
  }
};

/**
 * Resend Email OTP
 */
const resendEmailOTP = async (email) => {
  try {
    const pool = getPool();

    const result = await pool.query(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw ApiError.notFound('User not found');
    }

    const user = result.rows[0];

    if (user.email_verified) {
      throw ApiError.badRequest('Email already verified');
    }

    // Generate new OTP
    const emailOTP = generateOTP();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Update OTP
    await pool.query(
      'UPDATE users SET email_otp = $1, otp_expires_at = $2 WHERE id = $3',
      [emailOTP, otpExpiresAt, user.id]
    );

    // Send OTP
    await sendEmailOTP(email, emailOTP);

    logger.info(`[Auth] Email OTP resent: ${email}`);

    return {
      success: true,
      message: 'OTP sent successfully'
    };
  } catch (error) {
    logger.error('[Auth] Resend email OTP failed:', error.message);
    throw error;
  }
};

/**
 * Resend Phone OTP
 */
const resendPhoneOTP = async (phone) => {
  try {
    const pool = getPool();

    const result = await pool.query(
      'SELECT id, phone_verified FROM users WHERE phone = $1',
      [phone]
    );

    if (result.rows.length === 0) {
      throw ApiError.notFound('User not found');
    }

    const user = result.rows[0];

    if (user.phone_verified) {
      throw ApiError.badRequest('Phone already verified');
    }

    // Generate new OTP
    const phoneOTP = generateOTP();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Update OTP
    await pool.query(
      'UPDATE users SET phone_otp = $1, otp_expires_at = $2 WHERE id = $3',
      [phoneOTP, otpExpiresAt, user.id]
    );

    // Send OTP
    await sendPhoneOTP(phone, phoneOTP);

    logger.info(`[Auth] Phone OTP resent: ${phone}`);

    return {
      success: true,
      message: 'OTP sent successfully'
    };
  } catch (error) {
    logger.error('[Auth] Resend phone OTP failed:', error.message);
    throw error;
  }
};

/**
 * Get user profile
 */
const getUserProfile = async (userId) => {
  try {
    const pool = getPool();

    const result = await pool.query(
      `SELECT id, email, phone, first_name, last_name, 
              email_verified, phone_verified, status, created_at, last_login
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw ApiError.notFound('User not found');
    }

    const user = result.rows[0];

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        emailVerified: user.email_verified,
        phoneVerified: user.phone_verified,
        status: user.status,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    };
  } catch (error) {
    logger.error('[Auth] Get profile failed:', error.message);
    throw error;
  }
};

module.exports = {
  signUp,
  login,
  verifyEmailOTP,
  verifyPhoneOTP,
  resendEmailOTP,
  resendPhoneOTP,
  getUserProfile,
  generateToken
};
