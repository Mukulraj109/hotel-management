import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Bed, 
  DollarSign, 
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Download,
  Filter,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

interface KPIMetric {
  label: string;
  value: number | string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  format: 'currency' | 'percentage' | 'number' | 'decimal';
}

interface DashboardData {
  kpis: {
    revenue: KPIMetric;
    occupancy: KPIMetric;
    adr: KPIMetric;
    revpar: KPIMetric;
    bookings: KPIMetric;
    cancellations: KPIMetric;
  };
  revenueByChannel: Array<{
    channel: string;
    revenue: number;
    percentage: number;
  }>;
  occupancyTrends: Array<{
    date: string;
    occupancy: number;
    revenue: number;
  }>;
  guestSegmentation: Array<{
    segment: string;
    count: number;
    revenue: number;
  }>;
  topPerformingRooms: Array<{
    roomType: string;
    revenue: number;
    occupancy: number;
  }>;
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
  }>;
}

const ExecutiveDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/analytics/dashboard/metrics?period=${selectedPeriod}`);
      
      if (response.data) {
        const result = response.data;
        setDashboardData(result.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeKPIs = async () => {
    try {
      const response = await fetch('/api/v1/analytics/kpis/realtime', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        // Update only the real-time metrics without full reload
        if (dashboardData) {
          setDashboardData(prev => ({
            ...prev!,
            kpis: {
              ...prev!.kpis,
              revenue: { 
                ...prev!.kpis.revenue, 
                value: result.data.today.revenue 
              },
              occupancy: { 
                ...prev!.kpis.occupancy, 
                value: result.data.today.occupancy.occupancy_rate 
              },
              adr: { 
                ...prev!.kpis.adr, 
                value: result.data.today.adr 
              },
              revpar: { 
                ...prev!.kpis.revpar, 
                value: result.data.today.revpar 
              }
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching real-time KPIs:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      // Refresh real-time KPIs every 5 minutes
      interval = setInterval(fetchRealtimeKPIs, 5 * 60 * 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, dashboardData]);

  const formatValue = (value: number | string, format: string): string => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'decimal':
        return value.toFixed(2);
      default:
        return value.toString();
    }
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decrease':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const exportReport = async () => {
    try {
      const response = await fetch('/api/v1/analytics/reports/executive-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          parameters: {
            period: selectedPeriod,
            export_format: 'pdf'
          }
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `executive-report-${selectedPeriod}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>
          
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={exportReport}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Alerts */}
      {dashboardData?.alerts && dashboardData.alerts.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                System Alerts ({dashboardData.alerts.length})
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                {dashboardData.alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="mt-1">
                    • {alert.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {dashboardData?.kpis && Object.entries(dashboardData.kpis).map(([key, metric]) => (
          <div key={key} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  {metric.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatValue(metric.value, metric.format)}
                </p>
                <div className="flex items-center mt-2">
                  {getChangeIcon(metric.changeType)}
                  <span className={`ml-1 text-sm font-medium ${
                    metric.changeType === 'increase' ? 'text-green-600' : 
                    metric.changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {Math.abs(metric.change)}% vs last period
                  </span>
                </div>
              </div>
              <div className="ml-4">
                {key === 'revenue' && <DollarSign className="h-8 w-8 text-green-500" />}
                {key === 'occupancy' && <Bed className="h-8 w-8 text-blue-500" />}
                {key === 'adr' && <TrendingUp className="h-8 w-8 text-purple-500" />}
                {key === 'revpar' && <BarChart3 className="h-8 w-8 text-orange-500" />}
                {key === 'bookings' && <Users className="h-8 w-8 text-indigo-500" />}
                {key === 'cancellations' && <Calendar className="h-8 w-8 text-red-500" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Channel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue by Channel</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {dashboardData?.revenueByChannel?.map((channel, index) => (
              <div key={channel.channel} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {channel.channel}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatValue(channel.revenue, 'currency')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {channel.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guest Segmentation */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Guest Segmentation</h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {dashboardData?.guestSegmentation?.map((segment, index) => (
              <div key={segment.segment} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: `hsl(${index * 90}, 70%, 60%)` }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {segment.segment}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {segment.count} guests
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatValue(segment.revenue, 'currency')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Performing Room Types</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occupancy Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboardData?.topPerformingRooms?.map((room, index) => (
                <tr key={room.roomType}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {room.roomType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatValue(room.revenue, 'currency')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatValue(room.occupancy, 'percentage')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min(room.occupancy, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;