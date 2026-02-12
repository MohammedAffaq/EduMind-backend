require('dotenv').config();
const { connectDB } = require('./db');

async function dropDB() {
  const mongoose = require('mongoose');
  await connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/edumind');

  await mongoose.connection.db.dropDatabase();
  console.log('Database dropped');

  process.exit(0);
}

dropDB().catch(err => { console.error(err); process.exit(1); });
