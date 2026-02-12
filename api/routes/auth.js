const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendOTPEmail } = require('../utils/emailService');

/* ===============================
   SEND OTP
================================ */
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Save OTP to Otp collection (Create or Update)
    await Otp.findOneAndUpdate(
      { email },
      { otp, createdAt: Date.now() }, // Update createdAt to reset TTL
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`🔹 Generated OTP for ${email}: ${otp}`);

    // Send email
    await sendOTPEmail(email, otp);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('SEND OTP ERROR 👉', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send OTP'
    });
  }
});

/* ===============================
   VERIFY OTP
================================ */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required'
      });
    }

    // Find OTP in Otp collection
    const validOtp = await Otp.findOne({ email, otp });

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP'
      });
    }

    // Optional: Delete OTP after successful verification (to prevent reuse)
    // await Otp.deleteOne({ _id: validOtp._id });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('VERIFY OTP ERROR 👉', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify OTP'
    });
  }
});

/* ===============================
   REGISTER
================================ */
router.post('/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      staffType,
      designation,
      subject,
      rollNumber,
      className,
      children,
      relationship,
      dob,
      documents
    } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email, password and role are required'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }

    // REMOVED MANUAL HASHING - User model pre-save hook handles it
    // const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      email,
      phone,
      password, // Pass plain password, let User model hash it
      role,
      staffType: role === 'staff' ? staffType : undefined,
      designation: role === 'staff' ? designation : undefined,
      subject: role === 'staff' && staffType === 'teaching' ? subject : undefined,
      rollNumber: role === 'student' ? rollNumber : undefined,
      className: role === 'student' ? className : undefined,
      className: role === 'student' ? className : undefined,
      children: role === 'parent' ? children : undefined,
      relationship: role === 'parent' ? relationship : undefined,
      dob: role === 'student' ? dob : undefined,
      documents: role === 'student' ? documents : undefined
    });

    console.log('📝 Attempting to save new user:', { ...newUser.toObject(), password: 'REDACTED' });

    try {
      const savedUser = await newUser.save();
      console.log('✅ User saved successfully! ID:', savedUser._id);
    } catch (saveError) {
      console.error('❌ User Save Failed:', saveError);
      return res.status(500).json({
        success: false,
        error: `Database Save Failed: ${saveError.message}`
      });
    }

    return res.status(201).json({
      success: true,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('REGISTER ERROR 👉', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/* ===============================
   LOGIN (🔥 FULLY FIXED 🔥)
================================ */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    /* ---- Validation ---- */
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    /* ---- Find User ---- */
    /* ---- Find User ---- */
    console.log(`🔑 Login attempt for: ${email}`);
    // Ensure email is lowercase/trimmed if your schema requires it, though duplication logic usually handles this?
    // User model has lowercase: true, so query SHOULD ideally match, but let's be safe if needed.
    // However, for now, we just rely on the input.

    const user = await User.findOne({ email });

    console.log('🔍 Database Query Result:', user ? `Found user: ${user.email} (${user._id})` : 'User NOT found');

    if (!user) {
      console.log('❌ Login failed: User not found in DB');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    console.log('✅ User found. Checking password...');
    if (!user.password) {
      console.error('❌ Login failed: user.password is missing/undefined in DB document');
      return res.status(500).json({
        success: false,
        error: 'User password not set'
      });
    }

    /* ---- Compare Password ---- */
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Login failed: Password mismatch');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    console.log('✅ Password match! Login successful.');

    /* ---- Create Token ---- */
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        staffType: user.staffType || null,
        designation: user.designation || null,
        subject: user.subject || null,
        rollNumber: user.rollNumber || null,
        className: user.className || null,
        children: user.children || [],
        relationship: user.relationship || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    /* ---- Success Response ---- */
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        staffType: user.staffType || null,
        designation: user.designation || null,
        subject: user.subject || null,
        rollNumber: user.rollNumber || null,
        className: user.className || null,
        children: user.children || [],
        relationship: user.relationship || null
      }
    });
  } catch (error) {
    console.error('LOGIN ERROR 👉', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
