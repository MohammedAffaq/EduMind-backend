require('dotenv').config();
const { connectDB } = require('./db');
const User = require('./models/User');
const Notification = require('./models/Notification');

async function seedNotifications() {
  try {
    await connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/edumind');
    console.log('🔌 Connected to DB');

    // Get admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin user found, skipping notification seeding');
      process.exit(0);
    }

    // Clear existing notifications
    await Notification.deleteMany({});
    console.log('Cleared existing notifications');

    const notifications = [
      {
        title: 'Staff Meeting',
        message: 'Monthly staff meeting scheduled for tomorrow at 10:00 AM in Conference Room A.',
        type: 'announcement',
        priority: 'medium',
        targetAudience: 'staff',
        createdBy: admin._id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      {
        title: 'System Maintenance',
        message: 'Scheduled system maintenance on Sunday from 2:00 AM to 4:00 AM. Services may be temporarily unavailable.',
        type: 'alert',
        priority: 'high',
        targetAudience: 'all',
        createdBy: admin._id,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
      },
      {
        title: 'Holiday Notice',
        message: 'School will remain closed on Monday due to public holiday.',
        type: 'announcement',
        priority: 'medium',
        targetAudience: 'all',
        createdBy: admin._id,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
      },
      {
        title: 'New Policy Update',
        message: 'Please review the updated attendance policy in the staff handbook.',
        type: 'reminder',
        priority: 'low',
        targetAudience: 'staff',
        createdBy: admin._id
      }
    ];

    const createdNotifications = await Notification.insertMany(notifications);
    console.log(`✅ Created ${createdNotifications.length} sample notifications`);

    console.log('🎉 Notifications seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedNotifications();
