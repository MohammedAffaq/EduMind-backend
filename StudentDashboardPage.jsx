import React, { useState } from 'react';
import StudentDashboardLayout from './StudentDashboardLayout';
import {
  TrendingUp,
  ClipboardList,
  GraduationCap,
  CreditCard,
  Calendar as CalendarIcon,
  BookOpen,
  MessageSquare,
  FileText,
  Bell,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';

const StudentDashboardPage = ({ onNavigate }) => {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [recentActivities, setRecentActivities] = useState([
    { id: 1, title: "New Assignment Posted", time: "History Essay due Friday" },
    { id: 2, title: "Grade Updated", time: "Science Quiz: 92%" },
    { id: 3, title: "Parent-Teacher Meeting", time: "Scheduled for tomorrow" }
  ]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const getEventsForDay = (day, month, year) => {
    const events = [];
    // Mock events
    if (day === 15) events.push({ type: 'exam', title: "Mid-term Exam" });
    if (day === 20) events.push({ type: 'assignment', title: "Assignment Due" });
    if (day === 5) events.push({ type: 'event', title: "Sports Day" });

    return events;
  };

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const clearActivities = () => {
    setRecentActivities([]);
  };

  return (
    <StudentDashboardLayout activePage="Dashboard" onNavigate={onNavigate}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, Alex Johnson!</h2>
          <div className="flex flex-wrap gap-4 mt-6">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              View Timetable
            </button>
            <button className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
              Submit Assignment
            </button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            icon={<TrendingUp className="text-green-600" />}
            label="Attendance %"
            value="95%"
            trend="+2%"
          />
          <KPICard
            icon={<ClipboardList className="text-orange-600" />}
            label="Upcoming Assignments"
            value="3"
            trend="Due soon"
          />
          <KPICard
            icon={<GraduationCap className="text-purple-600" />}
            label="Latest Result / GPA"
            value="3.8"
            trend="+0.2"
          />
          <KPICard
            icon={<CreditCard className="text-red-600" />}
            label="Fee Payment Status"
            value="$50"
            trend="Due"
          />
        </div>

        {/* Below KPI Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
            <div className="space-y-4">
              <QuickActionButton icon={<CalendarIcon size={20} />} label="View Timetable" description="Check your daily schedule" />
              <QuickActionButton icon={<BookOpen size={20} />} label="Submit Assignment" description="Upload completed work" />
              <QuickActionButton icon={<MessageSquare size={20} />} label="Message Teacher" description="Contact your teachers" />
            </div>
          </div>

          {/* Calendar Widget */}
          <div className="bg-white p-6 rounded-2xl shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Monthly Calendar</h3>
              <div className="flex items-center gap-2">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <span className="text-lg font-semibold text-gray-900 w-32 text-center">{months[calendarDate.getMonth()]} {calendarDate.getFullYear()}</span>
                <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronRight size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before start of month */}
              {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2"></div>
              ))}

              {/* Days of the month */}
              {Array.from({ length: getDaysInMonth(calendarDate) }, (_, i) => {
                const day = i + 1;
                const events = getEventsForDay(day, calendarDate.getMonth(), calendarDate.getFullYear());
                const isToday = new Date().toDateString() === new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).toDateString();

                let bgClass = 'hover:bg-gray-50 text-gray-700';
                if (isToday) bgClass = 'bg-indigo-100 text-indigo-700 font-bold border border-indigo-200';
                else if (events.some(e => e.type === 'exam')) bgClass = 'bg-info-50 text-info font-medium';
                else if (events.some(e => e.type === 'assignment')) bgClass = 'bg-orange-50 text-orange-700 font-medium';

                return (
                  <div
                    key={day}
                    className={`p-2 h-10 flex items-center justify-center text-sm rounded-lg transition-colors cursor-pointer relative group ${bgClass}`}
                  >
                    {day}
                    {events.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-current opacity-50"></div>
                    )}
                    {events.length > 0 && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-max max-w-[150px] bg-gray-800 text-white text-xs rounded py-1 px-2 shadow-lg">
                        {events.map((e, idx) => <div key={idx}>{e.title}</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-info rounded-full"></div>
                <span className="text-gray-600">Exams</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-gray-600">Assignments</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
            {recentActivities.length > 0 && (
              <button onClick={clearActivities} className="text-sm text-red-500 hover:text-red-700 font-medium">Clear All</button>
            )}
          </div>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {recentActivities.length > 0 ? (
              recentActivities.map(activity => (
                <EventItem key={activity.id} title={activity.title} time={activity.time} />
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">No recent activity.</p>
            )}
          </div>
        </div>
      </div>
    </StudentDashboardLayout>
  );
};

// Helper Components
const KPICard = ({ icon, label, value, trend }) => {
  const getTrendColor = (trend) => {
    if (trend.includes('+')) return 'text-green-600';
    if (trend.includes('-')) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl bg-gray-50">{icon}</div>
        <span className={`text-sm font-semibold ${getTrendColor(trend)}`}>{trend}</span>
      </div>
      <h4 className="text-gray-600 text-sm mb-2">{label}</h4>
      <h2 className="text-2xl font-bold text-gray-900">{value}</h2>
    </div>
  );
};

const QuickActionButton = ({ icon, label, description }) => (
  <button className="w-full text-left p-4 bg-gray-50 rounded-xl hover:bg-gray-100 hover:shadow-md transition-all duration-200 group">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 bg-white rounded-lg group-hover:bg-gray-100 transition-colors">
        {icon}
      </div>
      <span className="font-semibold text-gray-900">{label}</span>
    </div>
    <p className="text-sm text-gray-600 ml-11">{description}</p>
  </button>
);

const EventItem = ({ title, time }) => (
  <div className="border-l-4 border-sky-500 pl-4">
    <h4 className="text-gray-900 font-semibold">{title}</h4>
    <p className="text-gray-600 text-sm mt-1">{time}</p>
  </div>
);

export default StudentDashboardPage;
