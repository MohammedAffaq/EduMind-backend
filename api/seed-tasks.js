require('dotenv').config();
const { connectDB } = require('./db');
const User = require('./models/User');
const Task = require('./models/Task');
const AuditLog = require('./models/AuditLog');
const bcrypt = require('bcryptjs');

async function seedTasks() {
  try {
    await connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/edumind');
    console.log('🔌 Connected to DB');

    // 1. Find or Create Admin (to assign tasks)
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      const passwordHash = await bcrypt.hash('Admin@123', 10);
      admin = await User.create({
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@edumind.com',
        passwordHash,
        role: 'admin',
        status: 'active'
      });
      console.log('✅ Created Admin user');
    }

    // 2. Find or Create Cleaning Staff
    let cleaner = await User.findOne({ email: 'cleaning@edumind.com' });
    if (!cleaner) {
      const passwordHash = await bcrypt.hash('Vaish@123', 10);
      cleaner = await User.create({
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'cleaning@edumind.com',
        phone: '9876543211',
        passwordHash,
        role: 'staff',
        staffType: 'cleaning-staff',
        status: 'active'
      });
      console.log('✅ Created Cleaning Staff user');
    }

    // 3. Create Sample Tasks
    await Task.deleteMany({ assignedTo: cleaner._id }); // Clear existing tasks for this user

    const tasks = [
      {
        title: 'Sanitize Computer Lab',
        description: 'Deep clean keyboards and monitors in Lab 1.',
        type: 'maintenance',
        priority: 'high',
        status: 'pending',
        assignedTo: cleaner._id,
        assignedBy: admin._id,
        department: 'it',
        dueDate: new Date(new Date().setHours(17, 0, 0, 0)) // Today 5 PM
      },
      {
        title: 'Clean Library Windows',
        description: 'Wipe down all glass surfaces in the main library hall.',
        type: 'maintenance',
        priority: 'medium',
        status: 'in_progress',
        assignedTo: cleaner._id,
        assignedBy: admin._id,
        department: 'library',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 1)) // Tomorrow
      },
      {
        title: 'Restock Washroom Supplies',
        description: 'Refill soap dispensers and paper towels in Block A.',
        type: 'facility',
        priority: 'low',
        status: 'completed',
        assignedTo: cleaner._id,
        assignedBy: admin._id,
        department: 'maintenance',
        dueDate: new Date(new Date().setDate(new Date().getDate() - 1)) // Yesterday
      }
    ];

    const createdTasks = await Task.insertMany(tasks);
    console.log(`✅ Created ${createdTasks.length} sample tasks`);

    // 4. Create Audit Logs
    const auditLogs = createdTasks.map(task => ({
      actionBy: admin._id,
      action: 'CREATE',
      module: 'USER', // Using USER as generic module based on schema enum
      referenceId: task._id,
      timestamp: new Date()
    }));

    await AuditLog.insertMany(auditLogs);
    console.log(`✅ Created ${auditLogs.length} audit logs`);

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedTasks();