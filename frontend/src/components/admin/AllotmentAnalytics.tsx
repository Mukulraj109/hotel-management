import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  Download,
  RefreshCwCw,
  Target,
  Activity,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface AllotmentAnalyticsProps {
  allotment: any;
  onBack: () => void;
}

const CHANNEL_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
];

export default function AllotmentAnalytics({ allotment, onBack }: AllotmentAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [selectedMetric, setSelectedMetric] = useState('occupancy');

  useEffect(() => {
    loadAnalytics();
  }, [allotment._id, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, parseInt(timeRange));
      
      const response = await fetch(
        `/api/v1/allotments/${allotment._id}/analytics?` +
        new URLSearchParams({
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        })
      );
      
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      } else {
        throw new Error('Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getMetricColor = (value: number, type: 'occupancy' | 'revenue') => {
    if (type === 'occupancy') {
      if (value >= 85) return 'text-green-600';
      if (value >= 70) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-blue-600';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={onBack} className="mb-6">
          ← Back to Overview
        </Button>
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-600">Unable to load analytics data for this allotment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {allotment.name} - Analytics
            </h1>
            <p className="text-gray-600">Performance insights and channel analytics</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Occupancy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMetricColor(analyticsData.summary.averageOccupancy, 'occupancy')}`}>
              {formatPercentage(analyticsData.summary.averageOccupancy)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(analyticsData.summary.occupancyTrend)}
              <span className="ml-1">
                {analyticsData.summary.occupancyTrend > 0 ? '+' : ''}
                {formatPercentage(analyticsData.summary.occupancyTrend)} from last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analyticsData.summary.totalRevenue)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(analyticsData.summary.revenueTrend)}
              <span className="ml-1">
                {analyticsData.summary.revenueTrend > 0 ? '+' : ''}
                {formatPercentage(analyticsData.summary.revenueTrend)} from last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.summary.totalBookings.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(analyticsData.summary.bookingsTrend)}
              <span className="ml-1">
                {analyticsData.summary.bookingsTrend > 0 ? '+' : ''}
                {analyticsData.summary.bookingsTrend.toFixed(1)} from last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Channel</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {analyticsData.summary.topChannel.name}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {formatPercentage(analyticsData.summary.topChannel.occupancy)} occupancy
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {/* Daily Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Performance</CardTitle>
              <CardDescription>
                Occupancy rates and revenue across the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.dailyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                      formatter={(value: number, name: string) => [
                        name === 'revenue' ? formatCurrency(value) : formatPercentage(value),
                        name === 'revenue' ? 'Revenue' : 'Occupancy'
                      ]}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="occupancy"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      name="Occupancy (%)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stackId="2"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      name="Revenue ($)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Room Utilization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Room Utilization</CardTitle>
                <CardDescription>Average utilization by day of week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.utilizationByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [formatPercentage(value), 'Utilization']} />
                      <Bar dataKey="utilization" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Lead Time</CardTitle>
                <CardDescription>Distribution of booking lead times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.leadTimeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analyticsData.leadTimeDistribution.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          {/* Channel Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Channel Performance Comparison</CardTitle>
              <CardDescription>
                Revenue and occupancy rates by distribution channel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.channelPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channelName" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'revenue' ? formatCurrency(value) : formatPercentage(value),
                        name === 'revenue' ? 'Revenue' : 'Occupancy'
                      ]}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="occupancy" fill="#3b82f6" name="Occupancy (%)" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Channel Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Channel Details</CardTitle>
              <CardDescription>Detailed performance metrics by channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Channel</th>
                      <th className="text-right p-2">Bookings</th>
                      <th className="text-right p-2">Revenue</th>
                      <th className="text-right p-2">Occupancy</th>
                      <th className="text-right p-2">ADR</th>
                      <th className="text-right p-2">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.channelPerformance.map((channel: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CHANNEL_COLORS[index % CHANNEL_COLORS.length] }}
                            />
                            <span className="font-medium">{channel.channelName}</span>
                          </div>
                        </td>
                        <td className="text-right p-2">{channel.bookings}</td>
                        <td className="text-right p-2">{formatCurrency(channel.revenue)}</td>
                        <td className="text-right p-2">
                          <span className={getMetricColor(channel.occupancy, 'occupancy')}>
                            {formatPercentage(channel.occupancy)}
                          </span>
                        </td>
                        <td className="text-right p-2">{formatCurrency(channel.adr)}</td>
                        <td className="text-right p-2">{formatPercentage(channel.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Revenue Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Revenue performance over time by channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.dailyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Total Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Seasonal Patterns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Seasonal Patterns</CardTitle>
                <CardDescription>Average occupancy by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.seasonalPatterns}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [formatPercentage(value), 'Occupancy']} />
                      <Bar dataKey="occupancy" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Patterns</CardTitle>
                <CardDescription>Bookings by day of week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.bookingPatterns}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="bookings" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          {/* Optimization Recommendations */}
          {analyticsData.recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
                <CardDescription>AI-powered suggestions to improve performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.recommendations.map((rec: any, index: number) => (
                    <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                            {rec.priority} priority
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Confidence: {rec.confidence}%
                          </span>
                        </div>
                        <h4 className="font-medium capitalize mb-1">
                          {rec.type.replace('_', ' ')}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">{rec.impact}</p>
                        <p className="text-xs text-gray-500">
                          Expected impact: {rec.expectedImpact}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Apply
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Channel Efficiency</CardTitle>
                <CardDescription>Revenue per booking by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.channelEfficiency}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="channelName" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue per Booking']} />
                      <Bar dataKey="revenuePerBooking" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Allocation Efficiency</CardTitle>
                <CardDescription>Utilization rates by allocation method</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.allocationEfficiency.map((method: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {method.method.replace('_', ' ')}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${method.efficiency}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12">
                          {formatPercentage(method.efficiency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}