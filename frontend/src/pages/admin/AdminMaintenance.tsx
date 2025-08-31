import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Filter,
  Plus,
  Eye,
  Edit,
  Play,
  CheckSquare,
  X,
  User,
  MapPin,
  Calendar,
  ChevronDown,
  Save,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/dashboard/DataTable';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import { formatNumber, getStatusColor } from '../../utils/dashboardUtils';
import { adminMaintenanceService, MaintenanceTask, MaintenanceStats, CreateMaintenanceTaskData, MaintenanceFilters } from '../../services/adminMaintenanceService';
import { useRealTime } from '../../services/realTimeService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';


export default function AdminMaintenance() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [filters, setFilters] = useState<MaintenanceFilters>({ page: 1, limit: 20 });
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  
  // Auth context
  const { user } = useAuth();
  
  // Available staff and rooms for task creation
  const [availableStaff, setAvailableStaff] = useState<Array<{ _id: string; name: string; email: string; department?: string }>>([]);
  const [availableRooms, setAvailableRooms] = useState<Array<{ _id: string; roomNumber: string; type: string; floor?: string }>>([]);
  
  // Real-time connection
  const { connectionState, connect, disconnect, on, off, isConnected } = useRealTime();
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<CreateMaintenanceTaskData>({
    title: '',
    description: '',
    type: 'other',
    category: 'corrective',
    priority: 'medium',
    roomId: '',
    assignedToUserId: '',
    estimatedDuration: 60,
    estimatedCost: 0,
    notes: ''
  });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminMaintenanceService.getTasks(filters);
      // Filter out any undefined or invalid tasks
      const validTasks = (response.data.tasks || []).filter(task => task && typeof task === 'object');
      setTasks(validTasks);
      setPagination({ 
        total: response.data.pagination?.total || 0, 
        pages: response.data.pagination?.pages || 1 
      });
    } catch (error) {
      console.error('Error fetching maintenance tasks:', error);
      toast.error('Failed to load maintenance tasks');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      // Service will handle hotelId dynamically
      const response = await adminMaintenanceService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching maintenance stats:', error);
      toast.error('Failed to load maintenance statistics');
    }
  }, []);

  const fetchAvailableStaff = useCallback(async () => {
    try {
      // Service will handle hotelId dynamically
      const response = await adminMaintenanceService.getAvailableStaff();
      setAvailableStaff(response.data);
    } catch (error) {
      console.error('Error fetching available staff:', error);
      toast.error('Failed to load available staff');
    }
  }, []);

  const fetchAvailableRooms = useCallback(async () => {
    try {
      // Service will handle hotelId dynamically
      const response = await adminMaintenanceService.getAvailableRooms();
      console.log('Frontend received rooms:', response.data);
      setAvailableRooms(response.data);
    } catch (error) {
      console.error('Error fetching available rooms:', error);
      toast.error('Failed to load available rooms');
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchStats();
    fetchAvailableStaff();
    fetchAvailableRooms();
    
    // Connect to real-time updates
    connect().catch(console.error);
    
    return () => {
      disconnect();
    };
  }, [filters, user?.hotelId]);
  
  // Set up real-time event listeners
  useEffect(() => {
    if (!isConnected) return;
    
    const handleMaintenanceUpdate = (data: any) => {
      console.log('Real-time maintenance update:', data);
      fetchTasks();
      fetchStats();
      toast.success('Maintenance data updated in real-time');
    };
    
    const handleMaintenanceCreate = (data: any) => {
      console.log('Real-time maintenance create:', data);
      fetchTasks();
      fetchStats();
      toast.success('New maintenance task created');
    };
    
    // Subscribe to maintenance events
    on('maintenance:created', handleMaintenanceCreate);
    on('maintenance:updated', handleMaintenanceUpdate);
    on('maintenance:status_changed', handleMaintenanceUpdate);
    
    return () => {
      off('maintenance:created', handleMaintenanceCreate);
      off('maintenance:updated', handleMaintenanceUpdate);
      off('maintenance:status_changed', handleMaintenanceUpdate);
    };
  }, [isConnected, on, off]);

  // Handle task creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const cleanedFormData = {
        ...formData,
        roomId: formData.roomId || undefined,
        assignedToUserId: formData.assignedToUserId || undefined,
        estimatedDuration: formData.estimatedDuration || 60,
        estimatedCost: formData.estimatedCost || 0
      };
      console.log('Sending maintenance task data:', cleanedFormData);
      await adminMaintenanceService.createTask(cleanedFormData);
      
      toast.success('Maintenance task created successfully');
      await fetchTasks();
      await fetchStats();
      setShowCreateModal(false);
      resetFormData();
    } catch (error) {
      console.error('Error creating maintenance task:', error);
      toast.error('Failed to create maintenance task');
    } finally {
      setUpdating(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (taskId: string, newStatus: 'assigned' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      setUpdating(true);
      await adminMaintenanceService.updateTask(taskId, { status: newStatus });
      
      await fetchTasks();
      await fetchStats();
      toast.success('Task status updated successfully');
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    } finally {
      setUpdating(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      title: '',
      description: '',
      type: 'other',
      category: 'corrective',
      priority: 'medium',
      roomId: '',
      assignedToUserId: '',
      estimatedDuration: 60,
      estimatedCost: 0,
      notes: ''
    });
  };

  const handleViewTask = (task: MaintenanceTask) => {
    setSelectedTask(task);
    setShowViewModal(true);
  };

  const getTaskTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      preventive: 'bg-blue-100 text-blue-800',
      corrective: 'bg-orange-100 text-orange-800',
      emergency: 'bg-red-100 text-red-800',
      inspection: 'bg-green-100 text-green-800',
      plumbing: 'bg-cyan-100 text-cyan-800',
      electrical: 'bg-yellow-100 text-yellow-800',
      hvac: 'bg-indigo-100 text-indigo-800',
      cleaning: 'bg-green-100 text-green-800',
      carpentry: 'bg-amber-100 text-amber-800',
      painting: 'bg-purple-100 text-purple-800',
      appliance: 'bg-pink-100 text-pink-800',
      safety: 'bg-red-100 text-red-800',
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

  const columns = useMemo(() => [
    {
      key: 'title',
      header: 'Task',
      render: (value: any, task: MaintenanceTask) => (
        <div>
          <div className="font-medium text-gray-900">{task.title}</div>
          <div className="text-sm text-gray-500">{task.description}</div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (value: any, task: MaintenanceTask) => {
        if (!task || !task.type) {
          return <span className="text-gray-400">N/A</span>;
        }
        return (
          <div className="space-y-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTaskTypeColor(task.type)}`}>
              {task.type.replace('_', ' ')}
            </span>
            {task.category && (
              <div className="text-xs text-gray-500">
                {task.category}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (value: any, task: MaintenanceTask) => {
        if (!task || !task.priority) {
          return <span className="text-gray-400">N/A</span>;
        }
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
        );
      }
    },
    {
      key: 'roomId',
      header: 'Room',
      render: (value: any, task: MaintenanceTask) => {
        if (!task || !task.roomId) {
          return <span className="text-gray-400">No room assigned</span>;
        }
        return (
          <div className="text-sm">
            <div className="font-medium">{task.roomId.roomNumber || 'Unknown Room'}</div>
            <div className="text-gray-500">{task.roomId.type || 'Unknown Type'}</div>
          </div>
        );
      }
    },
    {
      key: 'assignedToUserId',
      header: 'Assigned To',
      render: (value: any, task: MaintenanceTask) => {
        if (!task) {
          return <span className="text-gray-400">N/A</span>;
        }
        return (
          <div className="text-sm">
            {task.assignedToUserId && task.assignedToUserId.name ? (
              <>
                <div className="font-medium">{task.assignedToUserId.name}</div>
                <div className="text-gray-500">{task.assignedToUserId.email || ''}</div>
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
      render: (value: any, task: MaintenanceTask) => {
        if (!task || !task.status) {
          return <span className="text-gray-400">N/A</span>;
        }
        return (
          <StatusBadge 
            status={task.status} 
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
      key: 'estimatedDuration',
      header: 'Duration',
      render: (value: any, task: MaintenanceTask) => {
        if (!task || !task.estimatedDuration) {
          return <span className="text-gray-400">N/A</span>;
        }
        return (
          <div className="text-sm text-gray-600">
            {task.estimatedDuration} min
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value: any, task: MaintenanceTask) => {
        if (!task || !task._id) {
          return <span className="text-gray-400">N/A</span>;
        }
        return (
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleViewTask(task)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {task.status === 'pending' && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(task._id, 'assigned')}
                disabled={updating}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            {task.status === 'assigned' && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(task._id, 'in_progress')}
                disabled={updating}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            {(task.status === 'in_progress' || task.status === 'assigned') && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(task._id, 'completed')}
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
  ], [updating]);

  if (loading && !tasks.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ErrorBoundary level="page" onError={(error, errorInfo) => {
      console.error('AdminMaintenance Error:', error, errorInfo);
      toast.error('An error occurred in the maintenance management page');
    }}>
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Maintenance Management</h1>
          <p className="text-gray-600">Create and manage maintenance tasks for hotel operations</p>
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
          
          <Button onClick={fetchTasks} variant="secondary" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
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
              <div className="text-2xl font-bold text-purple-600">{stats.avgDuration}</div>
              <div className="text-sm text-gray-600">Avg Duration (min)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.overdueCount}</div>
              <div className="text-sm text-gray-600">Overdue</div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={filters.taskType || ''}
                onChange={(e) => setFilters({ ...filters, taskType: e.target.value || undefined, page: 1 })}
              >
                <option value="">All Types</option>
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="emergency">Emergency</option>
                <option value="inspection">Inspection</option>
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

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Tasks ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorBoundary level="component" fallback={
            <div className="p-4 text-center text-gray-500">
              Failed to load maintenance tasks table
            </div>
          }>
            <DataTable 
              data={tasks}
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

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Maintenance Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
            <Input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 h-24 resize-none"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter task description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                required
              >
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="hvac">HVAC</option>
                <option value="cleaning">Cleaning</option>
                <option value="carpentry">Carpentry</option>
                <option value="painting">Painting</option>
                <option value="appliance">Appliance</option>
                <option value="safety">Safety</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                required
              >
                <option value="corrective">Corrective</option>
                <option value="preventive">Preventive</option>
                <option value="emergency">Emergency</option>
                <option value="inspection">Inspection</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost ($)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={formData.roomId}
                onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
              >
                <option value="">Select Room</option>
                {availableRooms.map((room) => (
                  <option key={room._id} value={room._id}>
                    Room {room.roomNumber} - {room.type}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={formData.assignedToUserId}
                onChange={(e) => setFormData({ ...formData, assignedToUserId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {availableStaff.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.name} - {staff.department || 'Staff'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration (minutes)</label>
            <Input
              type="number"
              min="1"
              required
              value={formData.estimatedDuration}
              onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 h-20 resize-none"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes (optional)"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updating}>
              {updating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Task Modal */}
      {selectedTask && (
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title="Task Details"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selectedTask.title}</h3>
              <p className="text-gray-600 mt-1">{selectedTask.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Maintenance Type</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getTaskTypeColor(selectedTask.type)}`}>
                  {selectedTask.type.replace('_', ' ')}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getTaskTypeColor(selectedTask.category)}`}>
                  {selectedTask.category.replace('_', ' ')}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getPriorityColor(selectedTask.priority)}`}>
                  {selectedTask.priority}
                </span>
              </div>
              {selectedTask.estimatedCost && selectedTask.estimatedCost > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estimated Cost</label>
                  <div className="mt-1 text-sm text-gray-900">${selectedTask.estimatedCost.toFixed(2)}</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Room</label>
                <div className="mt-1">
                  <div className="font-medium">{selectedTask.roomId.roomNumber}</div>
                  <div className="text-sm text-gray-500">{selectedTask.roomId.type}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <StatusBadge 
                    status={selectedTask.status} 
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
            </div>

            {selectedTask.assignedToUserId && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                <div className="mt-1">
                  <div className="font-medium">{selectedTask.assignedToUserId.name}</div>
                  <div className="text-sm text-gray-500">{selectedTask.assignedToUserId.email}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Estimated Duration</label>
                <div className="mt-1 text-sm text-gray-900">{selectedTask.estimatedDuration} minutes</div>
              </div>
              {selectedTask.actualDuration && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Actual Duration</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedTask.actualDuration} minutes</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <div className="mt-1 text-sm text-gray-900">
                  {format(parseISO(selectedTask.createdAt), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
              {selectedTask.completedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Completed</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {format(parseISO(selectedTask.completedAt), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              )}
            </div>

            {selectedTask.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedTask.notes}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
            {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && (
              <Button 
                onClick={() => {
                  const nextStatus = selectedTask.status === 'pending' ? 'assigned' : 
                                   selectedTask.status === 'assigned' ? 'in_progress' : 'completed';
                  handleStatusUpdate(selectedTask._id, nextStatus as any);
                  setShowViewModal(false);
                }}
                disabled={updating}
              >
                {selectedTask.status === 'pending' && 'Assign Task'}
                {selectedTask.status === 'assigned' && 'Start Task'}
                {selectedTask.status === 'in_progress' && 'Complete Task'}
              </Button>
            )}
          </div>
        </Modal>
      )}
    </div>
    </ErrorBoundary>
  );
}