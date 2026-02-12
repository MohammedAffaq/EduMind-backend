const fs = require('fs');
const path = require('path');
const { connectDB } = require('./db');
const User = require('./models/User');

async function migrate() {
  await connectDB();
  const USERS_FILE = path.join(__dirname, 'users.json');

  if (!fs.existsSync(USERS_FILE)) {
    console.log('No users.json file found, nothing to migrate');
    process.exit(0);
  }

  const data = fs.readFileSync(USERS_FILE, 'utf8');
  const users = JSON.parse(data);

  for (const u of users) {
    try {
      await User.updateOne({ email: u.email }, { $set: u }, { upsert: true });
      console.log('Upserted user:', u.email);
    } catch (err) {
      console.error('Failed to upsert', u.email, err.message);
    }
  }

  console.log('Migration completed');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });