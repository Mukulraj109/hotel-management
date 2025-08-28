import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { Calendar, MapPin, Users, CreditCard, Clock, CheckCircle, XCircle, AlertCircle, Filter, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { Booking } from '../../types/booking';
import toast from 'react-hot-toast';

interface BookingWithHotel extends Booking {
  hotelId: {
    _id: string;
    name: string;
    address: string;
    contact: {
      phone?: string;
      email?: string;
    };
  };
}

export default function GuestBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [user, filter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingService.getBookings({ 
        status: filter === 'all' ? undefined : filter 
      });
      
      // Ensure bookings is always an array and handle populated hotelId
      const bookingsData = response.data.bookings || [];
      setBookings(bookingsData as unknown as BookingWithHotel[]);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await bookingService.cancelBooking(bookingId, 'Cancelled by guest');
      toast.success('Booking cancelled successfully');
      fetchBookings(); // Refresh the list
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'checked_out':
        return 'text-blue-600 bg-blue-100';
      case 'no_show':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'checked_out':
        return <CheckCircle className="h-4 w-4" />;
      case 'no_show':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'refunded':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof booking.hotelId === 'object' && booking.hotelId.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      booking.guestDetails.adults.toString().includes(searchTerm) ||
      booking.guestDetails.children.toString().includes(searchTerm);
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-gray-600 mt-2">Manage and view all your hotel bookings</p>
          </div>
          <Button onClick={() => window.location.href = '/'}>
            <Calendar className="h-4 w-4 mr-2" />
            Book New Room
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {['all', 'pending', 'confirmed', 'checked_out', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === tab
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings by number, hotel, or guests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          {filteredBookings.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {filter === 'all' ? 'No bookings found' : `No ${filter.replace('_', ' ')} bookings`}
                </h3>
                <p className="text-gray-600 mb-4">
                  {filter === 'all' 
                    ? 'You haven\'t made any bookings yet. Start your journey by booking a room!'
                    : `You don't have any ${filter.replace('_', ' ')} bookings at the moment.`
                  }
                </p>
                {filter === 'all' && (
                  <Button onClick={() => window.location.href = '/'}>
                    Browse Rooms
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            filteredBookings.map((booking) => (
              <Card key={booking._id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  {/* Booking Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Booking #{booking.bookingNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {typeof booking.hotelId === 'object' && booking.hotelId.name 
                            ? booking.hotelId.name 
                            : `Hotel #${booking.hotelId}`
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {getStatusIcon(booking.status)}
                          <span className="ml-1 capitalize">{booking.status.replace('_', ' ')}</span>
                        </div>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getPaymentStatusColor(booking.paymentStatus)}`}>
                          <CreditCard className="h-3 w-3 mr-1" />
                          <span className="capitalize">{booking.paymentStatus}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Check-in</p>
                          <p className="font-medium">{formatDate(booking.checkIn)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Check-out</p>
                          <p className="font-medium">{formatDate(booking.checkOut)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Guests</p>
                          <p className="font-medium">
                            {booking.guestDetails.adults + booking.guestDetails.children} 
                            ({booking.guestDetails.adults} adults, {booking.guestDetails.children} children)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Total Amount</p>
                          <p className="font-medium">₹{formatCurrency(booking.totalAmount)}</p>
                        </div>
                      </div>
                    </div>

                    {booking.guestDetails.specialRequests && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500">Special Requests:</p>
                        <p className="text-sm text-gray-700">{booking.guestDetails.specialRequests}</p>
                      </div>
                    )}

                    {typeof booking.hotelId === 'object' && booking.hotelId.contact && (
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {booking.hotelId.contact.phone && (
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {booking.hotelId.contact.phone}
                          </span>
                        )}
                        {booking.hotelId.contact.email && (
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {booking.hotelId.contact.email}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 mt-4 lg:mt-0 lg:ml-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/app/bookings/${booking._id}`, '_blank')}
                      className="flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    
                    {booking.status === 'confirmed' && new Date(booking.checkIn) > new Date() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelBooking(booking._id)}
                        className="flex items-center text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Booking
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}