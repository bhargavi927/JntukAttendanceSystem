import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import { AuthProvider } from './contexts/AuthContext';
import mainImage from './jntukimages/mainimage.jpg';
import RequireAuth from './components/RequireAuth';
import AppLayout from './components/AppLayout';
import RequireProfessor from './components/RequireProfessor';
import RequireVerifiedProfessor from './components/RequireVerifiedProfessor';
import RequireVerifiedStudent from './components/RequireVerifiedStudent';
import './App.css';

// Lazy Load Pages
const StudHome = React.lazy(() => import('./pages/StudHome'));
const StudProfilePage = React.lazy(() => import('./pages/StudProfilePage'));
const StudUploadAttendence = React.lazy(() => import('./pages/StudUploadAttendence'));
const StudAttendanceRegisterDetailss = React.lazy(() => import('./pages/StudAttendanceRegisterDetailss'));
const StudAttendanceRegister = React.lazy(() => import('./pages/StudAttendanceRegister'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const StudLMSFiles = React.lazy(() => import('./pages/StudLMSFiles'));
const StudLMSDetails = React.lazy(() => import('./pages/StudLMSDetails'));

const ProfessorHome = React.lazy(() => import('./pages/ProfessorHome'));
const ProfProfilePage = React.lazy(() => import('./pages/ProfProfilePage'));
const ProfPermissions = React.lazy(() => import('./pages/ProfPermissions'));
const ReviewAttendance = React.lazy(() => import('./pages/ReviewAttendance'));
const ProfLMSFiles = React.lazy(() => import('./pages/ProfLMSFiles'));
const AdminSetUserRole = React.lazy(() => import('./pages/AdminSetUserRole'));
const ProfAttendanceRegister = React.lazy(() => import('./pages/ProfAttendanceRegister'));

// Loading Fallback Component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f8faf5]">
    <div className="text-xl font-semibold text-emerald-700 animate-pulse">Loading...</div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Login/Signup pages in centered box with background image */}
          <Route path="/" element={
            <div
              className="relative min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${mainImage})` }}
            >
              <div className="absolute inset-0 bg-[#f8faf5]/80" />
              <div className="relative w-full max-w-md mx-4">
                <LoginForm />
              </div>
            </div>
          } />

          {/* App pages with global Home navbar */}
          <Route element={<AppLayout />}>
            {/* Home page (replaces Dashboard page) */}
            <Route path="/home" element={<StudHome />} />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <StudProfilePage />
                </RequireAuth>
              }
            />

            <Route
              path="/lms"
              element={
                <RequireVerifiedStudent>
                  <StudLMSDetails />
                </RequireVerifiedStudent>
              }
            />

            {/* Attendance pages from Home navbar */}
            <Route
              path="/attendance/upload"
              element={
                <RequireVerifiedStudent>
                  <StudUploadAttendence />
                </RequireVerifiedStudent>
              }
            />
            <Route
              path="/attendance/check"
              element={
                <RequireVerifiedStudent>
                  <StudAttendanceRegisterDetailss />
                </RequireVerifiedStudent>
              }
            />

            <Route
              path="/attendance/register"
              element={
                <RequireVerifiedStudent>
                  <StudAttendanceRegister />
                </RequireVerifiedStudent>
              }
            />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route
              path="/studlmsfiles"
              element={
                <RequireVerifiedStudent>
                  <StudLMSFiles />
                </RequireVerifiedStudent>
              }
            />
            <Route path="/admin/set-user-role" element={<AdminSetUserRole />} />
          </Route>

          {/* ProfessorHome route WITHOUT AppLayout/HomeNavbar */}
          <Route
            path="/professor/home"
            element={
              <RequireProfessor>
                <ProfessorHome />
              </RequireProfessor>
            }
          />
          <Route
            path="/professor/profile"
            element={
              <RequireProfessor>
                <ProfProfilePage />
              </RequireProfessor>
            }
          />
          <Route
            path="/professor/permissions"
            element={
              <RequireVerifiedProfessor>
                <ProfPermissions />
              </RequireVerifiedProfessor>
            }
          />
          <Route
            path="/professor/review-attendance"
            element={
              <RequireVerifiedProfessor>
                <ReviewAttendance />
              </RequireVerifiedProfessor>
            }
          />

          <Route
            path="/professor/lecture-materials"
            element={
              <RequireProfessor>
                <ProfLMSFiles />
              </RequireProfessor>
            }
          />
          <Route
            path="/professor/proflmsfiles"
            element={
              <RequireProfessor>
                <ProfLMSFiles />
              </RequireProfessor>
            }
          />
          <Route
            path="/professor/attendance-register"
            element={
              <RequireVerifiedProfessor>
                <ProfAttendanceRegister />
              </RequireVerifiedProfessor>
            }
          />

          {/* Back-compat */}
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider >
  );
}

export default App;
