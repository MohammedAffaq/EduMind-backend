const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
// Import student request functions
const {
  createStudentRequest,
  getPendingRequests,
  getAllRequests,
  approveRequest,
  rejectRequest,
  getRequestsByTeacher,
  loadRequests
} = require('./student_requests');

// Path to users data file (kept for migration/backup)
const USERS_FILE = path.join(__dirname, 'users.json');
const MARKS_FILE = path.join(__dirname, 'marks.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-secret-key-change-this';

// MongoDB setup
const { connectDB } = require('./db');
const User = require('./models/User');
const Mark = require('./models/Mark');

// Function to load users from MongoDB (fills in-memory cache)
async function loadUsers() {
  try {
    const users = await User.find({}).lean();
    userDatabase = users.map(u => {
      const { _id, __v, ...rest } = u;
      return rest;
    });
    console.log('Users loaded from MongoDB:', userDatabase.length);
  } catch (error) {
    console.error('Error loading users from MongoDB:', error);
    userDatabase = [];
  }
}

// Save users array into MongoDB by upserting (keeps file backup too)
async function saveUsers() {
  try {
    for (const user of userDatabase) {
      await User.updateOne({ id: user.id }, { $set: user }, { upsert: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(userDatabase, null, 2));
    console.log('Users saved to MongoDB and users.json backup');
  } catch (error) {
    console.error('Error saving users to MongoDB:', error);
  }
}

// Function to load marks from MongoDB
async function loadMarks() {
  try {
    const marks = await Mark.find({}).lean();
    marksDatabase = marks.map(m => {
      const { _id, __v, ...rest } = m;
      return rest;
    });
    console.log('Marks loaded from MongoDB:', marksDatabase.length);
  } catch (error) {
    console.error('Error loading marks from MongoDB:', error);
    marksDatabase = [];
  }
}

// Function to save marks to MongoDB and file backup
async function saveMarks() {
  try {
    for (const mark of marksDatabase) {
      await Mark.updateOne({ id: mark.id }, { $set: mark }, { upsert: true });
    }
    fs.writeFileSync(MARKS_FILE, JSON.stringify(marksDatabase, null, 2));
    console.log('Marks saved to MongoDB and marks.json backup');
  } catch (error) {
    console.error('Error saving marks to MongoDB:', error);
  }
}

// Middleware to verify admin token
const isAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify the token matches an admin user in DB
    const adminUser = await User.findOne({ id: decoded.id, role: 'admin', status: 'active' }).lean();
    if (!adminUser) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    req.user = adminUser;

    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token.' });
  }
};

// Middleware to verify teacher token
const isTeacher = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Teacher access required.' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify the token matches a teacher user in DB
    const teacherUser = await User.findOne({ id: decoded.id, role: 'teacher' }).lean();
    if (!teacherUser) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Teacher access required.' });
    }

    req.user = teacherUser;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token or authorization error.' });
  }
};

// Middleware to verify any authenticated user
const isAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Authentication required.' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify the token matches any user in DB
    const user = await User.findOne({ id: decoded.id }).lean();
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized. User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token or authorization error.' });
  }
};
// Simulated database - in production, this would be a real database
let userDatabase = [];
let marksDatabase = [];

// OTP storage (in production, use Redis or database)
let otpStorage = {};

// Create default admin user on startup
async function createDefaultAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = userDatabase.find(user => user.role === 'admin');
    if (existingAdmin) {
      return;
    }

    console.log('🚀 Creating default admin account...');

    // Create default admin
    const defaultAdminData = {
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@edumind.com',
      phone: '1234567890',
      password: 'Admin123!',
      role: 'admin'
    };

    const result = await createAdminUser(defaultAdminData);

    if (result.success) {
      console.log('✅ Default admin created successfully!');
      console.log('📧 Email: admin@edumind.com');
      console.log('🔑 Password: Admin123!');
      console.log('🔗 Login at: http://localhost:3000/');
    } else {
      console.log('❌ Failed to create default admin:', result.error);
    }

  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}
// Function to generate a secure random password
function generateSecurePassword() {
  const length = Math.floor(Math.random() * 3) + 10; // 10-12 characters
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = uppercase + lowercase + numbers + specialChars;
  let password = '';

  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];

  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Function to hash password using bcrypt
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Function to send email using Gmail
async function sendPasswordEmail(email, password, userName, role) {
  // Create transporter with Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'aedumind@gmail.com',
      pass: 'rspb mkpm evdm anve' // 16-character App Password
    }
  });

  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
  const loginUrl = 'http://localhost:3000/login'; // Update this with your actual login URL

  const mailOptions = {
    from: 'aedumind@gmail.com',
    to: email,
    subject: 'Your EduMind Account Credentials',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to EduMind!</h2>
        <p>Dear ${userName},</p>
        <p>Your EduMind account has been created successfully as a <strong>${roleDisplay}</strong>. Here are your login details:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Login ID (Email):</strong> ${email}</p>
          <p><strong>Generated Password:</strong> <code style="background-color: #e5e7eb; padding: 2px 4px; border-radius: 4px;">${password}</code></p>
          <p><strong>Login URL:</strong> <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a></p>
        </div>
        <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>EduMind Admin Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

// Function to create admin user (with optional password generation)
async function createAdminUser(userData) {
  try {
    const { firstName, lastName, email, password } = userData;

    // Check if user with this email already exists in DB
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return { success: false, error: 'User with this email already exists' };
    }

    let finalPassword;
    let isFirstLogin = false;

    if (password && password.trim()) {
      finalPassword = password;
      isFirstLogin = false;
    } else {
      finalPassword = generateSecurePassword();
      isFirstLogin = true;
      console.log('Generated password for admin', email, ':', finalPassword);
    }

    const hashedPassword = await hashPassword(finalPassword);

    const adminRecord = {
      id: Date.now().toString(),
      firstName,
      lastName,
      email,
      role: 'admin',
      password: hashedPassword,
      isFirstLogin,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    // Save to MongoDB
    await User.create(adminRecord);

    // Update in-memory cache
    userDatabase.push(adminRecord);

    if (!password || !password.trim()) {
      const fullName = `${firstName} ${lastName}`;
      await sendPasswordEmail(email, finalPassword, fullName, 'admin');
      console.log('Password email sent to admin');
    }

    return {
      success: true,
      userId: adminRecord.id,
      message: password && password.trim() ? 'Admin user created successfully' : 'Admin user created successfully and password sent via email',
      generatedPassword: (!password || !password.trim()) ? finalPassword : undefined
    };

  } catch (error) {
    console.error('Error creating admin user:', error);
    return { success: false, error: error.message };
  }
}

// Function to verify password
async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

// Main function to create user and send password
async function createUserAndSendPassword(userData) {
  try {
    const { firstName, lastName, email, role, className, rollNumber, designation, subject, childName, relationship, password } = userData;

    // Check if user already exists by email (Case insensitive)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return { success: false, error: 'User with this email already exists' };
    }

    // Check if user already exists by name and role (same person)
    const existingPerson = await User.findOne({ firstName, lastName, role });
    if (existingPerson) {
      return { success: false, error: 'User with this name and role already exists' };
    }

    let generatedPassword;
    let isFirstLogin = true;

    if (password) {
      generatedPassword = password;
      isFirstLogin = false;
    } else {
      generatedPassword = generateSecurePassword();
      console.log('Generated password for', email, ':', generatedPassword);
    }

    const hashedPassword = await hashPassword(generatedPassword);
    console.log('Password hashed successfully');

    const userRecord = {
      id: Date.now().toString(),
      firstName,
      lastName,
      email,
      role,
      password: hashedPassword,
      isFirstLogin,
      createdAt: new Date().toISOString(),
      status: 'active',
      ...(role === 'student' && { rollNumber, className }),
      ...(role === 'teacher' && { designation, subject }),
      ...(role === 'parent' && {
        children: userData.children || [{ name: childName || 'Child', grade: className || 'Grade 10' }],
        relationship
      }),
      ...(role === 'staff' && { designation }),
    };

    // Save to MongoDB
    await User.create(userRecord);

    // Update in-memory cache
    userDatabase.push(userRecord);

    if (!password) {
      const fullName = `${firstName} ${lastName}`;
      try {
        await sendPasswordEmail(email, generatedPassword, fullName, role);
        console.log('Password email sent successfully');
      } catch (emailError) {
        console.error('Failed to send password email:', emailError);
        console.log(`[DEBUG] Generated Password for ${email}: ${generatedPassword}`);
      }
    }

    return { success: true, userId: userRecord.id, message: password ? 'User created successfully' : 'User created successfully and password sent via email' };

  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
}

// Function to authenticate user
async function authenticateUser(email, password) {
  try {
    const user = await User.findOne({ email }).lean();

    if (!user) {
      return { success: false, error: 'User not registered. Please contact Admin.' };
    }

    if (user.role === 'student' && user.status === 'pending') {
      return { success: false, error: 'Registration pending Admin approval.' };
    }

    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' };
    }

    const { password: _, ...userData } = user;
    return { success: true, user: userData };

  } catch (error) {
    console.error('Error authenticating user:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

// Function to change password
async function changePassword(userId, currentPassword, newPassword) {
  try {
    const user = await User.findOne({ id: userId });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const isValidCurrentPassword = await verifyPassword(currentPassword, user.password);
    if (!isValidCurrentPassword) {
      return { success: false, error: 'Current password is incorrect' };
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await User.updateOne({ id: userId }, { $set: { password: hashedNewPassword, isFirstLogin: false } });

    // Refresh in-memory cache
    await loadUsers();

    return { success: true, message: 'Password changed successfully' };

  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: 'Failed to change password' };
  }
}

// Function to get all users (for admin)
async function getAllUsers() {
  const users = await User.find({}, '-password -__v -_id').lean();
  return users;
}

async function getTeacher(id) {
  return await User.findOne({ id }).lean();
}

async function getUser(id) {
  return await User.findOne({ id }).lean();
}

async function deleteUser(id) {
  try {
    const result = await User.deleteOne({ id });
    if (result.deletedCount === 0) {
      return { success: false, error: 'User not found' };
    }

    // Refresh cache
    await loadUsers();

    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: 'Failed to delete user' };
  }
}



// Express server setup
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/admin/register', async (req, res) => {
  try {
    const result = await createAdminUser(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/register', isAdmin, async (req, res) => {
  try {
    const result = await createUserAndSendPassword(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authenticateUser(email, password);

    if (result.success) {
      const token = jwt.sign(
        { id: result.user.id, email: result.user.email, role: result.user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ ...result, token });
    } else {
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/change-password', isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // Get user ID from authenticated user in token
    const result = await changePassword(userId, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/users/:id', isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await deleteUser(userId);
    res.json(result);
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});


app.get('/api/marks/:studentId', (req, res) => {

  try {
    const { studentId } = req.params;
    const studentMarks = marksDatabase.filter(m => m.studentId === studentId);
    res.json({ success: true, marks: studentMarks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/marks', (req, res) => {

  try {
    const { studentId, examType, subjects } = req.body;

    const newMark = {
      id: Date.now().toString(),
      studentId,
      examType, // "Internal 1", "Internal 2", "Internal 3", "Mid Term", "Final Exam"
      subjects, // Array of { subject, marks, total }
      date: new Date().toISOString()
    };

    marksDatabase.push(newMark);
    saveMarks();

    res.json({ success: true, message: 'Marks added successfully', markId: newMark.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
app.get('/api/marks/:studentId/download', (req, res) => {

  try {
    const { studentId } = req.params;
    const studentMarks = marksDatabase.filter(m => m.studentId === studentId);
    const student = userDatabase.find(u => u.id === studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'Student';

    let csvContent = 'Exam Type,Subject,Marks Obtained,Total Marks,Percentage,Date\n';

    studentMarks.forEach(record => {
      record.subjects.forEach(sub => {
        const percentage = sub.total > 0 ? ((sub.marks / sub.total) * 100).toFixed(2) : '0.00';
        csvContent += `"${record.examType}","${sub.subject}",${sub.marks},${sub.total},${percentage}%,${new Date(record.date).toLocaleDateString()}\n`;
      });
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Report_${studentName.replace(/\s+/g, '_')}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Student Request Routes
app.post('/api/student-requests', isTeacher, async (req, res) => {
  try {
    const teacherUser = req.user;
    const requestData = {
      ...req.body,
      teacherId: teacherUser.id,
      teacherName: `${teacherUser.firstName} ${teacherUser.lastName}`
    };

    const result = createStudentRequest(requestData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/student-requests', isAdmin, (req, res) => {
  try {
    const requests = getAllRequests();
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/student-requests/:id/approve', isAdmin, async (req, res) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { note } = req.body;

    const result = approveRequest(id, adminUser.id, `${adminUser.firstName} ${adminUser.lastName}`, note);

    if (result.success) {
      const request = result.request;

      // If it's an add request, register the student
      if (request.type === 'add') {
        // Find the pending student record
        const pendingStudent = userDatabase.find(user =>
          user.id === request.id && user.status === 'pending'
        );

        if (!pendingStudent) {
          return res.status(404).json({
            success: false,
            error: 'Pending student record not found'
          });
        }

        // Update student status to active
        pendingStudent.status = 'active';

        // Generate password and send email
        const userData = {
          firstName: pendingStudent.firstName,
          lastName: pendingStudent.lastName,
          email: pendingStudent.email,
          phone: pendingStudent.phone,
          role: 'student',
          rollNumber: pendingStudent.rollNumber,
          className: pendingStudent.className
        };

        const registerResult = await createUserAndSendPassword(userData);
        if (!registerResult.success) {
          return res.status(500).json({
            success: false,
            error: `Request approved but student registration failed: ${registerResult.error}`
          });
        }

        // Update the student record with the new ID from registration
        pendingStudent.id = registerResult.userId;
        saveUsers();
      }
      // For delete requests, we would need additional logic to remove the student
      // This would require finding and removing the student from userDatabase
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/student-requests/:id/reject', isAdmin, (req, res) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { note } = req.body;

    const result = rejectRequest(id, adminUser.id, `${adminUser.firstName} ${adminUser.lastName}`, note);

    if (result.success) {
      const request = result.request;

      // If it's an add request, remove the pending student record
      if (request.type === 'add') {
        const studentIndex = userDatabase.findIndex(user =>
          user.requestId === id && user.status === 'pending' && user.role === 'student'
        );

        if (studentIndex !== -1) {
          userDatabase.splice(studentIndex, 1);
          saveUsers();
          console.log('Pending student record removed');
        }
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Authentication Routes (matching Postman collection)
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate role is ADMIN
    if (role !== 'ADMIN') {
      return res.status(400).json({
        message: 'Invalid role. Only ADMIN role is allowed for this endpoint.'
      });
    }

    const result = await authenticateUser(email, password);

    if (result.success) {
      // Check if user is admin
      if (result.user.role !== 'admin') {
        return res.status(403).json({
          message: 'Access denied. Admin privileges required.'
        });
      }

      const token = jwt.sign(
        { id: result.user.id, email: result.user.email, sub: result.user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        userId: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        role: 'ADMIN',
        token
      });
    } else {
      if (result.error === 'User not registered. Please contact Admin.' ||
        result.error === 'Registration pending Admin approval.') {
        return res.status(404).json({ message: 'User not found or inactive' });
      }
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/auth/logout', isAdmin, (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side by removing the token
    // We could implement token blacklisting here if needed
    res.json({ message: 'Admin Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Development-only: impersonate a user by id and return a valid token
if (process.env.NODE_ENV === 'development') {
  app.get('/dev/impersonate/:id', (req, res) => {
    try {
      const { id } = req.params;
      const user = userDatabase.find(u => u.id === id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ success: true, token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

// Admin Profile Routes
app.get('/admin/profile', isAdmin, (req, res) => {
  try {
    const admin = req.user;
    res.json({
      adminId: admin.id,
      userId: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      emailId: admin.email,
      mobile: admin.phone || null,
      gender: admin.gender || null,
      designation: admin.designation || null,
      profilePicture: admin.profilePicture || null,
      schoolId: admin.schoolId || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/admin/profile', isAdmin, (req, res) => {
  try {
    const admin = req.user;
    const { firstName, lastName, mobile, profilePicture } = req.body;

    // Validate mobile number if provided
    if (mobile && !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid mobile number',
        status: 400
      });
    }

    // Update admin profile
    if (firstName) admin.firstName = firstName;
    if (lastName) admin.lastName = lastName;
    if (mobile) admin.phone = mobile;
    if (profilePicture !== undefined) admin.profilePicture = profilePicture;

    saveUsers();

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/admin/profile', isAdmin, (req, res) => {
  try {
    const admin = req.user;

    // Soft delete - set status to DELETED
    admin.status = 'DELETED';
    saveUsers();

    res.json({ message: 'Admin profile deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Notification Flag Routes
app.get('/api/notifications/flag', isAdmin, (req, res) => {
  try {
    const admin = req.user;
    // For now, return false. In a real system, this would check for unread notifications
    // You could add a hasNewNotification field to the admin user record
    const hasNewNotification = admin.hasNewNotification || false;

    res.json({ hasNewNotification });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/notifications/read-all', isAdmin, (req, res) => {
  try {
    const admin = req.user;

    // Reset notification flag
    admin.hasNewNotification = false;
    saveUsers();

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Parent Profile Routes
app.get('/parent/profile', isAuthenticated, (req, res) => {
  try {
    const parent = req.user;
    // Verify user is parent
    if (parent.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied. Parent privileges required.' });
    }

    res.json({
      parentId: parent.id,
      userId: parent.id,
      firstName: parent.firstName,
      lastName: parent.lastName,
      emailId: parent.email,
      mobile: parent.phone || null,
      address: parent.address || null,
      profilePicture: parent.profilePicture || null,
      children: parent.children || []
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/parent/profile', isAuthenticated, (req, res) => {
  try {
    const parent = req.user;
    // Verify user is parent
    if (parent.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied. Parent privileges required.' });
    }

    const { firstName, lastName, mobile, address, profilePicture } = req.body;

    // Validate mobile number if provided
    if (mobile && !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid mobile number',
        status: 400
      });
    }

    // Update parent profile
    if (firstName) parent.firstName = firstName;
    if (lastName) parent.lastName = lastName;
    if (mobile) parent.phone = mobile;
    if (address !== undefined) parent.address = address;
    if (profilePicture !== undefined) parent.profilePicture = profilePicture;

    saveUsers();

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Parent Notifications Routes
app.get('/parent/notifications', isAuthenticated, (req, res) => {
  try {
    const parent = req.user;
    // Verify user is parent
    if (parent.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied. Parent privileges required.' });
    }

    // For now, return mock notifications. In a real system, this would fetch from database
    const notifications = [
      { id: 1, title: 'Fee Due', message: 'School fees for March are due tomorrow. Please pay to avoid late fees.', time: 'Tomorrow', type: 'fee', read: false },
      { id: 2, title: 'Assignment Submitted', message: 'Math homework "Algebra Worksheet" submitted successfully.', time: '4 hours ago', type: 'assignment', read: false },
      { id: 3, title: 'Parent-Teacher Meeting', message: 'Reminder: PTM scheduled for Nov 20, 2023 from 9 AM to 12 PM.', time: '2 days ago', type: 'meeting', read: false },
    ];

    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/parent/notifications/:id/read', isAuthenticated, (req, res) => {
  try {
    const parent = req.user;
    // Verify user is parent
    if (parent.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied. Parent privileges required.' });
    }

    const { id } = req.params;

    // In a real system, this would update the notification status in database
    // For now, just return success
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/parent/notifications/read-all', isAuthenticated, (req, res) => {
  try {
    const parent = req.user;
    // Verify user is parent
    if (parent.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied. Parent privileges required.' });
    }

    // In a real system, this would mark all notifications as read in database
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Parent Password Change Route
app.put('/parent/change-password', isAuthenticated, async (req, res) => {
  try {
    const parent = req.user;
    // Verify user is parent
    if (parent.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied. Parent privileges required.' });
    }

    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isValidCurrentPassword = await verifyPassword(currentPassword, parent.password);
    if (!isValidCurrentPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    parent.password = hashedNewPassword;
    parent.isFirstLogin = false;
    saveUsers();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// OTP Routes for Signup
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, firstName, lastName, phone, password, role, staffType, rollNumber, className, designation, subject, children, relationship } = req.body;

    // Check if user already exists
    const existingUser = userDatabase.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Log OTP to console for debugging/development
    console.log(`[OTP] Generated for ${email}: ${otp}`);

    // Store OTP with user data (expires in 5 minutes)
    otpStorage[email] = {
      otp,
      userData: { firstName, lastName, email, phone, password, role, staffType, rollNumber, className, designation, subject, children, relationship },
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    };

    // For development: Always succeed and log OTP to console
    // Email sending is disabled to avoid configuration issues
    console.log(`🔐 DEVELOPMENT MODE: OTP for ${email} is: ${otp}`);
    console.log(`📧 Email sending disabled for development. Check console for OTP.`);

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.EMAIL_PASS || 'your-app-password'
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: email,
        subject: 'EduMind - Email Verification OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Verify Your Email - EduMind</h2>
            <p>Dear ${firstName} ${lastName},</p>
            <p>Your OTP for email verification is:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h1 style="color: #2563eb; font-size: 32px; margin: 0;">${otp}</h1>
            </div>
            <p>This OTP will expire in 5 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>EduMind Team</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully');
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      // In production, you might want to handle this differently
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Check if OTP exists and is valid
    const otpData = otpStorage[email];
    if (!otpData) {
      return res.status(400).json({ success: false, error: 'OTP not found or expired' });
    }

    if (Date.now() > otpData.expiresAt) {
      delete otpStorage[email];
      return res.status(400).json({ success: false, error: 'OTP expired' });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    // OTP is valid, create the user
    const userData = otpData.userData;
    const result = await createUserAndSendPassword(userData);

    // Clean up OTP
    delete otpStorage[email];

    if (result.success) {
      res.json({ success: true, message: 'User registered successfully', userId: result.userId });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify OTP' });
  }
});

// Start server
if (require.main === module) {
  (async () => {
    try {
      await connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/edumind');
      const server = app.listen(PORT, async () => {
        console.log(`EduMind Backend Server running on port ${PORT}`);
        await loadUsers();
        await loadMarks();
        await createDefaultAdmin();
        main();
      });
    } catch (err) {
      console.error('Failed to start server', err);
      process.exit(1);
    }
  })();
}

// Example usage
async function main() {
  const userData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'student',
    className: '10-A',
    rollNumber: 'STU001'
  };

  const result = await createUserAndSendPassword(userData);

  if (result.success) {
    console.log('✅ User creation completed successfully!');
    console.log('User ID:', result.userId);
    console.log('Database contents:', userDatabase);
  }
}

module.exports = {
  deleteUser,
  getUser,
  createUserAndSendPassword,
  createAdminUser,
  generateSecurePassword,
  hashPassword,
  sendPasswordEmail,
  authenticateUser,

  changePassword,
  getAllUsers,
  app,
  saveUsers,
  loadUsers
};
