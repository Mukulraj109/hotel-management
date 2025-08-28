import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { Booking } from '../../types/booking';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Download,
  Phone,
  Mail
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

// Extended interface for bookings with populated hotel data
interface BookingWithHotel extends Omit<Booking, 'hotelId'> {
  hotelId: {
    _id: string;
    name: string;
    address?: {
      street: string;
      city: string;
      state: string;
    };
    contact?: {
      phone: string;
      email: string;
    };
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'checked_in': return 'bg-blue-100 text-blue-800';
    case 'checked_out': return 'bg-gray-100 text-gray-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'no_show': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'failed': return 'bg-red-100 text-red-800';
    case 'refunded': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'confirmed': return <CheckCircle className="w-4 h-4" />;
    case 'pending': return <Clock className="w-4 h-4" />;
    case 'checked_in': return <CheckCircle className="w-4 h-4" />;
    case 'checked_out': return <CheckCircle className="w-4 h-4" />;
    case 'cancelled': return <XCircle className="w-4 h-4" />;
    case 'no_show': return <AlertCircle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

export default function GuestBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingService.getUserBookings();
      // Handle the actual API response structure
      const bookingsData = response.data?.bookings || response.data || [];
      if (Array.isArray(bookingsData)) {
        setBookings(bookingsData as unknown as BookingWithHotel[]);
      } else {
        console.error('Unexpected response format:', response);
        setBookings([]);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') {
      return ['confirmed', 'pending'].includes(booking.status) && 
             new Date(booking.checkIn) > new Date();
    }
    if (filter === 'active') {
      return ['checked_in'].includes(booking.status);
    }
    if (filter === 'past') {
      return ['checked_out'].includes(booking.status) || 
             new Date(booking.checkOut) < new Date();
    }
    if (filter === 'cancelled') {
      return ['cancelled', 'no_show'].includes(booking.status);
    }
    return booking.status === filter;
  });

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      await bookingService.cancelBooking(bookingId);
      toast.success('Booking cancelled successfully');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
        <p className="text-gray-600">Manage your hotel reservations and view booking history</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'all', label: 'All Bookings', count: bookings.length },
              { id: 'upcoming', label: 'Upcoming', count: bookings.filter(b => ['confirmed', 'pending'].includes(b.status) && new Date(b.checkIn) > new Date()).length },
              { id: 'active', label: 'Active', count: bookings.filter(b => b.status === 'checked_in').length },
              { id: 'past', label: 'Past', count: bookings.filter(b => b.status === 'checked_out' || new Date(b.checkOut) < new Date()).length },
              { id: 'cancelled', label: 'Cancelled', count: bookings.filter(b => ['cancelled', 'no_show'].includes(b.status)).length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  filter === tab.id
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
          <p className="text-gray-500 mb-4">
            {filter === 'all' 
              ? "You haven't made any bookings yet." 
              : `No ${filter} bookings found.`}
          </p>
          <Button 
            onClick={() => window.location.href = '/rooms'}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Browse Rooms
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredBookings.map((booking) => (
            <Card key={booking._id} className="overflow-hidden">
              <div className="p-6">
                {/* Booking Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {booking.hotelId?.name || 'Hotel'}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1 capitalize">{booking.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      Booking #{booking.bookingNumber}
                    </p>
                    {booking.hotelId?.address && (
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="w-4 h-4 mr-1" />
                        {booking.hotelId.address.street}, {booking.hotelId.address.city}, {booking.hotelId.address.state}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(booking.totalAmount, booking.currency)}
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
                      <CreditCard className="w-3 h-3 mr-1" />
                      {booking.paymentStatus === 'paid' ? 'Paid' : booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Booking Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                  {/* Check-in/out */}
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Check-in</p>
                      <p className="text-sm text-gray-600">{formatDate(booking.checkIn)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Check-out</p>
                      <p className="text-sm text-gray-600">{formatDate(booking.checkOut)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Guests</p>
                      <p className="text-sm text-gray-600">
                        {booking.guestDetails.adults} adults
                        {booking.guestDetails.children > 0 && `, ${booking.guestDetails.children} children`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rooms */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Rooms ({booking.rooms.length})</h4>
                  <div className="space-y-2">
                    {booking.rooms.map((room, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Room {room.roomId?.roomNumber || index + 1} - {room.roomId?.type || 'Standard'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {booking.nights} nights × {formatCurrency(room.rate, booking.currency)}/night
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(room.rate * booking.nights, booking.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Requests */}
                {booking.guestDetails.specialRequests && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Special Requests</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {booking.guestDetails.specialRequests}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Booked on {formatDate(booking.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {booking.hotelId?.contact && (
                      <>
                        {booking.hotelId.contact.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`tel:${booking.hotelId.contact!.phone}`)}
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            Call Hotel
                          </Button>
                        )}
                        {booking.hotelId.contact.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`mailto:${booking.hotelId.contact!.email}`)}
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Email Hotel
                          </Button>
                        )}
                      </>
                    )}
                    
                    {/* Cancel button for eligible bookings */}
                    {['pending', 'confirmed'].includes(booking.status) && 
                     new Date(booking.checkIn) > new Date(Date.now() + 24 * 60 * 60 * 1000) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelBooking(booking._id)}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}