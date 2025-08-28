import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { guestServiceService, GuestServiceRequest } from '../../services/guestService';
import { bookingService } from '../../services/bookingService';
import { 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  MapPin,
  Users,
  Filter,
  Search,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatDate, formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface Booking {
  _id: string;
  bookingNumber: string;
  checkIn: string;
  checkOut: string;
  status: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'assigned': return 'bg-blue-100 text-blue-800';
    case 'in_progress': return 'bg-purple-100 text-purple-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Clock className="w-4 h-4" />;
    case 'assigned': return <AlertCircle className="w-4 h-4" />;
    case 'in_progress': return <Clock className="w-4 h-4" />;
    case 'completed': return <CheckCircle className="w-4 h-4" />;
    case 'cancelled': return <XCircle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function GuestRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<GuestServiceRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    bookingId: '',
    serviceType: '',
    title: '',
    description: '',
    priority: 'medium',
    scheduledTime: '',
    specialInstructions: ''
  });

  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchBookings();
    }
  }, [user, filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await guestServiceService.getServiceRequests({
        status: filter === 'all' ? undefined : filter,
        limit: 50
      });
      setRequests(response.data.serviceRequests || []);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      toast.error('Failed to load service requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await bookingService.getUserBookings();
      const bookingsData = Array.isArray(response.data) ? response.data : [];
      setBookings(bookingsData.filter(b => ['confirmed', 'checked_in'].includes(b.status)));
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const handleCreateRequest = async () => {
    if (!formData.bookingId || !formData.serviceType || !formData.title) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      await guestServiceService.createServiceRequest({
        bookingId: formData.bookingId,
        serviceType: formData.serviceType,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        scheduledTime: formData.scheduledTime || undefined,
        specialInstructions: formData.specialInstructions
      });
      
      toast.success('Service request created successfully');
      setShowCreateForm(false);
      setFormData({
        bookingId: '',
        serviceType: '',
        title: '',
        description: '',
        priority: 'medium',
        scheduledTime: '',
        specialInstructions: ''
      });
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create service request');
    } finally {
      setCreating(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;

    try {
      await guestServiceService.cancelServiceRequest(requestId, 'Cancelled by guest');
      toast.success('Request cancelled successfully');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel request');
    }
  };

  const filteredRequests = requests.filter(request =>
    request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.bookingId?.bookingNumber?.includes(searchTerm)
  );

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Service Requests</h1>
        <p className="text-gray-600">Manage your hotel service requests and track their status</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <Button
          variant="primary"
          onClick={() => setShowCreateForm(true)}
          disabled={bookings.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>

        {bookings.length === 0 && (
          <p className="text-sm text-gray-500">
            You need an active booking to create service requests
          </p>
        )}

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'all', label: 'All Requests', count: requests.length },
              { id: 'pending', label: 'Pending', count: requests.filter(r => r.status === 'pending').length },
              { id: 'assigned', label: 'Assigned', count: requests.filter(r => r.status === 'assigned').length },
              { id: 'in_progress', label: 'In Progress', count: requests.filter(r => r.status === 'in_progress').length },
              { id: 'completed', label: 'Completed', count: requests.filter(r => r.status === 'completed').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  filter === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Create Request Form */}
      {showCreateForm && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Service Request</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booking *
              </label>
              <select
                value={formData.bookingId}
                onChange={(e) => setFormData(prev => ({ ...prev, bookingId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a booking</option>
                {bookings.map(booking => (
                  <option key={booking._id} value={booking._id}>
                    #{booking.bookingNumber} - {formatDate(booking.checkIn)} to {formatDate(booking.checkOut)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Type *
              </label>
              <select
                value={formData.serviceType}
                onChange={(e) => setFormData(prev => ({ ...prev, serviceType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select service type</option>
                <option value="room_service">Room Service</option>
                <option value="housekeeping">Housekeeping</option>
                <option value="maintenance">Maintenance</option>
                <option value="concierge">Concierge</option>
                <option value="transport">Transport</option>
                <option value="spa">Spa</option>
                <option value="laundry">Laundry</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of your request"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Detailed description of your request..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledTime}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Instructions
              </label>
              <textarea
                value={formData.specialInstructions}
                onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="Any special instructions or preferences..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="ghost"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateRequest}
              loading={creating}
            >
              Create Request
            </Button>
          </div>
        </Card>
      )}

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No service requests found</h3>
          <p className="text-gray-500 mb-4">
            {filter === 'all' 
              ? "You haven't made any service requests yet." 
              : `No ${filter} requests found.`}
          </p>
          {bookings.length > 0 && (
            <Button
              variant="primary"
              onClick={() => setShowCreateForm(true)}
            >
              Create Your First Request
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request._id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.title}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1 capitalize">{request.status.replace('_', ' ')}</span>
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                      {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {request.bookingId?.bookingNumber ? `Booking #${request.bookingId.bookingNumber} • ` : ''}{request.serviceType.replace('_', ' ').charAt(0).toUpperCase() + request.serviceType.replace('_', ' ').slice(1)}
                  </p>
                  
                  {request.description && (
                    <p className="text-sm text-gray-700 mb-3">{request.description}</p>
                  )}

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Created {formatDate(request.createdAt)}</span>
                    </div>
                    {request.scheduledTime && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>Scheduled {formatDate(request.scheduledTime)}</span>
                      </div>
                    )}
                    {request.assignedTo && (
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>Assigned to {request.assignedTo.name}</span>
                      </div>
                    )}
                  </div>

                  {request.specialInstructions && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Special Instructions:</strong> {request.specialInstructions}
                      </p>
                    </div>
                  )}

                  {request.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Notes:</strong> {request.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {['pending', 'assigned'].includes(request.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelRequest(request._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* Cost Information */}
              {(request.estimatedCost || request.actualCost) && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between text-sm">
                    {request.estimatedCost && (
                      <span className="text-gray-600">
                        Estimated Cost: {formatCurrency(request.estimatedCost, 'INR')}
                      </span>
                    )}
                    {request.actualCost && (
                      <span className="text-gray-900 font-medium">
                        Actual Cost: {formatCurrency(request.actualCost, 'INR')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}