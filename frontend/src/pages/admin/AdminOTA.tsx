import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OTADashboard from '../../components/ota/OTADashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProperty } from '../../context/PropertyContext';
import { PropertyBreadcrumb } from '../../components/common/PropertyBreadcrumb';
import { api } from '../../services/api';
import { toast } from '../../utils/toast';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Globe,
  Settings,
  Wifi,
  WifiOff,
  Loader2,
  Save,
} from 'lucide-react';

interface OTAChannelConfig {
  enabled: boolean;
  hotelId: string;
  lastSync: string | null;
  syncFrequency: string;
  autoSync: boolean;
  webhookEnabled: boolean;
  webhookUrl: string;
}

interface OTAConfig {
  bookingCom: OTAChannelConfig;
  expedia: OTAChannelConfig;
  airbnb: OTAChannelConfig;
}

const CHANNEL_INFO: Record<string, { name: string; description: string; color: string }> = {
  bookingCom: {
    name: 'Booking.com',
    description: 'Connect to Booking.com to sync room availability, rates, and receive bookings.',
    color: 'blue',
  },
  expedia: {
    name: 'Expedia',
    description: 'Connect to Expedia Group to manage listings across Expedia, Hotels.com, and Vrbo.',
    color: 'yellow',
  },
  airbnb: {
    name: 'Airbnb',
    description: 'Connect to Airbnb to sync listings, availability, and manage guest bookings.',
    color: 'red',
  },
};

const AdminOTA: React.FC = () => {
  const { selectedPropertyId, viewMode } = useProperty();
  const [activeTab, setActiveTab] = useState('analytics');
  const [config, setConfig] = useState<OTAConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  // Load OTA config when switching to sync/channels tab
  useEffect(() => {
    if ((activeTab === 'sync' || activeTab === 'channels') && selectedPropertyId && !config) {
      loadConfig();
    }
  }, [activeTab, selectedPropertyId]);

  const loadConfig = async () => {
    if (!selectedPropertyId) return;
    setConfigLoading(true);
    try {
      const response = await api.get(`/ota/config/${selectedPropertyId}`);
      setConfig(response.data?.data?.config || null);
    } catch {
      toast.error('Failed to load OTA configuration');
    } finally {
      setConfigLoading(false);
    }
  };

  const toggleChannel = async (provider: string, enabled: boolean) => {
    if (!selectedPropertyId) return;
    setSaving(provider);
    try {
      await api.patch(`/ota/config/${selectedPropertyId}`, {
        provider,
        config: { enabled },
      });
      setConfig(prev => prev ? {
        ...prev,
        [provider]: { ...prev[provider as keyof OTAConfig], enabled },
      } : prev);
      toast.success(`${CHANNEL_INFO[provider]?.name || provider} ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error(`Failed to update ${CHANNEL_INFO[provider]?.name || provider}`);
    } finally {
      setSaving(null);
    }
  };

  if (!selectedPropertyId && viewMode === 'single') {
    return (
      <div className="p-6">
        <PropertyBreadcrumb items={['OTA Management']} />
        <div className="text-center py-12">
          <Globe className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Property Selected</h3>
          <p className="text-gray-500">Please select a property to view OTA management.</p>
        </div>
      </div>
    );
  }

  const renderChannelCard = (provider: string, channelConfig: OTAChannelConfig) => {
    const info = CHANNEL_INFO[provider];
    if (!info) return null;

    return (
      <Card key={provider}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {channelConfig.enabled ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <h3 className="font-semibold text-lg">{info.name}</h3>
                <p className="text-sm text-gray-500">{info.description}</p>
              </div>
            </div>
            <Badge variant={channelConfig.enabled ? 'default' : 'secondary'}>
              {channelConfig.enabled ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Sync Frequency</p>
              <p className="text-sm font-medium">{channelConfig.syncFrequency || 'Not set'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Auto Sync</p>
              <p className="text-sm font-medium">{channelConfig.autoSync ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Last Synced</p>
              <p className="text-sm font-medium">
                {channelConfig.lastSync
                  ? new Date(channelConfig.lastSync).toLocaleString()
                  : 'Never'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={channelConfig.enabled ? 'destructive' : 'default'}
              size="sm"
              disabled={saving === provider}
              onClick={() => toggleChannel(provider, !channelConfig.enabled)}
            >
              {saving === provider ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : channelConfig.enabled ? (
                <XCircle className="w-4 h-4 mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {channelConfig.enabled ? 'Disconnect' : 'Connect'}
            </Button>
            {channelConfig.enabled && (
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PropertyBreadcrumb items={['OTA Management']} />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics">OTA Analytics</TabsTrigger>
          <TabsTrigger value="channels">Channel Management</TabsTrigger>
          <TabsTrigger value="sync">Sync Settings</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <OTADashboard onConfigure={() => setActiveTab('sync')} />
        </TabsContent>

        <TabsContent value="channels">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Channel Management</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Manage your OTA channel connections and monitor sync status.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={loadConfig} disabled={configLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${configLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {configLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : config ? (
              <div className="space-y-4">
                {Object.entries(config).map(([provider, channelConfig]) =>
                  renderChannelCard(provider, channelConfig)
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Unable to load channel configuration.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={loadConfig}>
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sync">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Sync Settings</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Configure how your property data synchronizes with OTA channels.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={loadConfig} disabled={configLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${configLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {configLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : config ? (
              <>
                {/* Connected channels sync status */}
                <div className="space-y-4">
                  {Object.entries(config).map(([provider, channelConfig]) => {
                    const info = CHANNEL_INFO[provider];
                    if (!info) return null;

                    return (
                      <Card key={provider}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {channelConfig.enabled ? (
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                              ) : (
                                <div className="w-3 h-3 rounded-full bg-gray-300" />
                              )}
                              <div>
                                <h3 className="font-semibold">{info.name}</h3>
                                <p className="text-xs text-gray-500">
                                  {channelConfig.enabled
                                    ? `Syncing every ${channelConfig.syncFrequency} | Auto-sync ${channelConfig.autoSync ? 'on' : 'off'}`
                                    : 'Not connected'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {channelConfig.enabled && (
                                <div className="text-right text-sm">
                                  <p className="text-gray-500">Last sync</p>
                                  <p className="font-medium">
                                    {channelConfig.lastSync
                                      ? new Date(channelConfig.lastSync).toLocaleString()
                                      : 'Never'}
                                  </p>
                                </div>
                              )}

                              <Button
                                variant={channelConfig.enabled ? 'outline' : 'default'}
                                size="sm"
                                disabled={saving === provider}
                                onClick={() => {
                                  if (!channelConfig.enabled) {
                                    toggleChannel(provider, true);
                                  } else {
                                    setActiveTab('channels');
                                  }
                                }}
                              >
                                {saving === provider ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : channelConfig.enabled ? (
                                  'Manage'
                                ) : (
                                  'Enable'
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Sync info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Synchronization Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">Data Synced</p>
                        <ul className="space-y-1 text-gray-700">
                          <li>Room availability and inventory</li>
                          <li>Room rates and pricing</li>
                          <li>Booking reservations</li>
                          <li>Guest information</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Sync Behavior</p>
                        <ul className="space-y-1 text-gray-700">
                          <li>Changes push to OTA within sync interval</li>
                          <li>Incoming bookings processed in real-time via webhooks</li>
                          <li>Rate updates reflected immediately on enabled channels</li>
                          <li>Availability auto-adjusted on booking confirmation</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Unable to load sync settings.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={loadConfig}>
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="integration">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">OTA Integration Status</h2>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    System Integration Complete
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Backend Services</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Room Type Management API</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Inventory Management API</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Enhanced Booking Engine API</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> OTA Synchronization Services</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Frontend Components</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> OTA Analytics Dashboard</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Channel Management Interface</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Sync Configuration Panel</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Real-time Status Monitoring</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminOTA;
