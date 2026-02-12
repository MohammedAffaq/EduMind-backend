const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const Otp = require('./models/Otp');

// Mock email service to avoid actual sending during test
const emailService = require('./utils/emailService');
emailService.sendOTPEmail = async (email, otp) => {
    console.log(`[MOCK] Sending OTP ${otp} to ${email}`);
    return true;
};

async function testOtpFlow() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const testEmail = `test-${Date.now()}@example.com`;
        console.log(`🧪 Testing with new email: ${testEmail}`);

        // Generate OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        // Save to DB
        console.log('💾 Saving OTP to database...');
        const result = await Otp.findOneAndUpdate(
            { email: testEmail },
            { otp, createdAt: Date.now() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log('✅ OTP Document created:', result);

        if (result.email === testEmail && result.otp === otp) {
            console.log('🎉 SUCCESS: OTP saved correctly for new email!');
        } else {
            console.error('❌ FAILURE: OTP document mismatch');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected');
    }
}

testOtpFlow();
