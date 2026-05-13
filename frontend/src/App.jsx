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
import AdminStub from './pages/admin/AdminStub'

// Student pages
import StudentDashboard from './pages/student/StudentDashboard'
import StudentMyClasses from './pages/student/StudentMyClasses'
import StudentBilling from './pages/student/StudentBilling'
import StudentAccount from './pages/student/StudentAccount'
import StudentProgress from './pages/student/StudentProgress'
import StudentStub from './pages/student/StudentStub'

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
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<RequireAuth role="admin"><AdminShell /></RequireAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="timetable" element={<AdminTimetable />} />
            <Route path="reporting" element={<AdminReporting />} />
            <Route path="classes/:id/attendance" element={<AttendancePage />} />
            <Route path="*" element={<AdminStub />} />
          </Route>

          {/* Student routes */}
          <Route path="/portal" element={<RequireAuth role="student"><StudentShell /></RequireAuth>}>
            <Route index element={<StudentDashboard />} />
            <Route path="classes" element={<StudentMyClasses />} />
            <Route path="billing" element={<StudentBilling />} />
            <Route path="account" element={<StudentAccount />} />
            <Route path="progress" element={<StudentProgress />} />
            <Route path="*" element={<StudentStub />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
