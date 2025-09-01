import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AlertTriangle, User, Home, Calendar, CreditCard, FileText, CheckCircle } from 'lucide-react';
import { adminBypassService, CheckedInBooking, AdminBypassRequest } from '../../services/adminBypassService';
import { LoadingSpinner } from '../LoadingSpinner';

const AdminBypassCheckout: React.FC = () => {
  const [bookings, setBookings] = useState<CheckedInBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<CheckedInBooking | null>(null);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'bank_transfer'>('cash');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await adminBypassService.getCheckedInBookings();
      setBookings(response.data.bookings);
      setError(null);
    } catch (err: any) {
      setError('Failed to fetch bookings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBypassCheckout = async (booking: CheckedInBooking) => {
    if (!notes.trim()) {
      alert('Please enter notes explaining the reason for bypass checkout');
      return;
    }

    try {
      setProcessing(booking._id);
      setError(null);

      const bypassData: AdminBypassRequest = {
        bookingId: booking._id,
        notes: notes.trim(),
        paymentMethod
      };

      await adminBypassService.bypassCheckout(bypassData);
      
      setSuccess(`✅ Admin bypass checkout completed successfully for ${booking.guest.name}`);
      setSelectedBooking(null);
      setNotes('');
      
      // Refresh the bookings list
      fetchBookings();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
      
    } catch (err: any) {
      setError('Failed to process bypass checkout: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const openBypassModal = (booking: CheckedInBooking) => {
    setSelectedBooking(booking);
    setNotes('');
    setPaymentMethod('cash');
    setError(null);
  };

  const closeBypassModal = () => {
    setSelectedBooking(null);
    setNotes('');
    setError(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div>
              <h2 className="text-lg font-semibold text-yellow-800">Admin Bypass Checkout</h2>
              <p className="text-sm text-yellow-700">
                Emergency checkout option that bypasses the normal inventory check process.
                Use only for special cases and always provide detailed notes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800">{success}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Checked-in Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Checked-in Bookings ({bookings.length})</span>
            <Button onClick={fetchBookings} size="sm" variant="outline">
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Home className="mx-auto h-12 w-12 mb-3 text-gray-400" />
              <p>No checked-in bookings available for bypass checkout</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking._id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {booking.guest.name}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Home className="h-4 w-4 mr-1" />
                              Room {booking.room.number} ({booking.room.type})
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {booking.nights} night{booking.nights !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center">
                              <CreditCard className="h-4 w-4 mr-1" />
                              ${booking.totalAmount}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Booking: {booking.bookingNumber} | {booking.guest.email}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          {booking.checkoutInventory ? (
                            <Badge
                              variant={
                                booking.checkoutInventory.status === 'paid'
                                  ? 'default'
                                  : booking.checkoutInventory.status === 'completed'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {booking.checkoutInventory.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline">No Checkout</Badge>
                          )}
                          
                          {booking.canBypassCheckout && (
                            <Button
                              onClick={() => openBypassModal(booking)}
                              disabled={processing === booking._id}
                              variant="destructive"
                              size="sm"
                            >
                              {processing === booking._id ? 'Processing...' : 'Bypass Checkout'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bypass Confirmation Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              Confirm Bypass Checkout
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p><strong>Guest:</strong> {selectedBooking.guest.name}</p>
                <p><strong>Room:</strong> {selectedBooking.room.number}</p>
                <p><strong>Booking:</strong> {selectedBooking.bookingNumber}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Reason for Bypass (Required)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter detailed reason for bypassing normal checkout process..."
                  className="w-full p-3 border border-gray-300 rounded-md resize-none h-24"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Explain why normal inventory checkout cannot be completed
                </p>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  onClick={() => handleBypassCheckout(selectedBooking)}
                  disabled={!notes.trim() || processing === selectedBooking._id}
                  variant="destructive"
                  className="flex-1"
                >
                  {processing === selectedBooking._id ? 'Processing...' : 'Confirm Bypass'}
                </Button>
                <Button
                  onClick={closeBypassModal}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBypassCheckout;