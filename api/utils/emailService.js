const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000,
  socketTimeout: 10000
});

// Verify connection configuration
async function verifyConnection() {
  try {
    await transporter.verify();
    console.log('✅ SMTP Connection verified successfully');
    return true;
  } catch (error) {
    console.error('❌ SMTP Connection failed:', error);
    return false;
  }
}

async function sendOTPEmail(email, message, customSubject = null) {
  try {
    // Check if this is an OTP (numeric) or a custom message
    const isOTP = /^\d{4,6}$/.test(message);

    const mailOptions = {
      from: `"EduMind Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: customSubject || (isOTP ? 'EduMind - Email Verification OTP' : 'EduMind - Account Notification'),
      html: isOTP ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #0056b3;">Welcome to EduMind!</h2>
          <p>Thank you for registering. To complete your verification, please use the OTP below:</p>
          <div style="background-color: #f0f4f8; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #007bff; font-size: 36px; letter-spacing: 5px; margin: 0;">${message}</h1>
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p style="font-size: 12px; color: #666;">If you didn't request this code, you can safely ignore this email.</p>
          <br>
          <p>Best regards,<br><strong>EduMind Team</strong></p>
        </div>
      ` : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">EduMind Account Update</h2>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <br>
          <p>Best regards,<br>EduMind Team</p>
        </div>
      `
    };

    console.log(`📤 Sending email to: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    // Throw error so the caller knows it failed
    throw error;
  }
}

module.exports = { sendOTPEmail, verifyConnection };
