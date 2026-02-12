const fs = require('fs');
const path = require('path');

// Path to leave requests data file
const LEAVE_REQUESTS_FILE = path.join(__dirname, 'leave_requests.json');

// Function to load leave requests from file
function loadLeaveRequests() {
  try {
    if (fs.existsSync(LEAVE_REQUESTS_FILE)) {
      const data = fs.readFileSync(LEAVE_REQUESTS_FILE, 'utf8');
      return JSON.parse(data);
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error loading leave requests:', error);
    return [];
  }
}

// Function to save leave requests to file
function saveLeaveRequests(requests) {
  try {
    fs.writeFileSync(LEAVE_REQUESTS_FILE, JSON.stringify(requests, null, 2));
    console.log('Leave requests saved to file');
  } catch (error) {
    console.error('Error saving leave requests:', error);
  }
}

// Initialize leave requests array
let leaveRequests = loadLeaveRequests();

// Function to create a new leave request
function createLeaveRequest(requestData) {
  try {
    const { teacherId, teacherName, startDate, endDate, reason, leaveType } = requestData;

    const request = {
      id: Date.now().toString(),
      teacherId,
      teacherName,
      startDate,
      endDate,
      reason,
      leaveType,
      status: 'pending', // 'pending', 'approved', 'rejected'
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: null
    };

    leaveRequests.push(request);
    saveLeaveRequests(leaveRequests);

    return {
      success: true,
      requestId: request.id,
      message: 'Leave request submitted successfully'
    };

  } catch (error) {
    console.error('Error creating leave request:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to get all pending leave requests
function getPendingLeaveRequests() {
  return leaveRequests.filter(request => request.status === 'pending');
}

// Function to get all leave requests (for admin view)
function getAllLeaveRequests() {
  return leaveRequests;
}

// Function to approve a leave request
function approveLeaveRequest(requestId, adminId, adminName, note = '') {
  try {
    const request = leaveRequests.find(r => r.id === requestId);
    if (!request) {
      return {
        success: false,
        error: 'Leave request not found'
      };
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        error: 'Leave request has already been processed'
      };
    }

    request.status = 'approved';
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = adminId;
    request.reviewNote = note;

    saveLeaveRequests(leaveRequests);

    return {
      success: true,
      request,
      message: 'Leave request approved successfully'
    };

  } catch (error) {
    console.error('Error approving leave request:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to reject a leave request
function rejectLeaveRequest(requestId, adminId, adminName, note = '') {
  try {
    const request = leaveRequests.find(r => r.id === requestId);
    if (!request) {
      return {
        success: false,
        error: 'Leave request not found'
      };
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        error: 'Leave request has already been processed'
      };
    }

    request.status = 'rejected';
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = adminId;
    request.reviewNote = note;

    saveLeaveRequests(leaveRequests);

    return {
      success: true,
      request,
      message: 'Leave request rejected successfully'
    };

  } catch (error) {
    console.error('Error rejecting leave request:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to get leave requests by teacher
function getLeaveRequestsByTeacher(teacherId) {
  return leaveRequests.filter(request => request.teacherId === teacherId);
}

module.exports = {
  createLeaveRequest,
  getPendingLeaveRequests,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveRequestsByTeacher,
  loadLeaveRequests,
  saveLeaveRequests
};
