import React, { useState, useEffect } from 'react';
import PerformanceReport from './PerformanceReport';
import './ParentDashboard.css';

const ParentDashboard = () => {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [activeSection, setActiveSection] = useState('performance'); // Default to performance

  useEffect(() => {
    const fetchParentData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            fetchChildrenDetails(parsedUser);
          }
          return;
        }

        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          fetchChildrenDetails(data.user);
        }
      } catch (error) {
        console.error('Error fetching parent data:', error);
      }
    };
    fetchParentData();
  }, []);

  const fetchChildrenDetails = async (parentUser) => {
    try {
      // 2. Fetch all users to find student IDs matching the children's names
      // (Since the mock parent object currently only stores names, we need to find the real Student ID)
      const response = await fetch('http://localhost:5000/api/users');
      const data = await response.json();
      
      if (data.success && parentUser.children) {
        const students = data.users.filter(u => u.role === 'student');
        const matchedChildren = [];

        parentUser.children.forEach(child => {
          // Match student by name (First Name + Last Name OR just First Name)
          const student = students.find(s => 
            `${s.firstName} ${s.lastName}`.toLowerCase() === child.name.toLowerCase() ||
            s.firstName.toLowerCase() === child.name.toLowerCase()
          );
          
          if (student) {
            matchedChildren.push({
              id: student.id,
              name: child.name,
              grade: student.className || child.grade
            });
          }
        });

        setChildren(matchedChildren);
        // Default to the first child found
        if (matchedChildren.length > 0) {
          setSelectedChildId(matchedChildren[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching children details:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login'; // Adjust based on your routing
  };

  if (!user) return <div className="dashboard-loading">Loading Dashboard...</div>;

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="user-profile">
          <div className="avatar-circle">{user.firstName.charAt(0)}</div>
          <h3>{user.firstName} {user.lastName}</h3>
          <p className="role-badge">Parent</p>
        </div>
        <nav className="menu">
          <button 
            className={activeSection === 'performance' ? 'menu-item active' : 'menu-item'} 
            onClick={() => setActiveSection('performance')}
          >
            📊 Performance
          </button>
          <button className="menu-item" onClick={handleLogout}>
            🚪 Logout
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {activeSection === 'performance' && (
          <div className="section-content">
            <div className="section-header">
              <h1>Academic Performance</h1>
              
              {children.length > 0 && (
                <div className="child-selector">
                  <label htmlFor="child-select">Select Child:</label>
                  <select 
                    id="child-select"
                    value={selectedChildId} 
                    onChange={(e) => setSelectedChildId(e.target.value)}
                  >
                    {children.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.name} ({child.grade})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {children.length > 0 ? (
              selectedChildId && <PerformanceReport studentId={selectedChildId} />
            ) : (
              <div className="warning-box">
                <p>No student records found linked to your account. Please ensure your children are registered as Students with the exact name listed in your profile.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ParentDashboard;