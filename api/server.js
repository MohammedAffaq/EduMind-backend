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

const PORT = process.env.PORT || 5000;

/* =========================
   CORS CONFIGURATION (FIXED)
========================= */

// Allow both local + deployed frontend
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://edumind.netlify.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman / server-to-server
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

/* =========================
   SOCKET.IO (FIXED CORS)
========================= */

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('send-notification', ({ recipientId, notification }) => {
    io.to(recipientId).emit('notification', notification);
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

app.set('io', io);

/* =========================
   MIDDLEWARE
========================= */

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
  console.error('❌ Error:', err.message);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
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

mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 20000);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20000
    });

    console.log('✅ MongoDB connected');

    server.listen(PORT, () => {
      console.log(`🚀 EduMind API running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🔌 Socket.IO enabled');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
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
