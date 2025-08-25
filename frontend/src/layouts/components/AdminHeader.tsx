import React from 'react';
import { Bell, User, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export default function AdminHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.role === 'admin' ? 'Admin Dashboard' : 'Staff Dashboard'}
        </h1>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-md text-gray-500 hover:bg-gray-100">
            <Bell className="h-5 w-5" />
          </button>
          
          <button className="p-2 rounded-md text-gray-500 hover:bg-gray-100">
            <Settings className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <div className="h-8 w-8 bg-gray-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </div>
          
          <Button variant="ghost" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}