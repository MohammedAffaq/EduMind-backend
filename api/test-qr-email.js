require('dotenv').config();
const path = require('path');
// Load environment variables from parent directory (backend/.env)
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sendOTPEmail } = require('./utils/emailService');

async function testQREmail() {
  console.log('🧪 Testing QR Code Email...');
  console.log('📧 User:', process.env.EMAIL_USER || 'UNDEFINED');

  const testEmail = process.env.EMAIL_USER;
  const testQRCode = 'QR_TEST123456';
  const testName = 'John Doe';

  if (!testEmail) {
    console.error('❌ EMAIL_USER not set in environment variables');
    return;
  }

  try {
    const qrMessage = `
Dear ${testName},

Your EduMind account has been successfully verified!

Your QR Code for attendance marking: ${testQRCode}

Please save this QR code. You will need to scan it using the EduMind attendance system to mark your attendance as present.

Best regards,
EduMind Team
    `.trim();

    console.log('📨 Sending QR code test email...');
    await sendOTPEmail(testEmail, qrMessage, 'Account Verified - Your QR Code');
    console.log('✅ QR code test email sent successfully!');
  } catch (error) {
    console.error('❌ QR code email test failed:', error.message);
    console.error('Full error:', error);
  }
}

testQREmail();
