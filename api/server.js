const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

/* =========================
   BASIC APP SETUP
========================= */

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

/* =========================
   MIDDLEWARE
========================= */

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   STATIC FILES (OPTIONAL)
========================= */

app.use(express.static(path.join(__dirname, '../../build')));

/* =========================
   SOCKET.IO
========================= */

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('send-notification', ({ recipientId, notification }) => {
    io.to(recipientId).emit('notification', notification);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.set('io', io);

/* =========================
   ROUTES
========================= */

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/parents', require('./routes/parents'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/tasks', require('./routes/taskRoutes'));

/* =========================
   HEALTH CHECK
========================= */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/* =========================
   ERROR HANDLING
========================= */

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

/* =========================
   MONGODB + SERVER START
========================= */

// 🚫 Disable mongoose buffering (CRITICAL FIX)
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 20000);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 20000
    });

    console.log('✅ MongoDB connected');

    // --- TEMPORARY FIX FOR DUPLICATE KEY ERROR ---
    try {
      const collection = mongoose.connection.db.collection('users');
      const indexes = await collection.indexes();
      const targetIndex = indexes.find(idx => idx.name === 'id_1');
      if (targetIndex) {
        console.log('⚠️ Found rogue index "id_1". Dropping it...');
        await collection.dropIndex('id_1');
        console.log('✅ Successfully dropped index "id_1"');
      } else {
        console.log('ℹ️ Index "id_1" not found. Good to go.');
      }
    } catch (err) {
      console.error('⚠️ Error checking/dropping index:', err);
    }
    // ---------------------------------------------

    server.listen(PORT, () => {
      console.log(`🚀 EduMind API running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🔌 Socket.IO enabled');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1); // HARD STOP if DB fails
  }
};

startServer();

/* =========================
   GRACEFUL SHUTDOWN
========================= */

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
