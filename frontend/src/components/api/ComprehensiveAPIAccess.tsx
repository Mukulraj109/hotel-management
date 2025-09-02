import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  Code,
  Key,
  Globe,
  Shield,
  Zap,
  Database,
  Cloud,
  Settings,
  Users,
  BarChart3,
  Activity,
  Lock,
  Unlock,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Download,
  Upload,
  Server,
  Webhook,
  Terminal,
  FileText,
  Filter,
  Search
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

interface APIEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  category: string;
  version: string;
  status: 'active' | 'deprecated' | 'beta' | 'maintenance';
  authRequired: boolean;
  rateLimit: number;
  usage: {
    requests: number;
    errors: number;
    avgResponseTime: number;
  };
  lastUsed: string;
}

interface APIKey {
  id: string;
  name: string;
  key: string;
  type: 'read' | 'write' | 'admin';
  permissions: string[];
  expiresAt?: string;
  isActive: boolean;
  usage: {
    requests: number;
    lastUsed?: string;
    rateLimit: number;
    rateLimitUsed: number;
  };
  createdBy: string;
  createdAt: string;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
  stats: {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    lastDelivery?: string;
  };
}

interface APIMetrics {
  totalRequests: number;
  requestsToday: number;
  avgResponseTime: number;
  errorRate: number;
  topEndpoints: Array<{
    endpoint: string;
    requests: number;
    errors: number;
  }>;
  statusCodes: {
    [key: string]: number;
  };
}

export const ComprehensiveAPIAccess: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [apiEndpoints, setApiEndpoints] = useState<APIEndpoint[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [apiMetrics, setApiMetrics] = useState<APIMetrics | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [showKeyCreator, setShowKeyCreator] = useState(false);
  const [showWebhookCreator, setShowWebhookCreator] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});

  const mockAPIEndpoints: APIEndpoint[] = [
    {
      id: 'EP001',
      name: 'Get Reservations',
      method: 'GET',
      path: '/api/v1/reservations',
      description: 'Retrieve all reservations with optional filtering',
      category: 'Reservations',
      version: 'v1',
      status: 'active',
      authRequired: true,
      rateLimit: 1000,
      usage: { requests: 25847, errors: 12, avgResponseTime: 145 },
      lastUsed: '2024-12-01T14:30:00Z'
    },
    {
      id: 'EP002',
      name: 'Create Reservation',
      method: 'POST',
      path: '/api/v1/reservations',
      description: 'Create a new reservation',
      category: 'Reservations',
      version: 'v1',
      status: 'active',
      authRequired: true,
      rateLimit: 500,
      usage: { requests: 8934, errors: 45, avgResponseTime: 234 },
      lastUsed: '2024-12-01T14:15:00Z'
    },
    {
      id: 'EP003',
      name: 'Get Rooms',
      method: 'GET',
      path: '/api/v1/rooms',
      description: 'Retrieve room inventory and availability',
      category: 'Inventory',
      version: 'v1',
      status: 'active',
      authRequired: true,
      rateLimit: 2000,
      usage: { requests: 45234, errors: 23, avgResponseTime: 89 },
      lastUsed: '2024-12-01T14:45:00Z'
    },
    {
      id: 'EP004',
      name: 'Process Payment',
      method: 'POST',
      path: '/api/v1/payments',
      description: 'Process guest payments and transactions',
      category: 'Payments',
      version: 'v1',
      status: 'active',
      authRequired: true,
      rateLimit: 100,
      usage: { requests: 3456, errors: 8, avgResponseTime: 456 },
      lastUsed: '2024-12-01T14:20:00Z'
    },
    {
      id: 'EP005',
      name: 'Get Guest Profile (Legacy)',
      method: 'GET',
      path: '/api/v0/guest/{id}',
      description: 'Legacy endpoint for guest profile retrieval',
      category: 'Guests',
      version: 'v0',
      status: 'deprecated',
      authRequired: true,
      rateLimit: 100,
      usage: { requests: 234, errors: 12, avgResponseTime: 789 },
      lastUsed: '2024-11-15T10:30:00Z'
    }
  ];

  const mockAPIKeys: APIKey[] = [
    {
      id: 'KEY001',
      name: 'Mobile App Production',
      key: 'pk_live_1234567890abcdef',
      type: 'read',
      permissions: ['read:reservations', 'read:rooms', 'read:guests'],
      expiresAt: '2025-06-01T00:00:00Z',
      isActive: true,
      usage: {
        requests: 156789,
        lastUsed: '2024-12-01T14:45:00Z',
        rateLimit: 10000,
        rateLimitUsed: 7234
      },
      createdBy: 'John Smith',
      createdAt: '2024-06-01T09:00:00Z'
    },
    {
      id: 'KEY002',
      name: 'Partner Integration',
      key: 'pk_test_abcdef1234567890',
      type: 'write',
      permissions: ['read:reservations', 'write:reservations', 'read:rooms'],
      isActive: true,
      usage: {
        requests: 45623,
        lastUsed: '2024-12-01T13:20:00Z',
        rateLimit: 5000,
        rateLimitUsed: 2145
      },
      createdBy: 'Sarah Johnson',
      createdAt: '2024-08-15T14:30:00Z'
    },
    {
      id: 'KEY003',
      name: 'Admin Dashboard',
      key: 'pk_admin_fedcba0987654321',
      type: 'admin',
      permissions: ['*'],
      expiresAt: '2024-12-31T23:59:59Z',
      isActive: false,
      usage: {
        requests: 8934,
        lastUsed: '2024-11-28T16:45:00Z',
        rateLimit: 1000,
        rateLimitUsed: 0
      },
      createdBy: 'Admin User',
      createdAt: '2024-01-01T00:00:00Z'
    }
  ];

  const mockWebhooks: WebhookEndpoint[] = [
    {
      id: 'WH001',
      name: 'Booking Notifications',
      url: 'https://partner.example.com/webhooks/bookings',
      events: ['reservation.created', 'reservation.updated', 'reservation.cancelled'],
      isActive: true,
      secret: 'whsec_1234567890abcdef',
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2
      },
      stats: {
        totalDeliveries: 1245,
        successfulDeliveries: 1189,
        failedDeliveries: 56,
        lastDelivery: '2024-12-01T14:30:00Z'
      }
    },
    {
      id: 'WH002',
      name: 'Payment Processing',
      url: 'https://payments.example.com/webhooks/hotel',
      events: ['payment.completed', 'payment.failed', 'refund.processed'],
      isActive: true,
      secret: 'whsec_abcdef1234567890',
      retryPolicy: {
        maxRetries: 5,
        backoffMultiplier: 1.5
      },
      stats: {
        totalDeliveries: 567,
        successfulDeliveries: 562,
        failedDeliveries: 5,
        lastDelivery: '2024-12-01T14:15:00Z'
      }
    }
  ];

  const mockAPIMetrics: APIMetrics = {
    totalRequests: 234567,
    requestsToday: 15678,
    avgResponseTime: 187,
    errorRate: 0.8,
    topEndpoints: [
      { endpoint: '/api/v1/rooms', requests: 45234, errors: 23 },
      { endpoint: '/api/v1/reservations', requests: 25847, errors: 12 },
      { endpoint: '/api/v1/guests', requests: 18934, errors: 34 },
      { endpoint: '/api/v1/payments', requests: 3456, errors: 8 }
    ],
    statusCodes: {
      '200': 220145,
      '201': 8934,
      '400': 2134,
      '401': 1234,
      '404': 567,
      '500': 234
    }
  };

  useEffect(() => {
    setApiEndpoints(mockAPIEndpoints);
    setApiKeys(mockAPIKeys);
    setWebhooks(mockWebhooks);
    setApiMetrics(mockAPIMetrics);
  }, []);

  const filteredEndpoints = apiEndpoints.filter(endpoint => {
    const matchesSearch = endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         endpoint.path.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || endpoint.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const toggleKeyStatus = (keyId: string) => {
    setApiKeys(apiKeys.map(key => 
      key.id === keyId ? { ...key, isActive: !key.isActive } : key
    ));
    
    const key = apiKeys.find(k => k.id === keyId);
    toast({
      title: "API Key Updated",
      description: `${key?.name} has been ${!key?.isActive ? 'activated' : 'deactivated'}`
    });
  };

  const toggleWebhookStatus = (webhookId: string) => {
    setWebhooks(webhooks.map(webhook => 
      webhook.id === webhookId ? { ...webhook, isActive: !webhook.isActive } : webhook
    ));
    
    const webhook = webhooks.find(w => w.id === webhookId);
    toast({
      title: "Webhook Updated",
      description: `${webhook?.name} has been ${!webhook?.isActive ? 'activated' : 'deactivated'}`
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`
    });
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-500';
      case 'POST': return 'bg-green-500';
      case 'PUT': return 'bg-yellow-500';
      case 'DELETE': return 'bg-red-500';
      case 'PATCH': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'deprecated': return 'destructive';
      case 'beta': return 'secondary';
      case 'maintenance': return 'outline';
      default: return 'secondary';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* API Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{apiMetrics?.totalRequests.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Requests Today</p>
                <p className="text-2xl font-bold">{apiMetrics?.requestsToday.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{apiMetrics?.avgResponseTime}ms</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">{apiMetrics?.errorRate}%</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Top API Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiMetrics?.topEndpoints.map((endpoint, index) => (
              <div key={endpoint.endpoint} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{endpoint.endpoint}</div>
                    <div className="text-sm text-muted-foreground">
                      {endpoint.requests.toLocaleString()} requests
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{endpoint.requests.toLocaleString()}</div>
                  <div className="text-sm text-red-500">{endpoint.errors} errors</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Codes */}
      <Card>
        <CardHeader>
          <CardTitle>Response Status Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(apiMetrics?.statusCodes || {}).map(([code, count]) => (
              <div key={code} className="text-center p-4 border rounded-lg">
                <div className={`text-2xl font-bold ${
                  code.startsWith('2') ? 'text-green-600' :
                  code.startsWith('4') ? 'text-yellow-600' :
                  code.startsWith('5') ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {count.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">{code}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>API Health Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="font-medium">All Systems Operational</div>
                <div className="text-sm text-muted-foreground">All endpoints responding normally</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <div className="font-medium">Security Status: Good</div>
                <div className="text-sm text-muted-foreground">No security incidents detected</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <TrendingUp className="h-8 w-8 text-yellow-600" />
              <div>
                <div className="font-medium">Rate Limits: Normal</div>
                <div className="text-sm text-muted-foreground">No rate limit violations</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderEndpoints = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search endpoints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Reservations">Reservations</SelectItem>
                <SelectItem value="Inventory">Inventory</SelectItem>
                <SelectItem value="Payments">Payments</SelectItem>
                <SelectItem value="Guests">Guests</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Endpoint
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints List */}
      <div className="space-y-4">
        {filteredEndpoints.map(endpoint => (
          <Card key={endpoint.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedEndpoint(endpoint)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex items-center space-x-2">
                    <div className={`px-2 py-1 text-xs font-bold text-white rounded ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </div>
                    <Badge variant={getStatusColor(endpoint.status) as any}>
                      {endpoint.status}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{endpoint.name}</div>
                    <div className="text-sm text-muted-foreground font-mono">{endpoint.path}</div>
                    <div className="text-sm text-muted-foreground mt-1">{endpoint.description}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6 text-right">
                  <div>
                    <div className="text-lg font-bold">{endpoint.usage.requests.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Requests</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${endpoint.usage.errors > 50 ? 'text-red-600' : 'text-green-600'}`}>
                      {endpoint.usage.errors}
                    </div>
                    <div className="text-xs text-muted-foreground">Errors</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{endpoint.usage.avgResponseTime}ms</div>
                    <div className="text-xs text-muted-foreground">Avg Response</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderAPIKeys = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">API Keys</h3>
        <Button onClick={() => setShowKeyCreator(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      <div className="space-y-4">
        {apiKeys.map(apiKey => (
          <Card key={apiKey.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h4 className="font-medium">{apiKey.name}</h4>
                    <Badge variant={apiKey.type === 'admin' ? 'destructive' : 'secondary'}>
                      {apiKey.type}
                    </Badge>
                    <Badge variant={apiKey.isActive ? 'default' : 'outline'}>
                      {apiKey.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Key:</span>
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {showSecrets[apiKey.id] ? apiKey.key : '•'.repeat(apiKey.key.length)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSecretVisibility(apiKey.id)}
                      >
                        {showSecrets[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(apiKey.key, 'API Key')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <div>Created by {apiKey.createdBy} on {new Date(apiKey.createdAt).toLocaleDateString()}</div>
                      {apiKey.expiresAt && (
                        <div>Expires: {new Date(apiKey.expiresAt).toLocaleDateString()}</div>
                      )}
                      {apiKey.usage.lastUsed && (
                        <div>Last used: {new Date(apiKey.usage.lastUsed).toLocaleString()}</div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {apiKey.permissions.slice(0, 3).map(permission => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                      {apiKey.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{apiKey.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-2">
                  <div>
                    <div className="text-lg font-bold">{apiKey.usage.requests.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Total Requests</div>
                  </div>
                  <div>
                    <div className="text-sm">
                      {apiKey.usage.rateLimitUsed.toLocaleString()} / {apiKey.usage.rateLimit.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Rate Limit</div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant={apiKey.isActive ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => toggleKeyStatus(apiKey.id)}
                    >
                      {apiKey.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderWebhooks = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Webhook Endpoints</h3>
        <Button onClick={() => setShowWebhookCreator(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      <div className="space-y-4">
        {webhooks.map(webhook => (
          <Card key={webhook.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h4 className="font-medium">{webhook.name}</h4>
                    <Badge variant={webhook.isActive ? 'default' : 'outline'}>
                      {webhook.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">URL:</span>
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {webhook.url}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(webhook.url, 'Webhook URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Secret:</span>
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {showSecrets[webhook.id] ? webhook.secret : '•'.repeat(webhook.secret.length)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSecretVisibility(webhook.id)}
                      >
                        {showSecrets[webhook.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {webhook.events.map(event => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-2">
                  <div>
                    <div className="text-lg font-bold">{webhook.stats.totalDeliveries}</div>
                    <div className="text-xs text-muted-foreground">Total Deliveries</div>
                  </div>
                  <div>
                    <div className="text-sm text-green-600">{webhook.stats.successfulDeliveries}</div>
                    <div className="text-xs text-muted-foreground">Successful</div>
                  </div>
                  <div>
                    <div className="text-sm text-red-600">{webhook.stats.failedDeliveries}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant={webhook.isActive ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => toggleWebhookStatus(webhook.id)}
                    >
                      {webhook.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'endpoints', name: 'API Endpoints', icon: Globe },
    { id: 'keys', name: 'API Keys', icon: Key },
    { id: 'webhooks', name: 'Webhooks', icon: Webhook }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">API Management</h2>
        <div className="flex space-x-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            API Documentation
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Card>
        <CardContent className="p-0">
          <div className="flex space-x-0 border-b">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'endpoints' && renderEndpoints()}
      {activeTab === 'keys' && renderAPIKeys()}
      {activeTab === 'webhooks' && renderWebhooks()}

      {/* Endpoint Details Modal */}
      {selectedEndpoint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <div className={`px-2 py-1 text-xs font-bold text-white rounded mr-3 ${getMethodColor(selectedEndpoint.method)}`}>
                    {selectedEndpoint.method}
                  </div>
                  {selectedEndpoint.name}
                </CardTitle>
                <Button variant="outline" onClick={() => setSelectedEndpoint(null)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Endpoint Path</label>
                  <code className="block bg-muted p-2 rounded font-mono text-sm mt-1">
                    {selectedEndpoint.path}
                  </code>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Rate Limit</label>
                  <div className="text-lg font-semibold">{selectedEndpoint.rateLimit} requests/hour</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm mt-1">{selectedEndpoint.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{selectedEndpoint.usage.requests.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Requests</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{selectedEndpoint.usage.errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{selectedEndpoint.usage.avgResponseTime}ms</div>
                  <div className="text-sm text-muted-foreground">Avg Response Time</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant={getStatusColor(selectedEndpoint.status) as any}>
                  {selectedEndpoint.status}
                </Badge>
                <Badge variant="outline">{selectedEndpoint.version}</Badge>
                <Badge variant="outline">{selectedEndpoint.category}</Badge>
                {selectedEndpoint.authRequired && (
                  <Badge variant="secondary">
                    <Shield className="mr-1 h-3 w-3" />
                    Auth Required
                  </Badge>
                )}
              </div>

              <div className="flex space-x-2">
                <Button className="flex-1">
                  <Terminal className="mr-2 h-4 w-4" />
                  Test Endpoint
                </Button>
                <Button variant="outline" className="flex-1">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};