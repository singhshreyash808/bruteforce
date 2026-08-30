/**
 * auth.js
 * Express router for registration, login, JWT verification, and password reset flows (Email + WhatsApp OTP).
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');

const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const AuditLog = require('../models/AuditLog');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { normalizePhoneNumber, sendWhatsAppOtp } = require('../services/whatsappService');
const { sendPasswordResetEmail } = require('../services/emailService');

/**
 * POST /api/auth/register
 * Register a new user (Officer, Citizen, or Bank).
 */
router.post('/register', async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      userId,
      password,
      confirmPassword,
      role = 'officer',
      badgeNumber,
      designation,
      policeStation,
      bankName,
      branchCode,
      employeeId,
      aadhaar,
      address,
      city
    } = req.body;

    // Basic Validations
    if (!fullName || !email || !userId || !password) {
      return res.status(400).json({ error: 'Please provide full name, email, user ID, and password.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Password and Confirm Password do not match.' });
    }

    // Check duplicate User ID (case-insensitive)
    const existingUserId = await User.findOne({
      where: { userId: { [Op.like]: userId.trim() } }
    });
    if (existingUserId) {
      return res.status(400).json({ error: `User ID "${userId}" is already registered. Please choose another.` });
    }

    // Check duplicate Email
    const cleanEmail = email.trim().toLowerCase();
    const existingEmail = await User.findOne({
      where: { email: cleanEmail }
    });
    if (existingEmail) {
      return res.status(400).json({ error: `An account with email "${email}" is already registered.` });
    }

    // Check duplicate Phone
    let normalizedPhone = null;
    if (phone && phone.trim()) {
      normalizedPhone = normalizePhoneNumber(phone.trim());
      const existingPhone = await User.findOne({
        where: {
          phone: {
            [Op.or]: [phone.trim(), normalizedPhone]
          }
        }
      });
      if (existingPhone) {
        return res.status(400).json({ error: `An account with phone number "${phone}" is already registered.` });
      }
    }

    // Prevent direct admin registration
    const safeRole = ['officer', 'citizen', 'bank'].includes(role) ? role : 'officer';

    // Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      userId: userId.trim(),
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: normalizedPhone || phone,
      passwordHash,
      role: safeRole,
      badgeNumber: badgeNumber ? badgeNumber.trim() : null,
      designation: designation ? designation.trim() : null,
      policeStation: policeStation ? policeStation.trim() : null,
      bankName: bankName ? bankName.trim() : null,
      branchCode: branchCode ? branchCode.trim() : null,
      employeeId: employeeId ? employeeId.trim() : null,
      aadhaar: aadhaar ? aadhaar.trim() : null,
      address: address ? address.trim() : null,
      city: city ? city.trim() : null,
      isActive: true
    });

    // Audit log
    try {
      await AuditLog.create({
        userId: newUser.userId,
        action: 'User Registered',
        entityType: 'User',
        entityId: String(newUser.id),
        details: JSON.stringify({ role: newUser.role, email: newUser.email }),
        ipAddress: req.ip || '127.0.0.1'
      });
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      user: {
        id: newUser.id,
        userId: newUser.userId,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to complete registration: ' + error.message });
  }
});

/**
 * POST /api/auth/login
 * Authenticate with User ID / Email and password against database.
 */
router.post('/login', async (req, res) => {
  try {
    const { userId, identifier, password, role } = req.body;
    const loginIdentifier = (userId || identifier || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Please enter your User ID / Email and password.' });
    }

    // Lookup user by userId OR email
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { userId: { [Op.like]: loginIdentifier } },
          { email: { [Op.like]: loginIdentifier.toLowerCase() } }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. Please verify your User ID and password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated. Please contact an administrator.' });
    }

    // Role check if provided
    if (role && user.role !== role) {
      return res.status(401).json({ error: `Invalid account role. This account is registered as "${user.role.toUpperCase()}", not "${role.toUpperCase()}".` });
    }

    // Verify bcrypt password hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials. Please verify your User ID and password.' });
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        userId: user.userId,
        role: user.role,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Audit log
    try {
      await AuditLog.create({
        userId: user.userId,
        action: 'User Logged In',
        entityType: 'User',
        entityId: String(user.id),
        details: JSON.stringify({ role: user.role }),
        ipAddress: req.ip || '127.0.0.1'
      });
    } catch (e) {}

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        badgeNumber: user.badgeNumber,
        designation: user.designation,
        policeStation: user.policeStation,
        bankName: user.bankName,
        branchCode: user.branchCode,
        employeeId: user.employeeId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal login error: ' + error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user details.
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      user: {
        id: user.id,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        badgeNumber: user.badgeNumber,
        designation: user.designation,
        policeStation: user.policeStation,
        bankName: user.bankName,
        branchCode: user.branchCode,
        employeeId: user.employeeId,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current user.' });
  }
});

/**
 * POST /api/auth/logout
 * Acknowledge user logout.
 */
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * POST /api/auth/forgot-password/email
 * Request password reset via Email link.
 */
router.post('/forgot-password/email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Please enter your registered email address.' });
    }

    const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });

    // Anti-enumeration: return identical success message whether user exists or not
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email address, password reset instructions have been dispatched.'
      });
    }

    // Invalidate prior unused email resets for this user
    await PasswordReset.update(
      { used: true },
      { where: { userId: user.userId, method: 'email', used: false } }
    );

    // Generate secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await PasswordReset.create({
      userId: user.userId,
      method: 'email',
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      attempts: 0,
      verified: false,
      used: false
    });

    // Send email
    await sendPasswordResetEmail(user.email, rawToken);

    res.json({
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been dispatched.'
    });
  } catch (error) {
    console.error('Forgot password (email) error:', error);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

/**
 * POST /api/auth/forgot-password/phone
 * Request password reset OTP via WhatsApp.
 */
router.post('/forgot-password/phone', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Please enter your registered phone number.' });
    }

    const normalized = normalizePhoneNumber(phone.trim());
    const rawDigits = phone.replace(/[\s\-\(\)\+]/g, '');

    const user = await User.findOne({
      where: {
        phone: {
          [Op.or]: [phone.trim(), normalized, rawDigits, { [Op.like]: `%${rawDigits.slice(-10)}` }]
        }
      }
    });

    // Anti-enumeration: return generic success message
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account is associated with this phone number, an OTP code has been dispatched via WhatsApp.'
      });
    }

    // Invalidate previous active phone OTP resets for this user
    await PasswordReset.update(
      { used: true },
      { where: { userId: user.userId, method: 'phone', used: false } }
    );

    // Generate random 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    await PasswordReset.create({
      userId: user.userId,
      method: 'phone',
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0,
      verified: false,
      used: false
    });

    // Dispatch via WhatsApp provider
    await sendWhatsAppOtp(user.phone || normalized, otp);

    res.json({
      success: true,
      message: 'A 6-digit verification code has been dispatched via WhatsApp to your registered mobile number.'
    });
  } catch (error) {
    console.error('Forgot password (phone) error:', error);
    res.status(500).json({ error: 'Failed to dispatch WhatsApp OTP: ' + error.message });
  }
});

/**
 * POST /api/auth/verify-phone-otp
 * Verify WhatsApp OTP code and obtain a short-lived reset authorization token.
 */
router.post('/verify-phone-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Please provide both phone number and the 6-digit OTP code.' });
    }

    const normalized = normalizePhoneNumber(phone.trim());
    const rawDigits = phone.replace(/[\s\-\(\)\+]/g, '');

    const user = await User.findOne({
      where: {
        phone: {
          [Op.or]: [phone.trim(), normalized, rawDigits, { [Op.like]: `%${rawDigits.slice(-10)}` }]
        }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired OTP verification request.' });
    }

    const resetRecord = await PasswordReset.findOne({
      where: {
        userId: user.userId,
        method: 'phone',
        used: false,
        expiresAt: { [Op.gt]: new Date() }
      },
      order: [['createdAt', 'DESC']]
    });

    if (!resetRecord) {
      return res.status(400).json({ error: 'OTP has expired or is invalid. Please request a new verification code.' });
    }

    if (resetRecord.attempts >= 5) {
      resetRecord.used = true;
      await resetRecord.save();
      return res.status(400).json({ error: 'Maximum verification attempts exceeded. Please request a new OTP.' });
    }

    // Increment attempt count
    resetRecord.attempts += 1;

    const submittedOtpHash = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    if (submittedOtpHash !== resetRecord.otpHash) {
      await resetRecord.save();
      const remaining = 5 - resetRecord.attempts;
      return res.status(400).json({ error: `Incorrect verification code. ${remaining > 0 ? remaining + ' attempts remaining.' : 'Please request a new code.'}` });
    }

    // Success: Generate resetAuthToken valid for 10 minutes
    const resetAuthToken = crypto.randomBytes(32).toString('hex');
    resetRecord.verified = true;
    resetRecord.resetAuthToken = resetAuthToken;
    resetRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes to reset password
    await resetRecord.save();

    res.json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken: resetAuthToken
    });
  } catch (error) {
    console.error('Verify phone OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP code.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Set a new password using the validated reset token (Email or WhatsApp Phone flow).
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Check if resetToken matches a phone resetAuthToken OR an email tokenHash
    const emailTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    const resetRecord = await PasswordReset.findOne({
      where: {
        [Op.or]: [
          { resetAuthToken: resetToken, verified: true },
          { tokenHash: emailTokenHash, method: 'email' }
        ],
        used: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired password reset authorization. Please initiate password recovery again.' });
    }

    const user = await User.findOne({ where: { userId: resetRecord.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newPasswordHash;
    await user.save();

    // Mark reset record as used
    resetRecord.used = true;
    await resetRecord.save();

    // Invalidate any other active reset requests for this user
    await PasswordReset.update(
      { used: true },
      { where: { userId: user.userId, used: false } }
    );

    // Audit log
    try {
      await AuditLog.create({
        userId: user.userId,
        action: 'Password Reset Completed',
        entityType: 'User',
        entityId: String(user.id),
        details: JSON.stringify({ method: resetRecord.method }),
        ipAddress: req.ip || '127.0.0.1'
      });
    } catch (e) {}

    res.json({
      success: true,
      message: 'Your password has been reset successfully. Please log in using your new credentials.'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password: ' + error.message });
  }
});

module.exports = router;