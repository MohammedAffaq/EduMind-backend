require('dotenv').config();
const { connectDB } = require('./db');
const User = require('./models/User');
const StaffStats = require('./models/StaffStats');
const Task = require('./models/Task');

async function seedStaffStats() {
  try {
    await connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/edumind');
    console.log('🔌 Connected to DB');

    // Get all staff users
    const staffUsers = await User.find({ role: 'staff' });
    console.log(`Found ${staffUsers.length} staff users`);

    for (const user of staffUsers) {
      // Calculate stats for each user
      const pendingTasks = await Task.countDocuments({
        assignedTo: user._id,
        status: { $ne: 'Completed' }
      });

      const completedTasks = await Task.countDocuments({
        assignedTo: user._id,
        status: 'Completed'
      });

      // Update or create staff stats
      await StaffStats.findOneAndUpdate(
        { user: user._id },
        {
          pendingTasks,
          requestsProcessed: completedTasks, // Using completed tasks as proxy
          hoursLogged: Math.floor(Math.random() * 160) + 40, // Random hours 40-200
          leaveBalance: 12, // Default leave balance
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );

      console.log(`✅ Updated stats for ${user.firstName} ${user.lastName}`);
    }

    console.log('🎉 Staff stats seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedStaffStats();
