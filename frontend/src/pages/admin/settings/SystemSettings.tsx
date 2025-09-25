import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import {
  Shield,
  Key,
  Clock,
  Database,
  Download,
  Trash2,
  Save,
  Loader2,
  Plus,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import toast from 'react-hot-toast';

interface SystemFormData {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  backupSchedule: string;
  dataRetention: number;
  autoLogout: boolean;
  passwordExpiry: number;
  loginAttempts: number;
}

interface SystemSettingsProps {
  onSettingsChange: (hasChanges: boolean) => void;
}

export default function SystemSettings({ onSettingsChange }: SystemSettingsProps) {
  const [apiKeys, setApiKeys] = useState([
    {
      id: '1',
      name: 'Production API',
      key: 'sk_live_****************************',
      permissions: ['read', 'write'],
      createdAt: '2024-01-15',
      lastUsed: '2024-01-20'
    }
  ]);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { isDirty }
  } = useForm<SystemFormData>({
    defaultValues: {
      twoFactorAuth: false,
      sessionTimeout: 60,
      backupSchedule: 'daily',
      dataRetention: 365,
      autoLogout: true,
      passwordExpiry: 90,
      loginAttempts: 5
    }
  });

  // Watch for form changes
  useEffect(() => {
    onSettingsChange(isDirty);
  }, [isDirty, onSettingsChange]);

  // Save system settings mutation
  const saveSystemMutation = useMutation({
    mutationFn: async (data: SystemFormData) => {
      // Mock API call
      const response = await fetch('/api/v1/system/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to update system settings');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('System settings updated successfully');
      onSettingsChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update system settings');
    }
  });

  const onSubmit = (data: SystemFormData) => {
    saveSystemMutation.mutate(data);
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>System Settings</span>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure security, backup, and system-wide settings
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Security Settings */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Security Settings</span>
            </h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  {...register('twoFactorAuth')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900">Enable Two-Factor Authentication</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  {...register('autoLogout')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900">Auto logout on inactivity</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Session Timeout (minutes)
                  </label>
                  <input
                    {...register('sessionTimeout', { min: 5, max: 480 })}
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Expiry (days)
                  </label>
                  <input
                    {...register('passwordExpiry', { min: 30, max: 365 })}
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Login Attempts
                  </label>
                  <input
                    {...register('loginAttempts', { min: 3, max: 10 })}
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* API Keys Management */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <Key className="h-4 w-4" />
              <span>API Keys</span>
            </h3>
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{apiKey.name}</h4>
                      <p className="text-sm text-gray-500">{apiKey.key}</p>
                      <p className="text-xs text-gray-400">
                        Created: {apiKey.createdAt} • Last used: {apiKey.lastUsed}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewKeyForm(!showNewKeyForm)}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Generate New API Key</span>
              </Button>
            </div>
          </div>

          {/* Backup Settings */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Backup & Data Retention</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Schedule
                </label>
                <select
                  {...register('backupSchedule')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Retention (days)
                </label>
                <input
                  {...register('dataRetention', { min: 30, max: 2555 })}
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex space-x-3">
              <Button type="button" variant="outline" className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Download Backup</span>
              </Button>
              <Button type="button" variant="outline" className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span>Restore from Backup</span>
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              type="submit"
              disabled={!isDirty || saveSystemMutation.isLoading}
              className="flex items-center space-x-2"
            >
              {saveSystemMutation.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save Changes</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}