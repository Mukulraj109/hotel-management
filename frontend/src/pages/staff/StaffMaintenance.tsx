import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Wrench, Clock, CheckCircle, AlertTriangle, Zap } from 'lucide-react';

export default function StaffMaintenance() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Maintenance Management</h1>
        <p className="text-gray-600">Handle maintenance requests and repairs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
              Urgent Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <p className="font-medium">AC Failure - Room 302</p>
                  <p className="text-sm text-gray-600">Temperature control not working</p>
                  <p className="text-xs text-red-600">Reported: 15 min ago</p>
                </div>
                <Button size="sm" variant="destructive">Attend Now</Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <p className="font-medium">Water Leak - Room 405</p>
                  <p className="text-sm text-gray-600">Bathroom ceiling leak</p>
                  <p className="text-xs text-red-600">Reported: 30 min ago</p>
                </div>
                <Button size="sm" variant="destructive">Attend Now</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-orange-600" />
              Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div>
                  <p className="font-medium">Light Bulb Replacement</p>
                  <p className="text-sm text-gray-600">Room 108 bathroom</p>
                  <p className="text-xs text-orange-600">Due: 1 hour ago</p>
                </div>
                <Button size="sm">Start Task</Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div>
                  <p className="font-medium">TV Remote Battery</p>
                  <p className="text-sm text-gray-600">Room 201</p>
                  <p className="text-xs text-orange-600">Due: 2 hours ago</p>
                </div>
                <Button size="sm">Start Task</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="h-5 w-5 mr-2 text-blue-600" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <p className="font-medium">Door Lock Repair</p>
                  <p className="text-sm text-gray-600">Room 305</p>
                  <p className="text-xs text-blue-600">Started: 45 min ago</p>
                </div>
                <Button size="sm" variant="outline">Complete</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed Today */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="font-medium">WiFi Router Reset</p>
                  <p className="text-sm text-gray-600">Room 102</p>
                  <p className="text-xs text-green-600">Completed: 1 hour ago</p>
                </div>
                <Badge variant="outline" className="text-green-700">Completed</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="font-medium">Curtain Rail Fix</p>
                  <p className="text-sm text-gray-600">Room 208</p>
                  <p className="text-xs text-green-600">Completed: 2 hours ago</p>
                </div>
                <Badge variant="outline" className="text-green-700">Completed</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
