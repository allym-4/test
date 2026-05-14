import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Shells
import Shell from './components/Shell'
import AdminShell from './components/AdminShell'
import StudentShell from './components/StudentShell'

// Instructor pages
import DashboardPage from './pages/DashboardPage'
import ClassesPage from './pages/ClassesPage'
import AttendancePage from './pages/AttendancePage'
import StudentsPage from './pages/StudentsPage'
import HomeworkPage from './pages/HomeworkPage'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminStudents from './pages/admin/AdminStudents'
import AdminBilling from './pages/admin/AdminBilling'
import AdminStaff from './pages/admin/AdminStaff'
import AdminTimetable from './pages/admin/AdminTimetable'
import AdminReporting from './pages/admin/AdminReporting'
import AdminBookings from './pages/admin/AdminBookings'
import AdminSeasons from './pages/admin/AdminSeasons'
import AdminWaitlist from './pages/admin/AdminWaitlist'
import AdminLeads from './pages/admin/AdminLeads'
import AdminRecommendations from './pages/admin/AdminRecommendations'
import AdminSettings from './pages/admin/AdminSettings'
import AdminMessages from './pages/admin/AdminMessages'
import AdminCommunity from './pages/admin/AdminCommunity'
import AdminAutomations from './pages/admin/AdminAutomations'
import AdminRetail from './pages/admin/AdminRetail'
import AdminLockers from './pages/admin/AdminLockers'
import AdminHelpdesk from './pages/admin/AdminHelpdesk'

// Student pages
import StudentDashboard from './pages/student/StudentDashboard'
import StudentMyClasses from './pages/student/StudentMyClasses'
import StudentBilling from './pages/student/StudentBilling'
import StudentAccount from './pages/student/StudentAccount'
import StudentProgress from './pages/student/StudentProgress'
import StudentBook from './pages/student/StudentBook'
import StudentCommunity from './pages/student/StudentCommunity'
import StudentChat from './pages/student/StudentChat'
import StudentNotifications from './pages/student/StudentNotifications'
import StudentSupport from './pages/student/StudentSupport'
import StudentStudioInfo from './pages/student/StudentStudioInfo'
import StudentHomework from './pages/student/StudentHomework'
import StudentForms from './pages/student/StudentForms'

// Instructor pages (extra)
import InstructorMessages from './pages/InstructorMessages'
import InstructorPay from './pages/InstructorPay'
import InstructorAvailability from './pages/InstructorAvailability'
import InstructorAttendance from './pages/InstructorAttendance'
import InstructorProfile from './pages/InstructorProfile'

// Login
import LoginPage from './pages/LoginPage'

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div className="spinner" />
    </div>
  )
}

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    if (user.role === 'student') return <Navigate to="/portal" replace />
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Instructor routes */}
          <Route path="/" element={<RequireAuth role="instructor"><Shell /></RequireAuth>}>
            <Route index element={<DashboardPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="classes/:id/attendance" element={<AttendancePage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="homework" element={<HomeworkPage />} />
            <Route path="attendance" element={<InstructorAttendance />} />
            <Route path="messages" element={<InstructorMessages />} />
            <Route path="pay" element={<InstructorPay />} />
            <Route path="availability" element={<InstructorAvailability />} />
            <Route path="profile" element={<InstructorProfile />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<RequireAuth role="admin"><AdminShell /></RequireAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="timetable" element={<AdminTimetable />} />
            <Route path="reporting" element={<AdminReporting />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="seasons" element={<AdminSeasons />} />
            <Route path="waitlist" element={<AdminWaitlist />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="recommendations" element={<AdminRecommendations />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="community" element={<AdminCommunity />} />
            <Route path="automations" element={<AdminAutomations />} />
            <Route path="retail" element={<AdminRetail />} />
            <Route path="lockers" element={<AdminLockers />} />
            <Route path="helpdesk" element={<AdminHelpdesk />} />
            <Route path="classes/:id/attendance" element={<AttendancePage />} />
          </Route>

          {/* Student routes */}
          <Route path="/portal" element={<RequireAuth role="student"><StudentShell /></RequireAuth>}>
            <Route index element={<StudentDashboard />} />
            <Route path="classes" element={<StudentMyClasses />} />
            <Route path="billing" element={<StudentBilling />} />
            <Route path="account" element={<StudentAccount />} />
            <Route path="progress" element={<StudentProgress />} />
            <Route path="book" element={<StudentBook />} />
            <Route path="community" element={<StudentCommunity />} />
            <Route path="chat" element={<StudentChat />} />
            <Route path="notifications" element={<StudentNotifications />} />
            <Route path="support" element={<StudentSupport />} />
            <Route path="studio" element={<StudentStudioInfo />} />
            <Route path="homework" element={<StudentHomework />} />
            <Route path="forms" element={<StudentForms />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
