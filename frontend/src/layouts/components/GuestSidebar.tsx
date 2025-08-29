import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, User, MessageSquare, Globe, Star, ConciergeBell, Bell, Key, Users, CreditCard } from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Globe },
  { name: 'Dashboard', href: '/app', icon: Home },
  { name: 'My Bookings', href: '/app/bookings', icon: Calendar },
  { name: 'Billing & Payments', href: '/app/billing', icon: CreditCard },
  { name: 'Loyalty', href: '/app/loyalty', icon: Star },
  { name: 'Hotel Services', href: '/app/services', icon: ConciergeBell },
  { name: 'Notifications', href: '/app/notifications', icon: Bell },
  { name: 'Digital Keys', href: '/app/keys', icon: Key },
  { name: 'Meet-Ups', href: '/app/meet-ups', icon: Users },
  { name: 'Profile', href: '/app/profile', icon: User },
  { name: 'Requests', href: '/app/requests', icon: MessageSquare },
];

export default function GuestSidebar() {
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