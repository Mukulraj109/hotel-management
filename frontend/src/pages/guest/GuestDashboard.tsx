import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { Booking } from '../../types/booking';
import { 
  Calendar, 
  CreditCard, 
  MapPin, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Users,
  Star
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { RoomServiceWidget } from '../../components/guest/RoomServiceWidget';

interface BookingStats {
  totalBookings: number;
  upcomingBookings: number;
  totalSpent: number;
  loyaltyPoints: number;
  recentBookings: Booking[];
}

export default function GuestDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<BookingStats>({
    totalBookings: 0,
    upcomingBookings: 0,
    totalSpent: 0,
    loyaltyPoints: 0,
    recentBookings: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await bookingService.getUserBookings({ limit: 5 });
      const bookings = Array.isArray(response.data?.bookings) ? response.data.bookings : 
                      Array.isArray(response.data) ? response.data : [];
      
      // Calculate stats from bookings
      const totalBookings = bookings.length;
      const upcomingBookings = bookings.filter(b => 
        ['confirmed', 'pending', 'checked_in'].includes(b.status) && 
        (new Date(b.checkIn) > new Date() || 
         (new Date(b.checkIn) <= new Date() && new Date(b.checkOut) > new Date()))
      ).length;
      const totalSpent = bookings
        .filter(b => b.paymentStatus === 'paid')
        .reduce((total, booking) => total + booking.totalAmount, 0);

      setStats({
        totalBookings,
        upcomingBookings,
        totalSpent,
        loyaltyPoints: user?.loyalty?.points || 0,
        recentBookings: bookings.slice(0, 5)
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setStats({
        totalBookings: 0,
        upcomingBookings: 0,
        totalSpent: 0,
        loyaltyPoints: user?.loyalty?.points || 0,
        recentBookings: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600">
          Manage your bookings and explore your loyalty benefits
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalBookings}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Upcoming</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.upcomingBookings}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats.totalSpent)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Loyalty Points</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.loyaltyPoints}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Bookings</h2>
            <button 
              onClick={() => window.location.href = '/guest/bookings'}
              className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
            >
              View All
            </button>
          </div>

          {stats.recentBookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <p className="text-gray-500">No bookings yet</p>
              <button 
                onClick={() => window.location.href = '/rooms'}
                className="mt-2 text-yellow-600 hover:text-yellow-700 text-sm font-medium"
              >
                Browse Rooms
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentBookings.map((booking) => (
                <div key={booking._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{booking.hotelId?.name || 'Hotel'}</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                    </p>
                    <p className="text-xs text-gray-500">#{booking.bookingNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(booking.totalAmount, booking.currency)}
                    </p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : booking.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Loyalty Program */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Loyalty Status</h2>
          
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mb-4">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 capitalize mb-1">
              {user?.loyalty?.tier || 'Bronze'} Member
            </h3>
            <p className="text-gray-600">{stats.loyaltyPoints} points</p>
          </div>

          {/* Loyalty Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress to next tier</span>
              <span className="text-sm font-medium text-gray-900">
                {Math.min(stats.loyaltyPoints % 1000, 1000)}/1000
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full" 
                style={{ width: `${Math.min((stats.loyaltyPoints % 1000) / 1000 * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Benefits */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Your Benefits</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Member-only rates and discounts
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Priority customer support
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Earn points on every stay
              </li>
              {(user?.loyalty?.tier === 'silver' || user?.loyalty?.tier === 'gold' || user?.loyalty?.tier === 'platinum') && (
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Complimentary room upgrades
                </li>
              )}
              {(user?.loyalty?.tier === 'gold' || user?.loyalty?.tier === 'platinum') && (
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Late checkout privileges
                </li>
              )}
              {user?.loyalty?.tier === 'platinum' && (
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Exclusive platinum benefits
                </li>
              )}
            </ul>
          </div>
        </Card>
      </div>

      {/* Room Service Section - Only show if user has an active booking */}
      {stats.upcomingBookings > 0 && (
        <div className="mt-8">
          <RoomServiceWidget 
            guestId={user?._id}
            bookingId={stats.recentBookings.find(b => 
              ['confirmed', 'pending', 'checked_in'].includes(b.status) && 
              new Date(b.checkOut) > new Date()
            )?._id}
            onRequestService={(serviceType, items) => {
              console.log('Service requested:', serviceType, items);
              // Handle service request here - could integrate with booking system
            }}
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/rooms'}
              className="flex items-center justify-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <Calendar className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="font-medium text-yellow-700">Book a Room</span>
            </button>
            <button
              onClick={() => window.location.href = '/guest/bookings'}
              className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-700">My Bookings</span>
            </button>
            <button
              onClick={() => window.location.href = '/contact'}
              className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Users className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-medium text-green-700">Contact Support</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}