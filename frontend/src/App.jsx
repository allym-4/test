import { Component } from 'react'
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
import AdminStudentDetail from './pages/admin/AdminStudentDetail'
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
import AdminClasses from './pages/admin/AdminClasses'
import AdminPaymentPlans from './pages/admin/AdminPaymentPlans'
import AdminKisi from './pages/admin/AdminKisi'
import AdminActionLog from './pages/admin/AdminActionLog'
import AdminActivityLog from './pages/admin/AdminActivityLog'
import AdminAssistant from './pages/admin/AdminAssistant'
import AdminCategories from './pages/admin/AdminCategories'
import AdminOffers from './pages/admin/AdminOffers'
import AdminMemberships from './pages/admin/AdminMemberships'
import AdminPackages from './pages/admin/AdminPackages'
import AdminTags from './pages/admin/AdminTags'
import AdminMarketing from './pages/admin/AdminMarketing'
import AdminMediaLibrary from './pages/admin/AdminMediaLibrary'
import AdminRooms from './pages/admin/AdminRooms'
import AdminSkillLists from './pages/admin/AdminSkillLists'
import AdminStudioNotes from './pages/admin/AdminStudioNotes'
import AdminSurveys from './pages/admin/AdminSurveys'
import AdminPractice from './pages/admin/AdminPractice'

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
import StudentPractice from './pages/student/StudentPractice'

// Instructor pages (extra)
import InstructorMessages from './pages/InstructorMessages'
import InstructorPay from './pages/InstructorPay'
import InstructorAvailability from './pages/InstructorAvailability'
import InstructorAttendance from './pages/InstructorAttendance'
import InstructorProfile from './pages/InstructorProfile'
import InstructorSkills from './pages/InstructorSkills'
import InstructorNotifications from './pages/InstructorNotifications'

// Login
import LoginPage from './pages/LoginPage'

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div className="spinner" />
    </div>
  )
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#ff6666', fontFamily: 'monospace', background: '#0a0a0a', minHeight: '100dvh' }}>
          <h2 style={{ color: '#ff6666' }}>Something went wrong</h2>
          <p style={{ color: '#ccc', marginBottom: 16 }}>{this.state.error.message}</p>
          <pre style={{ fontSize: 11, color: '#888', whiteSpace: 'pre-wrap' }}>{this.state.error.stack}</pre>
          <button onClick={() => { this.setState({ error: null }); window.location.reload() }} style={{ marginTop: 20, padding: '8px 16px', background: '#ccff00', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Reload</button>
        </div>
      )
    }
    return this.props.children
  }
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
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Instructor routes */}
          <Route path="/" element={<RequireAuth role="instructor"><Shell /></RequireAuth>}>
            <Route index element={<DashboardPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="classes/:id/attendance" element={<AttendancePage />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="students/:id" element={<AdminStudentDetail />} />
            <Route path="homework" element={<HomeworkPage />} />
            <Route path="attendance" element={<InstructorAttendance />} />
            <Route path="messages" element={<InstructorMessages />} />
            <Route path="pay" element={<InstructorPay />} />
            <Route path="availability" element={<InstructorAvailability />} />
            <Route path="skills" element={<InstructorSkills />} />
            <Route path="notifications" element={<InstructorNotifications />} />
            <Route path="profile" element={<InstructorProfile />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<RequireAuth role="admin"><AdminShell /></RequireAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="students/:id" element={<AdminStudentDetail />} />
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
            <Route path="classes" element={<AdminClasses />} />
            <Route path="payment-plans" element={<AdminPaymentPlans />} />
            <Route path="kisi" element={<AdminKisi />} />
            <Route path="action-log" element={<AdminActionLog />} />
            <Route path="activity-log" element={<AdminActivityLog />} />
            <Route path="assistant" element={<AdminAssistant />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="offers" element={<AdminOffers />} />
            <Route path="memberships" element={<AdminMemberships />} />
            <Route path="packages" element={<AdminPackages />} />
            <Route path="tags" element={<AdminTags />} />
            <Route path="marketing" element={<AdminMarketing />} />
            <Route path="media" element={<AdminMediaLibrary />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="skills" element={<AdminSkillLists />} />
            <Route path="studio-notes" element={<AdminStudioNotes />} />
            <Route path="surveys" element={<AdminSurveys />} />
            <Route path="practice" element={<AdminPractice />} />
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
            <Route path="practice" element={<StudentPractice />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  )
}
