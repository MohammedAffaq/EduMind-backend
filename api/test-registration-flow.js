const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });
const User = require('./models/User');

// Mock user data
const testUser = {
    email: `reg-test-${Date.now()}@example.com`,
    password: 'password123',
    role: 'student',
    // note: NO roleId provided here, testing if schema allows it
    firstName: 'Test',
    lastName: 'User'
};

async function testRegistrationFlow() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Simulate Registration
        console.log(`📝 Registering user: ${testUser.email} with role: ${testUser.role}`);

        const hashedPassword = await bcrypt.hash(testUser.password, 10);

        const newUser = new User({
            email: testUser.email,
            password: hashedPassword,
            role: testUser.role,
            firstName: testUser.firstName,
            lastName: testUser.lastName
        });

        try {
            await newUser.save();
            console.log('✅ User saved to DB successfully (Schema Validation passed)');
        } catch (saveError) {
            console.error('❌ FAILURE: Schema Validation Failed:', saveError.message);
            return;
        }

        // 2. Verify Data in DB
        const savedUser = await User.findOne({ email: testUser.email });
        console.log('🔍 Retrieved User:', savedUser);

        if (savedUser.role === testUser.role && !savedUser.roleId) {
            console.log('✅ SUCCESS: User saved with string role and without roleId.');
        } else {
            console.error('❌ FAILURE: Data mismatch.');
        }

        // Cleanup
        await User.deleteOne({ email: testUser.email });
        console.log('🧹 Cleanup done');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected');
    }
}

testRegistrationFlow();
