import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import HeaderNav from '../components/HeaderNav';
import ProfilePage from './ProfilePage';
import UploadAttendence from './UploadAttendence';
import PDFsPage from './PDFsPage';

export default function StudentDashboard() {
  const location = useLocation();
  const isProfile = location.pathname.endsWith('/profile');
  const isAttendance = location.pathname.endsWith('/attendance');

  return (
    <div className="w-full min-h-screen bg-[#f8faf5]">
      <HeaderNav title={isProfile ? 'Student Profile' : isAttendance ? 'Upload Attendance' : 'JNTUK Dashboard'} />
      <div className={`flex items-start ${isAttendance ? 'justify-start p-0' : 'justify-center p-6'} min-h-[calc(100vh-80px)]`}>
        <div className={`w-full ${isAttendance ? 'max-w-none' : 'max-w-2xl'}`}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/attendance" element={<UploadAttendence />} />
            <Route path="/pdfs" element={<PDFsPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
