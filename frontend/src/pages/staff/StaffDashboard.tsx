import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  ClipboardCheck, 
  AlertTriangle, 
  Wrench,
  Calendar,
  CheckCircle,
  Clock,
  Package,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StaffTaskDashboard } from '../../components/staff/StaffTaskDashboard';
import { 
  staffDashboardService,
  StaffTodayData, 
  StaffTasksData, 
  RoomStatusData, 
  StaffInventoryData 
} from '../../services/staffDashboardService';

interface StaffDashboardData {
  today: StaffTodayData;
  myTasks: StaffTasksData;
  roomStatus: RoomStatusData;
  inventory: StaffInventoryData;
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'rooms' | 'inventory'>('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching real staff dashboard data from API');
      
      // Fetch real data from the backend API using the service
      const [todayRes, tasksRes, roomsRes, inventoryRes] = await Promise.all([
        staffDashboardService.getTodayOverview(),
        staffDashboardService.getMyTasks(),
        staffDashboardService.getRoomStatus(),
        staffDashboardService.getInventorySummary()
      ]);

      const realData: StaffDashboardData = {
        today: todayRes.data.today,
        myTasks: tasksRes.data,
        roomStatus: roomsRes.data,
        inventory: inventoryRes.data
      };

      setData(realData);
      console.log('Real data fetched successfully:', realData);
    } catch (error) {
      console.error('Failed to fetch staff dashboard data:', error);
      
      // Fallback to mock data if API fails
      console.log('Falling back to mock data');
      const mockData: StaffDashboardData = {
        today: {
          checkIns: 0,
          checkOuts: 0,
          pendingHousekeeping: 0,
          pendingMaintenance: 0,
          pendingGuestServices: 0,
          occupancyRate: 0
        },
        myTasks: {
          housekeeping: [],
          maintenance: [],
          guestServices: [],
          totalTasks: 0
        },
        roomStatus: {
          summary: {
            occupied: 0,
            vacant_clean: 0,
            vacant_dirty: 0,
            maintenance: 0,
            out_of_order: 0
          },
          needsAttention: [],
          total: 0
        },
        inventory: {
          lowStockAlert: {
            count: 0,
            items: []
          },
          inspectionsDue: {
            count: 0,
            rooms: []
          }
        }
      };
      
      setData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'housekeeping':
        return <ClipboardCheck className="w-4 h-4" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4" />;
      case 'guest_service':
        return <Users className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load dashboard</h3>
          <Button onClick={fetchDashboardData}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome, {user?.name}!
        </h1>
        <p className="text-gray-600">Staff Dashboard - Today's Operations</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'tasks', label: 'My Tasks', icon: ClipboardCheck },
            { id: 'rooms', label: 'Room Status', icon: Users },
            { id: 'inventory', label: 'Inventory', icon: Package }
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
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Today's Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Check-ins Today</p>
                  <p className="text-2xl font-semibold text-gray-900">{data.today.checkIns}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Check-outs Today</p>
                  <p className="text-2xl font-semibold text-gray-900">{data.today.checkOuts}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">{data.today.occupancyRate}%</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ClipboardCheck className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Housekeeping Tasks</p>
                  <p className="text-2xl font-semibold text-gray-900">{data.today.pendingHousekeeping}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Wrench className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Maintenance Tasks</p>
                  <p className="text-2xl font-semibold text-gray-900">{data.today.pendingMaintenance}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Users className="w-6 h-6 text-pink-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Guest Services</p>
                  <p className="text-2xl font-semibold text-gray-900">{data.today.pendingGuestServices}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button
                onClick={() => setActiveTab('tasks')}
                className="flex items-center justify-center space-x-2"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>View My Tasks</span>
              </Button>
              <Button
                onClick={() => setActiveTab('rooms')}
                variant="secondary"
                className="flex items-center justify-center space-x-2"
              >
                <Users className="w-4 h-4" />
                <span>Room Status</span>
              </Button>
              <Button
                onClick={() => window.location.href = '/staff/housekeeping'}
                variant="secondary"
                className="flex items-center justify-center space-x-2"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Housekeeping</span>
              </Button>
              <Button
                onClick={() => window.location.href = '/staff/maintenance'}
                variant="secondary"
                className="flex items-center justify-center space-x-2"
              >
                <Wrench className="w-4 h-4" />
                <span>Maintenance</span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* My Tasks Tab */}
      {activeTab === 'tasks' && (
        <StaffTaskDashboard />
      )}

      {/* Room Status Tab */}
      {activeTab === 'rooms' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Room Status Overview</h2>

          {/* Status Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Object.entries(data.roomStatus.summary).map(([status, count]) => (
              <Card key={status} className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{count as number}</p>
                  <p className="text-sm text-gray-600 capitalize">
                    {status.replace('_', ' ')}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* Rooms Needing Attention */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rooms Needing Attention</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.roomStatus.needsAttention.map((room, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Room {room.roomNumber}</p>
                      <p className="text-sm text-gray-600 capitalize">{room.type}</p>
                    </div>
                    <Badge
                      variant="default"
                      className={
                        room.status === 'out_of_order' ? 'bg-red-100 text-red-800' :
                        room.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {room.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Inventory Summary</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Stock Items */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Low Stock Alert</h3>
                <Badge variant="default" className="bg-red-100 text-red-800">
                  {data.inventory.lowStockAlert.count} items
                </Badge>
              </div>
              <div className="space-y-3">
                {data.inventory.lowStockAlert.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600 capitalize">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-700">
                        {item.currentStock} / {item.threshold}
                      </p>
                      <p className="text-xs text-red-600">Low Stock</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Inspections Due */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Inspections Due</h3>
                <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                  {data.inventory.inspectionsDue.count} rooms
                </Badge>
              </div>
              <div className="space-y-3">
                {data.inventory.inspectionsDue.rooms.map((room, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Room {room.roomNumber}</p>
                      <p className="text-sm text-gray-600">Inventory inspection needed</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-yellow-700">
                        {room.daysPastDue} days
                      </p>
                      <p className="text-xs text-yellow-600">Overdue</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}