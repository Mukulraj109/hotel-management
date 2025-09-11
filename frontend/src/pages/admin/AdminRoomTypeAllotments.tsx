import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Calendar, BarChart3, Settings, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import AllotmentCalendar from '../../components/admin/AllotmentCalendar';
import AllotmentAnalytics from '../../components/admin/AllotmentAnalytics';
import { allotmentService, RoomTypeAllotment } from '../../services/allotmentService';

const AdminRoomTypeAllotments: React.FC = () => {
  const [allotments, setAllotments] = useState<RoomTypeAllotment[]>([]);
  const [filteredAllotments, setFilteredAllotments] = useState<RoomTypeAllotment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedAllotment, setSelectedAllotment] = useState<RoomTypeAllotment | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 12
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadAllotments();
    loadDashboard();
  }, [searchParams]);

  useEffect(() => {
    filterAllotments();
  }, [allotments, searchTerm, statusFilter, roomTypeFilter]);

  const loadAllotments = async () => {
    try {
      setLoading(true);
      const params = {
        page: searchParams.get('page') || '1',
        limit: '12',
        search: searchParams.get('search') || '',
        status: searchParams.get('status') || 'all',
        roomTypeId: searchParams.get('roomTypeId') || '',
        sortBy: searchParams.get('sortBy') || 'updatedAt',
        sortOrder: searchParams.get('sortOrder') || 'desc'
      };

      console.log('🔍 [DEBUG] loadAllotments - Starting API call with params:', params);
      console.log('🔍 [DEBUG] loadAllotments - allotmentService:', allotmentService);
      
      const response = await allotmentService.getAllotments(params);
      
      console.log('🔍 [DEBUG] loadAllotments - Response received:', response);
      console.log('🔍 [DEBUG] loadAllotments - Response success:', response?.success);
      console.log('🔍 [DEBUG] loadAllotments - Response data:', response?.data);
      
      if (response?.success) {
        console.log('✅ [SUCCESS] loadAllotments - Setting allotments:', response.data.allotments);
        console.log('✅ [SUCCESS] loadAllotments - Setting pagination:', response.data.pagination);
        setAllotments(response.data.allotments);
        setPagination(response.data.pagination);
      } else {
        console.error('❌ [ERROR] loadAllotments - Response not successful:', response);
        toast.error('Failed to load allotments');
      }
    } catch (error) {
      console.error('❌ [ERROR] loadAllotments - Exception caught:', error);
      console.error('❌ [ERROR] loadAllotments - Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
      toast.error('Failed to load allotments');
    } finally {
      setLoading(false);
      console.log('🏁 [DEBUG] loadAllotments - Finished, loading set to false');
    }
  };

  const loadDashboard = async () => {
    try {
      console.log('🔍 [DEBUG] loadDashboard - Starting dashboard API call');
      console.log('🔍 [DEBUG] loadDashboard - allotmentService:', allotmentService);
      
      const response = await allotmentService.getDashboard();
      
      console.log('🔍 [DEBUG] loadDashboard - Response received:', response);
      console.log('🔍 [DEBUG] loadDashboard - Response success:', response?.success);
      console.log('🔍 [DEBUG] loadDashboard - Response data:', response?.data);
      
      if (response?.success) {
        console.log('✅ [SUCCESS] loadDashboard - Setting dashboard data:', response.data);
        setDashboardData(response.data);
      } else {
        console.error('❌ [ERROR] loadDashboard - Response not successful:', response);
      }
    } catch (error) {
      console.error('❌ [ERROR] loadDashboard - Exception caught:', error);
      console.error('❌ [ERROR] loadDashboard - Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
    }
  };

  const filterAllotments = () => {
    let filtered = [...allotments];

    if (searchTerm) {
      filtered = filtered.filter(allotment =>
        allotment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        allotment.roomTypeId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(allotment => allotment.status === statusFilter);
    }

    if (roomTypeFilter !== 'all') {
      filtered = filtered.filter(allotment => allotment.roomTypeId?._id === roomTypeFilter);
    }

    setFilteredAllotments(filtered);
  };

  const handleCreateAllotment = () => {
    navigate('/admin/room-allotments/create');
  };

  const handleEditAllotment = (allotment: RoomTypeAllotment) => {
    navigate(`/admin/room-allotments/${allotment._id}/edit`);
  };

  const handleViewCalendar = (allotment: RoomTypeAllotment) => {
    setSelectedAllotment(allotment);
    setActiveTab('calendar');
  };

  const handleViewAnalytics = (allotment: RoomTypeAllotment) => {
    setSelectedAllotment(allotment);
    setActiveTab('analytics');
  };

  const handleOptimizeAllotment = async (allotment: RoomTypeAllotment) => {
    try {
      const response = await allotmentService.optimizeAllocations(allotment._id);
      if (response.success) {
        toast.success('Allocations optimized successfully');
        loadAllotments(); // Refresh data
      } else {
        toast.error('Failed to optimize allocations');
      }
    } catch (error) {
      console.error('Error optimizing allotment:', error);
      toast.error('Failed to optimize allocations');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600';
    if (rate >= 70) return 'text-orange-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (selectedAllotment && activeTab === 'calendar') {
    const roomType = {
      _id: selectedAllotment.roomTypeId?._id || selectedAllotment.roomTypeId,
      name: selectedAllotment.roomTypeId?.name || 'Unknown',
      totalInventory: selectedAllotment.defaultSettings?.totalInventory || 0,
      basePrice: 0
    };

    return (
      <div className="p-6">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedAllotment(null);
              setActiveTab('overview');
            }}
            className="mb-4"
          >
            ← Back to Overview
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {selectedAllotment.name} - Calendar View
          </h1>
          <p className="text-gray-600">
            Drag and drop inventory allocations across channels
          </p>
        </div>

        <AllotmentCalendar
          roomTypes={[roomType]}
          selectedRoomType={roomType._id}
          onRoomTypeChange={() => {}}
          dateRange={{
            start: new Date(),
            end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }}
          onDateRangeChange={() => {}}
        />
      </div>
    );
  }

  if (selectedAllotment && activeTab === 'analytics') {
    return (
      <AllotmentAnalytics
        allotment={selectedAllotment}
        onBack={() => {
          setSelectedAllotment(null);
          setActiveTab('overview');
        }}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Room Type Allotments</h1>
          <p className="text-gray-600">Manage inventory allocation across distribution channels</p>
        </div>
        <Button onClick={handleCreateAllotment} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Allotment
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {/* Dashboard Summary Cards */}
          {dashboardData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Allotments</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.totalAllotments}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.totalRoomTypes} room types configured
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Occupancy</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getOccupancyColor(dashboardData.averageOccupancyRate)}`}>
                    {dashboardData.averageOccupancyRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last 30 days average
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.totalChannels}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.topPerformingChannel?.channelName || 'N/A'} performing best
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${dashboardData.totalRevenue.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recommendations Alert */}
          {dashboardData?.recentRecommendations?.length > 0 && (
            <Card className="mb-6 border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="w-5 h-5" />
                  Optimization Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.recentRecommendations.slice(0, 3).map((rec: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                      <div>
                        <span className="text-sm font-medium">{rec.type.replace('_', ' ')}</span>
                        <p className="text-xs text-gray-600">{rec.impact}</p>
                      </div>
                      <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                        {rec.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search allotments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Room Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Room Types</SelectItem>
                    {/* Room types would be loaded from API */}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Allotments Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAllotments.map((allotment) => (
                <Card key={allotment._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold truncate">
                          {allotment.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {allotment.roomTypeId?.name || 'Unknown Room Type'}
                        </p>
                      </div>
                      <Badge className={getStatusColor(allotment.status)}>
                        {allotment.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Total Inventory</span>
                          <p className="font-semibold">{allotment.defaultSettings?.totalInventory || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Occupancy</span>
                          <p className={`font-semibold ${getOccupancyColor(allotment.overallOccupancyRate || 0)}`}>
                            {allotment.overallOccupancyRate?.toFixed(1) || 0}%
                          </p>
                        </div>
                      </div>

                      {/* Active Channels */}
                      <div>
                        <span className="text-sm text-gray-600">Active Channels</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {allotment.channels?.filter(c => c.isActive).slice(0, 3).map((channel, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {channel.channelName}
                            </Badge>
                          ))}
                          {allotment.channels?.filter(c => c.isActive).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{allotment.channels.filter(c => c.isActive).length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewCalendar(allotment)}
                          className="flex-1"
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          Calendar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewAnalytics(allotment)}
                        >
                          <BarChart3 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOptimizeAllotment(allotment)}
                        >
                          <TrendingUp className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredAllotments.length === 0 && !loading && (
            <div className="text-center py-12">
              <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No allotments found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' || roomTypeFilter !== 'all'
                  ? 'No allotments match your current filters.'
                  : 'Create your first room type allotment configuration to get started.'}
              </p>
              {(!searchTerm && statusFilter === 'all' && roomTypeFilter === 'all') && (
                <Button onClick={handleCreateAllotment} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Allotment
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6">
          <div className="space-y-6">
            {/* Channel Performance */}
            {dashboardData?.topPerformingChannel && (
              <Card>
                <CardHeader>
                  <CardTitle>Channel Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.topPerformingChannel ? (
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-green-900">Top Performer</h4>
                          <p className="text-sm text-green-700">{dashboardData.topPerformingChannel.channelName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-900">
                            {(dashboardData.topPerformingChannel.utilizationRate || 0).toFixed(1)}%
                          </p>
                          <p className="text-sm text-green-700">Utilization</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-600">No Channel Data Available</h4>
                          <p className="text-sm text-gray-500">Performance data will appear once bookings are made</p>
                        </div>
                      </div>
                    )}

                    {dashboardData.lowUtilizationChannels?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Low Utilization Channels</h4>
                        <div className="space-y-2">
                          {dashboardData.lowUtilizationChannels.map((channel: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded">
                              <span className="text-sm">{channel.channelName}</span>
                              <Badge variant="outline" className="text-orange-600">
                                {channel.utilizationRate.toFixed(1)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Recommendations */}
            {dashboardData?.recentRecommendations?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData.recentRecommendations.map((rec: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium capitalize">{rec.type.replace('_', ' ')}</h4>
                          <p className="text-sm text-gray-600">{rec.impact}</p>
                          <p className="text-xs text-gray-500">
                            Confidence: {rec.confidence}% • Created: {new Date(rec.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                          {rec.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Allotment Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Global Settings</h4>
                  <p className="text-sm text-gray-600 mb-4">Configure default settings for new allotments</p>
                  {/* Settings would be implemented here */}
                  <div className="p-4 bg-gray-50 rounded text-center text-gray-600">
                    Global allotment settings coming soon
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Integration Settings</h4>
                  <p className="text-sm text-gray-600 mb-4">Configure channel manager and PMS integrations</p>
                  <div className="p-4 bg-gray-50 rounded text-center text-gray-600">
                    Integration settings coming soon
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminRoomTypeAllotments;