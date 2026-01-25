import React from 'react';
import { Outlet } from 'react-router-dom';
import HomeNavbar from './HomeNavbar';
import StudentFooter from './StudentFooter';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#f8faf5] flex flex-col">
      <HomeNavbar />
      <div className="flex-grow">
        <Outlet />
      </div>
      <StudentFooter />
    </div>
  );
}
