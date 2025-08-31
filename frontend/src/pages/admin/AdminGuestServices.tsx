import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Headphones, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Filter,
  Eye,
  User,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  UserCheck,
  Play,
  CheckSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/dashboard/DataTable';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import { formatNumber } from '../../utils/dashboardUtils';
import toast from 'react-hot-toast';
import { adminGuestServicesService, GuestService, GuestServiceStats, GuestServiceFilters } from '../../services/adminGuestServicesService';
import { useRealTime } from '../../services/realTimeService';
import { useAuth } from '../../context/AuthContext';


export default function AdminGuestServices() {
  const { user } = useAuth();
  const [services, setServices] = useState<GuestService[]>([]);
  const [stats, setStats] = useState<GuestServiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [filters, setFilters] = useState<GuestServiceFilters>({ page: 1, limit: 20 });
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [availableStaff, setAvailableStaff] = useState<Array<{ _id: string; name: string; email: string; department: string }>>([]);
  
  // Real-time connection
  const { connectionState, connect, disconnect, on, off, isConnected } = useRealTime();
  
  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedService, setSelectedService] = useState<GuestService | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignData, setAssignData] = useState({
    assignedTo: '',
    notes: '',
    scheduledTime: ''
  });

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await adminGuestServicesService.getServices(filters);
      console.log('Guest services response:', response.data);
      console.log('First service:', response.data.serviceRequests?.[0]);
      setServices(response.data.serviceRequests || []);
      setPagination({ 
        total: response.data.pagination?.total || 0, 
        pages: response.data.pagination?.pages || 1 
      });
    } catch (error) {
      console.error('Error fetching guest services:', error);
      toast.error('Failed to load guest services');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Service will handle hotelId dynamically
      const response = await adminGuestServicesService.getStats();
      
      // Map backend response to frontend expected format
      const backendData = response.data;
      const overall = backendData.overall || {};
      
      const mappedStats = {
        total: overall.totalRequests || 0,
        pending: overall.pendingCount || 0,
        assigned: 0, // These might need to be calculated from byServiceType data
        inProgress: 0,
        completed: overall.completedCount || 0,
        cancelled: 0,
        avgResponseTime: 0, // These might need separate calculation
        avgCompletionTime: 0,
        satisfactionScore: overall.avgRating || 0
      };
      
      setStats(mappedStats);
    } catch (error) {
      console.error('Error fetching guest service stats:', error);
      toast.error('Failed to load guest service statistics');
    }
  };

  const fetchAvailableStaff = async () => {
    try {
      // Service will handle hotelId dynamically
      const response = await adminGuestServicesService.getAvailableStaff();
      setAvailableStaff(response.data);
    } catch (error) {
      console.error('Error fetching available staff:', error);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchStats();
    fetchAvailableStaff();
    
    // Connect to real-time updates
    connect().catch(console.error);
    
    return () => {
      disconnect();
    };
  }, [filters]);
  
  // Set up real-time event listeners
  useEffect(() => {
    if (!isConnected) return;
    
    const handleGuestServiceUpdate = (data: any) => {
      console.log('Real-time guest service update:', data);
      fetchServices();
      fetchStats();
      toast.success('Guest service data updated in real-time');
    };
    
    const handleGuestServiceCreate = (data: any) => {
      console.log('Real-time guest service create:', data);
      fetchServices();
      fetchStats();
      toast.success('New guest service request created');
    };
    
    // Subscribe to guest service events
    on('guest-services:created', handleGuestServiceCreate);
    on('guest-services:updated', handleGuestServiceUpdate);
    on('guest-services:status_changed', handleGuestServiceUpdate);
    
    return () => {
      off('guest-services:created', handleGuestServiceCreate);
      off('guest-services:updated', handleGuestServiceUpdate);
      off('guest-services:status_changed', handleGuestServiceUpdate);
    };
  }, [isConnected, on, off]);

  // Handle status update
  const handleStatusUpdate = async (serviceId: string, newStatus: 'assigned' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      setUpdating(true);
      await adminGuestServicesService.updateStatus(serviceId, newStatus);
      
      await fetchServices();
      await fetchStats();
      toast.success('Service status updated successfully');
    } catch (error) {
      console.error('Error updating service status:', error);
      toast.error('Failed to update service status');
    } finally {
      setUpdating(false);
    }
  };

  // Handle assignment
  const handleAssignService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    try {
      setUpdating(true);
      await adminGuestServicesService.assignService(selectedService._id, assignData);
      
      await fetchServices();
      await fetchStats();
      setShowAssignModal(false);
      setAssignData({ assignedTo: '', notes: '', scheduledTime: '' });
      toast.success('Service assigned successfully');
    } catch (error) {
      console.error('Error assigning service:', error);
      toast.error('Failed to assign service');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewService = (service: GuestService) => {
    setSelectedService(service);
    setShowViewModal(true);
  };

  const openAssignModal = (service: GuestService) => {
    setSelectedService(service);
    setShowAssignModal(true);
  };

  const getServiceTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      room_service: <Headphones className="h-4 w-4" />,
      housekeeping: <Clock className="h-4 w-4" />,
      maintenance: <AlertCircle className="h-4 w-4" />,
      concierge: <User className="h-4 w-4" />,
      transport: <MapPin className="h-4 w-4" />,
      spa: <CheckCircle className="h-4 w-4" />,
      laundry: <RefreshCw className="h-4 w-4" />,
      other: <MessageSquare className="h-4 w-4" />
    };
    return icons[type] || <MessageSquare className="h-4 w-4" />;
  };

  const getServiceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      room_service: 'bg-blue-100 text-blue-800',
      housekeeping: 'bg-green-100 text-green-800',
      maintenance: 'bg-orange-100 text-orange-800',
      concierge: 'bg-purple-100 text-purple-800',
      transport: 'bg-indigo-100 text-indigo-800',
      spa: 'bg-pink-100 text-pink-800',
      laundry: 'bg-cyan-100 text-cyan-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const columns = [
    {
      key: 'serviceType',
      header: 'Service',
      render: (value: any, service: GuestService) => {
        if (!service) return <div>No data</div>;
        return (
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getServiceTypeColor(service.serviceType)}`}>
              {getServiceTypeIcon(service.serviceType)}
            </div>
            <div>
              <div className="font-medium text-gray-900">{service.title}</div>
              <div className="text-sm text-gray-500">{service.description}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'guest',
      header: 'Guest',
      render: (value: any, service: GuestService) => {
        if (!service) return <div>No data</div>;
        return (
          <div className="text-sm">
            <div className="font-medium">{service.userId?.name}</div>
            <div className="text-gray-500">Room {service.bookingId?.rooms?.[0]?.roomId?.roomNumber}</div>
            <div className="text-gray-500">{service.bookingId?.bookingNumber}</div>
          </div>
        );
      }
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (value: any, service: GuestService) => {
        if (!service) return <div>No data</div>;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(service.priority)}`}>
            {service.priority}
          </span>
        );
      }
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (value: any, service: GuestService) => {
        if (!service) return <div>No data</div>;
        return (
          <div className="text-sm">
            {service.assignedTo ? (
              <>
                <div className="font-medium">{service.assignedTo.name}</div>
                <div className="text-gray-500">{service.assignedTo.email}</div>
              </>
            ) : (
              <span className="text-gray-400">Unassigned</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: any, service: GuestService) => {
        if (!service) return <div>No data</div>;
        return (
          <StatusBadge 
            status={service.status} 
            colorMap={{
              pending: 'yellow',
              assigned: 'blue',
              in_progress: 'orange',
              completed: 'green',
              cancelled: 'red'
            }}
          />
        );
      }
    },
    {
      key: 'cost',
      header: 'Cost',
      render: (value: any, service: GuestService) => {
        if (!service) return <div>No data</div>;
        return (
          <div className="text-sm">
            {service.actualCost ? (
              <div>
                <div className="font-medium">${service.actualCost.toFixed(2)}</div>
                {service.actualCost !== service.estimatedCost && (
                  <div className="text-gray-500">Est: ${service.estimatedCost?.toFixed(2)}</div>
                )}
              </div>
            ) : (
              <div className="text-gray-600">${service.estimatedCost?.toFixed(2)}</div>
            )}
          </div>
        );
      }
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (value: any, service: GuestService) => {
        if (!service || !service.createdAt) return <div>No data</div>;
        return (
          <div className="text-sm text-gray-600">
            {format(parseISO(service.createdAt), 'MMM dd, HH:mm')}
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value: any, service: GuestService) => {
        if (!service) return <div>No data</div>;
        return (
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleViewService(service)}
            >
            <Eye className="h-4 w-4" />
          </Button>
          {service.status === 'pending' && (
            <Button
              size="sm"
              onClick={() => openAssignModal(service)}
              disabled={updating}
            >
              <UserCheck className="h-4 w-4" />
            </Button>
          )}
          {service.status === 'assigned' && (
            <Button
              size="sm"
              onClick={() => handleStatusUpdate(service._id, 'in_progress')}
              disabled={updating}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          {(service.status === 'in_progress' || service.status === 'assigned') && (
            <Button
              size="sm"
              onClick={() => handleStatusUpdate(service._id, 'completed')}
              disabled={updating}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckSquare className="h-4 w-4" />
            </Button>
          )}
        </div>
        );
      },
      align: 'center' as const
    }
  ];

  if (loading && !services.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ErrorBoundary level="page" onError={(error, errorInfo) => {
      console.error('AdminGuestServices Error:', error, errorInfo);
      toast.error('An error occurred in the guest services management page');
    }}>
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Guest Services Management</h1>
          <p className="text-gray-600">Monitor and manage guest service requests</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Real-time connection status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionState === 'connected' ? 'bg-green-500' : 
              connectionState === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-500 capitalize">{connectionState}</span>
          </div>
          
          <Button onClick={fetchServices} variant="secondary" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-9 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Requests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.assigned}</div>
              <div className="text-sm text-gray-600">Assigned</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.avgResponseTime}</div>
              <div className="text-sm text-gray-600">Avg Response (min)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{stats.avgCompletionTime}</div>
              <div className="text-sm text-gray-600">Avg Completion (min)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.satisfactionScore}</div>
              <div className="text-sm text-gray-600">Satisfaction Score</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={filters.serviceType || ''}
                onChange={(e) => setFilters({ ...filters, serviceType: e.target.value || undefined, page: 1 })}
              >
                <option value="">All Types</option>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={filters.priority || ''}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value || undefined, page: 1 })}
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={() => setFilters({ page: 1, limit: 20 })}
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Service Requests ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorBoundary level="component" fallback={
            <div className="p-4 text-center text-gray-500">
              Failed to load guest services table
            </div>
          }>
            <DataTable 
              data={services}
              columns={columns}
              loading={loading}
            />
          </ErrorBoundary>
        </CardContent>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((filters.page || 1) - 1) * (filters.limit || 20) + 1} to{' '}
                {Math.min((filters.page || 1) * (filters.limit || 20), pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(filters.page || 1) <= 1}
                  onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-700">
                  Page {filters.page || 1} of {pagination.pages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(filters.page || 1) >= pagination.pages}
                  onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* View Service Modal */}
      {selectedService && (
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title="Service Request Details"
        >
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${getServiceTypeColor(selectedService.serviceType)}`}>
                {getServiceTypeIcon(selectedService.serviceType)}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedService.title}</h3>
                <p className="text-gray-600 mt-1">{selectedService.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Service Type</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getServiceTypeColor(selectedService.serviceType)}`}>
                  {selectedService.serviceType.replace('_', ' ')}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getPriorityColor(selectedService.priority)}`}>
                  {selectedService.priority}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Guest</label>
                <div className="mt-1">
                  <div className="font-medium">{selectedService.userId.name}</div>
                  <div className="text-sm text-gray-500">{selectedService.userId.email}</div>
                  {selectedService.userId.phone && (
                    <div className="text-sm text-gray-500">{selectedService.userId.phone}</div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Room & Booking</label>
                <div className="mt-1">
                  <div className="font-medium">Room {selectedService.bookingId.rooms[0]?.roomId.roomNumber}</div>
                  <div className="text-sm text-gray-500">{selectedService.bookingId.bookingNumber}</div>
                </div>
              </div>
            </div>

            {selectedService.assignedTo && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                <div className="mt-1">
                  <div className="font-medium">{selectedService.assignedTo.name}</div>
                  <div className="text-sm text-gray-500">{selectedService.assignedTo.email}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <StatusBadge 
                    status={selectedService.status} 
                    colorMap={{
                      pending: 'yellow',
                      assigned: 'blue',
                      in_progress: 'orange',
                      completed: 'green',
                      cancelled: 'red'
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost</label>
                <div className="mt-1 text-sm text-gray-900">
                  {selectedService.actualCost ? (
                    <div>
                      <div className="font-medium">${selectedService.actualCost.toFixed(2)} (Actual)</div>
                      {selectedService.actualCost !== selectedService.estimatedCost && (
                        <div className="text-gray-500">Estimated: ${selectedService.estimatedCost.toFixed(2)}</div>
                      )}
                    </div>
                  ) : (
                    <div>${selectedService.estimatedCost.toFixed(2)} (Estimated)</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <div className="mt-1 text-sm text-gray-900">
                  {format(parseISO(selectedService.createdAt), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
              {selectedService.completedTime && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Completed</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {format(parseISO(selectedService.completedTime), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              )}
            </div>

            {selectedService.scheduledTime && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Scheduled Time</label>
                <div className="mt-1 text-sm text-gray-900">
                  {format(parseISO(selectedService.scheduledTime), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
            )}

            {selectedService.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Staff Notes</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedService.notes}
                </div>
              </div>
            )}

            {selectedService.guestNotes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Guest Notes</label>
                <div className="mt-1 text-sm text-gray-900 bg-blue-50 p-3 rounded-md">
                  {selectedService.guestNotes}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
            {selectedService.status !== 'completed' && selectedService.status !== 'cancelled' && (
              <>
                {selectedService.status === 'pending' && (
                  <Button onClick={() => {
                    setShowViewModal(false);
                    openAssignModal(selectedService);
                  }}>
                    Assign Service
                  </Button>
                )}
                {selectedService.status !== 'pending' && (
                  <Button 
                    onClick={() => {
                      const nextStatus = selectedService.status === 'assigned' ? 'in_progress' : 'completed';
                      handleStatusUpdate(selectedService._id, nextStatus as any);
                      setShowViewModal(false);
                    }}
                    disabled={updating}
                  >
                    {selectedService.status === 'assigned' && 'Start Service'}
                    {selectedService.status === 'in_progress' && 'Complete Service'}
                  </Button>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Assign Service Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Service"
      >
        <form onSubmit={handleAssignService} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To Staff Member</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={assignData.assignedTo}
              onChange={(e) => setAssignData({ ...assignData, assignedTo: e.target.value })}
              required
            >
              <option value="">Select Staff Member</option>
              {availableStaff.map((staff) => (
                <option key={staff._id} value={staff._id}>
                  {staff.name} - {staff.department}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Time (Optional)</label>
            <input
              type="datetime-local"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={assignData.scheduledTime}
              onChange={(e) => setAssignData({ ...assignData, scheduledTime: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Notes</label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 h-24 resize-none"
              value={assignData.notes}
              onChange={(e) => setAssignData({ ...assignData, notes: e.target.value })}
              placeholder="Add any special instructions or notes for the staff member"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAssignModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updating}>
              {updating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Assign Service
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
    </ErrorBoundary>
  );
}