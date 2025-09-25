import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Volume2,
  VolumeX,
  Clock,
  Save,
  Loader2
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import toast from 'react-hot-toast';

interface NotificationFormData {
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  categories: {
    systemAlerts: boolean;
    bookingUpdates: boolean;
    paymentNotifications: boolean;
    guestRequests: boolean;
    inventoryAlerts: boolean;
    staffNotifications: boolean;
    maintenanceAlerts: boolean;
    securityNotifications: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  sound: boolean;
  desktop: boolean;
  frequency: 'instant' | 'hourly' | 'daily';
}

interface NotificationSettingsProps {
  onSettingsChange: (hasChanges: boolean) => void;
}

export default function NotificationSettings({ onSettingsChange }: NotificationSettingsProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty }
  } = useForm<NotificationFormData>({
    defaultValues: {
      channels: {
        inApp: true,
        email: true,
        sms: false,
        push: true
      },
      categories: {
        systemAlerts: true,
        bookingUpdates: true,
        paymentNotifications: true,
        guestRequests: true,
        inventoryAlerts: true,
        staffNotifications: true,
        maintenanceAlerts: true,
        securityNotifications: true
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      sound: true,
      desktop: true,
      frequency: 'instant'
    }
  });

  const watchedValues = watch();

  // Watch for form changes
  useEffect(() => {
    onSettingsChange(isDirty);
  }, [isDirty, onSettingsChange]);

  // Save notification settings mutation
  const saveNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      // Mock API call - replace with actual API endpoint
      const response = await fetch('/api/v1/users/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to update notification settings');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Notification settings updated successfully');
      onSettingsChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update notification settings');
    }
  });

  const onSubmit = (data: NotificationFormData) => {
    saveNotificationMutation.mutate(data);
  };

  const categoryLabels = {
    systemAlerts: 'System Alerts',
    bookingUpdates: 'Booking Updates',
    paymentNotifications: 'Payment Notifications',
    guestRequests: 'Guest Requests',
    inventoryAlerts: 'Inventory Alerts',
    staffNotifications: 'Staff Notifications',
    maintenanceAlerts: 'Maintenance Alerts',
    securityNotifications: 'Security Notifications'
  };

  return (
    <div className="p-6">
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notification Settings</span>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure how and when you want to receive notifications
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Notification Channels */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">Notification Channels</h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  {...register('channels.inApp')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Smartphone className="h-5 w-5 text-gray-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">In-App Notifications</p>
                  <p className="text-sm text-gray-500">Receive notifications within the application</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  {...register('channels.email')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Mail className="h-5 w-5 text-gray-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  {...register('channels.sms')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <MessageSquare className="h-5 w-5 text-gray-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">SMS Notifications</p>
                  <p className="text-sm text-gray-500">Receive notifications via text message</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  {...register('channels.push')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Bell className="h-5 w-5 text-gray-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-500">Receive browser push notifications</p>
                </div>
              </label>
            </div>
          </div>

          {/* Notification Categories */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">Notification Categories</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    {...register(`categories.${key}` as keyof NotificationFormData['categories'])}
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-gray-900">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notification Frequency */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">Notification Frequency</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  {...register('frequency')}
                  type="radio"
                  value="instant"
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900">Instant</span>
                <span className="text-sm text-gray-500">Receive notifications immediately</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  {...register('frequency')}
                  type="radio"
                  value="hourly"
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900">Hourly Digest</span>
                <span className="text-sm text-gray-500">Receive a summary every hour</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  {...register('frequency')}
                  type="radio"
                  value="daily"
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900">Daily Digest</span>
                <span className="text-sm text-gray-500">Receive a daily summary</span>
              </label>
            </div>
          </div>

          {/* Quiet Hours */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Quiet Hours</span>
            </h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  {...register('quietHours.enabled')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900">Enable Quiet Hours</span>
              </label>

              {watchedValues.quietHours?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      {...register('quietHours.start')}
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      {...register('quietHours.end')}
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Settings */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">Additional Settings</h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  {...register('sound')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {watchedValues.sound ? (
                  <Volume2 className="h-5 w-5 text-gray-600" />
                ) : (
                  <VolumeX className="h-5 w-5 text-gray-600" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Sound Notifications</p>
                  <p className="text-sm text-gray-500">Play sound when receiving notifications</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  {...register('desktop')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Bell className="h-5 w-5 text-gray-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Desktop Notifications</p>
                  <p className="text-sm text-gray-500">Show desktop notifications when browser is minimized</p>
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              type="submit"
              disabled={!isDirty || saveNotificationMutation.isLoading}
              className="flex items-center space-x-2"
            >
              {saveNotificationMutation.isLoading ? (
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