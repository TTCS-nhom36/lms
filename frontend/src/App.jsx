import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Profile from './pages/Profile';
import CourseDetail from './pages/CourseDetail';
import LessonViewer from './pages/LessonViewer';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminCourses from './pages/admin/Courses';

// Instructor
import InstructorDashboard from './pages/instructor/Dashboard';
import CourseEditor from './pages/instructor/CourseEditor';
import Assignments from './pages/instructor/Assignments';
import Submissions from './pages/instructor/Submissions';
import Gradebook from './pages/instructor/Gradebook';

// Student
import StudentDashboard from './pages/student/Dashboard';
import BrowseCourses from './pages/student/BrowseCourses';
import MyCourses from './pages/student/MyCourses';
import AssignmentView from './pages/student/AssignmentView';

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const routes = { ADMIN: '/admin/dashboard', INSTRUCTOR: '/instructor/dashboard', STUDENT: '/student/dashboard' };
  return <Navigate to={routes[user.role] || '/login'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RoleRedirect />} />

            {/* Shared layout */}
            <Route element={<MainLayout />}>
              <Route path="/profile" element={<Profile />} />

              {/* Admin */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/courses" element={<AdminCourses />} />
              <Route path="/admin/courses/:id" element={<CourseDetail />} />

              {/* Instructor */}
              <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
              <Route path="/instructor/courses" element={<InstructorDashboard />} />
              <Route path="/instructor/courses/new" element={<CourseEditor />} />
              <Route path="/instructor/courses/:id/edit" element={<CourseEditor />} />
              <Route path="/instructor/courses/:courseId/assignments" element={<Assignments />} />
              <Route path="/instructor/courses/:courseId/submissions/:assignmentId" element={<Submissions />} />
              <Route path="/instructor/courses/:courseId/gradebook" element={<Gradebook />} />

              {/* Student */}
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/browse" element={<BrowseCourses />} />
              <Route path="/student/my-courses" element={<MyCourses />} />
              <Route path="/student/courses/:id" element={<CourseDetail />} />
              <Route path="/student/courses/:courseId/lessons/:lessonId" element={<LessonViewer />} />
              <Route path="/student/assignments/:id" element={<AssignmentView />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
