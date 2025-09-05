import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/utils/toast';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Clock, CheckCircle, AlertTriangle,
  Activity, Award, Target, Calendar, Filter, Download, RefreshCw,
  UserCheck, Timer, Briefcase, BarChart3, PieChart as PieChartIcon,
  AlertCircle, ChevronUp, ChevronDown, Star, Zap, Shield
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface StaffMetrics {
  staffId: string;
  staffName: string;
  department: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  averageCompletionTime: number;
  onTimeCompletions: number;
  lateCompletions: number;
  productivityScore: number;
  completionRate: number;
  onTimeRate: number;
  inspectionPassRate: number;
  uniqueRoomsCleaned?: number;
  tasksByType?: Record<string, number>;
  tasksByPriority?: Record<string, number>;
  overallPerformance?: number;
}

interface DepartmentMetrics {
  department: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  overdueRate: number;
  avgCompletionTime: number;
  efficiency: number;
  staffCount?: number;
  avgTasksPerStaff?: number;
}

interface ProductivityTrend {
  date: string;
  dayOfWeek: string;
  totalTasks: number;
  completedTasks: number;
  overallCompletionRate: number;
  housekeepingRate: number;
  maintenanceRate: number;
  servicesRate: number;
}

interface WorkloadData {
  staffId: string;
  staffName: string;
  department: string;
  currentTasks: number;
  pendingTasks: number;
  completedToday: number;
  urgentTasks: number;
  estimatedWorkload: number;
  status: 'overloaded' | 'busy' | 'normal' | 'light';
  assignedRooms?: string[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const StaffProductivityDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [staffMetrics, setStaffMetrics] = useState<StaffMetrics[]>([]);
  const [departmentMetrics, setDepartmentMetrics] = useState<DepartmentMetrics[]>([]);
  const [productivityTrends, setProductivityTrends] = useState<ProductivityTrend[]>([]);
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [selectedPeriod, selectedDepartment]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      switch (selectedPeriod) {
        case '1d':
          startDate = subDays(endDate, 1);
          break;
        case '7d':
          startDate = subDays(endDate, 7);
          break;
        case '30d':
          startDate = subDays(endDate, 30);
          break;
        case 'month':
          startDate = startOfMonth(endDate);
          break;
      }
      
      // Fetch all data in parallel
      const [staff, departments, trends, workload] = await Promise.all([
        fetchStaffMetrics(startDate, endDate),
        fetchDepartmentMetrics(startDate, endDate),
        fetchProductivityTrends(),
        fetchWorkloadDistribution()
      ]);
      
      setStaffMetrics(staff);
      setDepartmentMetrics(departments);
      setProductivityTrends(trends);
      setWorkloadData(workload);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching productivity data:', error);
      toast.error('Failed to load productivity data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffMetrics = async (startDate: Date, endDate: Date) => {
    // Simulated API call
    return [
      {
        staffId: '1',
        staffName: 'John Doe',
        department: 'housekeeping',
        totalTasks: 45,
        completedTasks: 42,
        pendingTasks: 3,
        averageCompletionTime: 35,
        onTimeCompletions: 38,
        lateCompletions: 4,
        productivityScore: 85,
        completionRate: 93,
        onTimeRate: 90,
        inspectionPassRate: 95,
        uniqueRoomsCleaned: 25,
        overallPerformance: 88
      },
      {
        staffId: '2',
        staffName: 'Jane Smith',
        department: 'housekeeping',
        totalTasks: 38,
        completedTasks: 35,
        pendingTasks: 3,
        averageCompletionTime: 30,
        onTimeCompletions: 33,
        lateCompletions: 2,
        productivityScore: 92,
        completionRate: 92,
        onTimeRate: 94,
        inspectionPassRate: 98,
        uniqueRoomsCleaned: 20,
        overallPerformance: 93
      },
      {
        staffId: '3',
        staffName: 'Mike Johnson',
        department: 'maintenance',
        totalTasks: 22,
        completedTasks: 18,
        pendingTasks: 4,
        averageCompletionTime: 60,
        onTimeCompletions: 15,
        lateCompletions: 3,
        productivityScore: 75,
        completionRate: 82,
        onTimeRate: 83,
        inspectionPassRate: 88,
        overallPerformance: 78
      }
    ];
  };

  const fetchDepartmentMetrics = async (startDate: Date, endDate: Date) => {
    // Simulated API call
    return [
      {
        department: 'Housekeeping',
        totalTasks: 120,
        completedTasks: 108,
        pendingTasks: 8,
        overdueTasks: 4,
        completionRate: 90,
        overdueRate: 3,
        avgCompletionTime: 35,
        efficiency: 87,
        staffCount: 5,
        avgTasksPerStaff: 24
      },
      {
        department: 'Maintenance',
        totalTasks: 45,
        completedTasks: 38,
        pendingTasks: 5,
        overdueTasks: 2,
        completionRate: 84,
        overdueRate: 4,
        avgCompletionTime: 75,
        efficiency: 80,
        staffCount: 3,
        avgTasksPerStaff: 15
      },
      {
        department: 'Front Desk',
        totalTasks: 200,
        completedTasks: 195,
        pendingTasks: 3,
        overdueTasks: 2,
        completionRate: 97,
        overdueRate: 1,
        avgCompletionTime: 15,
        efficiency: 96,
        staffCount: 4,
        avgTasksPerStaff: 50
      }
    ];
  };

  const fetchProductivityTrends = async () => {
    // Simulated API call - last 7 days
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      trends.push({
        date: format(date, 'yyyy-MM-dd'),
        dayOfWeek: format(date, 'EEE'),
        totalTasks: Math.floor(Math.random() * 50) + 30,
        completedTasks: Math.floor(Math.random() * 45) + 25,
        overallCompletionRate: Math.floor(Math.random() * 15) + 80,
        housekeepingRate: Math.floor(Math.random() * 10) + 85,
        maintenanceRate: Math.floor(Math.random() * 15) + 75,
        servicesRate: Math.floor(Math.random() * 10) + 88
      });
    }
    return trends;
  };

  const fetchWorkloadDistribution = async () => {
    // Simulated API call
    return [
      {
        staffId: '1',
        staffName: 'John Doe',
        department: 'housekeeping',
        currentTasks: 3,
        pendingTasks: 5,
        completedToday: 12,
        urgentTasks: 1,
        estimatedWorkload: 4.5,
        status: 'normal' as const,
        assignedRooms: ['101', '102', '103', '201', '202']
      },
      {
        staffId: '2',
        staffName: 'Jane Smith',
        department: 'housekeeping',
        currentTasks: 2,
        pendingTasks: 3,
        completedToday: 15,
        urgentTasks: 0,
        estimatedWorkload: 3.0,
        status: 'light' as const,
        assignedRooms: ['301', '302', '303']
      },
      {
        staffId: '3',
        staffName: 'Mike Johnson',
        department: 'maintenance',
        currentTasks: 4,
        pendingTasks: 6,
        completedToday: 8,
        urgentTasks: 2,
        estimatedWorkload: 8.5,
        status: 'overloaded' as const,
        assignedRooms: []
      }
    ];
  };

  const getStatusColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    const config = {
      overloaded: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      busy: { color: 'bg-orange-100 text-orange-800', icon: Clock },
      normal: { color: 'bg-blue-100 text-blue-800', icon: Activity },
      light: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };
    
    const { color, icon: Icon } = config[status as keyof typeof config] || config.normal;
    
    return (
      <Badge className={cn('flex items-center gap-1', color)}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const topPerformers = staffMetrics
    .sort((a, b) => b.productivityScore - a.productivityScore)
    .slice(0, 5);

  const needsAttention = staffMetrics
    .filter(s => s.productivityScore < 70 || s.pendingTasks > 5)
    .slice(0, 5);

  if (loading && staffMetrics.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Productivity Analytics</h1>
          <p className="text-gray-600">Monitor and analyze staff performance across all departments</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Last updated: {format(lastUpdate, 'HH:mm:ss')}
          </div>
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="housekeeping">Housekeeping</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="front_desk">Front Desk</SelectItem>
              <SelectItem value="laundry">Laundry</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={fetchAllData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Productivity</CardTitle>
            <Activity className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(staffMetrics.reduce((sum, s) => sum + s.productivityScore, 0) / staffMetrics.length)}%
            </div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              +5.2% from last period
            </div>
            <Progress 
              value={Math.round(staffMetrics.reduce((sum, s) => sum + s.productivityScore, 0) / staffMetrics.length)} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Completion Rate</CardTitle>
            <CheckCircle className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                departmentMetrics.reduce((sum, d) => sum + d.completionRate, 0) / departmentMetrics.length
              )}%
            </div>
            <div className="text-sm text-gray-600">
              {departmentMetrics.reduce((sum, d) => sum + d.completedTasks, 0)} of{' '}
              {departmentMetrics.reduce((sum, d) => sum + d.totalTasks, 0)} tasks
            </div>
            <div className="mt-2 flex gap-2">
              {departmentMetrics.map((dept, i) => (
                <div key={i} className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${dept.completionRate}%` }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Response Time</CardTitle>
            <Timer className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                departmentMetrics.reduce((sum, d) => sum + d.avgCompletionTime, 0) / departmentMetrics.length
              )} min
            </div>
            <div className="flex items-center text-sm text-yellow-600">
              <AlertTriangle className="w-4 h-4 mr-1" />
              3 min slower than target
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
              <div className="text-center">
                <div className="font-semibold">HK</div>
                <div>35m</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">MT</div>
                <div>75m</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">FD</div>
                <div>15m</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Utilization</CardTitle>
            <Users className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workloadData.filter(w => w.status === 'busy' || w.status === 'normal').length}/{workloadData.length}
            </div>
            <div className="text-sm text-gray-600">Optimally utilized</div>
            <div className="mt-2 flex gap-1">
              {workloadData.map((w, i) => (
                <div
                  key={i}
                  className={cn('w-2 h-8 rounded', {
                    'bg-red-500': w.status === 'overloaded',
                    'bg-orange-500': w.status === 'busy',
                    'bg-blue-500': w.status === 'normal',
                    'bg-green-500': w.status === 'light'
                  })}
                  title={w.staffName}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="department">Department</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
                <CardDescription>Highest productivity scores this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers.map((staff, index) => (
                    <div key={staff.staffId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn('font-bold text-lg', {
                          'text-yellow-500': index === 0,
                          'text-gray-500': index === 1,
                          'text-orange-500': index === 2,
                          'text-gray-700': index > 2
                        })}>
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{staff.staffName}</div>
                          <div className="text-sm text-gray-600 capitalize">{staff.department}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn('text-xl font-bold', getStatusColor(staff.productivityScore))}>
                          {staff.productivityScore}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {staff.completedTasks}/{staff.totalTasks} tasks
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Needs Attention */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Needs Attention
                </CardTitle>
                <CardDescription>Staff members who may need support</CardDescription>
              </CardHeader>
              <CardContent>
                {needsAttention.length > 0 ? (
                  <div className="space-y-3">
                    {needsAttention.map(staff => (
                      <div key={staff.staffId} className="flex items-center justify-between p-3 border rounded-lg border-red-200 bg-red-50">
                        <div>
                          <div className="font-medium">{staff.staffName}</div>
                          <div className="text-sm text-gray-600 capitalize">{staff.department}</div>
                          <div className="text-xs text-red-600 mt-1">
                            {staff.productivityScore < 70 && 'Low productivity score'}
                            {staff.pendingTasks > 5 && ` • ${staff.pendingTasks} pending tasks`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn('text-xl font-bold', getStatusColor(staff.productivityScore))}>
                            {staff.productivityScore}%
                          </div>
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            {staff.pendingTasks} pending
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    All staff members are performing well
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Department Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Department Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completionRate" fill="#3B82F6" name="Completion %" />
                  <Bar dataKey="efficiency" fill="#10B981" name="Efficiency %" />
                  <Bar dataKey="overdueRate" fill="#EF4444" name="Overdue %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Staff Performance</CardTitle>
              <CardDescription>Detailed metrics for each staff member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {staffMetrics.map(staff => (
                  <div key={staff.staffId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{staff.staffName}</div>
                          <div className="text-sm text-gray-600 capitalize">{staff.department}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn('text-3xl font-bold', getStatusColor(staff.productivityScore))}>
                          {staff.productivityScore}%
                        </div>
                        <div className="text-sm text-gray-500">Productivity Score</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Tasks Completed</div>
                        <div className="text-xl font-semibold">
                          {staff.completedTasks}/{staff.totalTasks}
                        </div>
                        <Progress value={(staff.completedTasks / staff.totalTasks) * 100} className="mt-1" />
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-600">On-Time Rate</div>
                        <div className="text-xl font-semibold">{staff.onTimeRate}%</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {staff.onTimeCompletions} of {staff.completedTasks}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-600">Avg Completion</div>
                        <div className="text-xl font-semibold">{staff.averageCompletionTime}m</div>
                        <div className="text-xs text-gray-500 mt-1">per task</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-600">Inspection Pass</div>
                        <div className="text-xl font-semibold">{staff.inspectionPassRate}%</div>
                        <div className="text-xs text-gray-500 mt-1">quality rate</div>
                      </div>
                    </div>
                    
                    {staff.uniqueRoomsCleaned && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Rooms Cleaned</span>
                          <span className="font-medium">{staff.uniqueRoomsCleaned}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="department" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Distribution by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={departmentMetrics}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ department, totalTasks }) => `${department}: ${totalTasks}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalTasks"
                    >
                      {departmentMetrics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Efficiency Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={departmentMetrics}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="department" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Completion Rate" dataKey="completionRate" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                    <Radar name="Efficiency" dataKey="efficiency" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Department Metrics Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Department</th>
                      <th className="text-center p-2">Staff</th>
                      <th className="text-center p-2">Total Tasks</th>
                      <th className="text-center p-2">Completed</th>
                      <th className="text-center p-2">Pending</th>
                      <th className="text-center p-2">Overdue</th>
                      <th className="text-center p-2">Completion %</th>
                      <th className="text-center p-2">Avg Time</th>
                      <th className="text-center p-2">Efficiency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentMetrics.map((dept, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{dept.department}</td>
                        <td className="text-center p-2">{dept.staffCount}</td>
                        <td className="text-center p-2">{dept.totalTasks}</td>
                        <td className="text-center p-2 text-green-600">{dept.completedTasks}</td>
                        <td className="text-center p-2 text-yellow-600">{dept.pendingTasks}</td>
                        <td className="text-center p-2 text-red-600">{dept.overdueTasks}</td>
                        <td className="text-center p-2">
                          <Badge className={cn({
                            'bg-green-100 text-green-800': dept.completionRate >= 90,
                            'bg-yellow-100 text-yellow-800': dept.completionRate >= 70 && dept.completionRate < 90,
                            'bg-red-100 text-red-800': dept.completionRate < 70
                          })}>
                            {dept.completionRate}%
                          </Badge>
                        </td>
                        <td className="text-center p-2">{dept.avgCompletionTime}m</td>
                        <td className="text-center p-2">
                          <div className="flex items-center justify-center gap-1">
                            {dept.efficiency >= 85 ? (
                              <ChevronUp className="w-4 h-4 text-green-600" />
                            ) : dept.efficiency >= 70 ? (
                              <Activity className="w-4 h-4 text-yellow-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-red-600" />
                            )}
                            {dept.efficiency}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Productivity Trends</CardTitle>
              <CardDescription>Task completion rates over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={productivityTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dayOfWeek" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="overallCompletionRate" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="Overall" />
                  <Area type="monotone" dataKey="housekeepingRate" stackId="2" stroke="#10B981" fill="#10B981" name="Housekeeping" />
                  <Area type="monotone" dataKey="maintenanceRate" stackId="3" stroke="#F59E0B" fill="#F59E0B" name="Maintenance" />
                  <Area type="monotone" dataKey="servicesRate" stackId="4" stroke="#8B5CF6" fill="#8B5CF6" name="Services" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Task Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={productivityTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dayOfWeek" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalTasks" stroke="#3B82F6" name="Total Tasks" />
                    <Line type="monotone" dataKey="completedTasks" stroke="#10B981" name="Completed" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Best Performance</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">Wednesday</div>
                      <div className="text-sm text-gray-600">95% completion rate</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      <span className="font-medium">Needs Improvement</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">Monday</div>
                      <div className="text-sm text-gray-600">78% completion rate</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Weekly Average</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">87%</div>
                      <div className="text-sm text-gray-600">completion rate</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Workload Distribution</CardTitle>
              <CardDescription>Real-time staff workload and task allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workloadData.map(staff => (
                  <div key={staff.staffId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', {
                          'bg-red-100': staff.status === 'overloaded',
                          'bg-orange-100': staff.status === 'busy',
                          'bg-blue-100': staff.status === 'normal',
                          'bg-green-100': staff.status === 'light'
                        })}>
                          <User className={cn('w-5 h-5', {
                            'text-red-600': staff.status === 'overloaded',
                            'text-orange-600': staff.status === 'busy',
                            'text-blue-600': staff.status === 'normal',
                            'text-green-600': staff.status === 'light'
                          })} />
                        </div>
                        <div>
                          <div className="font-medium">{staff.staffName}</div>
                          <div className="text-sm text-gray-600 capitalize">{staff.department}</div>
                        </div>
                      </div>
                      {getStatusBadge(staff.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                      <div>
                        <div className="text-sm text-gray-600">Current</div>
                        <div className="text-xl font-semibold text-blue-600">{staff.currentTasks}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Pending</div>
                        <div className="text-xl font-semibold text-yellow-600">{staff.pendingTasks}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Completed</div>
                        <div className="text-xl font-semibold text-green-600">{staff.completedToday}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Urgent</div>
                        <div className="text-xl font-semibold text-red-600">{staff.urgentTasks}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Est. Hours</div>
                        <div className="text-xl font-semibold">{staff.estimatedWorkload}h</div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Workload Progress</div>
                      <Progress 
                        value={(staff.estimatedWorkload / 8) * 100} 
                        className={cn('h-2', {
                          'bg-red-200': staff.status === 'overloaded',
                          'bg-orange-200': staff.status === 'busy',
                          'bg-blue-200': staff.status === 'normal',
                          'bg-green-200': staff.status === 'light'
                        })}
                      />
                    </div>
                    
                    {staff.assignedRooms && staff.assignedRooms.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm text-gray-600 mb-2">Assigned Rooms</div>
                        <div className="flex flex-wrap gap-2">
                          {staff.assignedRooms.map(room => (
                            <Badge key={room} variant="outline" className="text-xs">
                              Room {room}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workload Balance Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workloadData.filter(w => w.status === 'overloaded').map(staff => (
                  <div key={staff.staffId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-medium">{staff.staffName} is overloaded</div>
                        <div className="text-sm text-gray-600">Consider redistributing {staff.pendingTasks} pending tasks</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Redistribute
                    </Button>
                  </div>
                ))}
                
                {workloadData.filter(w => w.status === 'light').map(staff => (
                  <div key={staff.staffId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium">{staff.staffName} has capacity</div>
                        <div className="text-sm text-gray-600">Can handle {Math.floor((8 - staff.estimatedWorkload) * 2)} more tasks</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Assign Tasks
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffProductivityDashboard;