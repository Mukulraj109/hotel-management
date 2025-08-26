import React, { useState, useEffect } from 'react';
import { DataTable } from '../../components/dashboard/DataTable';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { adminService } from '../../services/adminService';
import { AdminBooking, BookingFilters, BookingStats } from '../../types/admin';
import { formatCurrency, formatNumber, getStatusColor } from '../../utils/dashboardUtils';
import { format, parseISO } from 'date-fns';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Filter,
  Eye,
  Edit,
  X,
  CheckCircle,
  Clock,
  UserCheck,
  UserX
} from 'lucide-react';

export default function AdminBookings() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BookingFilters>({
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await adminService.getBookings(filters);
      setBookings(response.data.bookings);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await adminService.getBookingStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchStats();
  }, [filters]);

  // Handle status update
  const handleStatusUpdate = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show') => {
    try {
      setUpdating(true);
      await adminService.updateBooking(bookingId, { status: newStatus });
      await fetchBookings();
      await fetchStats();
    } catch (error) {
      console.error('Error updating booking status:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Handle booking cancellation
  const handleCancelBooking = async (bookingId: string, reason: string = 'Cancelled by admin') => {
    try {
      setUpdating(true);
      await adminService.cancelBooking(bookingId, reason);
      await fetchBookings();
      await fetchStats();
    } catch (error) {
      console.error('Error cancelling booking:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Table columns
  const columns = [
    {
      key: 'bookingNumber',
      header: 'Booking #',
      render: (value: string) => (
        <span className="font-mono text-sm font-medium">{value}</span>
      )
    },
    {
      key: 'userId',
      header: 'Guest',
      render: (value: any) => (
        <div>
          <div className="font-medium">{value.name}</div>
          <div className="text-sm text-gray-500">{value.email}</div>
        </div>
      )
    },
    {
      key: 'rooms',
      header: 'Rooms',
      render: (value: any[]) => (
        <div className="space-y-1">
          {value.map((room, index) => (
            <div key={index} className="text-sm">
              {room.roomId.roomNumber} ({room.roomId.type})
            </div>
          ))}
        </div>
      )
    },
    {
      key: 'checkIn',
      header: 'Check In',
      render: (value: string) => (
        <div className="text-sm">
          {format(parseISO(value), 'MMM dd, yyyy')}
        </div>
      )
    },
    {
      key: 'checkOut',
      header: 'Check Out',
      render: (value: string) => (
        <div className="text-sm">
          {format(parseISO(value), 'MMM dd, yyyy')}
        </div>
      )
    },
    {
      key: 'nights',
      header: 'Nights',
      render: (value: number) => (
        <span className="text-sm font-medium">{value}</span>
      ),
      align: 'center' as const
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (value: number, row: AdminBooking) => (
        <div className="text-sm font-medium">
          {formatCurrency(value, row.currency)}
        </div>
      ),
      align: 'right' as const
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <StatusBadge status={value} variant="pill" size="sm" />
      )
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (value: string) => (
        <StatusBadge 
          status={value} 
          variant="pill" 
          size="sm"
          className={value === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
        />
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value: any, row: AdminBooking) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedBooking(row);
              setShowDetailsModal(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'pending' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusUpdate(row._id, 'confirmed')}
                disabled={updating}
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelBooking(row._id)}
                disabled={updating}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
          {row.status === 'confirmed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusUpdate(row._id, 'checked_in')}
              disabled={updating}
            >
              <UserCheck className="h-4 w-4 text-blue-600" />
            </Button>
          )}
          {row.status === 'checked_in' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusUpdate(row._id, 'checked_out')}
              disabled={updating}
            >
              <UserX className="h-4 w-4 text-gray-600" />
            </Button>
          )}
        </div>
      ),
      align: 'center' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-gray-600">Manage all hotel bookings and reservations</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue, 'INR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.pending)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg. Booking Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.averageBookingValue, 'INR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}



      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked_in">Checked In</option>
                  <option value="checked_out">Checked Out</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={filters.paymentStatus || ''}
                  onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Payment Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={filters.source || ''}
                  onChange={(e) => setFilters({ ...filters, source: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Sources</option>
                  <option value="direct">Direct</option>
                  <option value="booking_com">Booking.com</option>
                  <option value="expedia">Expedia</option>
                  <option value="airbnb">Airbnb</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                <Input
                  type="date"
                  value={filters.checkIn || ''}
                  onChange={(e) => setFilters({ ...filters, checkIn: e.target.value || undefined, page: 1 })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookings Table */}
      <DataTable
        title="All Bookings"
        data={bookings}
        columns={columns}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search bookings..."
        pagination={true}
        pageSize={filters.limit || 10}
        emptyMessage="No bookings found"
        onRowClick={(booking) => {
          setSelectedBooking(booking);
          setShowDetailsModal(true);
        }}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ ...filters, page: Math.max(1, (filters.page || 1) - 1) });
              }}
              disabled={pagination.current === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {pagination.current} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ ...filters, page: Math.min(pagination.pages, (filters.page || 1) + 1) });
              }}
              disabled={pagination.current === pagination.pages}
            >
              Next
            </Button>
          </div>
        }
      />

      {/* Booking Details Modal */}
      {selectedBooking && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedBooking(null);
          }}
          title={`Booking Details - ${selectedBooking.bookingNumber}`}
        >
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Guest</h3>
                <p className="text-sm text-gray-900">{selectedBooking.userId.name}</p>
                <p className="text-sm text-gray-600">{selectedBooking.userId.email}</p>
                {selectedBooking.userId.phone && (
                  <p className="text-sm text-gray-600">{selectedBooking.userId.phone}</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Hotel</h3>
                <p className="text-sm text-gray-900">{selectedBooking.hotelId.name}</p>
                {selectedBooking.hotelId.address && (
                  <p className="text-sm text-gray-600">{selectedBooking.hotelId.address}</p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Check In</h3>
                <p className="text-sm text-gray-900">
                  {format(parseISO(selectedBooking.checkIn), 'EEEE, MMMM dd, yyyy')}
                </p>
                {selectedBooking.checkInTime && (
                  <p className="text-sm text-gray-600">
                    Time: {format(parseISO(selectedBooking.checkInTime), 'HH:mm')}
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Check Out</h3>
                <p className="text-sm text-gray-900">
                  {format(parseISO(selectedBooking.checkOut), 'EEEE, MMMM dd, yyyy')}
                </p>
                {selectedBooking.checkOutTime && (
                  <p className="text-sm text-gray-600">
                    Time: {format(parseISO(selectedBooking.checkOutTime), 'HH:mm')}
                  </p>
                )}
              </div>
            </div>

            {/* Rooms */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Rooms</h3>
              <div className="space-y-2">
                {selectedBooking.rooms.map((room, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{room.roomId.roomNumber}</p>
                      <p className="text-sm text-gray-600">{room.roomId.type}</p>
                    </div>
                    <p className="text-sm font-medium">
                      {formatCurrency(room.rate, selectedBooking.currency)}/night
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest Details */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Guest Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Adults</p>
                  <p className="text-sm font-medium">{selectedBooking.guestDetails.adults}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Children</p>
                  <p className="text-sm font-medium">{selectedBooking.guestDetails.children}</p>
                </div>
              </div>
              {selectedBooking.guestDetails.specialRequests && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Special Requests</p>
                  <p className="text-sm text-gray-900">{selectedBooking.guestDetails.specialRequests}</p>
                </div>
              )}
            </div>

            {/* Extras */}
            {selectedBooking.extras && selectedBooking.extras.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Extras</h3>
                <div className="space-y-2">
                  {selectedBooking.extras.map((extra, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{extra.name} (x{extra.quantity})</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(extra.price * extra.quantity, selectedBooking.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Info */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total Amount</span>
                <span className="text-lg font-bold">
                  {formatCurrency(selectedBooking.totalAmount, selectedBooking.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">Payment Status</span>
                <StatusBadge status={selectedBooking.paymentStatus} variant="pill" size="sm" />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">Booking Status</span>
                <StatusBadge status={selectedBooking.status} variant="pill" size="sm" />
              </div>
            </div>

            {/* Actions */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Created: {format(parseISO(selectedBooking.createdAt), 'MMM dd, yyyy HH:mm')}
                </div>
                <div className="flex space-x-2">
                  {selectedBooking.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          handleStatusUpdate(selectedBooking._id, 'confirmed');
                          setShowDetailsModal(false);
                        }}
                        disabled={updating}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleCancelBooking(selectedBooking._id);
                          setShowDetailsModal(false);
                        }}
                        disabled={updating}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {selectedBooking.status === 'confirmed' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleStatusUpdate(selectedBooking._id, 'checked_in');
                        setShowDetailsModal(false);
                      }}
                      disabled={updating}
                    >
                      Check In
                    </Button>
                  )}
                  {selectedBooking.status === 'checked_in' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleStatusUpdate(selectedBooking._id, 'checked_out');
                        setShowDetailsModal(false);
                      }}
                      disabled={updating}
                    >
                      Check Out
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}