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
import WalkInBooking from './WalkInBooking';
import { 
  Calendar, 
  Coins, 
  Users, 
  TrendingUp, 
  Filter,
  Eye,
  Edit,
  X,
  CheckCircle,
  Clock,
  UserCheck,
  UserX,
  Plus,
  Search,
  Home,
  User,
  UserPlus,
  Building
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
  
  // Manual booking form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    hotelId: '68ad76f62e0857c9bd2f65d0',
    userId: '',
    roomIds: [] as string[],
    checkIn: '',
    checkOut: '',
    guestDetails: {
      adults: 1,
      children: 0,
      specialRequests: ''
    },
    totalAmount: 0,
    currency: 'INR',
    paymentStatus: 'pending' as 'pending' | 'paid',
    status: 'pending' as 'pending' | 'confirmed'
  });

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await adminService.getBookings(filters);
      // Handle both possible response structures
      const bookingsData = response.data?.bookings || response.data || [];
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await adminService.getBookingStats();
      setStats(response.data?.stats || response.data || null);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(null);
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

  // Fetch available rooms
  const fetchAvailableRooms = async (hotelId: string, checkIn: string, checkOut: string) => {
    try {
      const response = await adminService.getAvailableRooms(hotelId, checkIn, checkOut);
      setAvailableRooms(response.data.rooms);
    } catch (error) {
      console.error('Error fetching available rooms:', error);
      setAvailableRooms([]);
    }
  };

  // Fetch users for guest selection
  const fetchUsers = async (search: string = '') => {
    try {
      const response = await adminService.getUsers({ search, role: 'guest' });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  // Handle create booking form submission
  const handleCreateBooking = async () => {
    try {
      setCreating(true);
      await adminService.createBooking(createForm);
      
      // Reset form and close modal
      setCreateForm({
        hotelId: '68ad76f62e0857c9bd2f65d0',
        userId: '',
        roomIds: [],
        checkIn: '',
        checkOut: '',
        guestDetails: {
          adults: 1,
          children: 0,
          specialRequests: ''
        },
        totalAmount: 0,
        currency: 'INR',
        paymentStatus: 'pending',
        status: 'pending'
      });
      setShowCreateModal(false);
      
      // Refresh bookings and stats
      await fetchBookings();
      await fetchStats();
    } catch (error) {
      console.error('Error creating booking:', error);
    } finally {
      setCreating(false);
    }
  };

  // Calculate total amount when rooms or dates change
  const calculateTotalAmount = () => {
    if (!createForm.checkIn || !createForm.checkOut || createForm.roomIds.length === 0) {
      return 0;
    }

    const checkInDate = new Date(createForm.checkIn);
    const checkOutDate = new Date(createForm.checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const selectedRooms = availableRooms.filter(room => createForm.roomIds.includes(room._id));
    const roomsTotal = selectedRooms.reduce((total, room) => total + (room.currentRate || 0), 0);
    
    return roomsTotal * nights;
  };

  // Update total amount when form changes
  useEffect(() => {
    const totalAmount = calculateTotalAmount();
    setCreateForm(prev => ({ ...prev, totalAmount }));
  }, [createForm.roomIds, createForm.checkIn, createForm.checkOut, availableRooms]);

  // Fetch available rooms when dates change
  useEffect(() => {
    if (createForm.hotelId && createForm.checkIn && createForm.checkOut) {
      fetchAvailableRooms(createForm.hotelId, createForm.checkIn, createForm.checkOut);
    }
  }, [createForm.hotelId, createForm.checkIn, createForm.checkOut]);

  // Fetch users when user search changes
  useEffect(() => {
    fetchUsers(userSearch);
  }, [userSearch]);

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
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setShowWalkInModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Walk-in Booking
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Booking
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
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
                  <Coins className="h-6 w-6 text-green-600" />
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
                {selectedBooking.hotelId.address && typeof selectedBooking.hotelId.address === 'object' && (
                  <p className="text-sm text-gray-600">
                    {selectedBooking.hotelId.address.street}, {selectedBooking.hotelId.address.city}, {selectedBooking.hotelId.address.state}
                  </p>
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
                        variant="ghost"
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

      {/* Create New Booking Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateForm({
            hotelId: '68ad76f62e0857c9bd2f65d0',
            userId: '',
            roomIds: [],
            checkIn: '',
            checkOut: '',
            guestDetails: {
              adults: 1,
              children: 0,
              specialRequests: ''
            },
            totalAmount: 0,
            currency: 'INR',
            paymentStatus: 'pending',
            status: 'pending'
          });
          setAvailableRooms([]);
          setUsers([]);
          setUserSearch('');
        }}
        title="Create New Booking"
        size="lg"
      >
        <div className="space-y-6">
          {/* Step 1: Guest Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Guest Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Guest
                </label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search guest by name or email"
                    className="pl-10"
                  />
                </div>
              </div>

              {users.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Guest
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md">
                    {users.map((user) => (
                      <div
                        key={user._id}
                        className={`p-3 cursor-pointer border-b border-gray-200 last:border-b-0 hover:bg-gray-50 ${
                          createForm.userId === user._id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                        onClick={() => setCreateForm(prev => ({ ...prev, userId: user._id }))}
                      >
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="font-medium text-sm">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                            {user.phone && (
                              <div className="text-xs text-gray-500">{user.phone}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Date Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Booking Dates</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in Date
                </label>
                <Input
                  type="date"
                  value={createForm.checkIn}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, checkIn: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out Date
                </label>
                <Input
                  type="date"
                  value={createForm.checkOut}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, checkOut: e.target.value }))}
                  min={createForm.checkIn || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Step 3: Room Selection */}
          {availableRooms.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Available Rooms</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableRooms.map((room) => (
                  <div
                    key={room._id}
                    className={`p-3 border rounded-lg cursor-pointer ${
                      createForm.roomIds.includes(room._id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => {
                      setCreateForm(prev => ({
                        ...prev,
                        roomIds: prev.roomIds.includes(room._id)
                          ? prev.roomIds.filter(id => id !== room._id)
                          : [...prev.roomIds, room._id]
                      }));
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center">
                          <Home className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="font-medium">Room {room.roomNumber}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {room.type} • Floor {room.floor}
                        </div>
                        {room.amenities && room.amenities.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {room.amenities.slice(0, 3).join(', ')}
                            {room.amenities.length > 3 && ` +${room.amenities.length - 3} more`}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(room.currentRate || 0, 'INR')}/night
                        </div>
                        <div className="text-xs text-gray-500">
                          Max {room.maxOccupancy} guests
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Guest Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Guest Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adults
                </label>
                <Input
                  type="number"
                  min="1"
                  value={createForm.guestDetails.adults}
                  onChange={(e) => setCreateForm(prev => ({
                    ...prev,
                    guestDetails: { ...prev.guestDetails, adults: parseInt(e.target.value) || 1 }
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Children
                </label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.guestDetails.children}
                  onChange={(e) => setCreateForm(prev => ({
                    ...prev,
                    guestDetails: { ...prev.guestDetails, children: parseInt(e.target.value) || 0 }
                  }))}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Requests
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
                value={createForm.guestDetails.specialRequests}
                onChange={(e) => setCreateForm(prev => ({
                  ...prev,
                  guestDetails: { ...prev.guestDetails, specialRequests: e.target.value }
                }))}
                placeholder="Any special requests or notes..."
              />
            </div>
          </div>

          {/* Step 6: Booking Configuration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Booking Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Booking Status
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={createForm.status}
                  onChange={(e) => setCreateForm(prev => ({ 
                    ...prev, 
                    status: e.target.value as 'pending' | 'confirmed' 
                  }))}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={createForm.paymentStatus}
                  onChange={(e) => setCreateForm(prev => ({ 
                    ...prev, 
                    paymentStatus: e.target.value as 'pending' | 'paid' 
                  }))}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Total Amount Summary */}
          {createForm.totalAmount > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-lg font-medium">
                <span>Total Amount</span>
                <span className="text-blue-600">
                  {formatCurrency(createForm.totalAmount, createForm.currency)}
                </span>
              </div>
              {createForm.checkIn && createForm.checkOut && (
                <div className="text-sm text-gray-600 mt-1">
                  {Math.ceil((new Date(createForm.checkOut).getTime() - new Date(createForm.checkIn).getTime()) / (1000 * 60 * 60 * 24))} nights • {createForm.roomIds.length} room{createForm.roomIds.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBooking}
              disabled={creating || !createForm.hotelId || !createForm.userId || createForm.roomIds.length === 0 || !createForm.checkIn || !createForm.checkOut}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {creating ? 'Creating...' : 'Create Booking'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Walk-in Booking Modal */}
      <WalkInBooking
        isOpen={showWalkInModal}
        onClose={() => setShowWalkInModal(false)}
        onSuccess={() => {
          fetchBookings();
          fetchStats();
        }}
      />
    </div>
  );
}