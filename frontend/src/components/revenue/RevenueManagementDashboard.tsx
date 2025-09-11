import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Target,
  Brain,
  Zap,
  AlertTriangle,
  Settings,
  RefreshCw,
  Eye,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Users,
  Building,
  MapPin,
  Clock,
  Star,
  Percent
} from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';
import revenueManagementService, { RevenueMetrics, RateShopping, DemandForecast } from '@/services/revenueManagementService';

interface RoomTypeRate {
  id: string;
  roomType: string;
  baseRate: number;
  currentRate: number;
  demandMultiplier: number;
  occupancyThreshold: number;
  minRate: number;
  maxRate: number;
  isActive: boolean;
  lastUpdated: Date;
}



const RevenueManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [autoOptimization, setAutoOptimization] = useState(true);
  const [rateTypes, setRateTypes] = useState<RoomTypeRate[]>([]);
  const [demandForecast, setDemandForecast] = useState<DemandForecast[]>([]);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [rateShopping, setRateShopping] = useState<RateShopping | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data initialization
  useEffect(() => {
    fetchRevenueData();
  }, [dateRange]);

  const fetchRevenueData = async () => {
    setIsLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Fetch real data from API
      const dashboardData = await revenueManagementService.getDashboardMetrics({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      // Mock rate types (these would come from room management in a complete system)
      const mockRateTypes: RoomTypeRate[] = [
        {
          id: '1',
          roomType: 'Standard Room',
          baseRate: Math.round(dashboardData.metrics.adr * 0.85),
          currentRate: dashboardData.metrics.adr,
          demandMultiplier: 1.2,
          occupancyThreshold: 80,
          minRate: Math.round(dashboardData.metrics.adr * 0.7),
          maxRate: Math.round(dashboardData.metrics.adr * 1.5),
          isActive: true,
          lastUpdated: new Date()
        },
        {
          id: '2',
          roomType: 'Deluxe Suite',
          baseRate: Math.round(dashboardData.metrics.adr * 1.5),
          currentRate: Math.round(dashboardData.metrics.adr * 1.8),
          demandMultiplier: 1.2,
          occupancyThreshold: 75,
          minRate: Math.round(dashboardData.metrics.adr * 1.2),
          maxRate: Math.round(dashboardData.metrics.adr * 2.5),
          isActive: true,
          lastUpdated: new Date()
        },
        {
          id: '3',
          roomType: 'Executive Suite',
          baseRate: Math.round(dashboardData.metrics.adr * 2.5),
          currentRate: Math.round(dashboardData.metrics.adr * 3.0),
          demandMultiplier: 1.2,
          occupancyThreshold: 70,
          minRate: Math.round(dashboardData.metrics.adr * 2.0),
          maxRate: Math.round(dashboardData.metrics.adr * 4.0),
          isActive: true,
          lastUpdated: new Date()
        }
      ];

      setRateTypes(mockRateTypes);
      setDemandForecast(dashboardData.demandForecast);
      setMetrics(dashboardData.metrics);
      setRateShopping(dashboardData.rateShopping);
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
      // Set empty/default state on error
      setRateTypes([]);
      setDemandForecast([]);
      setMetrics(null);
      setRateShopping(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRateType = (id: string, updates: Partial<RoomTypeRate>) => {
    setRateTypes(prev => prev.map(rate => 
      rate.id === id ? { ...rate, ...updates, lastUpdated: new Date() } : rate
    ));
  };

  const getDemandLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'peak': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChangeColor = (change: number) => {
    return change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';
  };

  const getChangeIcon = (change: number) => {
    return change > 0 ? <TrendingUp className="w-4 h-4" /> : change < 0 ? <TrendingDown className="w-4 h-4" /> : null;
  };

  if (isLoading && !metrics) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
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
          <h1 className="text-2xl font-bold">Revenue Management</h1>
          <p className="text-gray-600">AI-powered pricing optimization and demand intelligence</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-optimization">Auto Optimization</Label>
            <Switch
              id="auto-optimization"
              checked={autoOptimization}
              onCheckedChange={setAutoOptimization}
            />
          </div>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchRevenueData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                {getChangeIcon(12.3)}
                <span className={`text-sm ${getChangeColor(12.3)}`}>+12.3% vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">RevPAR</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.revPAR)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                {getChangeIcon(8.7)}
                <span className={`text-sm ${getChangeColor(8.7)}`}>+8.7% optimization impact</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Competitive Index</p>
                  <p className="text-2xl font-bold">{metrics.competitiveIndex}</p>
                </div>
                <Target className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-sm text-gray-600 mt-2">vs market average</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Demand Capture</p>
                  <p className="text-2xl font-bold">{metrics.demandCaptureRate}%</p>
                </div>
                <Activity className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-sm text-green-600 mt-2">Excellent performance</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pricing">Dynamic Pricing</TabsTrigger>
          <TabsTrigger value="demand">Demand Intelligence</TabsTrigger>
          <TabsTrigger value="competition">Rate Shopping</TabsTrigger>
          <TabsTrigger value="forecasting">AI Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Revenue Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Current vs Target</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="w-3/4 bg-green-500 h-2 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">78%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Market Share</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="w-2/3 bg-blue-500 h-2 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">65%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Rate Optimization</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="w-5/6 bg-purple-500 h-2 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">87%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800">Increase Weekend Rates</span>
                    </div>
                    <p className="text-sm text-green-700">High demand predicted for weekends. Increase rates by 15-20%.</p>
                    <p className="text-xs text-green-600 mt-1">Potential revenue: +₹95K</p>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Optimize Corporate Rates</span>
                    </div>
                    <p className="text-sm text-blue-700">Adjust corporate discount tiers based on volume commitments.</p>
                    <p className="text-xs text-blue-600 mt-1">Impact: +8% corporate revenue</p>
                  </div>

                  <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-orange-800">Competitive Response</span>
                    </div>
                    <p className="text-sm text-orange-700">Grand Plaza reduced rates by 8%. Consider tactical response.</p>
                    <p className="text-xs text-orange-600 mt-1">Urgency: High</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Dynamic Pricing Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {rateTypes.map(rate => (
                    <div key={rate.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">{rate.roomType}</h3>
                        <div className="flex items-center gap-2">
                          <Badge className={rate.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {rate.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Switch
                            checked={rate.isActive}
                            onCheckedChange={(checked) => updateRateType(rate.id, { isActive: checked })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <Label>Base Rate</Label>
                          <Input
                            type="number"
                            value={rate.baseRate}
                            onChange={(e) => updateRateType(rate.id, { baseRate: parseFloat(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Current Rate</Label>
                          <Input
                            type="number"
                            value={rate.currentRate}
                            onChange={(e) => updateRateType(rate.id, { currentRate: parseFloat(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Min Rate</Label>
                          <Input
                            type="number"
                            value={rate.minRate}
                            onChange={(e) => updateRateType(rate.id, { minRate: parseFloat(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Max Rate</Label>
                          <Input
                            type="number"
                            value={rate.maxRate}
                            onChange={(e) => updateRateType(rate.id, { maxRate: parseFloat(e.target.value) })}
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label>Occupancy Threshold: {rate.occupancyThreshold}%</Label>
                        <Slider
                          value={[rate.occupancyThreshold]}
                          onValueChange={([value]) => updateRateType(rate.id, { occupancyThreshold: value })}
                          max={100}
                          step={5}
                          className="mt-2"
                        />
                      </div>

                      <div className="mt-2 text-sm text-gray-600">
                        Last updated: {rate.lastUpdated.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demand">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Demand Intelligence & Forecasting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demandForecast.map((forecast, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="font-medium">{new Date(forecast.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div className="text-sm text-gray-500">{new Date(forecast.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        </div>
                        
                        <Badge className={getDemandLevelColor(forecast.demandLevel)}>
                          {forecast.demandLevel.toUpperCase()}
                        </Badge>
                        
                        <div className="text-sm">
                          <div className="font-medium">{forecast.predictedOccupancy}% occupancy predicted</div>
                          <div className="text-gray-500">{forecast.confidence}% confidence</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getChangeColor(forecast.recommendedRateChange)}`}>
                          {forecast.recommendedRateChange > 0 ? '+' : ''}{forecast.recommendedRateChange}%
                        </div>
                        <div className="text-sm text-gray-600">rate change</div>
                        <div className="text-sm font-medium">{formatCurrency(forecast.potentialRevenue)}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      {forecast.factors.map((factor, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competition">
          {rateShopping && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Competitive Rate Shopping
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">Market Position</p>
                        <p className="text-sm text-gray-600">Your pricing vs competitors</p>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          rateShopping.marketPosition === 'leader' ? 'bg-green-100 text-green-800' :
                          rateShopping.marketPosition === 'competitive' ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }>
                          {rateShopping.marketPosition.toUpperCase()}
                        </Badge>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(rateShopping.priceGap)} gap
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Competitor Rates</h4>
                      {rateShopping.competitors.map((comp, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">{comp.hotelName}</p>
                            <p className="text-sm text-gray-600">{comp.roomType} • {comp.availability} rooms available</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(comp.currentRate)}</p>
                            <p className="text-xs text-gray-500">{comp.source} • {new Date(comp.lastUpdated).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Recommendations</h4>
                      {rateShopping.recommendations.map((rec, index) => (
                        <div key={index} className={`p-3 rounded border-l-4 ${
                          rec.urgency === 'high' ? 'border-red-500 bg-red-50' :
                          rec.urgency === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                          'border-green-500 bg-green-50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{rec.action}</p>
                            <Badge variant="outline">{rec.urgency}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{rec.impact}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="forecasting">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Revenue Forecasting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <LineChart className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">₹12.5M</p>
                    <p className="text-sm text-gray-600">30-day forecast</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">+18%</p>
                    <p className="text-sm text-gray-600">vs last period</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Target className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-600">92%</p>
                    <p className="text-sm text-gray-600">forecast accuracy</p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Key Forecast Drivers</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Positive Factors</p>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Conference season starting
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Increased corporate travel
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Holiday booking surge
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Risk Factors</p>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          New competitor opening
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Economic uncertainty
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Seasonal demand decline
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RevenueManagementDashboard;