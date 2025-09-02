import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Building2,
  MapPin,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Globe,
  Wifi,
  Star,
  Phone,
  Mail,
  Clock,
  Bed,
  Car,
  Coffee,
  Utensils,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Download,
  Upload
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { toast } from '../ui/use-toast';

interface Property {
  id: string;
  name: string;
  brand: string;
  type: 'hotel' | 'resort' | 'aparthotel' | 'hostel' | 'boutique';
  location: {
    address: string;
    city: string;
    country: string;
    coordinates: { lat: number; lng: number };
  };
  contact: {
    phone: string;
    email: string;
    manager: string;
  };
  rooms: {
    total: number;
    occupied: number;
    available: number;
    outOfOrder: number;
  };
  performance: {
    occupancyRate: number;
    adr: number;
    revpar: number;
    revenue: number;
    lastMonth: {
      occupancyRate: number;
      adr: number;
      revpar: number;
      revenue: number;
    };
  };
  amenities: string[];
  rating: number;
  status: 'active' | 'inactive' | 'maintenance';
  features: {
    pms: boolean;
    pos: boolean;
    spa: boolean;
    restaurant: boolean;
    parking: boolean;
    wifi: boolean;
    fitness: boolean;
    pool: boolean;
  };
  operationalHours: {
    checkIn: string;
    checkOut: string;
    frontDesk: string;
  };
}

interface PropertyGroup {
  id: string;
  name: string;
  description: string;
  properties: string[];
  manager: string;
  budget: number;
  performance: {
    totalRevenue: number;
    avgOccupancy: number;
    avgADR: number;
    totalRooms: number;
  };
}

export const MultiPropertyManager: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyGroups, setPropertyGroups] = useState<PropertyGroup[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PropertyGroup | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'properties' | 'groups' | 'analytics'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);

  const mockProperties: Property[] = [
    {
      id: 'PROP001',
      name: 'Grand Plaza Hotel',
      brand: 'Premium Collection',
      type: 'hotel',
      location: {
        address: '123 Main Street',
        city: 'New York',
        country: 'USA',
        coordinates: { lat: 40.7128, lng: -74.0060 }
      },
      contact: {
        phone: '+1-555-0123',
        email: 'manager@grandplaza.com',
        manager: 'Sarah Johnson'
      },
      rooms: {
        total: 250,
        occupied: 205,
        available: 35,
        outOfOrder: 10
      },
      performance: {
        occupancyRate: 82,
        adr: 320,
        revpar: 262.4,
        revenue: 65600,
        lastMonth: {
          occupancyRate: 78,
          adr: 315,
          revpar: 245.7,
          revenue: 61425
        }
      },
      amenities: ['Spa', 'Fitness Center', 'Pool', 'Restaurant', 'Valet Parking'],
      rating: 4.8,
      status: 'active',
      features: {
        pms: true,
        pos: true,
        spa: true,
        restaurant: true,
        parking: true,
        wifi: true,
        fitness: true,
        pool: true
      },
      operationalHours: {
        checkIn: '15:00',
        checkOut: '11:00',
        frontDesk: '24/7'
      }
    },
    {
      id: 'PROP002',
      name: 'Seaside Resort & Spa',
      brand: 'Premium Collection',
      type: 'resort',
      location: {
        address: '456 Ocean Drive',
        city: 'Miami',
        country: 'USA',
        coordinates: { lat: 25.7617, lng: -80.1918 }
      },
      contact: {
        phone: '+1-555-0456',
        email: 'manager@seasideresort.com',
        manager: 'Michael Chen'
      },
      rooms: {
        total: 180,
        occupied: 165,
        available: 12,
        outOfOrder: 3
      },
      performance: {
        occupancyRate: 92,
        adr: 450,
        revpar: 414,
        revenue: 74520,
        lastMonth: {
          occupancyRate: 88,
          adr: 435,
          revpar: 382.8,
          revenue: 68904
        }
      },
      amenities: ['Beach Access', 'Spa', 'Multiple Restaurants', 'Pool Complex', 'Water Sports'],
      rating: 4.9,
      status: 'active',
      features: {
        pms: true,
        pos: true,
        spa: true,
        restaurant: true,
        parking: true,
        wifi: true,
        fitness: true,
        pool: true
      },
      operationalHours: {
        checkIn: '16:00',
        checkOut: '12:00',
        frontDesk: '24/7'
      }
    },
    {
      id: 'PROP003',
      name: 'City Business Hotel',
      brand: 'Business Plus',
      type: 'hotel',
      location: {
        address: '789 Corporate Blvd',
        city: 'Chicago',
        country: 'USA',
        coordinates: { lat: 41.8781, lng: -87.6298 }
      },
      contact: {
        phone: '+1-555-0789',
        email: 'manager@citybusiness.com',
        manager: 'Emily Rodriguez'
      },
      rooms: {
        total: 120,
        occupied: 95,
        available: 20,
        outOfOrder: 5
      },
      performance: {
        occupancyRate: 79,
        adr: 280,
        revpar: 221.2,
        revenue: 26544,
        lastMonth: {
          occupancyRate: 85,
          adr: 275,
          revpar: 233.75,
          revenue: 28050
        }
      },
      amenities: ['Business Center', 'Meeting Rooms', 'Fitness Center', 'Restaurant'],
      rating: 4.3,
      status: 'active',
      features: {
        pms: true,
        pos: true,
        spa: false,
        restaurant: true,
        parking: true,
        wifi: true,
        fitness: true,
        pool: false
      },
      operationalHours: {
        checkIn: '15:00',
        checkOut: '11:00',
        frontDesk: '24/7'
      }
    }
  ];

  const mockPropertyGroups: PropertyGroup[] = [
    {
      id: 'GROUP001',
      name: 'Premium Collection',
      description: 'Luxury hotels and resorts targeting high-end travelers',
      properties: ['PROP001', 'PROP002'],
      manager: 'David Wilson',
      budget: 5000000,
      performance: {
        totalRevenue: 140120,
        avgOccupancy: 87,
        avgADR: 385,
        totalRooms: 430
      }
    },
    {
      id: 'GROUP002',
      name: 'Business Plus',
      description: 'Business-focused hotels in major city centers',
      properties: ['PROP003'],
      manager: 'Lisa Thompson',
      budget: 2000000,
      performance: {
        totalRevenue: 26544,
        avgOccupancy: 79,
        avgADR: 280,
        totalRooms: 120
      }
    }
  ];

  useEffect(() => {
    setProperties(mockProperties);
    setPropertyGroups(mockPropertyGroups);
  }, []);

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.location.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
    const matchesType = typeFilter === 'all' || property.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalStats = {
    properties: properties.length,
    totalRooms: properties.reduce((sum, p) => sum + p.rooms.total, 0),
    totalRevenue: properties.reduce((sum, p) => sum + p.performance.revenue, 0),
    avgOccupancy: properties.reduce((sum, p) => sum + p.performance.occupancyRate, 0) / properties.length,
    avgADR: properties.reduce((sum, p) => sum + p.performance.adr, 0) / properties.length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'maintenance': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPerformanceChange = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change >= 0
    };
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
                <p className="text-2xl font-bold">{totalStats.properties}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rooms</p>
                <p className="text-2xl font-bold">{totalStats.totalRooms}</p>
              </div>
              <Bed className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalStats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Occupancy</p>
                <p className="text-2xl font-bold">{totalStats.avgOccupancy.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Groups */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Property Groups</CardTitle>
            <Button onClick={() => setShowAddGroup(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {propertyGroups.map(group => (
              <div key={group.id} className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                   onClick={() => setSelectedGroup(group)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium">{group.name}</h3>
                      <Badge variant="secondary">{group.properties.length} properties</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      <span>Manager: {group.manager}</span>
                      <span>Budget: ${group.budget.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">${group.performance.totalRevenue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Properties */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {properties
              .sort((a, b) => b.performance.revpar - a.performance.revpar)
              .slice(0, 3)
              .map(property => {
                const revparChange = getPerformanceChange(
                  property.performance.revpar,
                  property.performance.lastMonth.revpar
                );
                return (
                  <div key={property.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {property.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{property.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {property.location.city}, {property.location.country}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{property.type}</Badge>
                          <div className="flex items-center">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                            <span className="text-xs">{property.rating}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">${property.performance.revpar.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">RevPAR</div>
                      <div className={`flex items-center text-sm ${
                        revparChange.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {revparChange.isPositive ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        {revparChange.value}%
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProperties = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="resort">Resort</SelectItem>
                <SelectItem value="aparthotel">Apart Hotel</SelectItem>
                <SelectItem value="boutique">Boutique</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowAddProperty(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Property Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProperties.map(property => {
          const occupancyChange = getPerformanceChange(
            property.performance.occupancyRate,
            property.performance.lastMonth.occupancyRate
          );
          const adrChange = getPerformanceChange(
            property.performance.adr,
            property.performance.lastMonth.adr
          );

          return (
            <Card key={property.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedProperty(property)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      {property.name}
                      <Badge variant={getStatusColor(property.status) as any} className="ml-2">
                        {property.status}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {property.brand} • {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                      <span className="text-sm font-medium">{property.rating}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Location */}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    {property.location.city}, {property.location.country}
                  </div>

                  {/* Room Stats */}
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-green-600">{property.rooms.available}</div>
                      <div className="text-xs text-muted-foreground">Available</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-600">{property.rooms.occupied}</div>
                      <div className="text-xs text-muted-foreground">Occupied</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-red-600">{property.rooms.outOfOrder}</div>
                      <div className="text-xs text-muted-foreground">OOO</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{property.rooms.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>

                  {/* Performance */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold">{property.performance.occupancyRate}%</div>
                      <div className="text-xs text-muted-foreground">Occupancy</div>
                      <div className={`text-xs flex items-center justify-center ${
                        occupancyChange.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {occupancyChange.isPositive ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        {occupancyChange.value}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">${property.performance.adr}</div>
                      <div className="text-xs text-muted-foreground">ADR</div>
                      <div className={`text-xs flex items-center justify-center ${
                        adrChange.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {adrChange.isPositive ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        {adrChange.value}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">${property.performance.revpar.toFixed(0)}</div>
                      <div className="text-xs text-muted-foreground">RevPAR</div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2">
                    {property.features.restaurant && <Badge variant="outline" className="text-xs">Restaurant</Badge>}
                    {property.features.spa && <Badge variant="outline" className="text-xs">Spa</Badge>}
                    {property.features.fitness && <Badge variant="outline" className="text-xs">Fitness</Badge>}
                    {property.features.pool && <Badge variant="outline" className="text-xs">Pool</Badge>}
                    {property.features.parking && <Badge variant="outline" className="text-xs">Parking</Badge>}
                    {property.features.wifi && <Badge variant="outline" className="text-xs">WiFi</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{totalStats.avgOccupancy.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Average Occupancy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">${totalStats.avgADR.toFixed(0)}</div>
              <div className="text-sm text-muted-foreground">Average ADR</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">${totalStats.totalRevenue.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Property Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['hotel', 'resort', 'boutique'].map(type => {
                const typeProperties = properties.filter(p => p.type === type);
                const avgRevenue = typeProperties.reduce((sum, p) => sum + p.performance.revenue, 0) / typeProperties.length;
                
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium capitalize">{type}s</div>
                      <div className="text-sm text-muted-foreground">{typeProperties.length} properties</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${avgRevenue.toFixed(0)}</div>
                      <div className="text-sm text-muted-foreground">Avg Revenue</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['New York', 'Miami', 'Chicago'].map(city => {
                const cityProperties = properties.filter(p => p.location.city === city);
                const totalRevenue = cityProperties.reduce((sum, p) => sum + p.performance.revenue, 0);
                
                return (
                  <div key={city} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{city}</div>
                      <div className="text-sm text-muted-foreground">{cityProperties.length} properties</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${totalRevenue.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'properties', name: 'Properties', icon: Building2 },
    { id: 'groups', name: 'Groups', icon: Users },
    { id: 'analytics', name: 'Analytics', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Multi-Property Manager</h2>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import Data
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
                  onClick={() => setActiveView(tab.id as any)}
                  className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeView === tab.id
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
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'properties' && renderProperties()}
      {activeView === 'groups' && renderProperties()}
      {activeView === 'analytics' && renderAnalytics()}

      {/* Property Details Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedProperty.name}</CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedProperty(null)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Property Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Brand:</span>
                        <div className="font-medium">{selectedProperty.brand}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <div className="font-medium capitalize">{selectedProperty.type}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rating:</span>
                        <div className="font-medium flex items-center">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                          {selectedProperty.rating}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={getStatusColor(selectedProperty.status) as any}>
                          {selectedProperty.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Address:</span>
                      <div className="font-medium">{selectedProperty.location.address}</div>
                      <div className="text-sm">{selectedProperty.location.city}, {selectedProperty.location.country}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center">
                      <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{selectedProperty.contact.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{selectedProperty.contact.email}</span>
                    </div>
                    <div className="flex items-center">
                      <User className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Manager: {selectedProperty.contact.manager}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedProperty.performance.occupancyRate}%</div>
                      <div className="text-sm text-muted-foreground">Occupancy Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">${selectedProperty.performance.adr}</div>
                      <div className="text-sm text-muted-foreground">ADR</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">${selectedProperty.performance.revpar.toFixed(0)}</div>
                      <div className="text-sm text-muted-foreground">RevPAR</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">${selectedProperty.performance.revenue.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Revenue</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Features and Amenities */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Features & Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {Object.entries(selectedProperty.features).map(([feature, enabled]) => {
                      const icons: { [key: string]: React.ComponentType<any> } = {
                        pms: Settings,
                        pos: DollarSign,
                        spa: Star,
                        restaurant: Utensils,
                        parking: Car,
                        wifi: Wifi,
                        fitness: Dumbbell,
                        pool: Coffee
                      };
                      const Icon = icons[feature] || CheckCircle;
                      
                      return (
                        <div key={feature} className={`flex items-center space-x-2 ${enabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                          <Icon className="h-4 w-4" />
                          <span className="capitalize text-sm">{feature}</span>
                          {enabled ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="text-sm font-medium mb-2">Amenities:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.amenities.map(amenity => (
                        <Badge key={amenity} variant="secondary">{amenity}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};