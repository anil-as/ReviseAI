import { BrowserRouter, Routes, Route } from "react-router-dom";
import ToastProvider from "./components/Toast";

// Auth
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Guards
import ProtectedRoute from "./components/ProtectedRoute";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import SubjectsPage from "./pages/student/SubjectsPage";
import TopicListPage from "./pages/student/TopicListPage";
import AssessmentPage from "./pages/student/AssessmentPage";
import EnrollPage from "./pages/student/EnrollPage";

// Instructor pages
import InstructorDashboard from "./pages/instructor/InstructorDashboard";
import ManageSubjectsPage from "./pages/instructor/ManageSubjectsPage";
import ManageTopicsPage from "./pages/instructor/ManageTopicsPage";
import EnrollmentRequestsPage from "./pages/instructor/EnrollmentRequestsPage";
import AnalyticsPage from "./pages/instructor/AnalyticsPage";

// Shared pages
import ProfilePage from "./pages/ProfilePage";
import ChatPage from "./pages/ChatPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student */}
          <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/subjects" element={<ProtectedRoute role="student"><SubjectsPage /></ProtectedRoute>} />
          <Route path="/student/subjects/:subjectId/topics" element={<ProtectedRoute role="student"><TopicListPage /></ProtectedRoute>} />
          <Route path="/student/assessment/:topicId" element={<ProtectedRoute role="student"><AssessmentPage /></ProtectedRoute>} />
          <Route path="/student/enroll" element={<ProtectedRoute role="student"><EnrollPage /></ProtectedRoute>} />

          {/* Instructor */}
          <Route path="/instructor" element={<ProtectedRoute role="instructor"><InstructorDashboard /></ProtectedRoute>} />
          <Route path="/instructor/subjects" element={<ProtectedRoute role="instructor"><ManageSubjectsPage /></ProtectedRoute>} />
          <Route path="/instructor/subjects/:subjectId/topics" element={<ProtectedRoute role="instructor"><ManageTopicsPage /></ProtectedRoute>} />
          <Route path="/instructor/enrollments" element={<ProtectedRoute role="instructor"><EnrollmentRequestsPage /></ProtectedRoute>} />
          <Route path="/instructor/analytics" element={<ProtectedRoute role="instructor"><AnalyticsPage /></ProtectedRoute>} />

          {/* Shared (any authenticated role) */}
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/chat/:subjectId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
