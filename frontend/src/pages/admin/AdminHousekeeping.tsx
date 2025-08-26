import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Filter,
  Plus,
  Eye,
  Edit,
  Play,
  CheckSquare,
  X,
  User,
  MapPin,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/dashboard/DataTable';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { adminService } from '../../services/adminService';
import { HousekeepingTask } from '../../types/admin';
import { formatNumber, getStatusColor } from '../../utils/dashboardUtils';

interface HousekeepingFilters {
  status?: string;
  taskType?: string;
  priority?: string;
  roomId?: string;
  assignedToUserId?: string;
  page?: number;
  limit?: number;
}

interface HousekeepingStats {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  avgDuration: number;
}

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminHousekeeping() {
  // State
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [stats, setStats] = useState<HousekeepingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<HousekeepingTask | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [filters, setFilters] = useState<HousekeepingFilters>({
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await adminService.getHousekeepingTasks(filters);
      setTasks(response.data.tasks);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await adminService.getHousekeepingStats();
      const statsData = response.data.stats;
      
      // Transform stats to match our interface
      const transformedStats: HousekeepingStats = {
        total: 0,
        pending: 0,
        assigned: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        avgDuration: 0
      };

      statsData.forEach((stat: any) => {
        transformedStats.total += stat.count;
        switch (stat._id) {
          case 'pending':
            transformedStats.pending = stat.count;
            break;
          case 'assigned':
            transformedStats.assigned = stat.count;
            break;
          case 'in_progress':
            transformedStats.inProgress = stat.count;
            break;
          case 'completed':
            transformedStats.completed = stat.count;
            break;
          case 'cancelled':
            transformedStats.cancelled = stat.count;
            break;
        }
        if (stat.avgDuration) {
          transformedStats.avgDuration = stat.avgDuration;
        }
      });

      setStats(transformedStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch staff members
  const fetchStaffMembers = async () => {
    try {
      // This would typically come from a staff/users API endpoint
      // For now, we'll use mock data
      const mockStaff: StaffMember[] = [
        { _id: '1', name: 'John Smith', email: 'john@hotel.com', role: 'housekeeper' },
        { _id: '2', name: 'Sarah Johnson', email: 'sarah@hotel.com', role: 'housekeeper' },
        { _id: '3', name: 'Mike Wilson', email: 'mike@hotel.com', role: 'housekeeper' },
        { _id: '4', name: 'Lisa Brown', email: 'lisa@hotel.com', role: 'housekeeper' },
        { _id: '5', name: 'David Lee', email: 'david@hotel.com', role: 'maintenance' },
      ];
      setStaffMembers(mockStaff);
    } catch (error) {
      console.error('Error fetching staff members:', error);
    }
  };

  // Load data on mount and filter changes
  useEffect(() => {
    fetchTasks();
    fetchStats();
    fetchStaffMembers();
  }, [filters]);

  // Handle status update
  const handleStatusUpdate = async (taskId: string, newStatus: 'assigned' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      setUpdating(true);
      await adminService.updateHousekeepingTask(taskId, { status: newStatus });
      await fetchTasks();
      await fetchStats();
    } catch (error) {
      console.error('Error updating task status:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Handle staff assignment
  const handleAssignStaff = async (taskId: string, staffId: string) => {
    try {
      setUpdating(true);
      const selectedStaff = staffMembers.find(staff => staff._id === staffId);
      await adminService.updateHousekeepingTask(taskId, { 
        status: 'assigned',
        assignedToUserId: staffId
      });
      await fetchTasks();
      await fetchStats();
      setShowAssignmentModal(false);
      setSelectedStaffId('');
    } catch (error) {
      console.error('Error assigning staff:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Open assignment modal
  const openAssignmentModal = (task: HousekeepingTask) => {
    setSelectedTask(task);
    setShowAssignmentModal(true);
  };

  // Table columns
  const columns = [
    {
      key: 'title',
      header: 'Task',
      render: (value: string, row: HousekeepingTask) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">{row.taskType.replace('_', ' ')}</div>
        </div>
      )
    },
    {
      key: 'roomId',
      header: 'Room',
      render: (value: any) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 text-gray-400 mr-1" />
          <span className="font-medium">{value.roomNumber}</span>
          <span className="text-sm text-gray-500 ml-1">({value.type})</span>
        </div>
      )
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (value: string) => (
        <StatusBadge 
          status={value} 
          variant="pill" 
          size="sm"
          className={
            value === 'urgent' ? 'bg-red-100 text-red-800' :
            value === 'high' ? 'bg-orange-100 text-orange-800' :
            value === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }
        />
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <StatusBadge status={value} variant="pill" size="sm" />
      )
    },
    {
      key: 'assignedToUserId',
      header: 'Assigned To',
      render: (value: any) => (
        <div className="flex items-center">
          <User className="h-4 w-4 text-gray-400 mr-1" />
          <span className={value ? 'text-gray-900' : 'text-gray-500'}>
            {value ? value.name : 'Unassigned'}
          </span>
        </div>
      )
    },
    {
      key: 'estimatedDuration',
      header: 'Duration',
      render: (value: number) => (
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-gray-400 mr-1" />
          <span>{value} min</span>
        </div>
      ),
      align: 'center' as const
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (value: string) => (
        <div className="text-sm">
          {format(parseISO(value), 'MMM dd, yyyy')}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value: any, row: HousekeepingTask) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedTask(row);
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
                onClick={() => openAssignmentModal(row)}
                disabled={updating}
              >
                <User className="h-4 w-4 text-blue-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusUpdate(row._id, 'cancelled')}
                disabled={updating}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
          {row.status === 'assigned' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusUpdate(row._id, 'in_progress')}
              disabled={updating}
            >
              <Play className="h-4 w-4 text-green-600" />
            </Button>
          )}
          {row.status === 'in_progress' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusUpdate(row._id, 'completed')}
              disabled={updating}
            >
              <CheckSquare className="h-4 w-4 text-green-600" />
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
          <h1 className="text-2xl font-bold text-gray-900">Housekeeping Management</h1>
          <p className="text-gray-600">Manage cleaning tasks and room maintenance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
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
                  <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
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
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Play className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.inProgress)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.completed)}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={filters.taskType || ''}
                  onChange={(e) => setFilters({ ...filters, taskType: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Types</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inspection">Inspection</option>
                  <option value="deep_clean">Deep Clean</option>
                  <option value="checkout_clean">Checkout Clean</option>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                <Input
                  type="text"
                  placeholder="Enter room number"
                  value={filters.roomId || ''}
                  onChange={(e) => setFilters({ ...filters, roomId: e.target.value || undefined, page: 1 })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <Input
                  type="text"
                  placeholder="Enter staff name"
                  value={filters.assignedToUserId || ''}
                  onChange={(e) => setFilters({ ...filters, assignedToUserId: e.target.value || undefined, page: 1 })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks Table */}
      <DataTable
        title="Housekeeping Tasks"
        data={tasks}
        columns={columns}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search tasks..."
        pagination={true}
        pageSize={filters.limit || 10}
        emptyMessage="No housekeeping tasks found"
        onRowClick={(task) => {
          setSelectedTask(task);
          setShowDetailsModal(true);
        }}
      />

      {/* Staff Assignment Modal */}
      <Modal
        isOpen={showAssignmentModal}
        onClose={() => {
          setShowAssignmentModal(false);
          setSelectedStaffId('');
        }}
        title="Assign Task to Staff"
      >
        <div className="space-y-6">
          {selectedTask && (
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-900">{selectedTask.title}</h3>
              <p className="text-sm text-gray-500">Room {selectedTask.roomId.roomNumber} - {selectedTask.taskType.replace('_', ' ')}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ASSIGNED TO</label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {staffMembers.map((staff) => (
                <div
                  key={staff._id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedStaffId === staff._id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedStaffId(staff._id)}
                >
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{staff.name}</div>
                    <div className="text-sm text-gray-500">{staff.email}</div>
                  </div>
                  {selectedStaffId === staff._id && (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAssignmentModal(false);
                setSelectedStaffId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedStaffId && selectedTask) {
                  handleAssignStaff(selectedTask._id, selectedStaffId);
                }
              }}
              disabled={!selectedStaffId || updating}
            >
              Assign Task
            </Button>
          </div>
        </div>
      </Modal>

      {/* Task Details Modal */}
      {selectedTask && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedTask(null);
          }}
          title="Task Details"
        >
          <div className="space-y-6">
            {/* Task Header */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTask.title}</h3>
                  <p className="text-sm text-gray-500">{selectedTask.taskType.replace('_', ' ')}</p>
                </div>
                <StatusBadge status={selectedTask.status} variant="pill" />
              </div>
            </div>

            {/* Task Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Room</label>
                  <div className="flex items-center mt-1">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="font-medium">{selectedTask.roomId.roomNumber}</span>
                    <span className="text-gray-500 ml-2">({selectedTask.roomId.type})</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <div className="mt-1">
                    <StatusBadge 
                      status={selectedTask.priority} 
                      variant="pill" 
                      size="sm"
                      className={
                        selectedTask.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        selectedTask.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        selectedTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                  <div className="flex items-center mt-1">
                    <User className="h-4 w-4 text-gray-400 mr-2" />
                    <span className={selectedTask.assignedToUserId ? 'text-gray-900' : 'text-gray-500'}>
                      {selectedTask.assignedToUserId ? selectedTask.assignedToUserId.name : 'Unassigned'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Estimated Duration</label>
                  <div className="flex items-center mt-1">
                    <Clock className="h-4 w-4 text-gray-400 mr-2" />
                    <span>{selectedTask.estimatedDuration} minutes</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {format(parseISO(selectedTask.createdAt), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>

                {selectedTask.startedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Started</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {format(parseISO(selectedTask.startedAt), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                )}

                {selectedTask.completedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Completed</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {format(parseISO(selectedTask.completedAt), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                )}

                {selectedTask.actualDuration && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Actual Duration</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {selectedTask.actualDuration} minutes
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {selectedTask.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedTask.description}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedTask.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedTask.notes}
                </div>
              </div>
            )}

            {/* Supplies */}
            {selectedTask.supplies && selectedTask.supplies.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Supplies Required</label>
                <div className="mt-2 space-y-2">
                  {selectedTask.supplies.map((supply, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                      <span className="text-sm font-medium">{supply.name}</span>
                      <span className="text-sm text-gray-500">
                        {supply.quantity} {supply.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTask(null);
                }}
              >
                Close
              </Button>
              {selectedTask.status === 'pending' && (
                <>
                  <Button
                    onClick={() => {
                      openAssignmentModal(selectedTask);
                      setShowDetailsModal(false);
                    }}
                    disabled={updating}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Assign
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      handleStatusUpdate(selectedTask._id, 'cancelled');
                      setShowDetailsModal(false);
                      setSelectedTask(null);
                    }}
                    disabled={updating}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
              {selectedTask.status === 'assigned' && (
                <Button
                  onClick={() => {
                    handleStatusUpdate(selectedTask._id, 'in_progress');
                    setShowDetailsModal(false);
                    setSelectedTask(null);
                  }}
                  disabled={updating}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Task
                </Button>
              )}
              {selectedTask.status === 'in_progress' && (
                <Button
                  onClick={() => {
                    handleStatusUpdate(selectedTask._id, 'completed');
                    setShowDetailsModal(false);
                    setSelectedTask(null);
                  }}
                  disabled={updating}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
