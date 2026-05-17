import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import MainLayout from './components/layout/MainLayout';
import RequireRole from './components/routing/RequireRole';
import RoleRedirect from './components/routing/RoleRedirect';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import CourseDetail from './pages/CourseDetail';
import AssignmentDetailManage from './pages/AssignmentDetailManage';
import LessonViewer from './pages/LessonViewer';
import CourseEnroll from './pages/CourseEnroll';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminCourses from './pages/admin/Courses';
import AdminCourseEditor from './pages/admin/CourseEditor';
import AdminSubmissions from './pages/admin/Submissions';
import AdminCourseAnalytics from './pages/admin/CourseAnalytics';

// Instructor
import InstructorCourses from './pages/instructor/Courses';
import CourseEditor from './pages/instructor/CourseEditor';
import Assignments from './pages/instructor/Assignments';
import Submissions from './pages/instructor/Submissions';
import Gradebook from './pages/instructor/Gradebook';
import TeachingAnalytics from './pages/instructor/TeachingAnalytics';

// Student
import BrowseCourses from './pages/student/BrowseCourses';
import MyCourses from './pages/student/MyCourses';
import AssignmentView from './pages/student/AssignmentView';
import StudentGradebook from './pages/student/StudentGradebook';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<RoleRedirect />} />
            
            <Route element={<MainLayout />}>
              <Route path="/profile" element={<Profile />} />
            </Route>

            <Route element={<RequireRole roles={['ADMIN']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/courses" element={<AdminCourses />} />
              <Route path="/admin/analytics" element={<AdminCourseAnalytics />} />
              <Route path="/admin/courses/new" element={<AdminCourseEditor />} />
              <Route path="/admin/courses/:id/edit" element={<AdminCourseEditor />} />
              <Route path="/admin/courses/:id/enroll" element={<CourseEnroll />} />
              <Route path="/admin/courses/:courseId/lessons/:lessonId" element={<LessonViewer />} />
              <Route path="/admin/courses/:courseId/submissions/:assignmentId" element={<AdminSubmissions />} />
              <Route path="/admin/courses/:courseId/assignments/:assignmentId" element={<AssignmentDetailManage />} />
              <Route path="/admin/courses/:id" element={<CourseDetail />} />
            </Route>

            <Route element={<RequireRole roles={['INSTRUCTOR']} />}>
              <Route path="/instructor/courses" element={<InstructorCourses />} />
              <Route path="/instructor/analytics" element={<TeachingAnalytics />} />
              <Route path="/instructor/courses/new" element={<CourseEditor />} />
              <Route path="/instructor/courses/:id" element={<CourseDetail />} />
              <Route path="/instructor/courses/:id/edit" element={<CourseEditor />} />
              <Route path="/instructor/courses/:id/enroll" element={<CourseEnroll />} />
              <Route path="/instructor/courses/:courseId/lessons/:lessonId" element={<LessonViewer />} />
              <Route path="/instructor/courses/:courseId/assignments" element={<Assignments />} />
              <Route path="/instructor/courses/:courseId/assignments/:assignmentId" element={<AssignmentDetailManage />} />
              <Route path="/instructor/courses/:courseId/submissions/:assignmentId" element={<Submissions />} />
              <Route path="/instructor/courses/:courseId/gradebook" element={<Gradebook />} />
            </Route>

            <Route element={<RequireRole roles={['STUDENT']} />}>
              <Route path="/student/browse" element={<BrowseCourses />} />
              <Route path="/student/my-courses" element={<MyCourses />} />
              <Route path="/student/performance" element={<StudentGradebook />} />
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
