import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Calendar, AlertTriangle, CheckCircle, Settings, TrendingUp, Clock } from 'lucide-react';
import { roomTypeService, RoomType } from '@/services/roomTypeService';
import { availabilityService } from '@/services/availabilityService';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

interface OverbookingRule {
  id: string;
  roomTypeId: string;
  roomTypeName: string;
  allowOverbooking: boolean;
  overbookingLimit: number;
  requiresApproval: boolean;
  seasonalRules?: {
    season: 'peak' | 'off-peak' | 'shoulder';
    startDate: string;
    endDate: string;
    overbookingLimit: number;
  }[];
  lastUpdated: string;
  createdBy: string;
}

interface OverbookingAlert {
  id: string;
  roomTypeId: string;
  roomTypeName: string;
  date: string;
  currentBookings: number;
  availableRooms: number;
  overbookingLevel: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved';
}

interface OverbookingStats {
  totalRoomTypes: number;
  overbookingEnabled: number;
  activeAlerts: number;
  revenueFromOverbooking: number;
  occupancyImprovement: number;
}

export default function OverbookingConfiguration() {
  const { user } = useAuth();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [overbookingRules, setOverbookingRules] = useState<OverbookingRule[]>([]);
  const [alerts, setAlerts] = useState<OverbookingAlert[]>([]);
  const [stats, setStats] = useState<OverbookingStats>({
    totalRoomTypes: 0,
    overbookingEnabled: 0,
    activeAlerts: 0,
    revenueFromOverbooking: 0,
    occupancyImprovement: 0
  });
  const [selectedRoomType, setSelectedRoomType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [allowOverbooking, setAllowOverbooking] = useState(false);
  const [overbookingLimit, setOverbookingLimit] = useState(0);
  const [requiresApproval, setRequiresApproval] = useState(false);

  // Get hotel ID from authenticated user context
  const hotelId = user?.hotelId || '68bc094f80c86bfe258e172b'; // Fallback to default if not in user context

  useEffect(() => {
    if (hotelId) {
      loadData();
    }
  }, [hotelId]);

  // Debug effect to monitor state changes
  useEffect(() => {
    if (selectedRoomType) {
      console.log('🔧 State Effect - Room Type Selected:', selectedRoomType.slice(0,8));
      console.log('🔧 State Effect - Current values:', { 
        allowOverbooking, 
        overbookingLimit, 
        requiresApproval 
      });
    }
  }, [selectedRoomType, allowOverbooking, overbookingLimit, requiresApproval]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load room types
      const roomTypesData = await roomTypeService.getRoomTypes(hotelId, { isActive: true });
      setRoomTypes(roomTypesData);

      // Convert room types to overbooking rules format
      const rules: OverbookingRule[] = roomTypesData.map(rt => ({
        id: rt._id,
        roomTypeId: rt._id,
        roomTypeName: rt.name,
        allowOverbooking: rt.settings?.allowOverbooking || false,
        overbookingLimit: rt.settings?.overbookingLimit || 0,
        requiresApproval: rt.settings?.requiresApproval || false,
        lastUpdated: rt.updatedAt,
        createdBy: 'admin'
      }));
      
      setOverbookingRules(rules);

      // Generate mock alerts for demonstration
      const mockAlerts: OverbookingAlert[] = [
        {
          id: '1',
          roomTypeId: roomTypesData[0]?._id || '',
          roomTypeName: roomTypesData[0]?.name || 'Deluxe Room',
          date: new Date().toISOString().split('T')[0],
          currentBookings: 25,
          availableRooms: 20,
          overbookingLevel: 5,
          severity: 'medium',
          status: 'active'
        },
        {
          id: '2',
          roomTypeId: roomTypesData[1]?._id || '',
          roomTypeName: roomTypesData[1]?.name || 'Suite',
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          currentBookings: 12,
          availableRooms: 10,
          overbookingLevel: 2,
          severity: 'low',
          status: 'active'
        }
      ];
      setAlerts(mockAlerts);

      // Calculate stats
      const enabledCount = rules.filter(rule => rule.allowOverbooking).length;
      setStats({
        totalRoomTypes: rules.length,
        overbookingEnabled: enabledCount,
        activeAlerts: mockAlerts.filter(alert => alert.status === 'active').length,
        revenueFromOverbooking: 15420,
        occupancyImprovement: 8.5
      });

    } catch (error) {
      console.error('Error loading overbooking data:', error);
      toast.error('Failed to load overbooking configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleRoomTypeSelect = (roomTypeId: string) => {
    console.log('🔧 Room Type Selected:', roomTypeId);
    console.log('🔧 Available Room Types:', roomTypes.map(rt => ({ id: rt._id, name: rt.name, settings: rt.settings })));
    console.log('🔧 Available Rules:', overbookingRules.map(r => ({ id: r.roomTypeId, name: r.roomTypeName, settings: { allowOverbooking: r.allowOverbooking, limit: r.overbookingLimit }})));
    
    setSelectedRoomType(roomTypeId);
    const rule = overbookingRules.find(r => r.roomTypeId === roomTypeId);
    const roomType = roomTypes.find(rt => rt._id === roomTypeId);
    
    console.log('🔧 Found Rule:', rule);
    console.log('🔧 Found Room Type:', roomType);
    console.log('🔧 Room Type Settings:', roomType?.settings);
    
    if (rule) {
      console.log('🔧 Using Rule Data - Before setting state:', { 
        allowOverbooking: rule.allowOverbooking, 
        overbookingLimit: rule.overbookingLimit, 
        requiresApproval: rule.requiresApproval 
      });
      setAllowOverbooking(rule.allowOverbooking);
      setOverbookingLimit(rule.overbookingLimit);
      setRequiresApproval(rule.requiresApproval);
    } else if (roomType?.settings) {
      console.log('🔧 Using Room Type Settings:', roomType.settings);
      setAllowOverbooking(roomType.settings.allowOverbooking || false);
      setOverbookingLimit(roomType.settings.overbookingLimit || 0);
      setRequiresApproval(roomType.settings.requiresApproval || false);
    } else {
      console.log('🔧 Using Default Settings - no rule or room type settings found');
      setAllowOverbooking(false);
      setOverbookingLimit(0);
      setRequiresApproval(false);
    }
    
    // Log state after a brief delay to see if it was set
    setTimeout(() => {
      console.log('🔧 State after update:', { 
        selectedRoomType: roomTypeId, 
        allowOverbooking, 
        overbookingLimit, 
        requiresApproval 
      });
    }, 100);
  };

  const handleSaveConfiguration = async () => {
    if (!selectedRoomType) {
      toast.error('Please select a room type');
      return;
    }

    try {
      setSaving(true);
      
      // Update room type with overbooking settings
      await roomTypeService.updateRoomType(selectedRoomType, {
        settings: {
          allowOverbooking,
          overbookingLimit,
          requiresApproval
        }
      });

      // Update local state
      setOverbookingRules(prev => prev.map(rule => 
        rule.roomTypeId === selectedRoomType 
          ? {
              ...rule,
              allowOverbooking,
              overbookingLimit,
              requiresApproval,
              lastUpdated: new Date().toISOString()
            }
          : rule
      ));

      // Recalculate stats
      const updatedRules = overbookingRules.map(rule => 
        rule.roomTypeId === selectedRoomType 
          ? { ...rule, allowOverbooking }
          : rule
      );
      const enabledCount = updatedRules.filter(rule => rule.allowOverbooking).length;
      setStats(prev => ({
        ...prev,
        overbookingEnabled: enabledCount
      }));

      toast.success('Overbooking configuration saved successfully');
    } catch (error) {
      console.error('Error saving overbooking configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const checkOverbookingStatus = async (date: string, roomTypeId?: string) => {
    try {
      const result = await availabilityService.checkOverbooking({
        date,
        roomType: roomTypeId
      });
      
      if (result.isOverbooked) {
        toast.error(`Overbooking detected: ${result.overbookingCount} rooms over capacity`);
      } else {
        toast.success(`No overbooking detected. ${result.availableRooms} rooms available`);
      }
    } catch (error) {
      console.error('Error checking overbooking:', error);
      toast.error('Failed to check overbooking status');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Overbooking Configuration</h1>
          <p className="text-gray-600 mt-1">
            Manage overbooking rules and monitor occupancy optimization
          </p>
        </div>
        <Button onClick={() => { console.log('🔄 Manually refreshing data...'); loadData(); }} disabled={loading}>
          <Settings className="w-4 h-4 mr-2" />
          {loading ? 'Loading...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Room Types</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRoomTypes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overbooking Enabled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overbookingEnabled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Additional Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${stats.revenueFromOverbooking}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Occupancy Boost</p>
                <p className="text-2xl font-bold text-gray-900">+{stats.occupancyImprovement}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Room Type Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Configure Overbooking Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Room Type
                  </label>
                  <Select value={selectedRoomType} onValueChange={handleRoomTypeSelect}>
                    <SelectTrigger className="w-full">
                      <div className="flex items-center justify-between w-full">
                        <span>
                          {selectedRoomType 
                            ? (() => {
                                const selected = roomTypes.find(rt => rt._id === selectedRoomType);
                                return selected ? `${selected.name} (${selected.code})` : "Choose a room type";
                              })()
                            : "Choose a room type"
                          }
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map(rt => (
                        <SelectItem key={rt._id} value={rt._id}>
                          {rt.name} ({rt.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRoomType ? (
                  <div className="space-y-4">
                    {/* Current Status Indicator */}
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {roomTypes.find(rt => rt._id === selectedRoomType)?.name || 'Room Type Not Found'}
                          </h5>
                          <p className="text-sm text-gray-600">
                            Current: {allowOverbooking 
                              ? `${overbookingLimit} rooms allowed for overbooking`
                              : 'Overbooking disabled'
                            }
                          </p>
                          {allowOverbooking && (
                            <p className="text-xs text-blue-600 font-medium">
                              Overbooking Rooms: {overbookingLimit} {overbookingLimit === 1 ? 'room' : 'rooms'}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={allowOverbooking ? "default" : "secondary"}>
                            {allowOverbooking ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              console.log('🔄 Toggle button clicked! Current state:', allowOverbooking);
                              const newState = !allowOverbooking;
                              setAllowOverbooking(newState);
                              if (newState && overbookingLimit === 0) {
                                setOverbookingLimit(1); // Default limit when enabling
                              }
                              console.log('🔄 New state will be:', newState);
                            }}
                          >
                            {allowOverbooking ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Allow Overbooking
                      </label>
                      <Switch 
                        checked={allowOverbooking}
                        onCheckedChange={setAllowOverbooking}
                      />
                    </div>

                    {allowOverbooking && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Overbooking Limit (rooms)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max="50"
                            value={overbookingLimit}
                            onChange={(e) => setOverbookingLimit(parseInt(e.target.value) || 0)}
                            placeholder="Maximum rooms to overbook"
                          />
                        </div>

                      </>
                    )}

                    <Button 
                      onClick={handleSaveConfiguration}
                      disabled={saving}
                      className="w-full"
                    >
                      {saving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Current Rules Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Current Overbooking Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overbookingRules.map(rule => (
                    <div 
                      key={rule.id} 
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedRoomType === rule.roomTypeId 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleRoomTypeSelect(rule.roomTypeId)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{rule.roomTypeName}</h4>
                          <p className="text-sm text-gray-600">
                            {rule.allowOverbooking 
                              ? `Limit: ${rule.overbookingLimit} rooms`
                              : 'Overbooking disabled'
                            }
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={rule.allowOverbooking ? "default" : "secondary"}
                          >
                            {rule.allowOverbooking ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overbooking Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Overbooking</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map(alert => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{alert.roomTypeName}</TableCell>
                        <TableCell>{new Date(alert.date).toLocaleDateString()}</TableCell>
                        <TableCell>{alert.currentBookings}</TableCell>
                        <TableCell>{alert.availableRooms}</TableCell>
                        <TableCell>{alert.overbookingLevel}</TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => checkOverbookingStatus(alert.date, alert.roomTypeId)}
                          >
                            Check Status
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No overbooking alerts at the moment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Occupancy Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Base Occupancy</span>
                    <span className="text-sm font-bold">78.5%</span>
                  </div>
                  <Progress value={78.5} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">With Overbooking</span>
                    <span className="text-sm font-bold">87%</span>
                  </div>
                  <Progress value={87} className="h-2" />
                  
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>+{stats.occupancyImprovement}%</strong> improvement in occupancy rate
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      ${stats.revenueFromOverbooking.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Additional revenue this month</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-lg font-semibold text-blue-600">42</p>
                      <p className="text-xs text-blue-800">Successful Overbooks</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-lg font-semibold text-purple-600">$367</p>
                      <p className="text-xs text-purple-800">Avg. Revenue/Overbook</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}