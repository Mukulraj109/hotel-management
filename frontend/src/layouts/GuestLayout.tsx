import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import GuestHeader from './components/GuestHeader';
import GuestSidebar from './components/GuestSidebar';

export default function GuestLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GuestHeader onMenuToggle={toggleMobileMenu} />
      <div className="flex">
        <GuestSidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:ml-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}