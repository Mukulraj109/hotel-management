import React from 'react';
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
  Globe
} from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Globe },
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Rooms', href: '/admin/rooms', icon: Bed },
  { name: 'Bookings', href: '/admin/bookings', icon: Calendar },
  { name: 'Housekeeping', href: '/admin/housekeeping', icon: ClipboardList },
  { name: 'Inventory', href: '/admin/inventory', icon: Package },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'OTA Sync', href: '/admin/ota', icon: Wifi },
];

export default function AdminSidebar() {
  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <nav className="p-6">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}