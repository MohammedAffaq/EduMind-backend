require('dotenv').config();
const { connectDB } = require('./db');
const User = require('./models/User');

async function deleteDriver() {
  await connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/edumind');

  const result = await User.deleteOne({ email: 'driver@edumind.com' });
  console.log(`Deleted ${result.deletedCount} driver user(s)`);

  process.exit(0);
}

deleteDriver().catch(err => {
  console.error(err);
  process.exit(1);
});
