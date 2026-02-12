require('dotenv').config();
const path = require('path');
// Load environment variables from parent directory (backend/.env)
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const nodemailer = require('nodemailer');

async function verifyEmail() {
  console.log('🔍 Checking email configuration...');
  console.log('📧 User:', process.env.EMAIL_USER || 'UNDEFINED');
  console.log('🔑 Pass:', process.env.EMAIL_PASS ? '******' : 'UNDEFINED');

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    // 1. Verify connection configuration
    await transporter.verify();
    console.log('✅ SMTP Connection successful! Credentials are valid.');

    // 2. Send a test email to yourself
    console.log('📨 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Sending to yourself
      subject: 'EduMind Email Configuration Test',
      text: 'If you are reading this, your Node.js email configuration is working correctly!'
    });

    console.log('✅ Test email sent successfully!');
    console.log('🆔 Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Email configuration failed:', error);
  }
}

verifyEmail();