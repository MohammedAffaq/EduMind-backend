 require('dotenv').config();
const { connectDB } = require('./db');
const User = require('./models/User');
const bcrypt = require('bcrypt');

async function seed() {
  await connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/edumind');

  const passwordHash = await bcrypt.hash('Vaish@123', 10);

  const demoUsers = [
    { firstName: 'Vaishnavi', lastName: 'K', email: 'kvaishnavi282003@gmail.com', phone: '1234567890', role: 'ADMIN' },
    { firstName: 'Jagannath', lastName: 'K', email: 'laptopfreehp@gmail.com', phone: '1234567891', role: 'TEACHER' },
    { firstName: 'Janaki', lastName: 'Gond', email: 'janakigond07@gmail.com', phone: '1234567892', role: 'PARENT' },
    { firstName: 'Janaki', lastName: 'Gonda', email: 'janakigonda014@gmail.com', phone: '1234567896', role: 'STUDENT' },
    { firstName: 'Tejaswini', lastName: 'K', email: 'v2118215@gmail.com', phone: '1234567897', role: 'TEACHER' },
    { firstName: 'Nithin', lastName: 'K', email: 'janakigonda140@gmail.com', phone: '1234567898', role: 'STAFF' },
    // Non-Teaching Staff Users
    { firstName: 'Rajesh', lastName: 'Kumar', email: 'driver@edumind.com', phone: '9876543210', role: 'STAFF', staffType: 'driver', password: 'Vaish@123' },
    { firstName: 'Priya', lastName: 'Sharma', email: 'cleaning@edumind.com', phone: '9876543211', role: 'STAFF', staffType: 'cleaning-staff', password: 'Vaish@123' },
    { firstName: 'Amit', lastName: 'Patel', email: 'accountant@edumind.com', phone: '9876543212', role: 'STAFF', staffType: 'accountant', password: 'Vaish@123' },
    { firstName: 'Sunita', lastName: 'Gupta', email: 'peon@edumind.com', phone: '9876543213', role: 'STAFF', staffType: 'peon', password: 'Vaish@123' },
    { firstName: 'Ravi', lastName: 'Singh', email: 'office@edumind.com', phone: '9876543214', role: 'STAFF', staffType: 'office-staff', password: 'Vaish@123' },
    { firstName: 'Meera', lastName: 'Joshi', email: 'receptionist@edumind.com', phone: '9876543215', role: 'STAFF', staffType: 'receptionist', password: 'Vaish@123' },
    { firstName: 'Vikram', lastName: 'Shah', email: 'librarian@edumind.com', phone: '9876543216', role: 'STAFF', staffType: 'librarian', password: 'Vaish@123' }
  ];

  for (const userData of demoUsers) {
    const existing = await User.findOne({ email: userData.email });
    if (!existing) {
      const userPasswordHash = userData.password ? await bcrypt.hash(userData.password, 10) : passwordHash;
      const user = new User({
        ...userData,
        passwordHash: userPasswordHash,
        status: 'ACTIVE',
        isActive: true,
        isFirstLogin: false,
        createdBy: 'ADMIN'
      });
      await user.save();
      console.log(`Demo user created: ${userData.email} (${userData.role})`);
    } else {
      console.log(`Demo user already exists: ${userData.email}`);
    }
  }

  // create a sample driver and some trips if none exist (useful for analytics demo)
  const Trip = require('./models/Trip');
  const driverEmail = process.env.SEED_DRIVER_EMAIL || 'driver@edumind.com';
  let driver = await User.findOne({ email: driverEmail });
  if (!driver) {
    driver = new User({ firstName: 'Demo', lastName: 'Driver', email: driverEmail, phone: '1234567895', passwordHash, role: 'STAFF', staffType: 'driver', status: 'ACTIVE', isActive: true, isFirstLogin: false, createdBy: 'ADMIN' });
    await driver.save();
    console.log('Driver user created:', driverEmail);
  }

  const existingTrips = await Trip.countDocuments();
  if (existingTrips === 0) {
    const trips = [
      { driverId: driver._id, vehicleNumber: 'TN-01-1111', routeName: 'Route A', date: new Date(), stops: [{ name: 'Stop 1', pickupTime: '08:00', dropTime: '08:30' }], status: 'not-started' },
      { driverId: driver._id, vehicleNumber: 'TN-01-2222', routeName: 'Route B', date: new Date(), stops: [{ name: 'Stop 2', pickupTime: '08:15', dropTime: '08:45' }], status: 'in-progress' },
      { driverId: driver._id, vehicleNumber: 'TN-01-3333', routeName: 'Route C', date: new Date(), stops: [{ name: 'Stop 3', pickupTime: '09:00', dropTime: '09:30' }], status: 'completed' }
    ];
    for (const t of trips) {
      const tr = new Trip(t);
      await tr.save();
    }
    console.log('Sample trips created');
  }

  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });