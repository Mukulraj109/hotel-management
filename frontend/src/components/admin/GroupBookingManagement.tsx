import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  Plus,
  Search,
  Users,
  Building2,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  X,
  Calendar,
  User,
  Phone,
  Mail,
  Briefcase
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '../LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/dashboardUtils';
import toast from 'react-hot-toast';

interface GroupBooking {
  _id: string;
  groupName: string;
  corporateCompanyId: {
    _id: string;
    name: string;
  };
  checkIn: string;
  checkOut: string;
  rooms: Array<{
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    employeeId?: string;
    department?: string;
    roomType: string;
    rate?: number;
    specialRequests?: string;
    status?: string;
  }>;
  contactPerson: {
    name: string;
    email: string;
    phone: string;
    designation?: string;
  };
  eventDetails?: {
    eventType?: string;
    eventName?: string;
    eventDescription?: string;
    meetingRoomRequired?: boolean;
    cateringRequired?: boolean;
    transportRequired?: boolean;
  };
  status: 'draft' | 'confirmed' | 'partially_confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  totalAmount?: number;
  paymentMethod: string;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

// API function to fetch group bookings
const fetchGroupBookings = async (): Promise<{ groupBookings: GroupBooking[] }> => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/v1/corporate/group-bookings', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch group bookings');
  }
  
  const data = await response.json();
  return data.data;
};

export default function GroupBookingManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<GroupBooking | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch group bookings
  const {
    data: bookingsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['group-bookings'],
    queryFn: fetchGroupBookings,
  });

  const bookings = bookingsData?.groupBookings || [];

  // Filter bookings based on search term and status
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.corporateCompanyId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.contactPerson.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partially_confirmed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'checked_out':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'checked_out':
        return <CheckCircle className="w-3 h-3" />;
      case 'partially_confirmed':
      case 'checked_in':
        return <Clock className="w-3 h-3" />;
      case 'cancelled':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load group bookings</h3>
        <p className="text-gray-500 mb-4">There was an error loading the group bookings.</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Group Bookings</h2>
          <p className="text-gray-600">Manage corporate group bookings and events</p>
        </div>
        <Button className="flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Group Booking
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by group name, company, or contact person..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="partially_confirmed">Partially Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredBookings.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredBookings.map((booking) => (
              <div key={booking._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <CalendarDays className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{booking.groupName}</h3>
                          <p className="text-sm text-gray-600 flex items-center">
                            <Building2 className="w-4 h-4 mr-1" />
                            {booking.corporateCompanyId.name}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn("px-2 py-1 text-xs font-medium border", getStatusColor(booking.status))}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1 capitalize">{booking.status.replace('_', ' ')}</span>
                      </Badge>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 flex items-center mb-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          Check-in
                        </p>
                        <p className="font-medium">{formatDate(booking.checkIn)}</p>
                      </div>
                      
                      <div>
                        <p className="text-gray-500 flex items-center mb-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          Check-out
                        </p>
                        <p className="font-medium">{formatDate(booking.checkOut)}</p>
                      </div>

                      <div>
                        <p className="text-gray-500 flex items-center mb-1">
                          <Users className="w-4 h-4 mr-1" />
                          Rooms
                        </p>
                        <p className="font-medium">{booking.rooms.length} rooms</p>
                      </div>

                      <div>
                        <p className="text-gray-500 flex items-center mb-1">
                          <User className="w-4 h-4 mr-1" />
                          Contact Person
                        </p>
                        <p className="font-medium">{booking.contactPerson.name}</p>
                      </div>
                    </div>

                    {/* Event Details */}
                    {booking.eventDetails?.eventName && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900">{booking.eventDetails.eventName}</p>
                        {booking.eventDetails.eventType && (
                          <p className="text-xs text-gray-600 mt-1">
                            Event Type: {booking.eventDetails.eventType}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Special Requirements */}
                    {(booking.eventDetails?.meetingRoomRequired || 
                      booking.eventDetails?.cateringRequired || 
                      booking.eventDetails?.transportRequired) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {booking.eventDetails.meetingRoomRequired && (
                          <Badge variant="outline" size="sm">Meeting Room</Badge>
                        )}
                        {booking.eventDetails.cateringRequired && (
                          <Badge variant="outline" size="sm">Catering</Badge>
                        )}
                        {booking.eventDetails.transportRequired && (
                          <Badge variant="outline" size="sm">Transport</Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CalendarDays className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No group bookings found' : 'No group bookings'}
            </h3>
            <p className="text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters.' 
                : 'Get started by creating your first group booking.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Group Booking Details
              </h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Group Name
                    </label>
                    <p className="text-sm text-gray-900">{selectedBooking.groupName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <p className="text-sm text-gray-900">{selectedBooking.corporateCompanyId.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check-in Date
                    </label>
                    <p className="text-sm text-gray-900">{formatDate(selectedBooking.checkIn)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check-out Date
                    </label>
                    <p className="text-sm text-gray-900">{formatDate(selectedBooking.checkOut)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <Badge className={cn("px-2 py-1 text-xs font-medium border", getStatusColor(selectedBooking.status))}>
                      {getStatusIcon(selectedBooking.status)}
                      <span className="ml-1 capitalize">{selectedBooking.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <p className="text-sm text-gray-900 capitalize">{selectedBooking.paymentMethod.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>

              {/* Contact Person */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Contact Person</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <p className="text-sm text-gray-900">{selectedBooking.contactPerson.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Designation
                    </label>
                    <p className="text-sm text-gray-900">{selectedBooking.contactPerson.designation || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <p className="text-sm text-gray-900 flex items-center">
                      <Mail className="w-4 h-4 mr-1 text-gray-400" />
                      {selectedBooking.contactPerson.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <p className="text-sm text-gray-900 flex items-center">
                      <Phone className="w-4 h-4 mr-1 text-gray-400" />
                      {selectedBooking.contactPerson.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              {selectedBooking.eventDetails && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Event Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Event Name
                      </label>
                      <p className="text-sm text-gray-900">{selectedBooking.eventDetails.eventName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Event Type
                      </label>
                      <p className="text-sm text-gray-900 capitalize">{selectedBooking.eventDetails.eventType || 'N/A'}</p>
                    </div>
                    {selectedBooking.eventDetails.eventDescription && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <p className="text-sm text-gray-900">{selectedBooking.eventDetails.eventDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rooms */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Rooms ({selectedBooking.rooms.length})</h4>
                <div className="space-y-3">
                  {selectedBooking.rooms.map((room, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Guest Name
                          </label>
                          <p className="text-sm text-gray-900">{room.guestName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Room Type
                          </label>
                          <p className="text-sm text-gray-900 capitalize">{room.roomType}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employee ID
                          </label>
                          <p className="text-sm text-gray-900">{room.employeeId || 'N/A'}</p>
                        </div>
                        {room.guestEmail && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email
                            </label>
                            <p className="text-sm text-gray-900">{room.guestEmail}</p>
                          </div>
                        )}
                        {room.department && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Department
                            </label>
                            <p className="text-sm text-gray-900">{room.department}</p>
                          </div>
                        )}
                        {room.rate && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rate
                            </label>
                            <p className="text-sm text-gray-900">{formatCurrency(room.rate)}</p>
                          </div>
                        )}
                        {room.specialRequests && (
                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Special Requests
                            </label>
                            <p className="text-sm text-gray-900">{room.specialRequests}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              {selectedBooking.specialInstructions && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Special Instructions</h4>
                  <p className="text-sm text-gray-900 bg-gray-50 p-4 rounded-lg">
                    {selectedBooking.specialInstructions}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
              <Button>
                Edit Booking
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}