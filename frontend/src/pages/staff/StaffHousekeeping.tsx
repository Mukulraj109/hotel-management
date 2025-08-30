import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Pause, 
  MapPin, 
  User,
  RefreshCw,
  Calendar,
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HousekeepingTask {
  _id: string;
  title: string;
  description: string;
  taskType: 'cleaning' | 'maintenance' | 'inspection' | 'deep_clean' | 'checkout_clean';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  roomId: {
    _id: string;
    roomNumber: string;
    type: string;
  };
  assignedToUserId?: string;
  estimatedDuration: number;
  startedAt?: string;
  completedAt?: string;
  actualDuration?: number;
  notes?: string;
  supplies?: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  createdAt: string;
}

export default function StaffHousekeeping() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/housekeeping?assignedToUserId=' + user?._id, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.data.tasks || []);
      } else {
        console.error('Failed to fetch housekeeping tasks:', response.statusText);
        // Use mock data for demonstration
        setTasks([
          {
            _id: 'task-1',
            title: 'Clean Room 101',
            description: 'Standard cleaning after checkout',
            taskType: 'cleaning',
            priority: 'high',
            status: 'assigned',
            roomId: { _id: '1', roomNumber: '101', type: 'Standard' },
            estimatedDuration: 30,
            createdAt: new Date().toISOString(),
            supplies: [{ name: 'Cleaning supplies', quantity: 1, unit: 'set' }]
          },
          {
            _id: 'task-2', 
            title: 'Maintenance Check Room 205',
            description: 'Check HVAC and lighting',
            taskType: 'maintenance',
            priority: 'medium',
            status: 'in_progress',
            roomId: { _id: '2', roomNumber: '205', type: 'Deluxe' },
            estimatedDuration: 45,
            startedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            supplies: [{ name: 'Tool kit', quantity: 1, unit: 'set' }]
          },
          {
            _id: 'task-3',
            title: 'Deep Clean Room 301',
            description: 'Weekly deep cleaning service',
            taskType: 'deep_clean',
            priority: 'medium',
            status: 'completed',
            roomId: { _id: '3', roomNumber: '301', type: 'Suite' },
            estimatedDuration: 60,
            completedAt: new Date().toISOString(),
            actualDuration: 55,
            createdAt: new Date().toISOString(),
            supplies: [{ name: 'Deep clean kit', quantity: 1, unit: 'set' }]
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/v1/housekeeping/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'cleaning': return <ClipboardCheck className="w-4 h-4" />;
      case 'maintenance': return <AlertTriangle className="w-4 h-4" />;
      case 'inspection': return <CheckSquare className="w-4 h-4" />;
      default: return <ClipboardCheck className="w-4 h-4" />;
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'assigned' || t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Housekeeping Tasks</h1>
          <p className="text-gray-600">Manage your assigned room cleaning and maintenance tasks</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={fetchTasks} variant="secondary" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-lg font-semibold text-gray-900">{tasks.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-lg font-semibold text-gray-900">{pendingTasks.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Play className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-lg font-semibold text-gray-900">{inProgressTasks.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-lg font-semibold text-gray-900">{completedTasks.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-orange-600" />
              Pending Tasks ({pendingTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No pending tasks</p>
              ) : (
                pendingTasks.map(task => (
                  <div key={task._id} className={`p-3 rounded-lg border ${getPriorityColor(task.priority)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {getTaskTypeIcon(task.taskType)}
                          <p className="font-medium ml-2">{task.roomId.roomNumber}</p>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {task.taskType.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.title}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>{task.estimatedDuration} min</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => updateTaskStatus(task._id, 'in_progress')}
                        disabled={updating}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Start
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* In Progress Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Play className="h-5 w-5 mr-2 text-yellow-600" />
              In Progress ({inProgressTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inProgressTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No tasks in progress</p>
              ) : (
                inProgressTasks.map(task => (
                  <div key={task._id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {getTaskTypeIcon(task.taskType)}
                          <p className="font-medium ml-2">{task.roomId.roomNumber}</p>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {task.taskType.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.title}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>Started {new Date(task.startedAt!).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => updateTaskStatus(task._id, 'completed')}
                        disabled={updating}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Completed Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Completed ({completedTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {completedTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No completed tasks</p>
              ) : (
                completedTasks.map(task => (
                  <div key={task._id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {getTaskTypeIcon(task.taskType)}
                          <p className="font-medium ml-2">{task.roomId.roomNumber}</p>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {task.taskType.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.title}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          <span>
                            Completed {new Date(task.completedAt!).toLocaleTimeString()}
                            {task.actualDuration && ` (${task.actualDuration} min)`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}