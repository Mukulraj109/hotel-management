import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Users, Home, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { staffDashboardService, RoomStatusData } from '../../services/staffDashboardService';

export default function StaffRooms() {
  const [roomData, setRoomData] = useState<RoomStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoomData();
  }, []);

  const fetchRoomData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await staffDashboardService.getRoomStatus();
      setRoomData(response.data);
      console.log('Room data fetched:', response.data);
    } catch (err) {
      console.error('Failed to fetch room data:', err);
      setError('Failed to load room data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load room data</h3>
          <Button onClick={fetchRoomData} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { summary, needsAttention } = roomData;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Room Status Overview</h1>
        <p className="text-gray-600">Monitor and manage room statuses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Home className="h-5 w-5 mr-2 text-blue-600" />
              Room Status Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summary.occupied}</div>
                <div className="text-sm text-gray-600">Occupied</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{summary.vacant_clean}</div>
                <div className="text-sm text-gray-600">Vacant & Clean</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{summary.vacant_dirty}</div>
                <div className="text-sm text-gray-600">Needs Cleaning</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{summary.maintenance}</div>
                <div className="text-sm text-gray-600">Maintenance</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rooms Needing Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
              Rooms Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {needsAttention.length > 0 ? (
                needsAttention.map((room) => (
                  <div key={room._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <p className="font-medium">Room {room.roomNumber}</p>
                      <p className="text-sm text-gray-600">{room.status}</p>
                    </div>
                    <Badge variant="destructive">Attention</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                  <p>No rooms need attention</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              Recent Check-ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p>No recent check-ins to display</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Check-outs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-orange-600" />
              Upcoming Check-outs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p>No upcoming check-outs to display</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
