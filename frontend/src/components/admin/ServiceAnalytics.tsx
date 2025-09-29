import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Star,
  Calendar,
  Filter,
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { serviceTypeService } from '../../services/serviceTypeService';
import { useAuth } from '../../context/AuthContext';

interface ServiceAnalyticsData {
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  averageResponseTime: number;
  averageCompletionTime: number;
  averageRating: number;
  completionRate: number;
  serviceTypeBreakdown: Array<{
    type: string;
    name: string;
    requests: number;
    completionRate: number;
    avgRating: number;
    revenue: number;
  }>;
  dailyTrends: Array<{
    date: string;
    requests: number;
    completed: number;
    revenue: number;
  }>;
  responseTimeDistribution: Array<{
    timeRange: string;
    count: number;
  }>;
  ratingDistribution: Array<{
    rating: number;
    count: number;
  }>;
}

interface TimeFilter {
  label: string;
  value: string;
  days: number;
}

const ServiceAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<ServiceAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilter>({
    label: 'Last 30 Days',
    value: '30d',
    days: 30
  });

  const timeFilters: TimeFilter[] = [
    { label: 'Last 7 Days', value: '7d', days: 7 },
    { label: 'Last 30 Days', value: '30d', days: 30 },
    { label: 'Last 90 Days', value: '90d', days: 90 },
    { label: 'Last Year', value: '1y', days: 365 }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  useEffect(() => {
    if (user?.hotelId) {
      fetchAnalyticsData();
    }
  }, [user?.hotelId, selectedTimeFilter]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Get service type statistics
      const stats = await serviceTypeService.getServiceTypeStats(user?.hotelId);

      // Generate mock enhanced analytics data based on real service types
      const mockAnalyticsData: ServiceAnalyticsData = {
        totalRequests: stats.totalRequests || 150,
        completedRequests: stats.totalCompletedRequests || 135,
        pendingRequests: (stats.totalRequests || 150) - (stats.totalCompletedRequests || 135),
        averageResponseTime: stats.averageResponseTime || 12,
        averageCompletionTime: stats.averageCompletionTime || 45,
        averageRating: stats.averageRating || 4.2,
        completionRate: stats.totalRequests > 0 ? Math.round((stats.totalCompletedRequests / stats.totalRequests) * 100) : 90,
        serviceTypeBreakdown: stats.serviceTypeBreakdown.map(item => ({
          type: item.type,
          name: item.name,
          requests: item.totalRequests,
          completionRate: item.completionRate,
          avgRating: item.averageRating,
          revenue: item.basePrice * item.completedRequests
        })),
        dailyTrends: generateDailyTrends(selectedTimeFilter.days),
        responseTimeDistribution: [
          { timeRange: '0-5 min', count: 45 },
          { timeRange: '5-15 min', count: 60 },
          { timeRange: '15-30 min', count: 30 },
          { timeRange: '30+ min', count: 15 }
        ],
        ratingDistribution: [
          { rating: 5, count: 85 },
          { rating: 4, count: 40 },
          { rating: 3, count: 8 },
          { rating: 2, count: 2 },
          { rating: 1, count: 0 }
        ]
      };

      setAnalyticsData(mockAnalyticsData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const generateDailyTrends = (days: number) => {
    const trends = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      trends.push({
        date: date.toISOString().split('T')[0],
        requests: Math.floor(Math.random() * 20) + 5,
        completed: Math.floor(Math.random() * 18) + 3,
        revenue: Math.floor(Math.random() * 5000) + 1000
      });
    }

    return trends;
  };

  const exportAnalytics = async () => {
    try {
      // In a real implementation, this would call an API endpoint
      const csvData = generateCSVData();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `service-analytics-${selectedTimeFilter.value}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Analytics data exported successfully');
    } catch (error) {
      toast.error('Failed to export analytics data');
    }
  };

  const generateCSVData = (): string => {
    if (!analyticsData) return '';

    const headers = ['Service Type', 'Total Requests', 'Completion Rate', 'Average Rating', 'Revenue'];
    const rows = analyticsData.serviceTypeBreakdown.map(item => [
      item.name,
      item.requests.toString(),
      `${item.completionRate}%`,
      item.avgRating.toFixed(1),
      `₹${item.revenue.toLocaleString()}`
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Analytics</h2>
          <p className="text-gray-600">Comprehensive insights into guest service performance</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedTimeFilter.value}
              onChange={(e) => {
                const filter = timeFilters.find(f => f.value === e.target.value);
                if (filter) setSelectedTimeFilter(filter);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeFilters.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={exportAnalytics} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              +2% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.averageResponseTime}m</div>
            <p className="text-xs text-muted-foreground">
              -3m from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              +0.2 from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Service Type Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.serviceTypeBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="requests"
                >
                  {analyticsData.serviceTypeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Response Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Response Time Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.responseTimeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timeRange" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Daily Request Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={analyticsData.dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="requests"
                stackId="1"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.6}
                name="Total Requests"
              />
              <Area
                type="monotone"
                dataKey="completed"
                stackId="2"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.6}
                name="Completed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Service Type Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Service Type Performance Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Service Type</th>
                  <th className="text-left py-3 px-4">Total Requests</th>
                  <th className="text-left py-3 px-4">Completion Rate</th>
                  <th className="text-left py-3 px-4">Avg Rating</th>
                  <th className="text-left py-3 px-4">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.serviceTypeBreakdown.map((service) => (
                  <tr key={service.type} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{service.name}</td>
                    <td className="py-3 px-4">{service.requests}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${service.completionRate}%` }}
                          ></div>
                        </div>
                        <span>{service.completionRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span>{service.avgRating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">₹{service.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceAnalytics;