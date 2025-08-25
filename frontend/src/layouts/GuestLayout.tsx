import React from 'react';
import { Outlet } from 'react-router-dom';
import GuestHeader from './components/GuestHeader';
import GuestSidebar from './components/GuestSidebar';

export default function GuestLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <GuestHeader />
      <div className="flex">
        <GuestSidebar />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}