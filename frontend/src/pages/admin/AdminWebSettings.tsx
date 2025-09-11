import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Save, 
  Download, 
  Upload, 
  RefreshCw, 
  TestTube,
  Eye,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Info,
  Globe,
  CreditCard,
  Search,
  Palette,
  Shield,
  Wrench
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { webSettingsService, WebSettings } from '@/services/webSettingsService';
import WebSettingsForm from '@/components/web/WebSettingsForm';
import SettingsPreview from '@/components/web/SettingsPreview';
import { useAuth } from '@/context/AuthContext';

export default function AdminWebSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<WebSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Get hotel ID from authenticated user context
  const hotelId = user?.hotelId || '68bc094f80c86bfe258e172b'; // Fallback to default if not in user context

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await webSettingsService.getSettings(hotelId);
      setSettings(data);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load web settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (updatedSettings: Partial<WebSettings>) => {
    console.log('🟡 AdminWebSettings: handleSaveSettings called', {
      hasSettings: !!settings,
      hotelId,
      updatedSettingsKeys: Object.keys(updatedSettings),
      updatedSettings,
      userContext: {
        hasUser: !!user,
        userId: user?.id,
        userHotelId: user?.hotelId
      }
    });

    if (!settings) {
      console.log('🔴 AdminWebSettings: No settings object available');
      return;
    }

    // Validate settings
    const validation = webSettingsService.validateSettings(updatedSettings);
    console.log('🟡 AdminWebSettings: Validation result:', validation);
    
    if (!validation.isValid) {
      console.log('🔴 AdminWebSettings: Validation failed:', validation.errors);
      toast.error(`Validation errors: ${validation.errors.join(', ')}`);
      return;
    }

    try {
      setSaving(true);
      console.log('🟡 AdminWebSettings: About to call webSettingsService.updateSettings');
      
      const savedSettings = await webSettingsService.updateSettings(hotelId, updatedSettings);
      
      console.log('🟢 AdminWebSettings: Settings saved successfully:', savedSettings);
      setSettings(savedSettings);
      setHasChanges(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('🔴 AdminWebSettings: Error saving settings:', {
        error,
        hotelId,
        updatedSettingsKeys: Object.keys(updatedSettings)
      });
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSectionUpdate = async (
    section: 'general' | 'booking' | 'payment' | 'seo' | 'integrations' | 'theme' | 'advanced' | 'maintenance',
    data: any
  ) => {
    console.log('🟡 AdminWebSettings: handleSectionUpdate called', {
      section,
      hotelId,
      data,
      dataKeys: Object.keys(data || {}),
      userContext: {
        hasUser: !!user,
        userId: user?.id,
        userHotelId: user?.hotelId
      }
    });

    try {
      setSaving(true);
      console.log('🟡 AdminWebSettings: About to call webSettingsService.updateSection');
      
      const updatedSettings = await webSettingsService.updateSection(hotelId, section, data);
      
      console.log('🟢 AdminWebSettings: Section updated successfully:', {
        section,
        updatedSettings
      });
      
      setSettings(updatedSettings);
      setHasChanges(false);
      toast.success(`${section} settings updated successfully`);
    } catch (error) {
      console.error('🔴 AdminWebSettings: Error updating section:', {
        error,
        section,
        hotelId,
        dataKeys: Object.keys(data || {})
      });
      toast.error(`Failed to update ${section} settings`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConfiguration = async (type: string, config: any) => {
    try {
      console.log('🔵 Frontend: Testing configuration:', { type, config, hasConfig: !!config });
      
      // Ensure config is always an object to pass validation
      const testConfig = config && typeof config === 'object' ? config : {};
      
      const result = await webSettingsService.testSettings(
        hotelId, 
        type as any, 
        testConfig
      );
      
      setTestResults(prev => ({ ...prev, [type]: result }));
      
      if (result.success) {
        toast.success(`${type} test successful`);
      } else {
        toast.error(`${type} test failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error testing configuration:', error);
      toast.error('Failed to test configuration');
    }
  };

  const handleExportSettings = async () => {
    try {
      await webSettingsService.downloadSettings(hotelId);
      toast.success('Settings exported successfully');
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast.error('Failed to export settings');
    }
  };

  const handleImportSettings = async (file: File) => {
    try {
      const importedSettings = await webSettingsService.uploadSettings(hotelId, file);
      setSettings(importedSettings);
      setHasChanges(false);
      toast.success('Settings imported successfully');
    } catch (error) {
      console.error('Error importing settings:', error);
      toast.error('Failed to import settings');
    }
  };

  const handleResetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
      return;
    }

    try {
      const defaultSettings = await webSettingsService.resetToDefault(hotelId);
      setSettings(defaultSettings);
      setHasChanges(false);
      toast.success('Settings reset to default successfully');
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    }
  };

  const handlePreviewToggle = () => {
    setPreviewMode(!previewMode);
  };

  const getTabIcon = (tab: string) => {
    const icons = {
      general: Globe,
      booking: Settings,
      payment: CreditCard,
      seo: Search,
      integrations: Settings,
      theme: Palette,
      advanced: Shield,
      maintenance: Wrench
    };
    return icons[tab as keyof typeof icons] || Settings;
  };

  const getSettingsStatus = () => {
    if (!settings) return { status: 'unknown', message: 'Loading...', color: 'gray' };
    
    const issues = [];
    
    // Check essential settings
    if (!settings.general?.hotelName) issues.push('Hotel name missing');
    if (!settings.general?.contact?.email) issues.push('Contact email missing');
    if (!settings.payment?.gateways?.some(g => g.isActive)) issues.push('No active payment gateway');
    
    if (issues.length === 0) {
      return { status: 'healthy', message: 'All settings configured', color: 'green' };
    } else if (issues.length <= 2) {
      return { status: 'warning', message: `${issues.length} configuration issues`, color: 'yellow' };
    } else {
      return { status: 'critical', message: `${issues.length} critical issues`, color: 'red' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load web settings</p>
          <Button onClick={loadSettings} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const status = getSettingsStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Web Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure your hotel's web presence and booking system
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Status Badge */}
          <Badge 
            variant={status.status === 'healthy' ? 'default' : status.status === 'warning' ? 'secondary' : 'destructive'}
            className="flex items-center"
          >
            {status.status === 'healthy' ? <CheckCircle className="w-3 h-3 mr-1" /> :
             status.status === 'warning' ? <AlertTriangle className="w-3 h-3 mr-1" /> :
             <AlertTriangle className="w-3 h-3 mr-1" />}
            {status.message}
          </Badge>

          {/* Action Buttons */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handlePreviewToggle}
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? 'Exit Preview' : 'Preview'}
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportSettings}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <label className="cursor-pointer">
            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportSettings(file);
              }}
            />
          </label>

          <Button 
            variant="outline" 
            size="sm"
            onClick={loadSettings}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Warning for unsaved changes */}
      {hasChanges && (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            You have unsaved changes. Don't forget to save your settings.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Configuration
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleSaveSettings(settings)}
                    disabled={saving || !hasChanges}
                    size="sm"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                  {[
                    { id: 'general', label: 'General' },
                    { id: 'booking', label: 'Booking' },
                    { id: 'payment', label: 'Payment' },
                    { id: 'seo', label: 'SEO' },
                    { id: 'integrations', label: 'Integrations' },
                    { id: 'theme', label: 'Theme' },
                    { id: 'advanced', label: 'Advanced' },
                    { id: 'maintenance', label: 'Maintenance' }
                  ].map((tab) => {
                    const IconComponent = getTabIcon(tab.id);
                    return (
                      <TabsTrigger key={tab.id} value={tab.id} className="flex items-center">
                        <IconComponent className="w-4 h-4 mr-1" />
                        <span className="hidden lg:inline">{tab.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {/* Tab Content */}
                {[
                  'general', 'booking', 'payment', 'seo', 
                  'integrations', 'theme', 'advanced', 'maintenance'
                ].map((section) => (
                  <TabsContent key={section} value={section} className="mt-6">
                    <WebSettingsForm
                      settings={settings}
                      section={section as any}
                      onSave={(data) => handleSectionUpdate(section as any, data)}
                      onTest={(type, config) => handleTestConfiguration(type, config)}
                      testResults={testResults}
                      onChange={() => setHasChanges(true)}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Preview Panel */}
          {previewMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SettingsPreview 
                  settings={settings}
                  section={activeTab}
                />
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => handleTestConfiguration('payment_gateway', settings.payment?.gateways?.[0])}
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test Payment Gateway
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => handleTestConfiguration('google_analytics', settings.integrations?.googleAnalytics)}
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test Analytics
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={handleExportSettings}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Settings
              </Button>
              
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full justify-start"
                onClick={handleResetSettings}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
            </CardContent>
          </Card>

          {/* Settings Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">General Settings</span>
                <Badge variant={settings.general?.hotelName ? 'default' : 'secondary'}>
                  {settings.general?.hotelName ? 'Complete' : 'Incomplete'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Payment Gateway</span>
                <Badge variant={settings.payment?.gateways?.some(g => g.isActive) ? 'default' : 'secondary'}>
                  {settings.payment?.gateways?.some(g => g.isActive) ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">SEO Settings</span>
                <Badge variant={settings.seo?.metaTags?.title ? 'default' : 'secondary'}>
                  {settings.seo?.metaTags?.title ? 'Configured' : 'Not Set'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Integrations</span>
                <Badge variant="secondary">
                  {settings.integrations ? Object.keys(settings.integrations).length : 0} Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}