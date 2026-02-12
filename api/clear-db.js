require('dotenv').config();
const { connectDB } = require('./db');
const User = require('./models/User');
const Attendance = require('./models/Attendance');
const Notification = require('./models/Notification');
const LoginActivity = require('./models/LoginActivity');

async function clearDatabase() {
  try {
    await connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/edumind');

    console.log('🗑️  Clearing database...');

    // Clear all user-related data
    await User.deleteMany({});
    console.log('✅ Cleared Users collection');

    await Attendance.deleteMany({});
    console.log('✅ Cleared Attendance collection');

    await Notification.deleteMany({});
    console.log('✅ Cleared Notifications collection');

    await LoginActivity.deleteMany({});
    console.log('✅ Cleared LoginActivity collection');

    // Clear other collections if needed
    const Trip = require('./models/Trip');
    await Trip.deleteMany({});
    console.log('✅ Cleared Trips collection');

    console.log('🎉 Database cleared successfully! Ready for fresh registration.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
