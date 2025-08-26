import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRooms, useRoomMetrics, useUpdateRoomStatus, useBulkUpdateStatus } from '../../hooks/useRooms';
import { MetricCard, RefreshButton, ChartCard, BarChart } from '../../components/dashboard';
import { formatPercentage, formatCurrency } from '../../utils/dashboardUtils';
import { Room } from '../../services/roomsService';

export default function AdminRooms() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  
  // Filter and action states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  // Real-time integration states
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(30000); // 30 seconds
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [changedRooms, setChangedRooms] = useState<Set<string>>(new Set());
  
  // Use user's hotel ID or fallback
  const hotelId = user?.hotelId || '68ad53aabf854d3c206b8555';
  
  // Fetch rooms data and metrics with real-time configuration
  const roomsQuery = useRooms({ 
    hotelId,
    limit: 100, // Get more rooms for accurate metrics
    enabled: !!hotelId,
    refetchInterval: realTimeEnabled ? autoRefreshInterval : false,
    staleTime: realTimeEnabled ? 15000 : 5 * 60 * 1000, // 15s when real-time, 5min otherwise
  });
  
  const metricsQuery = useRoomMetrics(hotelId, { 
    enabled: !!hotelId,
    refetchInterval: realTimeEnabled ? autoRefreshInterval : false,
  });
  
  // Mutation hooks
  const updateRoomStatus = useUpdateRoomStatus();
  const bulkUpdateStatus = useBulkUpdateStatus();
  
  const isLoading = roomsQuery.isLoading || metricsQuery.isLoading;
  const error = roomsQuery.error || metricsQuery.error;

  // Filter rooms based on selected filters
  const filteredRooms = useMemo(() => {
    let rooms = roomsQuery.data?.rooms || [];
    
    if (statusFilter !== 'all') {
      rooms = rooms.filter(room => room.status === statusFilter);
    }
    
    if (typeFilter !== 'all') {
      rooms = rooms.filter(room => room.type === typeFilter);
    }
    
    if (floorFilter !== 'all') {
      rooms = rooms.filter(room => room.floor.toString() === floorFilter);
    }
    
    return rooms;
  }, [roomsQuery.data?.rooms, statusFilter, typeFilter, floorFilter]);

  // Real-time change detection
  const previousRooms = useMemo(() => {
    return roomsQuery.data?.rooms || [];
  }, [roomsQuery.dataUpdatedAt]);

  // Detect room changes for visual feedback
  useEffect(() => {
    if (previousRooms.length > 0 && roomsQuery.data?.rooms) {
      const currentRooms = roomsQuery.data.rooms;
      const newChangedRooms = new Set<string>();
      
      currentRooms.forEach(currentRoom => {
        const previousRoom = previousRooms.find(r => r._id === currentRoom._id);
        if (previousRoom && previousRoom.status !== currentRoom.status) {
          newChangedRooms.add(currentRoom._id);
        }
      });
      
      if (newChangedRooms.size > 0) {
        setChangedRooms(newChangedRooms);
        setLastUpdateTime(new Date());
        
        // Clear change indicators after 5 seconds
        setTimeout(() => {
          setChangedRooms(new Set());
        }, 5000);
      }
    }
  }, [roomsQuery.data?.rooms, previousRooms]);

  // Connection status monitoring
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('connected');
    const handleOffline = () => setConnectionStatus('disconnected');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial status
    setConnectionStatus(navigator.onLine ? 'connected' : 'disconnected');
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle query errors for connection status
  useEffect(() => {
    if (roomsQuery.error || metricsQuery.error) {
      setConnectionStatus('disconnected');
    } else if (roomsQuery.isLoading || metricsQuery.isLoading) {
      setConnectionStatus('reconnecting');
    } else {
      setConnectionStatus('connected');
    }
  }, [roomsQuery.error, metricsQuery.error, roomsQuery.isLoading, metricsQuery.isLoading]);

  // Auto-reconnect when back online
  const handleReconnect = useCallback(() => {
    setConnectionStatus('reconnecting');
    roomsQuery.refetch();
    metricsQuery.refetch();
  }, [roomsQuery, metricsQuery]);

  // Calculate metrics from rooms data if metrics API doesn't exist
  const calculateMetrics = () => {
    const rooms = roomsQuery.data?.rooms || [];
    if (rooms.length === 0) return null;
    
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
    const availableRooms = rooms.filter(r => r.status === 'vacant').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;
    const outOfOrderRooms = rooms.filter(r => r.status === 'out_of_order').length;
    const dirtyRooms = rooms.filter(r => r.status === 'dirty').length;
    
    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      maintenanceRooms,
      outOfOrderRooms,
      dirtyRooms,
      occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
      availabilityRate: totalRooms > 0 ? (availableRooms / totalRooms) * 100 : 0,
    };
  };

  // Use API metrics if available, otherwise calculate from rooms data
  const metrics = metricsQuery.data || calculateMetrics();

  // Calculate floor-wise distribution
  const calculateFloorData = () => {
    const rooms = roomsQuery.data?.rooms || [];
    if (rooms.length === 0) return [];
    
    const floorMap = new Map();
    
    rooms.forEach(room => {
      const floor = room.floor;
      if (!floorMap.has(floor)) {
        floorMap.set(floor, {
          floor,
          totalRooms: 0,
          occupied: 0,
          available: 0,
          maintenance: 0,
          outOfOrder: 0,
          dirty: 0,
        });
      }
      
      const floorData = floorMap.get(floor);
      floorData.totalRooms++;
      
      switch (room.status) {
        case 'occupied':
          floorData.occupied++;
          break;
        case 'vacant':
          floorData.available++;
          break;
        case 'maintenance':
          floorData.maintenance++;
          break;
        case 'out_of_order':
          floorData.outOfOrder++;
          break;
        case 'dirty':
          floorData.dirty++;
          break;
      }
    });
    
    // Convert to array and sort by floor number
    return Array.from(floorMap.values()).sort((a, b) => a.floor - b.floor);
  };

  const floorData = calculateFloorData();
  
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    roomsQuery.refetch();
    metricsQuery.refetch();
  };

  // Room selection handlers
  const handleRoomSelect = (roomId: string) => {
    const newSelection = new Set(selectedRooms);
    if (newSelection.has(roomId)) {
      newSelection.delete(roomId);
    } else {
      newSelection.add(roomId);
    }
    setSelectedRooms(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedRooms.size === filteredRooms.length) {
      setSelectedRooms(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedRooms(new Set(filteredRooms.map(room => room._id)));
      setShowBulkActions(true);
    }
  };

  const handleClearSelection = () => {
    setSelectedRooms(new Set());
    setShowBulkActions(false);
  };

  // Quick action handlers
  const handleQuickStatusUpdate = async (roomId: string, newStatus: Room['status']) => {
    setIsPerformingAction(true);
    try {
      await updateRoomStatus.mutateAsync({ id: roomId, status: newStatus });
    } catch (error) {
      console.error('Failed to update room status:', error);
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: Room['status']) => {
    if (selectedRooms.size === 0) return;
    
    setIsPerformingAction(true);
    try {
      await bulkUpdateStatus.mutateAsync({
        roomIds: Array.from(selectedRooms),
        status: newStatus
      });
      handleClearSelection();
    } catch (error) {
      console.error('Failed to bulk update room status:', error);
    } finally {
      setIsPerformingAction(false);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setFloorFilter('all');
    setSelectedFloor(null);
    handleClearSelection();
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load room data</h3>
          <p className="text-gray-500 mb-4">There was an error loading the room information.</p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Room Management</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all hotel rooms</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Real-time Controls */}
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-2">
            {/* Connection Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`}></div>
              <span className="text-xs text-gray-600">
                {connectionStatus === 'connected' ? 'Live' : 
                 connectionStatus === 'reconnecting' ? 'Reconnecting' : 
                 'Offline'}
              </span>
            </div>

            {/* Real-time Toggle */}
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="checkbox"
                checked={realTimeEnabled}
                onChange={(e) => setRealTimeEnabled(e.target.checked)}
                className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-xs text-gray-600">Real-time</span>
            </label>

            {/* Refresh Interval Selector */}
            {realTimeEnabled && (
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
                <option value={60000}>1m</option>
                <option value={300000}>5m</option>
              </select>
            )}
          </div>

          {/* Connection Issues Banner */}
          {connectionStatus === 'disconnected' && (
            <button
              onClick={handleReconnect}
              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors"
            >
              Reconnect
            </button>
          )}

          {/* Last Update Time */}
          {lastUpdateTime && (
            <div className="text-xs text-gray-500">
              Updated {lastUpdateTime.toLocaleTimeString()}
            </div>
          )}

          <RefreshButton
            onRefresh={handleRefresh}
            loading={isLoading}
            lastUpdated={new Date().toISOString()}
            autoRefresh={realTimeEnabled}
            showLastUpdated={false}
          />
        </div>
      </div>

      {/* Phase 5: Filters and Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filter Section */}
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="vacant">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="dirty">Dirty/Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="out_of_order">Out of Order</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="suite">Suite</option>
                  <option value="deluxe">Deluxe</option>
                </select>
              </div>

              {/* Floor Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
                <select
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Floors</option>
                  {floorData.map(floor => (
                    <option key={floor.floor} value={floor.floor.toString()}>
                      Floor {floor.floor}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
                <div className="space-y-2">
                  <button
                    onClick={handleResetFilters}
                    className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Results Summary */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredRooms.length} of {roomsQuery.data?.rooms?.length || 0} rooms
              {selectedRooms.size > 0 && (
                <span className="ml-2 text-blue-600">
                  • {selectedRooms.size} selected
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="lg:w-80">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-4">
              {/* Selection Controls */}
              <div className="flex space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="flex-1 px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                >
                  {selectedRooms.size === filteredRooms.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedRooms.size > 0 && (
                  <button
                    onClick={handleClearSelection}
                    className="px-4 py-2 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Bulk Status Updates */}
              {showBulkActions && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">
                    Bulk Actions ({selectedRooms.size} rooms)
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleBulkStatusUpdate('vacant')}
                      disabled={isPerformingAction}
                      className="px-3 py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                      Mark Available
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('dirty')}
                      disabled={isPerformingAction}
                      className="px-3 py-2 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                    >
                      Mark Dirty
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('maintenance')}
                      disabled={isPerformingAction}
                      className="px-3 py-2 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      Maintenance
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('out_of_order')}
                      disabled={isPerformingAction}
                      className="px-3 py-2 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                      Out of Order
                    </button>
                  </div>
                  {isPerformingAction && (
                    <div className="mt-2 text-xs text-blue-600">
                      Updating rooms...
                    </div>
                  )}
                </div>
              )}

              {/* Quick Stats for Filtered Data */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Filtered Results</h4>
                <div className="space-y-1 text-xs text-gray-600">
                  <div>Available: {filteredRooms.filter(r => r.status === 'vacant').length}</div>
                  <div>Occupied: {filteredRooms.filter(r => r.status === 'occupied').length}</div>
                  <div>Maintenance: {filteredRooms.filter(r => r.status === 'maintenance').length}</div>
                  <div>Out of Order: {filteredRooms.filter(r => r.status === 'out_of_order').length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 1: Room Overview Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {/* Total Rooms */}
        <MetricCard
          title="Total Rooms"
          value={metrics?.totalRooms || 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          color="blue"
          loading={isLoading}
        />

        {/* Available Rooms */}
        <MetricCard
          title="Available"
          value={metrics?.availableRooms || 0}
          trend={{
            value: metrics?.availabilityRate || 0,
            direction: 'up',
            label: 'availability rate'
          }}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="green"
          loading={isLoading}
        />

        {/* Occupied Rooms */}
        <MetricCard
          title="Occupied"
          value={metrics?.occupiedRooms || 0}
          trend={{
            value: metrics?.occupancyRate || 0,
            direction: metrics && metrics.occupancyRate > 70 ? 'up' : 'down',
            label: 'occupancy rate'
          }}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="purple"
          loading={isLoading}
        />

        {/* Maintenance Rooms */}
        <MetricCard
          title="Maintenance"
          value={metrics?.maintenanceRooms || 0}
          suffix={metrics?.totalRooms ? ` of ${metrics.totalRooms}` : ''}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          color="orange"
          loading={isLoading}
        />

        {/* Out of Order Rooms */}
        <MetricCard
          title="Out of Order"
          value={metrics?.outOfOrderRooms || 0}
          suffix={metrics?.totalRooms ? ` of ${metrics.totalRooms}` : ''}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          }
          color="red"
          loading={isLoading}
        />
      </div>

      {/* Phase 2: Floor-wise Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Floor Distribution Bar Chart */}
        <ChartCard
          title="Rooms by Floor"
          subtitle="Total room count per floor"
          loading={isLoading}
          error={roomsQuery.error?.message}
          onRefresh={() => roomsQuery.refetch()}
          height="400px"
        >
          <BarChart
            data={floorData.map(floor => ({
              floor: `Floor ${floor.floor}`,
              totalRooms: floor.totalRooms,
              occupied: floor.occupied,
              available: floor.available,
              maintenance: floor.maintenance,
              outOfOrder: floor.outOfOrder,
            }))}
            xDataKey="floor"
            bars={[
              { dataKey: 'totalRooms', name: 'Total Rooms', color: '#3b82f6' },
            ]}
            height={350}
            showGrid={true}
            showLegend={false}
            showTooltip={true}
          />
        </ChartCard>

        {/* Floor Status Breakdown */}
        <ChartCard
          title="Floor Status Breakdown"
          subtitle={selectedFloor ? `Floor ${selectedFloor} details` : 'Select a floor to view details'}
          loading={isLoading}
          error={roomsQuery.error?.message}
          onRefresh={() => roomsQuery.refetch()}
          height="400px"
        >
          {selectedFloor ? (
            <div className="p-4">
              {(() => {
                const floor = floorData.find(f => f.floor === selectedFloor);
                if (!floor) return <p className="text-gray-500">No data for selected floor</p>;
                
                const statusData = [
                  { name: 'Available', value: floor.available, color: '#10b981' },
                  { name: 'Occupied', value: floor.occupied, color: '#8b5cf6' },
                  { name: 'Maintenance', value: floor.maintenance, color: '#f97316' },
                  { name: 'Dirty', value: floor.dirty, color: '#eab308' },
                  { name: 'Out of Order', value: floor.outOfOrder, color: '#ef4444' },
                ].filter(item => item.value > 0);

                return (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">Floor {selectedFloor}</h3>
                      <p className="text-gray-600">{floor.totalRooms} total rooms</p>
                    </div>
                    
                    <div className="space-y-3">
                      {statusData.map(item => {
                        const percentage = (item.value / floor.totalRooms) * 100;
                        return (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-4 h-4 rounded" 
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{item.value}</div>
                              <div className="text-sm text-gray-500">{percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t">
                      <button
                        onClick={() => setSelectedFloor(null)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        ← Back to all floors
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-lg font-medium">Click on a floor bar</p>
                <p className="text-sm">to see detailed room status breakdown</p>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Quick Floor Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Floor Navigation</h3>
        <div className="flex flex-wrap gap-2">
          {floorData.map(floor => {
            const occupancyRate = floor.totalRooms > 0 ? (floor.occupied / floor.totalRooms) * 100 : 0;
            const isSelected = selectedFloor === floor.floor;
            
            return (
              <button
                key={floor.floor}
                onClick={() => setSelectedFloor(isSelected ? null : floor.floor)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  isSelected 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="text-sm font-medium">Floor {floor.floor}</div>
                <div className="text-xs">
                  {floor.occupied}/{floor.totalRooms} occupied
                  <span className="ml-1">({occupancyRate.toFixed(0)}%)</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phase 3: Revenue Metrics Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Revenue & Performance Metrics</h2>
          <p className="text-gray-600 mt-1">Key financial and operational indicators</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Average Daily Rate (ADR) */}
          <MetricCard
            title="Average Daily Rate"
            subtitle="ADR"
            value={formatCurrency(
              roomsQuery.data?.rooms && roomsQuery.data.rooms.length > 0
                ? roomsQuery.data.rooms.reduce((sum, room) => sum + (room.currentRate || 0), 0) / roomsQuery.data.rooms.length
                : 0
            )}
            icon={
              <div className="w-6 h-6 flex items-center justify-center text-lg font-bold">
                ₹
              </div>
            }
            color="green"
            loading={isLoading}
            trend={{
              value: 12.5,
              direction: 'up',
              label: 'vs last month'
            }}
          />

          {/* Revenue Per Available Room (RevPAR) */}
          <MetricCard
            title="Revenue Per Available Room"
            subtitle="RevPAR"
            value={formatCurrency(
              roomsQuery.data?.rooms && roomsQuery.data.rooms.length > 0 && metrics
                ? (roomsQuery.data.rooms.reduce((sum, room) => sum + (room.currentRate || 0), 0) / roomsQuery.data.rooms.length) * 
                  (metrics.occupancyRate / 100)
                : 0
            )}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            }
            color="blue"
            loading={isLoading}
            trend={{
              value: 8.3,
              direction: 'up',
              label: 'vs last month'
            }}
          />

          {/* Occupancy Rate */}
          <MetricCard
            title="Occupancy Rate"
            subtitle="Current Period"
            value={formatPercentage(metrics?.occupancyRate || 0)}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            color="purple"
            loading={isLoading}
            trend={{
              value: metrics?.occupancyRate || 0,
              direction: (metrics?.occupancyRate || 0) > 70 ? 'up' : 'down',
              label: 'target: 80%'
            }}
          />

          {/* Total Revenue Potential */}
          <MetricCard
            title="Daily Revenue Potential"
            subtitle="If 100% occupied"
            value={formatCurrency(
              roomsQuery.data?.rooms && roomsQuery.data.rooms.length > 0
                ? roomsQuery.data.rooms.reduce((sum, room) => sum + (room.currentRate || 0), 0)
                : 0
            )}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            color="orange"
            loading={isLoading}
          />
        </div>

        {/* Revenue breakdown by room type */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Room Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const rooms = roomsQuery.data?.rooms || [];
              const roomTypes = ['single', 'double', 'suite', 'deluxe'];
              
              return roomTypes.map(type => {
                const typeRooms = rooms.filter(room => room.type === type);
                const totalRooms = typeRooms.length;
                const occupiedRooms = typeRooms.filter(room => room.status === 'occupied').length;
                const averageRate = totalRooms > 0 
                  ? typeRooms.reduce((sum, room) => sum + (room.currentRate || 0), 0) / totalRooms 
                  : 0;
                const dailyRevenue = occupiedRooms * averageRate;
                
                if (totalRooms === 0) return null;
                
                return (
                  <div key={type} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-900 capitalize mb-2">
                      {type} Rooms
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-600">
                        {occupiedRooms}/{totalRooms} occupied
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        Avg Rate: {formatCurrency(averageRate)}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(dailyRevenue)}
                      </div>
                      <div className="text-xs text-gray-500">daily revenue</div>
                    </div>
                  </div>
                );
              }).filter(Boolean);
            })()}
          </div>
        </div>

        {/* Performance indicators */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(metrics?.availabilityRate || 0)}
              </div>
              <div className="text-sm text-gray-600">Availability Rate</div>
              <div className={`text-xs mt-1 ${(metrics?.availabilityRate || 0) > 20 ? 'text-green-600' : 'text-orange-600'}`}>
                {(metrics?.availabilityRate || 0) > 20 ? 'Good availability' : 'High demand'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {metrics?.totalRooms ? Math.round((metrics.occupiedRooms / metrics.totalRooms) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Efficiency Rate</div>
              <div className="text-xs mt-1 text-blue-600">
                {metrics?.maintenanceRooms || 0} in maintenance
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  roomsQuery.data?.rooms && roomsQuery.data.rooms.length > 0 && metrics
                    ? (roomsQuery.data.rooms
                        .filter(room => room.status === 'occupied')
                        .reduce((sum, room) => sum + (room.currentRate || 0), 0))
                    : 0
                )}
              </div>
              <div className="text-sm text-gray-600">Current Daily Revenue</div>
              <div className="text-xs mt-1 text-purple-600">
                from {metrics?.occupiedRooms || 0} occupied rooms
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 4: Room Status Visual Indicators */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Room Status Overview</h2>
          <p className="text-gray-600 mt-1">Visual representation of all rooms with real-time status</p>
        </div>

        {/* Status Legend */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Status Legend</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded border-2 border-green-600"></div>
              <span className="text-sm text-gray-700">Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded border-2 border-red-600"></div>
              <span className="text-sm text-gray-700">Occupied</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded border-2 border-yellow-600"></div>
              <span className="text-sm text-gray-700">Dirty / Cleaning</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-500 rounded border-2 border-orange-600"></div>
              <span className="text-sm text-gray-700">Maintenance</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-500 rounded border-2 border-gray-600"></div>
              <span className="text-sm text-gray-700">Out of Order</span>
            </div>
          </div>
        </div>

        {/* Floor-by-Floor Room Grid */}
        <div className="space-y-8">
          {floorData.map(floor => {
            // Get filtered rooms for this floor
            const floorRooms = filteredRooms
              .filter(room => room.floor === floor.floor)
              .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));

            // Skip floor if no rooms match filters
            if (floorRooms.length === 0) return null;

            return (
              <div key={floor.floor} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Floor {floor.floor}
                  </h3>
                  <div className="text-sm text-gray-600">
                    {floor.occupied} occupied • {floor.available} available • {floor.totalRooms} total
                  </div>
                </div>

                {/* Room Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
                  {floorRooms.map(room => {
                    // Determine room color based on status
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'vacant':
                          return 'bg-green-500 border-green-600 hover:bg-green-600';
                        case 'occupied':
                          return 'bg-red-500 border-red-600 hover:bg-red-600';
                        case 'dirty':
                          return 'bg-yellow-500 border-yellow-600 hover:bg-yellow-600';
                        case 'maintenance':
                          return 'bg-orange-500 border-orange-600 hover:bg-orange-600';
                        case 'out_of_order':
                          return 'bg-gray-500 border-gray-600 hover:bg-gray-600';
                        default:
                          return 'bg-gray-300 border-gray-400 hover:bg-gray-400';
                      }
                    };

                    const getStatusText = (status: string) => {
                      switch (status) {
                        case 'vacant':
                          return 'Available';
                        case 'occupied':
                          return 'Occupied';
                        case 'dirty':
                          return 'Dirty';
                        case 'maintenance':
                          return 'Maintenance';
                        case 'out_of_order':
                          return 'Out of Order';
                        default:
                          return 'Unknown';
                      }
                    };

                    const getTypeIcon = (type: string) => {
                      switch (type) {
                        case 'suite':
                          return '👑';
                        case 'deluxe':
                          return '⭐';
                        case 'double':
                          return '👥';
                        case 'single':
                        default:
                          return '👤';
                      }
                    };

                    const isSelected = selectedRooms.has(room._id);
                    const isRecentlyChanged = changedRooms.has(room._id);

                    return (
                      <div
                        key={room._id}
                        className={`
                          relative aspect-square rounded-lg border-2 cursor-pointer transition-all duration-200
                          ${getStatusColor(room.status)}
                          ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                          ${isRecentlyChanged ? 'animate-pulse ring-2 ring-yellow-400' : ''}
                          group hover:scale-105 hover:shadow-lg
                        `}
                        onClick={() => handleRoomSelect(room._id)}
                        title={`Room ${room.roomNumber} - ${getStatusText(room.status)} - ${room.type} - ₹${room.currentRate}${isRecentlyChanged ? ' (Recently Updated)' : ''}`}
                      >
                        {/* Room Number */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white font-medium">
                          <div className="text-xs mb-1">{getTypeIcon(room.type)}</div>
                          <div className="text-sm font-bold">{room.roomNumber}</div>
                        </div>

                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute -top-2 -left-2">
                            <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}

                        {/* Hover Tooltip with Quick Actions */}
                        <div className="absolute -top-2 -left-2 -right-2 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                          <div className="font-medium">Room {room.roomNumber}</div>
                          <div className="capitalize">{room.type} • {getStatusText(room.status)}</div>
                          <div>Rate: {formatCurrency(room.currentRate)}</div>
                          {room.amenities?.length > 0 && (
                            <div className="text-xs text-gray-300 mt-1">
                              {room.amenities.slice(0, 2).join(', ')}
                              {room.amenities.length > 2 && '...'}
                            </div>
                          )}
                          
                          {/* Quick Action Buttons */}
                          <div className="mt-2 pt-2 border-t border-gray-700 pointer-events-auto">
                            <div className="flex space-x-1">
                              {room.status !== 'vacant' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickStatusUpdate(room._id, 'vacant');
                                  }}
                                  className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                                  disabled={isPerformingAction}
                                >
                                  Available
                                </button>
                              )}
                              {room.status !== 'dirty' && room.status !== 'occupied' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickStatusUpdate(room._id, 'dirty');
                                  }}
                                  className="px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 transition-colors"
                                  disabled={isPerformingAction}
                                >
                                  Dirty
                                </button>
                              )}
                              {room.status !== 'maintenance' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickStatusUpdate(room._id, 'maintenance');
                                  }}
                                  className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                                  disabled={isPerformingAction}
                                >
                                  Maintenance
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Recently Changed Indicator */}
                        {isRecentlyChanged && (
                          <div className="absolute -top-2 -right-2 z-30">
                            <div className="w-5 h-5 bg-yellow-500 rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}

                        {/* Priority Indicator (for maintenance/issues) */}
                        {(room.status === 'maintenance' || room.status === 'out_of_order') && (
                          <div className="absolute -top-1 -right-1">
                            <div className="w-3 h-3 bg-red-600 rounded-full border border-white flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}

                        {/* Occupied indicator (guest count) */}
                        {room.status === 'occupied' && (
                          <div className="absolute -bottom-1 -right-1">
                            <div className="w-4 h-4 bg-white rounded-full border-2 border-red-600 flex items-center justify-center">
                              <span className="text-xs font-bold text-red-600">{room.capacity || 1}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Floor Summary */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-600">
                      Occupancy: {floor.totalRooms > 0 ? ((floor.occupied / floor.totalRooms) * 100).toFixed(1) : 0}%
                    </div>
                    <div className="flex space-x-4 text-xs">
                      <span className="text-green-600">Available: {floor.available}</span>
                      <span className="text-red-600">Occupied: {floor.occupied}</span>
                      <span className="text-yellow-600">Cleaning: {floor.dirty}</span>
                      <span className="text-orange-600">Maintenance: {floor.maintenance}</span>
                      <span className="text-gray-600">OOO: {floor.outOfOrder}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall Summary */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900 mb-3">Hotel Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">{metrics?.totalRooms || 0}</div>
              <div className="text-sm text-blue-700">Total Rooms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics?.availableRooms || 0}</div>
              <div className="text-sm text-green-700">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{metrics?.occupiedRooms || 0}</div>
              <div className="text-sm text-red-700">Occupied</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics?.maintenanceRooms || 0}</div>
              <div className="text-sm text-orange-700">Maintenance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{metrics?.outOfOrderRooms || 0}</div>
              <div className="text-sm text-gray-700">Out of Order</div>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 6: Real-time Activity Feed */}
      {(changedRooms.size > 0 || connectionStatus !== 'connected') && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Real-time Activity</h2>
            <p className="text-gray-600 mt-1">Recent room updates and system status</p>
          </div>

          {/* Activity Feed */}
          <div className="space-y-3">
            {/* Connection Status Updates */}
            {connectionStatus !== 'connected' && (
              <div className={`p-3 rounded-lg border ${
                connectionStatus === 'reconnecting' 
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                  }`}></div>
                  <span className="font-medium">
                    {connectionStatus === 'reconnecting' 
                      ? 'Reconnecting to server...'
                      : 'Connection lost - Click reconnect to restore real-time updates'
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Recent Changes */}
            {changedRooms.size > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-green-800">
                      {changedRooms.size} room{changedRooms.size > 1 ? 's' : ''} updated
                    </span>
                  </div>
                  <span className="text-xs text-green-600">
                    {lastUpdateTime?.toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-2 text-sm text-green-700">
                  Rooms with status changes are highlighted with yellow indicators
                </div>
              </div>
            )}

            {/* Real-time Settings Summary */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    realTimeEnabled ? 'bg-blue-500' : 'bg-gray-500'
                  }`}></div>
                  <span className="font-medium text-blue-800">
                    Real-time updates: {realTimeEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {realTimeEnabled && (
                  <span className="text-xs text-blue-600">
                    Refreshing every {autoRefreshInterval / 1000}s
                  </span>
                )}
              </div>
              {!realTimeEnabled && (
                <div className="mt-2 text-sm text-blue-700">
                  Enable real-time updates in the header controls for live data
                </div>
              )}
            </div>

            {/* Data Freshness Indicator */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">Data Freshness</span>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    Rooms: {roomsQuery.dataUpdatedAt ? new Date(roomsQuery.dataUpdatedAt).toLocaleTimeString() : 'Loading...'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Metrics: {metricsQuery.dataUpdatedAt ? new Date(metricsQuery.dataUpdatedAt).toLocaleTimeString() : 'Loading...'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {filteredRooms.length}
                </div>
                <div className="text-xs text-gray-600">Rooms Displayed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {changedRooms.size}
                </div>
                <div className="text-xs text-gray-600">Recent Updates</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {autoRefreshInterval / 1000}s
                </div>
                <div className="text-xs text-gray-600">Refresh Rate</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${
                  connectionStatus === 'connected' ? 'text-green-600' : 
                  connectionStatus === 'reconnecting' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {connectionStatus === 'connected' ? '✓' : connectionStatus === 'reconnecting' ? '⟲' : '✗'}
                </div>
                <div className="text-xs text-gray-600">Connection</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Information (temporary) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Debug Info:</h3>
          <p className="text-sm text-gray-600">
            Hotel ID: {hotelId} | 
            Rooms loaded: {roomsQuery.data?.rooms?.length || 0} | 
            Metrics: {metrics ? 'Available' : 'Calculating from rooms'}
          </p>
        </div>
      )}
    </div>
  );
}