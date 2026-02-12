const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });
const User = require('./models/User');

// Mock user data
const testUser = {
    email: `login-test-${Date.now()}@example.com`,
    password: 'password123',
    role: 'student', // or whatever role is valid
    roleId: new mongoose.Types.ObjectId() // Mock ID
};

async function testLoginFlow() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Simulate Registration (Save User with Password)
        console.log(`📝 Registering user: ${testUser.email}`);

        const hashedPassword = await bcrypt.hash(testUser.password, 10);

        const newUser = new User({
            email: testUser.email,
            password: hashedPassword, // Checking if this field saves correctly now
            roleId: testUser.roleId
        });

        await newUser.save();
        console.log('✅ User saved to DB');

        // 2. Verify Data in DB
        const savedUser = await User.findOne({ email: testUser.email });
        console.log('🔍 Retrieved User:', savedUser);

        if (!savedUser.password) {
            console.error('❌ FAILURE: Password field is missing in DB document!');
            return;
        } else {
            console.log('✅ SUCCESS: Password field exists in DB.');
        }

        // 3. Simulate Login (Check Password)
        console.log('🔑 Testing Password Compare...');
        const isMatch = await bcrypt.compare(testUser.password, savedUser.password);

        if (isMatch) {
            console.log('🎉 SUCCESS: Login password check passed!');
        } else {
            console.error('❌ FAILURE: Password mismatch.');
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

testLoginFlow();
