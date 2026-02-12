const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const User = require('./models/User');

async function listUsers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const users = await User.find({});
        console.log(`\n👥 Found ${users.length} users in the database:`);

        if (users.length === 0) {
            console.log('⚠️ No users found! Registration is definitely failing.');
        } else {
            users.forEach((user, index) => {
                console.log(`\n[${index + 1}] --------------------------------`);
                console.log(`🆔 ID: ${user._id}`);
                console.log(`📧 Email: ${user.email}`);
                console.log(`👤 Role: ${user.role}`);
                console.log(`🔑 Password Set: ${user.password ? 'YES' : 'NO (❌ This causes login failure)'}`);
                if (user.password) {
                    console.log(`   (Password Length: ${user.password.length})`);
                }
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected');
    }
}

listUsers();
