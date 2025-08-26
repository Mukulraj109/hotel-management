import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import {
  DashboardCard,
  MetricCard,
  ChartCard,
  AlertCard,
  DataTable,
  FilterBar,
  RefreshButton,
  LineChart,
  BarChart,
  DonutChart,
  AreaChart,
  HeatmapChart,
} from '../../components/dashboard';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useDashboardOverview, useOccupancyData, useRevenueData } from '../../hooks/useDashboard';
import { formatCurrency, formatPercentage, formatRelativeTime } from '../../utils/dashboardUtils';

export default function AdminDashboard() {
  // Default hotelId - using actual hotel ID from database
  const [selectedHotelId, setSelectedHotelId] = useState<string>('68ad3f393ee2732df2b5efc6');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch dashboard data
  const {
    realTimeData,
    kpis,
    alerts,
    systemHealth,
    isLoading,
    error
  } = useDashboardOverview(selectedHotelId);

  const occupancyQuery = useOccupancyData(selectedHotelId, { enabled: !!selectedHotelId });
  const revenueQuery = useRevenueData(selectedHotelId, 'month', undefined, undefined, { enabled: !!selectedHotelId });
  console.log('Occupancy Query:', occupancyQuery);
  console.log('Occupancy Query Status:', {
    isLoading: occupancyQuery.isLoading,
    isError: occupancyQuery.isError,
    error: occupancyQuery.error,
    data: occupancyQuery.data
  });
  console.log('Room Data Sample:', occupancyQuery.data?.data?.rooms?.slice(0, 5));
  console.log('Floor Metrics:', occupancyQuery.data?.data?.floorMetrics?.slice(0, 2));
  console.log('Room Statuses:', occupancyQuery.data?.data?.rooms?.map(r => ({ roomNumber: r.roomNumber, status: r.status })).slice(0, 10));
  console.log('Heatmap Data:', (() => {
    const rooms = occupancyQuery.data?.data?.rooms || [];
    const floors: { [key: number]: any[] } = {};
    
    rooms.forEach(room => {
      const floor = parseInt(room.roomNumber.charAt(0));
      if (!floors[floor]) {
        floors[floor] = [];
      }
      floors[floor].push({
        roomNumber: room.roomNumber,
        status: room.status === 'occupied' ? 'occupied' : 
               room.status === 'vacant' ? 'vacant_clean' :
               room.status === 'dirty' ? 'vacant_dirty' :
               room.status === 'maintenance' ? 'maintenance' :
               room.status === 'out_of_order' ? 'out_of_order' : 'vacant_clean',
        color: room.status === 'occupied' ? '#ef4444' : 
               room.status === 'vacant' ? '#10b981' :
               room.status === 'dirty' ? '#f59e0b' :
               room.status === 'maintenance' ? '#f97316' :
               room.status === 'out_of_order' ? '#6b7280' : '#10b981'
      });
    });
    
    return Object.entries(floors).map(([floor, rooms]) => ({
      floor: parseInt(floor),
      rooms: rooms
    }));
  })());
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleFilterChange = (key: string, value: any) => {
    if (key === 'hotelId') {
      setSelectedHotelId(value);
    } else if (key === 'dateRange') {
      setDateRange(value);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load dashboard</h3>
          <p className="text-gray-500 mb-4">There was an error loading the dashboard data.</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time hotel management overview</p>
        </div>
        <div className="flex items-center space-x-3">
          <RefreshButton
            onRefresh={handleRefresh}
            loading={isLoading}
            lastUpdated={realTimeData.data?.data.lastUpdated}
            autoRefresh={true}
            showLastUpdated={true}
          />
        </div>
      </div>

      {/* Filters Section */}
      <FilterBar
        filters={[
          {
            key: 'hotelId',
            label: 'Hotel',
            type: 'select',
            options: [
              { value: '68ad3f393ee2732df2b5efc6', label: 'THE PENTOUZ' },
            ],
            placeholder: 'Select hotel',
          },
          {
            key: 'dateRange',
            label: 'Date Range',
            type: 'daterange',
          },
        ]}
        values={{ hotelId: selectedHotelId, dateRange }}
        onChange={handleFilterChange}
        className="mb-6"
      />

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Monthly Revenue"
          value={realTimeData.data?.data?.monthly?.revenue || 0}
          type="currency"
          trend={{
            value: 12.5,
            direction: 'up',
            label: 'vs last month'
          }}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          }
          color="green"
          loading={isLoading}
        />

        <MetricCard
          title="Occupancy Rate"
          value={kpis.data?.data?.averageOccupancy || 0}
          type="percentage"
          trend={{
            value: kpis.data?.data?.occupancyGrowth || 0,
            direction: (kpis.data?.data?.occupancyGrowth || 0) > 0 ? 'up' : 'down',
            label: 'vs last week'
          }}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          color="blue"
          loading={isLoading}
        />

        <MetricCard
          title="Total Bookings"
          value={realTimeData.data?.data?.overview?.totalBookings || 0}
          trend={{
            value: 8.3,
            direction: 'up',
            label: 'vs last month'
          }}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          }
          color="purple"
          loading={isLoading}
        />

        <MetricCard
          title="Guest Satisfaction"
          value={realTimeData.data?.data?.guestSatisfaction?.averageRating || 0}
          suffix="/5"
          trend={{
            value: kpis.data?.data?.satisfactionGrowth || 0,
            direction: (kpis.data?.data?.satisfactionGrowth || 0) > 0 ? 'up' : 'down',
            label: 'vs last month'
          }}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
          color="yellow"
          loading={isLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <ChartCard
          title="Revenue Trends"
          subtitle="Monthly revenue over time"
          loading={revenueQuery.isLoading}
          error={revenueQuery.error?.message}
          onRefresh={() => revenueQuery.refetch()}
          height="350px"
        >
          <LineChart
            data={revenueQuery.data?.data?.charts?.dailyRevenue || []}
            xDataKey="date"
            lines={[
              {
                dataKey: 'revenue',
                name: 'Revenue',
                color: '#10b981',
              },
              {
                dataKey: 'bookings',
                name: 'Bookings',
                color: '#3b82f6',
              }
            ]}
            height={300}
          />
        </ChartCard>

        {/* Occupancy Chart */}
        <ChartCard
          title="Occupancy by Room Type"
          subtitle="Current occupancy breakdown"
          loading={occupancyQuery.isLoading}
          error={occupancyQuery.error?.message}
          onRefresh={() => occupancyQuery.refetch()}
          height="350px"
        >
          <DonutChart
            data={occupancyQuery.data?.data?.roomTypeDistribution ? Object.entries(occupancyQuery.data.data.roomTypeDistribution).map(([roomType, data]: [string, any]) => ({
              name: roomType.charAt(0).toUpperCase() + roomType.slice(1),
              value: data.total,
              percentage: ((data.available / data.total) * 100)
            })) : []}
            height={300}
            centerContent={
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatPercentage(occupancyQuery.data?.data?.overallMetrics?.occupancyRate || 0)}
                </div>
                <div className="text-sm text-gray-500">Overall</div>
              </div>
            }
          />
        </ChartCard>
      </div>

      {/* Room Status Heatmap */}
      <ChartCard
        title="Room Status Overview"
        subtitle="Real-time room status by floor"
        loading={occupancyQuery.isLoading}
        error={occupancyQuery.error?.message}
        onRefresh={() => occupancyQuery.refetch()}
        height="400px"
      >
        {occupancyQuery.data?.data?.rooms?.length > 0 ? (
          <HeatmapChart
            data={(() => {
              const rooms = occupancyQuery.data?.data?.rooms || [];
              console.log('Raw rooms data:', rooms);
              const floors: { [key: number]: any[] } = {};
              
              rooms.forEach(room => {
                const floor = parseInt(room.roomNumber.charAt(0));
                console.log(`Room ${room.roomNumber} -> Floor ${floor}, Status: ${room.status}`);
                if (!floors[floor]) {
                  floors[floor] = [];
                }
                floors[floor].push({
                  roomNumber: room.roomNumber,
                  status: room.status === 'occupied' ? 'occupied' : 
                         room.status === 'vacant' ? 'vacant_clean' :
                         room.status === 'dirty' ? 'vacant_dirty' :
                         room.status === 'maintenance' ? 'maintenance' :
                         room.status === 'out_of_order' ? 'out_of_order' : 'vacant_clean',
                  color: room.status === 'occupied' ? '#ef4444' : 
                         room.status === 'vacant' ? '#10b981' :
                         room.status === 'dirty' ? '#f59e0b' :
                         room.status === 'maintenance' ? '#f97316' :
                         room.status === 'out_of_order' ? '#6b7280' : '#10b981'
                });
              });
              
              const result = Object.entries(floors).map(([floor, rooms]) => ({
                floor: parseInt(floor),
                rooms: rooms
              }));
              console.log('Final heatmap data:', result);
              return result;
            })()}
            onRoomClick={(room) => console.log('Room clicked:', room)}
            height={350}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p>No room data available</p>
              <p className="text-sm">Check if the backend is running and the hotel ID is correct</p>
            </div>
          </div>
        )}
      </ChartCard>

      {/* Bottom Section - Tables and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2">
          <DataTable
            title="Recent Bookings"
            data={realTimeData.data?.data.recentActivity?.bookings || []}
            columns={[
              {
                key: 'bookingNumber',
                header: 'Booking #',
                width: '140px',
              },
              {
                key: 'userId',
                header: 'Guest',
                render: (_, row) => row.userId?.name || 'N/A',
              },
              {
                key: 'checkIn',
                header: 'Check-in',
                render: (value) => new Date(value).toLocaleDateString(),
              },
              {
                key: 'status',
                header: 'Status',
                render: (value) => <StatusBadge status={value} size="sm" />,
                width: '120px',
              },
              {
                key: 'totalAmount',
                header: 'Amount',
                render: (value) => formatCurrency(value),
                align: 'right' as const,
                width: '100px',
              },
            ]}
            loading={isLoading}
            pageSize={8}
            searchable={true}
          />
        </div>

        {/* Alerts Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Active Alerts</h3>
            <Badge variant="secondary">
              {alerts.data?.data.alerts.length || 0}
            </Badge>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : alerts.data?.data.alerts.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500 text-sm">No active alerts</p>
              </div>
            ) : (
              alerts.data?.data.alerts.slice(0, 5).map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  compact={true}
                  onViewDetails={(alert) => console.log('View alert:', alert)}
                />
              ))
            )}
          </div>

          {(alerts.data?.data.alerts.length || 0) > 5 && (
            <Button variant="secondary" size="sm" className="w-full">
              View All Alerts ({alerts.data?.data.alerts.length})
            </Button>
          )}
        </div>
      </div>

      {/* System Health Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'w-3 h-3 rounded-full',
              systemHealth.data?.data?.overall?.status === 'healthy' ? 'bg-green-500' :
              systemHealth.data?.data?.overall?.status === 'warning' ? 'bg-yellow-500' :
              'bg-red-500'
            )} />
            <span className="text-sm font-medium text-gray-900">
              System Status: {systemHealth.data?.data?.overall?.status || 'Unknown'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Last checked: {systemHealth.data?.data?.overall?.lastUpdated ? 
              formatRelativeTime(systemHealth.data?.data?.overall?.lastUpdated) : 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
}