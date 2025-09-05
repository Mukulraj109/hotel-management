import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/utils/toast';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Building2, DollarSign, CreditCard, AlertTriangle,
  Clock, CheckCircle, Users, Calendar, Filter, Download, RefreshCw,
  AlertCircle, ChevronUp, ChevronDown, Star, Shield, Target, Zap,
  Mail, Phone, FileText, Eye, Edit, Send, Archive
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/currencyUtils';

interface CorporateDue {
  companyId: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  totalPending: number;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  creditUtilization: number;
  paymentTerms: string;
  lastPaymentDate?: string;
  aging: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
  invoiceCount: number;
  oldestInvoiceDate?: number;
  recentBookings: number;
  riskLevel: 'high' | 'medium' | 'low';
  overdueDays: number;
}

interface CompanyTrend {
  companyName: string;
  bookings: number;
  totalRevenue: number;
  averageRate: number;
  totalNights: number;
  cancellationRate: number;
  noShowRate: number;
  averageBookingValue: number;
}

interface ChannelPerformance {
  channel: string;
  bookings: number;
  revenue: number;
  nights: number;
  averageRate: number;
  averageBookingValue: number;
  marketShare: number;
  revenueShare: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const CorporateAnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  
  // Data states
  const [pendingDues, setPendingDues] = useState<CorporateDue[]>([]);
  const [companyTrends, setCompanyTrends] = useState<CompanyTrend[]>([]);
  const [channelPerformance, setChannelPerformance] = useState<ChannelPerformance[]>([]);
  const [creditUtilization, setCreditUtilization] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [selectedPeriod, selectedRiskLevel]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      switch (selectedPeriod) {
        case '7d':
          startDate = subDays(endDate, 7);
          break;
        case '30d':
          startDate = subDays(endDate, 30);
          break;
        case '90d':
          startDate = subDays(endDate, 90);
          break;
        case 'month':
          startDate = startOfMonth(endDate);
          break;
      }
      
      // Simulate API calls - replace with actual service calls
      await Promise.all([
        fetchPendingDues(),
        fetchCompanyTrends(startDate, endDate),
        fetchChannelPerformance(startDate, endDate),
        fetchCreditUtilization()
      ]);
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching corporate analytics:', error);
      toast.error('Failed to load corporate analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingDues = async () => {
    // Simulated data - replace with actual API call
    const mockData: CorporateDue[] = [
      {
        companyId: '1',
        companyName: 'ABC Corporation',
        contactPerson: 'John Smith',
        email: 'john@abccorp.com',
        phone: '+1-555-0101',
        totalPending: 45000,
        creditLimit: 100000,
        currentBalance: 65000,
        availableCredit: 35000,
        creditUtilization: 65,
        paymentTerms: 'net_30',
        lastPaymentDate: '2024-01-15',
        aging: { '0-30': 15000, '31-60': 20000, '61-90': 10000, '90+': 0 },
        invoiceCount: 8,
        recentBookings: 12,
        riskLevel: 'medium',
        overdueDays: 15
      },
      {
        companyId: '2',
        companyName: 'XYZ Industries',
        contactPerson: 'Sarah Johnson',
        email: 'sarah@xyzind.com',
        phone: '+1-555-0102',
        totalPending: 78000,
        creditLimit: 150000,
        currentBalance: 125000,
        availableCredit: 25000,
        creditUtilization: 83,
        paymentTerms: 'net_45',
        lastPaymentDate: '2023-12-20',
        aging: { '0-30': 0, '31-60': 25000, '61-90': 30000, '90+': 23000 },
        invoiceCount: 12,
        recentBookings: 18,
        riskLevel: 'high',
        overdueDays: 45
      },
      {
        companyId: '3',
        companyName: 'Tech Solutions Inc',
        contactPerson: 'Mike Davis',
        email: 'mike@techsol.com',
        phone: '+1-555-0103',
        totalPending: 22000,
        creditLimit: 75000,
        currentBalance: 30000,
        availableCredit: 45000,
        creditUtilization: 40,
        paymentTerms: 'net_15',
        lastPaymentDate: '2024-01-28',
        aging: { '0-30': 22000, '31-60': 0, '61-90': 0, '90+': 0 },
        invoiceCount: 4,
        recentBookings: 8,
        riskLevel: 'low',
        overdueDays: 0
      }
    ];
    
    setPendingDues(mockData);
    setSummary({
      totalPendingAmount: mockData.reduce((sum, d) => sum + d.totalPending, 0),
      totalCompaniesWithDues: mockData.length,
      highRiskCompanies: mockData.filter(d => d.riskLevel === 'high').length,
      averagePendingAmount: mockData.reduce((sum, d) => sum + d.totalPending, 0) / mockData.length,
      totalCreditLimit: mockData.reduce((sum, d) => sum + d.creditLimit, 0),
      avgCreditUtilization: mockData.reduce((sum, d) => sum + d.creditUtilization, 0) / mockData.length
    });
  };

  const fetchCompanyTrends = async (startDate: Date, endDate: Date) => {
    // Simulated data
    const mockTrends: CompanyTrend[] = [
      {
        companyName: 'ABC Corporation',
        bookings: 45,
        totalRevenue: 125000,
        averageRate: 185,
        totalNights: 675,
        cancellationRate: 8,
        noShowRate: 2,
        averageBookingValue: 2778
      },
      {
        companyName: 'XYZ Industries',
        bookings: 62,
        totalRevenue: 189000,
        averageRate: 195,
        totalNights: 969,
        cancellationRate: 12,
        noShowRate: 5,
        averageBookingValue: 3048
      },
      {
        companyName: 'Tech Solutions Inc',
        bookings: 28,
        totalRevenue: 78000,
        averageRate: 175,
        totalNights: 445,
        cancellationRate: 5,
        noShowRate: 1,
        averageBookingValue: 2786
      }
    ];
    
    setCompanyTrends(mockTrends);
  };

  const fetchChannelPerformance = async (startDate: Date, endDate: Date) => {
    // Simulated data
    const mockChannels: ChannelPerformance[] = [
      {
        channel: 'direct',
        bookings: 245,
        revenue: 485000,
        nights: 2450,
        averageRate: 198,
        averageBookingValue: 1980,
        marketShare: 35,
        revenueShare: 40
      },
      {
        channel: 'corporate',
        bookings: 135,
        revenue: 392000,
        nights: 2025,
        averageRate: 194,
        averageBookingValue: 2904,
        marketShare: 19,
        revenueShare: 32
      },
      {
        channel: 'ota',
        bookings: 185,
        revenue: 245000,
        nights: 1480,
        averageRate: 165,
        averageBookingValue: 1324,
        marketShare: 26,
        revenueShare: 20
      },
      {
        channel: 'travel_agent',
        bookings: 95,
        revenue: 156000,
        nights: 855,
        averageRate: 182,
        averageBookingValue: 1642,
        marketShare: 14,
        revenueShare: 13
      },
      {
        channel: 'walk_in',
        bookings: 45,
        revenue: 78000,
        nights: 450,
        averageRate: 173,
        averageBookingValue: 1733,
        marketShare: 6,
        revenueShare: 6
      }
    ];
    
    setChannelPerformance(mockChannels);
  };

  const fetchCreditUtilization = async () => {
    // Simulated data
    const mockUtilization = [
      {
        companyName: 'ABC Corporation',
        creditLimit: 100000,
        currentBalance: 65000,
        utilizationPercentage: 65,
        status: 'medium',
        riskLevel: 'medium'
      },
      {
        companyName: 'XYZ Industries',
        creditLimit: 150000,
        currentBalance: 125000,
        utilizationPercentage: 83,
        status: 'high',
        riskLevel: 'high'
      },
      {
        companyName: 'Tech Solutions Inc',
        creditLimit: 75000,
        currentBalance: 30000,
        utilizationPercentage: 40,
        status: 'low',
        riskLevel: 'low'
      }
    ];
    
    setCreditUtilization(mockUtilization);
  };

  const getRiskBadge = (risk: string) => {
    const config = {
      high: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      medium: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      low: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };
    
    const { color, icon: Icon } = config[risk as keyof typeof config];
    
    return (
      <Badge className={cn('flex items-center gap-1', color)}>
        <Icon className="w-3 h-3" />
        {risk.charAt(0).toUpperCase() + risk.slice(1)}
      </Badge>
    );
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage > 90) return 'text-red-600';
    if (percentage > 75) return 'text-orange-600';
    if (percentage > 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const filteredDues = selectedRiskLevel === 'all' 
    ? pendingDues 
    : pendingDues.filter(due => due.riskLevel === selectedRiskLevel);

  if (loading && pendingDues.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Corporate Analytics</h1>
          <p className="text-gray-600">Monitor corporate bookings, credit utilization, and pending dues</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Last updated: {format(lastUpdate, 'HH:mm:ss')}
          </div>
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedRiskLevel} onValueChange={setSelectedRiskLevel}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={fetchAllData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending Dues</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalPendingAmount)}</div>
            <div className="flex items-center text-sm text-red-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              +12.5% from last period
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {summary.totalCompaniesWithDues} companies with outstanding dues
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Utilization</CardTitle>
            <CreditCard className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(summary.avgCreditUtilization)}%</div>
            <div className="flex items-center text-sm text-yellow-600">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {summary.highRiskCompanies} high-risk companies
            </div>
            <Progress value={summary.avgCreditUtilization} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Corporate Revenue</CardTitle>
            <Building2 className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(companyTrends.reduce((sum, t) => sum + t.totalRevenue, 0))}
            </div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              +8.3% growth
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {companyTrends.reduce((sum, t) => sum + t.bookings, 0)} corporate bookings
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credit</CardTitle>
            <Shield className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalCreditLimit - pendingDues.reduce((sum, d) => sum + d.currentBalance, 0))}
            </div>
            <div className="text-sm text-gray-600">
              of {formatCurrency(summary.totalCreditLimit)} total limit
            </div>
            <div className="mt-2 text-xs text-green-600">
              Healthy credit portfolio
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pending-dues">Pending Dues</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Credit Utilization Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Credit Utilization by Company</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={creditUtilization}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="companyName" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} />
                    <Bar dataKey="utilizationPercentage" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Low Risk', value: pendingDues.filter(d => d.riskLevel === 'low').length, color: '#10B981' },
                        { name: 'Medium Risk', value: pendingDues.filter(d => d.riskLevel === 'medium').length, color: '#F59E0B' },
                        { name: 'High Risk', value: pendingDues.filter(d => d.riskLevel === 'high').length, color: '#EF4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pendingDues.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Companies Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Top Corporate Clients Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {companyTrends.slice(0, 5).map((company, index) => (
                  <div key={company.companyName} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                      <div>
                        <div className="font-semibold text-lg">{company.companyName}</div>
                        <div className="text-sm text-gray-600">
                          {company.bookings} bookings • {company.totalNights} nights
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(company.totalRevenue)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Avg: {formatCurrency(company.averageBookingValue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending-dues" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Pending Dues Management
              </CardTitle>
              <CardDescription>
                Companies with outstanding payments and credit management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredDues.map(due => (
                  <div key={due.companyId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{due.companyName}</div>
                          <div className="text-sm text-gray-600">{due.contactPerson}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">
                          {formatCurrency(due.totalPending)}
                        </div>
                        {getRiskBadge(due.riskLevel)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-600">Credit Limit</div>
                        <div className="font-semibold">{formatCurrency(due.creditLimit)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Available Credit</div>
                        <div className="font-semibold text-green-600">
                          {formatCurrency(due.availableCredit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Utilization</div>
                        <div className={cn('font-semibold', getUtilizationColor(due.creditUtilization))}>
                          {due.creditUtilization}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Overdue Days</div>
                        <div className={cn('font-semibold', {
                          'text-red-600': due.overdueDays > 30,
                          'text-yellow-600': due.overdueDays > 0 && due.overdueDays <= 30,
                          'text-green-600': due.overdueDays === 0
                        })}>
                          {due.overdueDays} days
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Invoices</div>
                        <div className="font-semibold">{due.invoiceCount}</div>
                      </div>
                    </div>
                    
                    {/* Aging Analysis */}
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-2">Aging Analysis</div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-medium">0-30 days</div>
                          <div className="text-green-600">{formatCurrency(due.aging['0-30'])}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">31-60 days</div>
                          <div className="text-yellow-600">{formatCurrency(due.aging['31-60'])}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">61-90 days</div>
                          <div className="text-orange-600">{formatCurrency(due.aging['61-90'])}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">90+ days</div>
                          <div className="text-red-600">{formatCurrency(due.aging['90+'])}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        {due.email}
                        <Phone className="w-4 h-4 ml-2" />
                        {due.phone}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Mail className="w-4 h-4 mr-1" />
                          Email
                        </Button>
                        <Button size="sm">
                          <Send className="w-4 h-4 mr-1" />
                          Send Reminder
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Corporate Booking Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={companyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="companyName" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => [
                    name === 'bookings' ? value : formatCurrency(value as number),
                    name === 'bookings' ? 'Bookings' : 'Revenue'
                  ]} />
                  <Legend />
                  <Area 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="bookings" 
                    stackId="1" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    name="Bookings" 
                  />
                  <Area 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="totalRevenue" 
                    stackId="2" 
                    stroke="#10B981" 
                    fill="#10B981" 
                    name="Revenue" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cancellation Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={companyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="companyName" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, 'Cancellation Rate']} />
                    <Bar dataKey="cancellationRate" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Booking Values</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={companyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="companyName" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(value as number), 'Avg Booking Value']} />
                    <Bar dataKey="averageBookingValue" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Channel Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={channelPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="bookings" fill="#3B82F6" name="Bookings" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#10B981" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Share Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={channelPerformance}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ channel, marketShare }) => `${channel}: ${marketShare}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="marketShare"
                    >
                      {channelPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Channel Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {channelPerformance.map((channel, index) => (
                    <div key={channel.channel} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <div className="font-medium capitalize">{channel.channel.replace('_', ' ')}</div>
                          <div className="text-sm text-gray-600">
                            {channel.bookings} bookings • {formatCurrency(channel.averageRate)} avg rate
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(channel.revenue)}</div>
                        <div className="text-sm text-gray-600">{channel.marketShare}% share</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CorporateAnalyticsDashboard;