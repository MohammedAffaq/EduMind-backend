require('dotenv').config();
const { connectDB } = require('./db');
const User = require('./models/User');

async function testUsers() {
  await connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/edumind');

  const users = await User.find({}, 'firstName lastName email role status isActive isFirstLogin');
  console.log('Users in database:');
  users.forEach(user => {
    console.log(`${user.firstName} ${user.lastName} - ${user.email} - ${user.role} - ${user.status} - Active: ${user.isActive} - FirstLogin: ${user.isFirstLogin}`);
  });

  process.exit(0);
}

testUsers().catch(err => { console.error(err); process.exit(1); });
