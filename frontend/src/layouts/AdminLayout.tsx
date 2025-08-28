import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminHeader from './components/AdminHeader';
import AdminSidebar from './components/AdminSidebar';

export default function AdminLayout() {
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <AdminHeader />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 p-6 overflow-auto scrollbar-custom">
          <Outlet />
        </main>
      </div>
    </div>
  );
}