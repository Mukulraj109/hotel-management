import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  TrendingUp,
  Users,
  Package,
  ClipboardList,
  Shirt,
  Home,
  Eye,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface AutomationStatus {
  isEnabled: boolean;
  lastProcessed: string;
  totalProcessed: number;
  successRate: number;
  averageTime: number;
}

interface AutomationStep {
  name: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  duration: number;
  details: string;
}

const SimpleAutomationDashboard: React.FC = () => {
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus>({
    isEnabled: true,
    lastProcessed: '2 hours ago',
    totalProcessed: 45,
    successRate: 98.5,
    averageTime: 12
  });

  const [automationSteps, setAutomationSteps] = useState<AutomationStep[]>([
    {
      name: 'Laundry Processing',
      status: 'completed',
      duration: 5,
      details: '8 items processed, ₹120 total cost'
    },
    {
      name: 'Inventory Assessment',
      status: 'completed',
      duration: 4,
      details: '15 items checked, 2 replaced'
    },
    {
      name: 'Housekeeping Tasks',
      status: 'completed',
      duration: 3,
      details: '3 tasks created and assigned'
    }
  ]);

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: 'checkout',
      room: 'Room 101',
      guest: 'John Doe',
      time: '2 hours ago',
      status: 'completed',
      duration: 12
    },
    {
      id: 2,
      type: 'checkout',
      room: 'Room 205',
      guest: 'Jane Smith',
      time: '4 hours ago',
      status: 'completed',
      duration: 15
    },
    {
      id: 3,
      type: 'checkout',
      room: 'Room 312',
      guest: 'Bob Johnson',
      time: '6 hours ago',
      status: 'completed',
      duration: 10
    }
  ]);

  const toggleAutomation = () => {
    setAutomationStatus(prev => ({
      ...prev,
      isEnabled: !prev.isEnabled
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'pending': return <AlertTriangle className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Automation Dashboard</h1>
              <p className="text-gray-600 mt-2">Monitor and control automatic checkout processing</p>
            </div>
            <button
              onClick={toggleAutomation}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                automationStatus.isEnabled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              {automationStatus.isEnabled ? (
                <>
                  <Pause className="h-4 w-4 mr-2 inline" />
                  Disable Automation
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2 inline" />
                  Enable Automation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-blue-100">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className={`text-2xl font-bold ${automationStatus.isEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  {automationStatus.isEnabled ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Processed</p>
                <p className="text-2xl font-bold text-gray-900">{automationStatus.totalProcessed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-yellow-100">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{automationStatus.successRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-purple-100">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Time</p>
                <p className="text-2xl font-bold text-gray-900">{automationStatus.averageTime}m</p>
              </div>
            </div>
          </div>
        </div>

        {/* Automation Steps */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Automation Steps</h2>
            <p className="text-gray-600 mt-1">Current automation process status</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {automationSteps.map((step, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full ${getStatusColor(step.status)}`}>
                      {getStatusIcon(step.status)}
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-900">{step.name}</h3>
                      <p className="text-sm text-gray-600">{step.details}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{step.duration}m</p>
                    <p className="text-xs text-gray-500">Duration</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
            <p className="text-gray-600 mt-1">Latest automation events</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-green-100">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-900">{activity.guest} - {activity.room}</h3>
                      <p className="text-sm text-gray-600">Checkout automation completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{activity.duration}m</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleAutomationDashboard;
