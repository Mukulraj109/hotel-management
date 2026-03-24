import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Mail,
  Key,
  Edit,
  MessageSquare,
  Percent,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import BookingKeyGenerator from '../../components/ui/BookingKeyGenerator';
import BookingModificationModal from '../../components/ui/BookingModificationModal';
import BookingConversationModal from '../../components/ui/BookingConversationModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

// Helper function to check if booking has price adjustments
const hasPriceAdjustments = (booking: BookingWithHotel) => {
  return booking.priceAdjustments && booking.priceAdjustments.length > 0 &&
         booking.priceAdjustments.some(adj => !adj.isReversed);
};

// Helper function to calculate total discount/surcharge
const calculateAdjustmentAmount = (booking: BookingWithHotel) => {
  const discount = booking.discountAmount || 0;
  const surcharge = booking.surchargeAmount || 0;
  return discount - surcharge; // Positive = discount, Negative = surcharge
};

// Helper function to calculate savings percentage
const calculateSavingsPercentage = (booking: BookingWithHotel) => {
  const original = booking.originalAmount || booking.totalAmount;
  const adjustment = calculateAdjustmentAmount(booking);
  if (original === 0) return 0;
  return Math.round((adjustment / original) * 100);
};

export default function GuestBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');
  const [showKeyGenerator, setShowKeyGenerator] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithHotel | null>(null);
  const [showModificationModal, setShowModificationModal] = useState(false);
  const [selectedModificationBooking, setSelectedModificationBooking] = useState<BookingWithHotel | null>(null);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [selectedConversationBooking, setSelectedConversationBooking] = useState<BookingWithHotel | null>(null);

  // Use React Query for data fetching
  const { data: bookings = [], isLoading: loading, error } = useQuery({
    queryKey: ['bookings', 'user', user?._id],
    queryFn: async () => {
      const response = await bookingService.getUserBookings();
      // Handle the actual API response structure
      const bookingsData = response.data?.bookings || response.data || [];
      if (Array.isArray(bookingsData)) {
        return bookingsData as unknown as BookingWithHotel[];
      } else {
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });

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
      
      // Invalidate queries to refresh data immediately
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      toast.success('Booking cancelled successfully');
    } catch (error: unknown) {
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const handleGenerateKey = (booking: BookingWithHotel) => {
    setSelectedBooking(booking);
    setShowKeyGenerator(true);
  };

  const handleKeyGeneratorClose = () => {
    setShowKeyGenerator(false);
    setSelectedBooking(null);
  };

  const handleKeyGeneratorSuccess = () => {
    // Refresh data after successful key generation
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['digital-keys'] });
  };

  const handleRequestModification = (booking: BookingWithHotel) => {
    setSelectedModificationBooking(booking);
    setShowModificationModal(true);
  };

  const handleModificationModalClose = () => {
    setShowModificationModal(false);
    setSelectedModificationBooking(null);
  };

  const handleModificationSuccess = () => {
    // Refresh data after successful modification request
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  const handleStartConversation = (booking: BookingWithHotel) => {
    setSelectedConversationBooking(booking);
    setShowConversationModal(true);
  };

  const handleConversationModalClose = () => {
    setShowConversationModal(false);
    setSelectedConversationBooking(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
        <p className="text-gray-600 text-sm sm:text-base">Manage your hotel reservations and view booking history</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
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
                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
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
          {filteredBookings.map((booking) => {
            // ENHANCED: Add visual indicator for discounted bookings
            const hasDiscount = hasPriceAdjustments(booking) && calculateAdjustmentAmount(booking) > 0;
            const hasSurcharge = hasPriceAdjustments(booking) && calculateAdjustmentAmount(booking) < 0;

            return (
              <Card
                key={booking._id}
                className={`overflow-hidden transition-all duration-200 ${
                  hasDiscount
                    ? 'border-l-4 border-l-green-500 shadow-lg hover:shadow-xl'
                    : hasSurcharge
                    ? 'border-l-4 border-l-red-500 shadow-lg hover:shadow-xl'
                    : 'hover:shadow-md'
                }`}
              >
              <div className="p-4 sm:p-6">
                {/* Booking Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3 sm:gap-0">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                        {booking.hotelId?.name || 'Hotel'}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${getStatusColor(booking.status)}`}>
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
                  <div className="text-left sm:text-right">
                    {/* ENHANCED: Show price adjustment indicators */}
                    {hasPriceAdjustments(booking) && (
                      <div className="mb-2 space-y-1">
                        {/* Original price with strikethrough */}
                        <div className="flex items-center justify-start sm:justify-end gap-2">
                          <span className="text-sm text-gray-500 line-through">
                            {formatCurrency(booking.originalAmount || booking.totalAmount, booking.currency)}
                          </span>
                          {/* Discount/Surcharge badge */}
                          {calculateAdjustmentAmount(booking) > 0 ? (
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"
                              title={`Discount applied: ${booking.priceAdjustments?.filter(adj => !adj.isReversed).map(adj => adj.reason).join(', ')}`}
                            >
                              <TrendingDown className="w-3 h-3 mr-1" />
                              {calculateSavingsPercentage(booking)}% OFF
                            </span>
                          ) : calculateAdjustmentAmount(booking) < 0 ? (
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"
                              title={`Surcharge applied: ${booking.priceAdjustments?.filter(adj => !adj.isReversed).map(adj => adj.reason).join(', ')}`}
                            >
                              <TrendingUp className="w-3 h-3 mr-1" />
                              +{Math.abs(calculateSavingsPercentage(booking))}%
                            </span>
                          ) : null}
                        </div>

                        {/* Savings amount */}
                        {booking.discountAmount && booking.discountAmount > 0 && (
                          <div className="text-sm font-medium text-green-600 flex items-center justify-start sm:justify-end gap-1">
                            <Percent className="w-3 h-3" />
                            You Save {formatCurrency(booking.discountAmount, booking.currency)}
                          </div>
                        )}

                        {/* Surcharge amount */}
                        {booking.surchargeAmount && booking.surchargeAmount > 0 && (
                          <div className="text-sm font-medium text-red-600 flex items-center justify-start sm:justify-end gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Additional {formatCurrency(booking.surchargeAmount, booking.currency)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Current total price */}
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">
                      {formatCurrency(booking.totalAmount, booking.currency)}
                    </div>

                    {/* Payment status badge */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${getPaymentStatusColor(booking.paymentStatus)}`}>
                      <CreditCard className="w-3 h-3 mr-1" />
                      {booking.paymentStatus === 'paid' ? 'Paid' : booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Booking Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4">
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
                      <div key={room.roomId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 rounded-lg p-3 gap-2 sm:gap-0">
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

                {/* ENHANCED: Price Adjustments Details */}
                {hasPriceAdjustments(booking) && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Percent className="w-4 h-4 text-yellow-600" />
                      Price Adjustments
                    </h4>
                    <div className="space-y-2">
                      {booking.priceAdjustments
                        ?.filter(adj => !adj.isReversed)
                        .map((adjustment, index) => (
                          <div
                            key={adjustment._id || index}
                            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg p-3 ${
                              adjustment.amount < 0
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                            }`}
                          >
                            <div className="flex items-start gap-2 mb-2 sm:mb-0">
                              {adjustment.amount < 0 ? (
                                <TrendingDown className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              ) : (
                                <TrendingUp className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                              )}
                              <div>
                                <p className={`text-sm font-medium ${
                                  adjustment.amount < 0 ? 'text-green-900' : 'text-red-900'
                                }`}>
                                  {adjustment.reason || (adjustment.amount < 0 ? 'Discount Applied' : 'Surcharge Applied')}
                                </p>
                                {adjustment.adjustedAt && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Applied on {formatDate(adjustment.adjustedAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className={`text-sm font-semibold ${
                              adjustment.amount < 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {adjustment.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(adjustment.amount), booking.currency)}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 gap-3 sm:gap-0">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Booked on {formatDate(booking.createdAt)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* View Details button - always visible */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/guest/bookings/${booking._id}`)}
                      className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>

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

                    {/* Request Changes button for eligible bookings */}
                    {['pending', 'confirmed'].includes(booking.status) &&
                     new Date(booking.checkIn) > new Date() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRequestModification(booking)}
                        className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Request Changes
                      </Button>
                    )}

                    {/* Contact Hotel button - available for all bookings */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartConversation(booking)}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Contact Hotel
                    </Button>

                    {/* Generate Digital Key button for confirmed bookings */}
                    {['confirmed', 'checked_in'].includes(booking.status) &&
                     new Date(booking.checkOut) > new Date() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateKey(booking)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <Key className="w-4 h-4 mr-1" />
                        Digital Key
                      </Button>
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
            );
          })}
        </div>
      )}

      {/* Digital Key Generator Modal */}
      {showKeyGenerator && selectedBooking && (
        <BookingKeyGenerator
          booking={{
            _id: selectedBooking._id,
            bookingNumber: selectedBooking.bookingNumber,
            roomId: {
              number: selectedBooking.rooms[0]?.roomId?.roomNumber || '101',
              type: selectedBooking.rooms[0]?.roomId?.type || 'Standard',
              floor: '1'
            },
            hotelId: {
              name: selectedBooking.hotelId.name,
              address: selectedBooking.hotelId.address ? 
                `${selectedBooking.hotelId.address.street}, ${selectedBooking.hotelId.address.city}, ${selectedBooking.hotelId.address.state}` : 
                'Hotel Address'
            },
            checkIn: selectedBooking.checkIn,
            checkOut: selectedBooking.checkOut,
            status: selectedBooking.status,
            guest: {
              name: selectedBooking.guestDetails.firstName + ' ' + selectedBooking.guestDetails.lastName,
              email: selectedBooking.guestDetails.email
            }
          }}
          onClose={handleKeyGeneratorClose}
          onSuccess={handleKeyGeneratorSuccess}
        />
      )}

      {/* Booking Modification Modal */}
      {showModificationModal && selectedModificationBooking && (
        <BookingModificationModal
          booking={{
            _id: selectedModificationBooking._id,
            bookingNumber: selectedModificationBooking.bookingNumber,
            checkIn: selectedModificationBooking.checkIn,
            checkOut: selectedModificationBooking.checkOut,
            totalAmount: selectedModificationBooking.totalAmount,
            currency: selectedModificationBooking.currency,
            guestDetails: selectedModificationBooking.guestDetails,
            nights: selectedModificationBooking.nights,
            status: selectedModificationBooking.status
          }}
          isOpen={showModificationModal}
          onClose={handleModificationModalClose}
          onSuccess={handleModificationSuccess}
        />
      )}

      {/* Booking Conversation Modal */}
      {showConversationModal && selectedConversationBooking && (
        <BookingConversationModal
          booking={{
            _id: selectedConversationBooking._id,
            bookingNumber: selectedConversationBooking.bookingNumber,
            checkIn: selectedConversationBooking.checkIn,
            checkOut: selectedConversationBooking.checkOut,
            status: selectedConversationBooking.status
          }}
          isOpen={showConversationModal}
          onClose={handleConversationModalClose}
        />
      )}
    </div>
  );
}