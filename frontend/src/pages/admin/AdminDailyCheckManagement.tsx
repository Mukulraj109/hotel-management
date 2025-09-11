import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ClipboardList, 
  Users, 
  Settings,
  Plus,
  UserCheck,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Edit
} from 'lucide-react';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { dailyRoutineCheckService } from '../../services/dailyRoutineCheckService';
import toast from 'react-hot-toast';

interface Staff {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Room {
  _id: string;
  roomNumber: string;
  type: string;
  floor: string;
}

interface AssignmentSummary {
  staff: Staff;
  totalAssigned: number;
  completed: number;
  pending: number;
  rooms: Array<{
    roomNumber: string;
    type: string;
    status: string;
    checkedAt: string | null;
  }>;
}

interface AdminOverview {
  totalRooms: number;
  assignedRooms: number;
  pendingChecks: number;
  completedToday: number;
  overdueChecks: number;
  assignmentSummary: AssignmentSummary[];
  unassignedRooms: number;
}

interface Assignment {
  roomId: string;
  staffId: string;
}

export default function AdminDailyCheckManagement() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentMode, setAssignmentMode] = useState(false);
  const [selectedAssignments, setSelectedAssignments] = useState<Assignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'templates'>('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [overviewRes, roomsRes, staffRes] = await Promise.all([
        fetch('/api/v1/daily-routine-check/admin/overview', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/v1/rooms', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/v1/users?role=staff', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const overviewData = await overviewRes.json();
      const roomsData = await roomsRes.json();
      const staffData = await staffRes.json();

      setOverview(overviewData.data);
      setRooms(roomsData.data?.rooms || []);
      setStaff(staffData.data?.users || []);
    } catch (error) {
      console.error('Failed to fetch admin daily check data:', error);
      toast.error('Failed to load daily check management data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRooms = async () => {
    if (selectedAssignments.length === 0) {
      toast.error('Please select at least one room-staff assignment');
      return;
    }

    try {
      await dailyRoutineCheckService.assignDailyChecks(selectedAssignments);
      toast.success(`Successfully assigned ${selectedAssignments.length} rooms`);
      setSelectedAssignments([]);
      setAssignmentMode(false);
      fetchData();
    } catch (error) {
      console.error('Failed to assign rooms:', error);
      toast.error('Failed to assign rooms to staff');
    }
  };

  const addAssignment = (roomId: string, staffId: string) => {
    const existingIndex = selectedAssignments.findIndex(a => a.roomId === roomId);
    if (existingIndex >= 0) {
      // Update existing assignment
      const updated = [...selectedAssignments];
      updated[existingIndex].staffId = staffId;
      setSelectedAssignments(updated);
    } else {
      // Add new assignment
      setSelectedAssignments([...selectedAssignments, { roomId, staffId }]);
    }
  };

  const removeAssignment = (roomId: string) => {
    setSelectedAssignments(selectedAssignments.filter(a => a.roomId !== roomId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Daily Check Management</h1>
        <p className="text-gray-600">Manage daily routine checks, assignments, and templates</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: ClipboardList },
            { id: 'assignments', label: 'Room Assignments', icon: Users },
            { id: 'templates', label: 'Templates', icon: Settings }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ClipboardList className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Rooms</p>
                  <p className="text-2xl font-semibold text-gray-900">{overview.totalRooms}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed Today</p>
                  <p className="text-2xl font-semibold text-gray-900">{overview.completedToday}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Checks</p>
                  <p className="text-2xl font-semibold text-gray-900">{overview.pendingChecks}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Unassigned</p>
                  <p className="text-2xl font-semibold text-gray-900">{overview.unassignedRooms}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Staff Assignment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Staff Assignment Summary
                </span>
                <Button onClick={fetchData} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview.assignmentSummary.length > 0 ? (
                  overview.assignmentSummary.map((summary, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{summary.staff.name}</h4>
                          <p className="text-sm text-gray-600">{summary.staff.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {summary.totalAssigned} assigned
                          </Badge>
                          <Badge className="bg-green-100 text-green-800">
                            {summary.completed} completed
                          </Badge>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {summary.pending} pending
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {summary.rooms.map((room, roomIndex) => (
                          <div key={roomIndex} className="text-xs p-2 bg-gray-50 rounded">
                            <div className="font-medium">Room {room.roomNumber}</div>
                            <div className="text-gray-600 capitalize">{room.type}</div>
                            <Badge 
                              size="sm" 
                              className={`mt-1 ${getStatusColor(room.status)}`}
                            >
                              {room.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
                    <p className="text-gray-500">Use the Assignments tab to assign rooms to staff members</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Room Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Room Assignments</h2>
            <div className="flex gap-2">
              {assignmentMode ? (
                <>
                  <Button
                    onClick={() => {
                      setAssignmentMode(false);
                      setSelectedAssignments([]);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignRooms}
                    disabled={selectedAssignments.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Assign {selectedAssignments.length} Rooms
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setAssignmentMode(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Rooms
                </Button>
              )}
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search rooms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Rooms</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          {/* Room Assignment Grid */}
          {assignmentMode ? (
            <Card>
              <CardHeader>
                <CardTitle>Assign Rooms to Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rooms
                    .filter(room => 
                      room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      room.type.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((room) => {
                      const assignment = selectedAssignments.find(a => a.roomId === room._id);
                      return (
                        <div key={room._id} className="border rounded-lg p-4">
                          <div className="mb-3">
                            <h4 className="font-medium">Room {room.roomNumber}</h4>
                            <p className="text-sm text-gray-600 capitalize">{room.type} • Floor {room.floor}</p>
                          </div>
                          <div className="space-y-2">
                            <select
                              value={assignment?.staffId || ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  addAssignment(room._id, e.target.value);
                                } else {
                                  removeAssignment(room._id);
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select staff member...</option>
                              {staff.map((member) => (
                                <option key={member._id} value={member._id}>
                                  {member.name}
                                </option>
                              ))}
                            </select>
                            {assignment && (
                              <Button
                                onClick={() => removeAssignment(room._id)}
                                variant="outline"
                                size="sm"
                                className="w-full text-red-600 hover:text-red-700"
                              >
                                Remove Assignment
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Room Assignment Mode</h3>
              <p className="text-gray-500 mb-4">Click "Assign Rooms" to start assigning rooms to staff members</p>
              <Button
                onClick={() => setAssignmentMode(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start Assigning
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Inventory Templates</h2>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Edit className="w-4 h-4 mr-2" />
              Manage Templates
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <Settings className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Template Management</h3>
                <p className="text-gray-500">Template management interface will be available here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}