import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Users,
  Bed,
  ClipboardList,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Grid,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProperty } from '../../context/PropertyContext';
import { api } from '../../services/api';

interface QuickStat {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  link?: string;
}

export default function FrontDeskDashboard() {
  const { user } = useAuth();
  const { selectedProperty } = useProperty();

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['frontdesk-dashboard-stats', selectedProperty?._id],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/stats', {
        params: { hotelId: selectedProperty?._id }
      });
      return response.data;
    },
    enabled: !!selectedProperty
  });

  // Fetch pending approvals count
  const { data: pendingApprovalsData } = useQuery({
    queryKey: ['pending-approvals-count'],
    queryFn: async () => {
      const response = await api.get('/api/approvals', {
        params: { status: 'pending' }
      });
      return response.data;
    },
    refetchInterval: 60000,
    enabled: !!user,
  });

  const pendingApprovalCount = pendingApprovalsData?.data?.approvals?.length || 0;

  const quickStats: QuickStat[] = [
    {
      label: 'Total Bookings',
      value: stats?.totalBookings || 0,
      icon: Calendar,
      color: 'blue',
      link: '/frontdesk/bookings'
    },
    {
      label: 'Today\'s Arrivals',
      value: stats?.todayArrivals || 0,
      icon: Users,
      color: 'green',
      link: '/frontdesk/upcoming-bookings'
    },
    {
      label: 'Available Rooms',
      value: stats?.availableRooms || 0,
      icon: Bed,
      color: 'purple',
      link: '/frontdesk/rooms'
    },
    {
      label: 'Pending Approvals',
      value: pendingApprovalCount,
      icon: FileCheck,
      color: 'yellow',
      link: '/frontdesk/my-approvals'
    }
  ];

  const quickActions = [
    {
      title: 'Tape Chart',
      description: 'View room availability',
      icon: Grid,
      link: '/frontdesk/tape-chart',
      color: 'blue'
    },
    {
      title: 'Upcoming Arrivals',
      description: 'Manage check-ins',
      icon: Clock,
      link: '/frontdesk/upcoming-bookings',
      color: 'green'
    },
    {
      title: 'Housekeeping',
      description: 'Room status updates',
      icon: ClipboardList,
      link: '/frontdesk/housekeeping',
      color: 'purple'
    },
    {
      title: 'Guest Services',
      description: 'Handle guest requests',
      icon: CheckCircle,
      link: '/frontdesk/guest-services',
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Front Desk Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {user?.name}! Here's your overview for today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          const bgColor = {
            blue: 'bg-blue-500',
            green: 'bg-green-500',
            purple: 'bg-purple-500',
            yellow: 'bg-yellow-500',
            orange: 'bg-orange-500'
          }[stat.color];

          return (
            <Link
              key={stat.label}
              to={stat.link || '#'}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {isLoading ? '...' : stat.value}
                  </p>
                </div>
                <div className={`${bgColor} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pending Approvals Alert */}
      {pendingApprovalCount > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                You have {pendingApprovalCount} pending approval request{pendingApprovalCount > 1 ? 's' : ''}
              </p>
              <Link
                to="/frontdesk/my-approvals"
                className="text-sm text-yellow-700 underline hover:text-yellow-900"
              >
                View all requests
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const bgColor = {
              blue: 'bg-blue-100',
              green: 'bg-green-100',
              purple: 'bg-purple-100',
              yellow: 'bg-yellow-100',
              orange: 'bg-orange-100'
            }[action.color];

            const iconColor = {
              blue: 'text-blue-600',
              green: 'text-green-600',
              purple: 'text-purple-600',
              yellow: 'text-yellow-600',
              orange: 'text-orange-600'
            }[action.color];

            return (
              <Link
                key={action.title}
                to={action.link}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all hover:scale-105"
              >
                <div className={`${bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Schedule</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Check-ins</p>
                <p className="text-sm text-gray-600">{stats?.todayArrivals || 0} guests arriving</p>
              </div>
            </div>
            <Link
              to="/frontdesk/upcoming-bookings"
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              View →
            </Link>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Check-outs</p>
                <p className="text-sm text-gray-600">{stats?.todayDepartures || 0} guests departing</p>
              </div>
            </div>
            <Link
              to="/frontdesk/bookings"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View →
            </Link>
          </div>

          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center">
              <ClipboardList className="h-5 w-5 text-purple-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Active Bookings</p>
                <p className="text-sm text-gray-600">{stats?.activeBookings || 0} current guests</p>
              </div>
            </div>
            <Link
              to="/frontdesk/bookings"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              View →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
