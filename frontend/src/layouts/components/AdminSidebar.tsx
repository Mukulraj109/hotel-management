import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Bed, 
  Calendar, 
  Users, 
  Package, 
  BarChart3, 
  Wifi,
  ClipboardList,
  Globe,
  CreditCard,
  Wrench,
  Headphones,
  FileText,
  AlertTriangle,
  Menu,
  X,
  UserCheck
} from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Globe },
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Rooms', href: '/admin/rooms', icon: Bed },
  { name: 'Bookings', href: '/admin/bookings', icon: Calendar },
  { name: 'Corporate', href: '/admin/corporate', icon: Users },
  { name: 'Staff Management', href: '/admin/staff', icon: UserCheck },
  { name: 'Billing & Payments', href: '/admin/billing', icon: CreditCard },
  { name: 'Housekeeping', href: '/admin/housekeeping', icon: ClipboardList },
  { name: 'Maintenance', href: '/admin/maintenance', icon: Wrench },
  { name: 'Guest Services', href: '/admin/guest-services', icon: Headphones },
  { name: 'Supply Requests', href: '/admin/supply-requests', icon: FileText },
  { name: 'Inventory', href: '/admin/inventory', icon: Package },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'Bypass Checkout', href: '/admin/bypass-checkout', icon: AlertTriangle },
  { name: 'OTA Sync', href: '/admin/ota', icon: Wifi },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ isOpen = true, onClose }: AdminSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-64 
        bg-white shadow-lg lg:shadow-sm border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:min-h-full
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 lg:p-6 h-full overflow-y-auto scrollbar-custom">
          <ul className="space-y-1 lg:space-y-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  onClick={onClose} // Close mobile menu when navigating
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}