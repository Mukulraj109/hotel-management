import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/utils/toast';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  CreditCard,
  Building,
  Users,
  Calendar,
  Clock,
  RefreshCw,
  Settings,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  PieChart,
  BarChart3,
  Activity,
  Globe,
  Smartphone,
  Zap,
  Target,
  Eye
} from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';

interface AccountingIntegration {
  id: string;
  name: string;
  type: 'erp' | 'accounting' | 'banking' | 'payment';
  logo: string;
  isConnected: boolean;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lastSync: Date;
  autoSync: boolean;
  syncInterval: number;
  settings: {
    companyCode?: string;
    chartOfAccounts: { [key: string]: string };
    taxSettings: {
      defaultTaxRate: number;
      taxAccounts: { [key: string]: string };
    };
    currencies: string[];
    fiscalYearStart: string;
  };
}

interface FinancialTransaction {
  id: string;
  type: 'revenue' | 'expense' | 'receivable' | 'payable' | 'adjustment';
  date: Date;
  amount: number;
  currency: string;
  description: string;
  account: string;
  reference: string;
  status: 'pending' | 'posted' | 'reconciled' | 'error';
  guestName?: string;
  bookingId?: string;
  departmentId?: string;
  paymentMethod?: string;
  taxAmount?: number;
}

interface AgingReport {
  category: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  accountsReceivable: number;
  accountsPayable: number;
  cashFlow: number;
  currentRatio: number;
  revenueGrowth: number;
  expenseRatio: number;
  dsoRatio: number; // Days Sales Outstanding
}

interface CurrencyRate {
  currency: string;
  rate: number;
  lastUpdated: Date;
  trend: 'up' | 'down' | 'stable';
}

const AccountingIntegrationDashboard: React.FC = () => {
  const [integrations, setIntegrations] = useState<AccountingIntegration[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [agingReport, setAgingReport] = useState<AgingReport[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<AccountingIntegration | null>(null);
  const [baseCurrency, setBaseCurrency] = useState('INR');
  const [fiscalPeriod, setFiscalPeriod] = useState('current');
  const [isLoading, setIsLoading] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  useEffect(() => {
    fetchFinancialData();
  }, [baseCurrency, fiscalPeriod]);

  const fetchFinancialData = async () => {
    setIsLoading(true);
    try {
      // Mock API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockIntegrations: AccountingIntegration[] = [
        {
          id: 'quickbooks',
          name: 'QuickBooks Online',
          type: 'accounting',
          logo: '/logos/quickbooks.png',
          isConnected: true,
          status: 'active',
          lastSync: new Date(Date.now() - 300000),
          autoSync: true,
          syncInterval: 60,
          settings: {
            companyCode: 'HOTEL001',
            chartOfAccounts: {
              'room_revenue': '4000',
              'fb_revenue': '4100',
              'other_revenue': '4900',
              'cost_of_sales': '5000',
              'operating_expenses': '6000',
              'accounts_receivable': '1200',
              'accounts_payable': '2100'
            },
            taxSettings: {
              defaultTaxRate: 18,
              taxAccounts: {
                'cgst': '2300',
                'sgst': '2301',
                'igst': '2302'
              }
            },
            currencies: ['INR', 'USD', 'EUR', 'GBP'],
            fiscalYearStart: '04-01'
          }
        },
        {
          id: 'sap',
          name: 'SAP Business One',
          type: 'erp',
          logo: '/logos/sap.png',
          isConnected: true,
          status: 'active',
          lastSync: new Date(Date.now() - 600000),
          autoSync: true,
          syncInterval: 120,
          settings: {
            companyCode: 'HOTEL',
            chartOfAccounts: {
              'room_revenue': '40000000',
              'fb_revenue': '40100000',
              'accounts_receivable': '11000000',
              'accounts_payable': '21000000'
            },
            taxSettings: {
              defaultTaxRate: 18,
              taxAccounts: {
                'input_tax': '15410000',
                'output_tax': '23410000'
              }
            },
            currencies: ['INR', 'USD'],
            fiscalYearStart: '04-01'
          }
        },
        {
          id: 'razorpay',
          name: 'Razorpay',
          type: 'payment',
          logo: '/logos/razorpay.png',
          isConnected: true,
          status: 'active',
          lastSync: new Date(Date.now() - 180000),
          autoSync: true,
          syncInterval: 30,
          settings: {
            chartOfAccounts: {
              'payment_gateway': '1110',
              'gateway_charges': '6200'
            },
            taxSettings: {
              defaultTaxRate: 18,
              taxAccounts: {}
            },
            currencies: ['INR'],
            fiscalYearStart: '04-01'
          }
        },
        {
          id: 'hdfc_bank',
          name: 'HDFC Bank',
          type: 'banking',
          logo: '/logos/hdfc.png',
          isConnected: false,
          status: 'inactive',
          lastSync: new Date(Date.now() - 86400000),
          autoSync: false,
          syncInterval: 1440,
          settings: {
            chartOfAccounts: {
              'bank_account': '1001'
            },
            taxSettings: {
              defaultTaxRate: 0,
              taxAccounts: {}
            },
            currencies: ['INR'],
            fiscalYearStart: '04-01'
          }
        }
      ];

      const mockTransactions: FinancialTransaction[] = [
        {
          id: '1',
          type: 'revenue',
          date: new Date('2024-01-10'),
          amount: 15750,
          currency: 'INR',
          description: 'Room Revenue - Deluxe Suite',
          account: '4000',
          reference: 'BK-2024-001',
          status: 'posted',
          guestName: 'John Doe',
          bookingId: 'BK-2024-001',
          departmentId: 'ROOMS',
          paymentMethod: 'Credit Card',
          taxAmount: 2835
        },
        {
          id: '2',
          type: 'receivable',
          date: new Date('2024-01-09'),
          amount: 25000,
          currency: 'INR',
          description: 'Corporate Booking - ABC Corp',
          account: '1200',
          reference: 'INV-2024-045',
          status: 'pending',
          guestName: 'ABC Corporation',
          bookingId: 'BK-2024-002',
          departmentId: 'ROOMS',
          paymentMethod: 'Corporate Credit'
        },
        {
          id: '3',
          type: 'expense',
          date: new Date('2024-01-08'),
          amount: 8500,
          currency: 'INR',
          description: 'Housekeeping Supplies',
          account: '6000',
          reference: 'PO-2024-123',
          status: 'posted',
          departmentId: 'HOUSEKEEPING'
        }
      ];

      const mockAgingReport: AgingReport[] = [
        {
          category: 'Guest Folios',
          current: 125000,
          days30: 85000,
          days60: 45000,
          days90: 25000,
          over90: 15000,
          total: 295000
        },
        {
          category: 'Corporate Accounts',
          current: 450000,
          days30: 125000,
          days60: 85000,
          days90: 35000,
          over90: 25000,
          total: 720000
        },
        {
          category: 'Travel Agents',
          current: 85000,
          days30: 45000,
          days60: 25000,
          days90: 15000,
          over90: 8000,
          total: 178000
        }
      ];

      const mockMetrics: FinancialMetrics = {
        totalRevenue: 2850000,
        totalExpenses: 1750000,
        netIncome: 1100000,
        accountsReceivable: 1193000,
        accountsPayable: 385000,
        cashFlow: 850000,
        currentRatio: 1.85,
        revenueGrowth: 12.5,
        expenseRatio: 61.4,
        dsoRatio: 28.5
      };

      const mockCurrencyRates: CurrencyRate[] = [
        { currency: 'USD', rate: 83.15, lastUpdated: new Date(), trend: 'up' },
        { currency: 'EUR', rate: 90.25, lastUpdated: new Date(), trend: 'down' },
        { currency: 'GBP', rate: 105.80, lastUpdated: new Date(), trend: 'stable' }
      ];

      setIntegrations(mockIntegrations);
      setTransactions(mockTransactions);
      setAgingReport(mockAgingReport);
      setMetrics(mockMetrics);
      setCurrencyRates(mockCurrencyRates);
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleIntegration = async (integrationId: string, connected: boolean) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIntegrations(prev => prev.map(integration =>
        integration.id === integrationId 
          ? { ...integration, isConnected: connected, status: connected ? 'active' : 'inactive' }
          : integration
      ));
      
      toast.success(`${connected ? 'Connected to' : 'Disconnected from'} integration`);
    } catch (error) {
      toast.error('Failed to update integration');
    }
  };

  const syncIntegration = async (integrationId: string) => {
    try {
      setIntegrations(prev => prev.map(integration =>
        integration.id === integrationId 
          ? { ...integration, status: 'syncing' }
          : integration
      ));

      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setIntegrations(prev => prev.map(integration =>
        integration.id === integrationId 
          ? { ...integration, status: 'active', lastSync: new Date() }
          : integration
      ));
      
      toast.success('Synchronization completed');
      fetchFinancialData(); // Refresh data
    } catch (error) {
      setIntegrations(prev => prev.map(integration =>
        integration.id === integrationId 
          ? { ...integration, status: 'error' }
          : integration
      ));
      toast.error('Synchronization failed');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'syncing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'inactive': return <Clock className="w-4 h-4 text-gray-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'syncing': return 'bg-blue-100 text-blue-700';
      case 'error': return 'bg-red-100 text-red-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'revenue': return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'expense': return <ArrowDownRight className="w-4 h-4 text-red-600" />;
      case 'receivable': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'payable': return <CreditCard className="w-4 h-4 text-orange-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'erp': return <Building className="w-5 h-5" />;
      case 'accounting': return <Calculator className="w-5 h-5" />;
      case 'banking': return <Wallet className="w-5 h-5" />;
      case 'payment': return <CreditCard className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getCurrencyTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-red-500" />;
      default: return <Activity className="w-3 h-3 text-gray-500" />;
    }
  };

  const exportFinancialData = async (format: 'excel' | 'pdf' | 'csv') => {
    try {
      // Mock export functionality
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`Financial data exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  if (isLoading && !metrics) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Financial & Accounting Integration</h1>
          <p className="text-gray-600">Connect and sync with your accounting systems</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={baseCurrency} onValueChange={setBaseCurrency}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">INR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={fiscalPeriod} onValueChange={setFiscalPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Month</SelectItem>
              <SelectItem value="quarter">Current Quarter</SelectItem>
              <SelectItem value="year">Current Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchFinancialData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">+{metrics.revenueGrowth}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Net Income</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.netIncome)}</p>
                </div>
                <Target className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Accounts Receivable</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(metrics.accountsReceivable)}</p>
                </div>
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="text-xs text-gray-500 mt-1">DSO: {metrics.dsoRatio} days</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cash Flow</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.cashFlow)}</p>
                </div>
                <Activity className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Ratio</p>
                  <p className="text-2xl font-bold">{metrics.currentRatio}</p>
                </div>
                <BarChart3 className="w-6 h-6 text-purple-500" />
              </div>
              <div className="text-xs text-gray-500 mt-1">Liquidity measure</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="currencies">Multi-Currency</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {integrations.map(integration => (
              <Card key={integration.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getIntegrationIcon(integration.type)}
                      <div>
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <p className="text-sm text-gray-500 capitalize">{integration.type}</p>
                      </div>
                    </div>
                    
                    <Badge className={getStatusColor(integration.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(integration.status)}
                        <span className="text-xs capitalize">{integration.status}</span>
                      </div>
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="text-sm">
                    <p className="text-gray-600">Last Sync: {integration.lastSync.toLocaleString()}</p>
                    <p className="text-gray-600">Auto Sync: {integration.autoSync ? 'Enabled' : 'Disabled'}</p>
                    {integration.settings.companyCode && (
                      <p className="text-gray-600">Company: {integration.settings.companyCode}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={integration.isConnected}
                        onCheckedChange={(checked) => toggleIntegration(integration.id, checked)}
                        size="sm"
                      />
                      <span className="text-sm text-gray-600">
                        {integration.isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {integration.isConnected && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncIntegration(integration.id)}
                          disabled={integration.status === 'syncing'}
                        >
                          <RefreshCw className={`w-3 h-3 ${integration.status === 'syncing' ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedIntegration(integration);
                          setSettingsDialogOpen(true);
                        }}
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportFinancialData('excel')}>
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </Button>
                  <Button size="sm" variant="outline">
                    <Upload className="w-3 h-3 mr-1" />
                    Import
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(transaction => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          <span className="capitalize">{transaction.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.date.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          {transaction.guestName && (
                            <p className="text-xs text-gray-500">{transaction.guestName}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{transaction.reference}</TableCell>
                      <TableCell>
                        <div className="text-right">
                          <p className={`font-medium ${
                            transaction.type === 'revenue' ? 'text-green-600' : 
                            transaction.type === 'expense' ? 'text-red-600' : 
                            'text-gray-600'
                          }`}>
                            {formatCurrency(transaction.amount)}
                          </p>
                          {transaction.taxAmount && (
                            <p className="text-xs text-gray-500">
                              Tax: {formatCurrency(transaction.taxAmount)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          transaction.status === 'posted' ? 'bg-green-100 text-green-700' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          transaction.status === 'reconciled' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Receivable Aging Report</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>31-60 Days</TableHead>
                    <TableHead>61-90 Days</TableHead>
                    <TableHead>91-120 Days</TableHead>
                    <TableHead>Over 120 Days</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agingReport.map(report => (
                    <TableRow key={report.category}>
                      <TableCell className="font-medium">{report.category}</TableCell>
                      <TableCell>{formatCurrency(report.current)}</TableCell>
                      <TableCell>{formatCurrency(report.days30)}</TableCell>
                      <TableCell>{formatCurrency(report.days60)}</TableCell>
                      <TableCell>{formatCurrency(report.days90)}</TableCell>
                      <TableCell className="text-red-600">
                        {formatCurrency(report.over90)}
                      </TableCell>
                      <TableCell className="font-bold">
                        {formatCurrency(report.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currencies">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Exchange Rates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currencyRates.map(rate => (
                  <div key={rate.currency} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{rate.currency}</span>
                      <div className="flex items-center gap-1">
                        {getCurrencyTrendIcon(rate.trend)}
                        <span className="text-sm text-gray-500">{rate.trend}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">₹{rate.rate.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {rate.lastUpdated.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full mt-4">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Rates
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Currency Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Base Currency</Label>
                  <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">Indian Rupee (INR)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Active Currencies</Label>
                  <div className="space-y-2">
                    {['USD', 'EUR', 'GBP', 'AED', 'SGD'].map(currency => (
                      <div key={currency} className="flex items-center gap-2">
                        <Switch size="sm" />
                        <span className="text-sm">{currency}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Auto-Update Rates</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Switch />
                    <span className="text-sm text-gray-600">Daily at 9:00 AM</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Profit & Loss Statement', description: 'Revenue and expense summary' },
                  { name: 'Balance Sheet', description: 'Assets, liabilities, and equity' },
                  { name: 'Cash Flow Statement', description: 'Cash inflows and outflows' },
                  { name: 'Trial Balance', description: 'Account balances verification' },
                  { name: 'General Ledger', description: 'Detailed transaction history' },
                  { name: 'Tax Summary', description: 'Tax collected and payable' }
                ].map(report => (
                  <div key={report.name} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <h4 className="font-medium">{report.name}</h4>
                      <p className="text-sm text-gray-600">{report.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scheduled Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  {[
                    { name: 'Daily Sales Report', frequency: 'Daily at 11 PM', status: 'Active' },
                    { name: 'Weekly P&L', frequency: 'Monday 9 AM', status: 'Active' },
                    { name: 'Monthly Financial Pack', frequency: '1st of month', status: 'Active' }
                  ].map(schedule => (
                    <div key={schedule.name} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{schedule.name}</h4>
                        <p className="text-sm text-gray-600">{schedule.frequency}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">
                        {schedule.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Schedule
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Integration Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedIntegration && `${selectedIntegration.name} Settings`}
            </DialogTitle>
            <DialogDescription>
              Configure integration-specific settings and account mappings
            </DialogDescription>
          </DialogHeader>
          
          {selectedIntegration && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sync Interval (minutes)</Label>
                  <Input
                    type="number"
                    value={selectedIntegration.syncInterval}
                    onChange={(e) => {
                      const updated = { ...selectedIntegration, syncInterval: parseInt(e.target.value) };
                      setSelectedIntegration(updated);
                    }}
                  />
                </div>
                <div>
                  <Label>Company Code</Label>
                  <Input
                    value={selectedIntegration.settings.companyCode || ''}
                    onChange={(e) => {
                      const updated = {
                        ...selectedIntegration,
                        settings: { ...selectedIntegration.settings, companyCode: e.target.value }
                      };
                      setSelectedIntegration(updated);
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={selectedIntegration.autoSync}
                  onCheckedChange={(checked) => {
                    const updated = { ...selectedIntegration, autoSync: checked };
                    setSelectedIntegration(updated);
                  }}
                />
                <Label>Enable Auto Sync</Label>
              </div>

              <div>
                <Label>Chart of Accounts Mapping</Label>
                <div className="space-y-2 mt-2">
                  {Object.entries(selectedIntegration.settings.chartOfAccounts).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-2">
                      <Input value={key} disabled className="bg-gray-50" />
                      <Input 
                        value={value}
                        onChange={(e) => {
                          const updated = {
                            ...selectedIntegration,
                            settings: {
                              ...selectedIntegration.settings,
                              chartOfAccounts: {
                                ...selectedIntegration.settings.chartOfAccounts,
                                [key]: e.target.value
                              }
                            }
                          };
                          setSelectedIntegration(updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={() => {
                    // Save settings
                    setIntegrations(prev => prev.map(i => 
                      i.id === selectedIntegration.id ? selectedIntegration : i
                    ));
                    setSettingsDialogOpen(false);
                    toast.success('Integration settings updated');
                  }}
                >
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountingIntegrationDashboard;