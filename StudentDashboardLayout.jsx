import React, { useState } from 'react';
import {
  LayoutDashboard,
  Clock,
  GraduationCap,
  Calendar,
  ClipboardList,
  CreditCard,
  Bell,
  User,
  Menu,
  LogOut,
} from 'lucide-react';

const StudentDashboardLayout = ({ children, activePage = 'Dashboard', onNavigate }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studentName, setStudentName] = useState('Alex Johnson');
  const [profileImage, setProfileImage] = useState(null);

  const menuItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Attendance', label: 'Attendance', icon: Clock },
    { id: 'Marks/Results', label: 'Marks/Results', icon: GraduationCap },
    { id: 'Timetable', label: 'Timetable', icon: Calendar },
    { id: 'Assignments', label: 'Assignments', icon: ClipboardList },
    { id: 'Fee & Payments', label: 'Fee & Payments', icon: CreditCard },
    { id: 'Notifications', label: 'Notifications', icon: Bell },
    { id: 'Profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-gray-800 overflow-hidden">
      {/* Left Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out shadow-sm ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-4 flex items-center justify-center gap-3">
          <img
            src="/assets/logo.png"
            alt="EduMind Logo"
            className="h-32 w-auto max-w-full object-contain cursor-pointer"
            onClick={() => onNavigate && onNavigate('Dashboard')}
          />
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activePage === item.id}
              onClick={() => onNavigate && onNavigate(item.id)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            className="flex items-center gap-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full p-3 rounded-xl transition-colors duration-200 font-medium"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)}></div>}

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:ml-64 flex flex-col h-screen">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex justify-between items-center px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{activePage === 'Dashboard' ? 'Student Dashboard' : activePage}</h1>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-400 hover:text-indigo-600 transition-colors">
              <Bell size={28} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button type="button" className="flex items-center gap-3 pl-6 border-l border-gray-100 hover:bg-gray-50 rounded-lg -ml-2 p-2 transition-colors z-20 relative">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-gray-900">{studentName}</p>
                <p className="text-xs text-gray-500 font-medium">Grade 10 - Section A</p>
              </div>
              <img
                src={profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=c7d2fe&color=3730a3`}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
              />
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-100">
          {children}
        </main>
      </div>
    </div>
  );
};

// Helper Components
const NavItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group w-full ${active ? 'bg-sky-50 text-sky-600 font-bold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}
  >
    <span className="flex-1 text-left">{label}</span>
  </button>
);

export default StudentDashboardLayout;
