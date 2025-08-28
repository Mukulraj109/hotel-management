import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/dashboard/DataTable';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { formatRelativeTime, formatNumber } from '../../utils/dashboardUtils';
import {
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Zap,
  Globe,
  Link,
  Eye,
  Edit,
  Save,
  X,
  Plus,
  TrendingUp,
  Calendar,
  Database
} from 'lucide-react';

interface OTAProvider {
  name: string;
  key: string;
  logo?: string;
  enabled: boolean;
  hotelId: string;
  lastSync: Date | null;
  syncFrequency: string;
  autoSync: boolean;
  webhookEnabled: boolean;
  webhookUrl: string;
}

interface SyncHistory {
  id: string;
  hotelId: string;
  provider: string;
  type: string;
  status: 'completed' | 'failed' | 'in_progress';
  startedAt: Date;
  completedAt?: Date;
  roomsUpdated?: number;
  errors?: string[];
}

interface OTAStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastSync: Date;
  averageSyncTime: number;
  providersActive: number;
  totalProviders: number;
  roomsSynced: number;
  bookingsReceived: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  syncFrequency: Record<string, string>;
}

export default function AdminOTA() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<OTAProvider[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [stats, setStats] = useState<OTAStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<OTAProvider | null>(null);
  const [configForm, setConfigForm] = useState<Partial<OTAProvider>>({});
  const [historyFilters, setHistoryFilters] = useState({
    page: 1,
    limit: 10,
    provider: '',
    status: ''
  });

  const hotelId = user?.hotelId || '68b036db9f87a72c2d171a91';

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch OTA configuration and convert to providers array
      const configResponse = await adminService.getOTAConfig(hotelId);
      const config = configResponse.data.config;
      
      const providersData: OTAProvider[] = [
        {
          name: 'Booking.com',
          key: 'bookingCom',
          enabled: config.bookingCom.enabled,
          hotelId: config.bookingCom.hotelId,
          lastSync: config.bookingCom.lastSync ? new Date(config.bookingCom.lastSync) : null,
          syncFrequency: config.bookingCom.syncFrequency,
          autoSync: config.bookingCom.autoSync,
          webhookEnabled: config.bookingCom.webhookEnabled,
          webhookUrl: config.bookingCom.webhookUrl
        },
        {
          name: 'Expedia',
          key: 'expedia',
          enabled: config.expedia.enabled,
          hotelId: config.expedia.hotelId,
          lastSync: config.expedia.lastSync ? new Date(config.expedia.lastSync) : null,
          syncFrequency: config.expedia.syncFrequency,
          autoSync: config.expedia.autoSync,
          webhookEnabled: config.expedia.webhookEnabled,
          webhookUrl: config.expedia.webhookUrl
        },
        {
          name: 'Airbnb',
          key: 'airbnb',
          enabled: config.airbnb.enabled,
          hotelId: config.airbnb.hotelId,
          lastSync: config.airbnb.lastSync ? new Date(config.airbnb.lastSync) : null,
          syncFrequency: config.airbnb.syncFrequency,
          autoSync: config.airbnb.autoSync,
          webhookEnabled: config.airbnb.webhookEnabled,
          webhookUrl: config.airbnb.webhookUrl
        }
      ];
      
      setProviders(providersData);

      // Fetch sync history
      const historyResponse = await adminService.getOTASyncHistory({
        hotelId,
        ...historyFilters
      });
      setSyncHistory(historyResponse.data.history || []);

      // Fetch stats
      const statsResponse = await adminService.getOTAStats(hotelId);
      setStats(statsResponse.data.stats);

    } catch (error) {
      console.error('Error fetching OTA data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [hotelId, historyFilters]);

  // Handle manual sync
  const handleSync = async (providerKey: string) => {
    if (providerKey !== 'bookingCom') {
      alert('Only Booking.com sync is currently implemented');
      return;
    }

    try {
      setSyncing(prev => ({ ...prev, [providerKey]: true }));
      await adminService.syncBookingCom(hotelId);
      
      // Refresh data after sync
      setTimeout(() => {
        fetchData();
      }, 2000);
      
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(prev => ({ ...prev, [providerKey]: false }));
    }
  };

  // Handle provider configuration
  const handleConfigProvider = (provider: OTAProvider) => {
    setSelectedProvider(provider);
    setConfigForm({
      enabled: provider.enabled,
      hotelId: provider.hotelId,
      syncFrequency: provider.syncFrequency,
      autoSync: provider.autoSync,
      webhookEnabled: provider.webhookEnabled,
      webhookUrl: provider.webhookUrl
    });
    setShowConfigModal(true);
  };

  // Save provider configuration
  const handleSaveConfig = async () => {
    if (!selectedProvider) return;

    try {
      await adminService.updateOTAConfig(hotelId, selectedProvider.key, configForm);
      setShowConfigModal(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Failed to update configuration:', error);
      alert('Failed to save configuration. Please try again.');
    }
  };

  // Handle demo setup
  const handleDemoSetup = async () => {
    try {
      setLoading(true);
      await adminService.setupOTADemo(hotelId);
      alert('Demo setup completed! Booking.com integration is now enabled.');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Demo setup failed:', error);
      alert('Demo setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get provider status icon
  const getProviderStatusIcon = (provider: OTAProvider) => {
    if (!provider.enabled) {
      return <WifiOff className="h-5 w-5 text-gray-400" />;
    }
    
    if (syncing[provider.key]) {
      return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    }

    return <Wifi className="h-5 w-5 text-green-500" />;
  };

  // Sync history table columns
  const historyColumns = [
    {
      key: 'provider',
      header: 'Provider',
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <Globe className="h-4 w-4 text-gray-400" />
          <span className="font-medium capitalize">{value.replace('_', '.')}</span>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (value: string) => (
        <Badge variant="secondary">{value.replace('_', ' ')}</Badge>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => <StatusBadge status={value} size="sm" />
    },
    {
      key: 'startedAt',
      header: 'Started',
      render: (value: Date) => (
        <div className="text-sm">
          {new Date(value).toLocaleDateString()}<br />
          <span className="text-gray-500">{new Date(value).toLocaleTimeString()}</span>
        </div>
      )
    },
    {
      key: 'roomsUpdated',
      header: 'Rooms Updated',
      render: (value: number) => (
        <span className="text-sm font-medium">{formatNumber(value || 0)}</span>
      ),
      align: 'center' as const
    },
    {
      key: 'errors',
      header: 'Errors',
      render: (value: string[], row: SyncHistory) => (
        <div>
          {value && value.length > 0 ? (
            <Badge variant="destructive">{value.length} error(s)</Badge>
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </div>
      ),
      align: 'center' as const
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OTA Integration</h1>
          <p className="text-gray-600">Manage online travel agency integrations and sync data</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleDemoSetup}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Setup Demo</span>
          </Button>
          <Button
            onClick={fetchData}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Syncs"
            value={stats.totalSyncs}
            icon={<Activity className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Success Rate"
            value={stats.totalSyncs > 0 ? Math.round((stats.successfulSyncs / stats.totalSyncs) * 100) : 0}
            suffix="%"
            trend={{
              value: 2.5,
              direction: 'up',
              label: 'vs last month'
            }}
            icon={<TrendingUp className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Active Providers"
            value={stats.providersActive}
            suffix={`/${stats.totalProviders}`}
            icon={<Zap className="h-6 w-6" />}
            color="purple"
          />
          <MetricCard
            title="Bookings This Month"
            value={stats.bookingsReceived.thisMonth}
            trend={{
              value: 12.3,
              direction: 'up',
              label: 'vs last month'
            }}
            icon={<Calendar className="h-6 w-6" />}
            color="orange"
          />
        </div>
      )}

      {/* OTA Providers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {providers.map(provider => (
          <Card key={provider.key} className="relative">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getProviderStatusIcon(provider)}
                  <CardTitle className="text-lg">{provider.name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleConfigProvider(provider)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant={provider.enabled ? 'default' : 'secondary'}>
                  {provider.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              {/* Hotel ID */}
              {provider.enabled && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Hotel ID</span>
                  <span className="text-sm font-mono">{provider.hotelId || 'Not Set'}</span>
                </div>
              )}

              {/* Last Sync */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Sync</span>
                <div className="text-right">
                  {provider.lastSync ? (
                    <>
                      <div className="text-sm font-medium">
                        {formatRelativeTime(provider.lastSync)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {provider.lastSync.toLocaleDateString()}
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">Never</span>
                  )}
                </div>
              </div>

              {/* Auto Sync */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto Sync</span>
                <div className="flex items-center space-x-2">
                  <Badge variant={provider.autoSync ? 'default' : 'secondary'} size="sm">
                    {provider.autoSync ? 'On' : 'Off'}
                  </Badge>
                  {provider.autoSync && (
                    <span className="text-xs text-gray-500">({provider.syncFrequency})</span>
                  )}
                </div>
              </div>

              {/* Webhook */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Webhook</span>
                <Badge variant={provider.webhookEnabled ? 'default' : 'secondary'} size="sm">
                  {provider.webhookEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t space-y-2">
                {provider.enabled && (
                  <Button
                    onClick={() => handleSync(provider.key)}
                    disabled={syncing[provider.key]}
                    className="w-full"
                    size="sm"
                  >
                    {syncing[provider.key] ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Manual Sync
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConfigProvider(provider)}
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sync History</CardTitle>
            <div className="flex items-center space-x-2">
              <select
                value={historyFilters.provider}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, provider: e.target.value, page: 1 }))}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="">All Providers</option>
                <option value="booking_com">Booking.com</option>
                <option value="expedia">Expedia</option>
                <option value="airbnb">Airbnb</option>
              </select>
              <select
                value={historyFilters.status}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="in_progress">In Progress</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={syncHistory}
            columns={historyColumns}
            loading={loading}
            searchable={false}
            pagination={true}
            pageSize={historyFilters.limit}
            emptyMessage="No sync history found"
          />
        </CardContent>
      </Card>

      {/* Configuration Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false);
          setSelectedProvider(null);
          setConfigForm({});
        }}
        title={`Configure ${selectedProvider?.name}`}
        size="lg"
      >
        {selectedProvider && (
          <div className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Enable Integration</h3>
                <p className="text-sm text-gray-600">
                  Enable or disable {selectedProvider.name} integration
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={configForm.enabled || false}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {configForm.enabled && (
              <>
                {/* Hotel ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedProvider.name} Hotel ID
                  </label>
                  <Input
                    type="text"
                    value={configForm.hotelId || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, hotelId: e.target.value }))}
                    placeholder="Enter hotel ID from OTA platform"
                  />
                </div>

                {/* Sync Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sync Frequency
                  </label>
                  <select
                    value={configForm.syncFrequency || '1h'}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, syncFrequency: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="15m">Every 15 minutes</option>
                    <option value="30m">Every 30 minutes</option>
                    <option value="1h">Every hour</option>
                    <option value="2h">Every 2 hours</option>
                    <option value="6h">Every 6 hours</option>
                    <option value="12h">Every 12 hours</option>
                    <option value="24h">Daily</option>
                  </select>
                </div>

                {/* Auto Sync */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Auto Sync</h3>
                    <p className="text-sm text-gray-600">
                      Automatically sync data at specified intervals
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={configForm.autoSync || false}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, autoSync: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Webhook */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Webhook Notifications</h3>
                    <p className="text-sm text-gray-600">
                      Receive real-time notifications from {selectedProvider.name}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={configForm.webhookEnabled || false}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, webhookEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Webhook URL (read-only) */}
                {configForm.webhookEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Webhook URL
                    </label>
                    <Input
                      type="text"
                      value={configForm.webhookUrl || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Configure this URL in your {selectedProvider.name} account settings
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setShowConfigModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}