import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Calendar, User, MessageSquare, Globe, Star, ConciergeBell, Bell, Key, Users, CreditCard, LogOut, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navigation = [
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
  { name: 'Inventory Requests', href: '/app/inventory-requests', icon: Package },
];

const publicNavigation = [
  { name: 'Public Website', href: '/', icon: Globe },
  { name: 'Logout', href: '#', icon: LogOut },
];

export default function GuestSidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handlePublicWebsiteClick = () => {
    // Navigate to public website without logging out
    // Use React Router navigation
    navigate('/', { replace: true });
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <nav className="p-6">
                 {/* Dashboard Navigation */}
         <div className="mb-6">
           <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
             Dashboard
           </h3>
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
        </div>

        {/* Public Website Navigation */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Public Website
          </h3>
          <ul className="space-y-2">
            <li>
              <button
                onClick={handlePublicWebsiteClick}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors w-full text-left"
              >
                <Globe className="h-5 w-5" />
                <span>Public Website</span>
              </button>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors w-full text-left"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
}