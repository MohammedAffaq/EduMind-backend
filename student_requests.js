const fs = require('fs');
const path = require('path');

// Path to student requests data file
const REQUESTS_FILE = path.join(__dirname, 'student_requests.json');

// Function to load requests from file
function loadRequests() {
  try {
    if (fs.existsSync(REQUESTS_FILE)) {
      const data = fs.readFileSync(REQUESTS_FILE, 'utf8');
      return JSON.parse(data);
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error loading requests:', error);
    return [];
  }
}

// Function to save requests to file
function saveRequests(requests) {
  try {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));
    console.log('Requests saved to file');
  } catch (error) {
    console.error('Error saving requests:', error);
  }
}

// Initialize requests array
let studentRequests = loadRequests();

// Function to create a new student request
function createStudentRequest(requestData, userDatabase, saveUsers) {
  try {
    const { teacherId, teacherName, type, studentData, reason } = requestData;

    const request = {
      id: Date.now().toString(),
      teacherId,
      teacherName,
      type, // 'add' or 'delete'
      studentData, // For add: { firstName, lastName, email, phone, rollNumber, className }
                  // For delete: { studentId, reason }
      reason,
      status: 'pending', // 'pending', 'approved', 'rejected'
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: null
    };

    studentRequests.push(request);
    saveRequests(studentRequests);

    // For add requests, create a pending student record
    if (type === 'add') {
      // Check if student already exists
      const existingStudent = userDatabase.find(user =>
        user.email.toLowerCase() === studentData.email.toLowerCase() ||
        (user.firstName === studentData.firstName && user.lastName === studentData.lastName && user.role === 'student')
      );

      if (existingStudent) {
        return {
          success: false,
          error: 'Student with this email or name already exists'
        };
      }

      // Create pending student record
      const pendingStudent = {
        id: request.id, // Use request ID as temporary user ID
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        email: studentData.email,
        phone: studentData.phone,
        role: 'student',
        rollNumber: studentData.rollNumber,
        className: studentData.className,
        status: 'pending', // Pending admin approval
        createdAt: new Date().toISOString(),
        teacherId: teacherId,
        requestId: request.id
      };

      userDatabase.push(pendingStudent);
      saveUsers();
    }

    return {
      success: true,
      requestId: request.id,
      message: 'Student request submitted successfully'
    };

  } catch (error) {
    console.error('Error creating student request:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to get all pending requests
function getPendingRequests() {
  return studentRequests.filter(request => request.status === 'pending');
}

// Function to get all requests (for admin view)
function getAllRequests() {
  return studentRequests;
}

// Function to approve a request
function approveRequest(requestId, adminId, adminName, note = '') {
  try {
    const request = studentRequests.find(r => r.id === requestId);
    if (!request) {
      return {
        success: false,
        error: 'Request not found'
      };
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        error: 'Request has already been processed'
      };
    }

    request.status = 'approved';
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = adminId;
    request.reviewNote = note;

    saveRequests(studentRequests);

    return {
      success: true,
      request,
      message: 'Request approved successfully'
    };

  } catch (error) {
    console.error('Error approving request:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to reject a request
function rejectRequest(requestId, adminId, adminName, note = '') {
  try {
    const request = studentRequests.find(r => r.id === requestId);
    if (!request) {
      return {
        success: false,
        error: 'Request not found'
      };
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        error: 'Request has already been processed'
      };
    }

    request.status = 'rejected';
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = adminId;
    request.reviewNote = note;

    saveRequests(studentRequests);

    return {
      success: true,
      request,
      message: 'Request rejected successfully'
    };

  } catch (error) {
    console.error('Error rejecting request:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to get requests by teacher
function getRequestsByTeacher(teacherId) {
  return studentRequests.filter(request => request.teacherId === teacherId);
}

module.exports = {
  createStudentRequest,
  getPendingRequests,
  getAllRequests,
  approveRequest,
  rejectRequest,
  getRequestsByTeacher,
  loadRequests,
  saveRequests
};
