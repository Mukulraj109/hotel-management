
import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  MapPin,
  Calendar,
  Coins,
  BarChart3,
  RefreshCw,
  Building,
  Phone,
  Mail,
  Save,
  X,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/dashboard/DataTable';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { adminService } from '../../services/adminService';
import { InventoryItem } from '../../types/admin';
import { formatNumber, formatCurrency } from '../../utils/dashboardUtils';

interface InventoryFilters {
  category?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

interface InventoryStats {
  total: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  categories: {
    [key: string]: number;
  };
}

export default function AdminInventory() {
  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'linens' as 'linens' | 'toiletries' | 'cleaning' | 'maintenance' | 'food_beverage' | 'other',
    quantity: 0,
    unit: 'pieces' as 'pieces' | 'bottles' | 'rolls' | 'kg' | 'liters' | 'sets',
    minimumThreshold: 0,
    maximumCapacity: 0,
    costPerUnit: 0,
    supplier: {
      name: '',
      contact: '',
      email: ''
    },
    location: {
      building: '',
      floor: '',
      room: '',
      shelf: ''
    }
  });
  const [restockData, setRestockData] = useState({
    quantity: 0,
    costPerUnit: 0
  });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<'restock' | 'update' | 'export'>('restock');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    categoryDistribution: {} as { [key: string]: number },
    stockTrends: [] as any[],
    lowStockAlerts: [] as Array<{
      id: string;
      name: string;
      currentStock: number;
      minimumThreshold: number;
      category: string;
      urgency: string;
    }>,
    costAnalysis: {} as {
      totalValue: number;
      averageCost: number;
      highestCost: number;
      lowestCost: number;
    },
    supplierPerformance: {} as { [key: string]: { items: number; totalValue: number; lowStockItems: number } }
  });
  const [advancedFilters, setAdvancedFilters] = useState({
    dateRange: { start: '', end: '' },
    costRange: { min: 0, max: 10000 },
    supplier: '',
    location: '',
    lastRestocked: ''
  });
  const [filters, setFilters] = useState<InventoryFilters>({
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  // Fetch inventory items
  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await adminService.getInventoryItems(filters);
      setItems(response.data.items);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats (calculated from items data)
  const fetchStats = async () => {
    try {
      // Calculate stats from items data
      const total = items.length;
      const lowStock = items.filter(item => item.isLowStock).length;
      const outOfStock = items.filter(item => item.quantity === 0).length;
      const totalValue = items.reduce((sum, item) => {
        return sum + (item.costPerUnit || 0) * item.quantity;
      }, 0);
      
      const categories = items.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      setStats({
        total,
        lowStock,
        outOfStock,
        totalValue,
        categories
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  // Load data on mount and filter changes
  useEffect(() => {
    fetchItems();
  }, [filters]);

  useEffect(() => {
    if (items.length > 0) {
      fetchStats();
      calculateAnalytics(); // Phase 5: Calculate analytics when items change
    }
  }, [items]);

  // Handle item update
  const handleUpdateItem = async (itemId: string, updates: Partial<InventoryItem>) => {
    try {
      setUpdating(true);
      await adminService.updateInventoryItem(itemId, updates);
      await fetchItems();
    } catch (error) {
      console.error('Error updating inventory item:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Handle item creation
  const handleCreateItem = async (itemData: Partial<InventoryItem>) => {
    try {
      setUpdating(true);
      await adminService.createInventoryItem(itemData);
      await fetchItems();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating inventory item:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Handle restock
  const handleRestock = async (itemId: string, quantity: number, costPerUnit: number) => {
    try {
      setUpdating(true);
      const currentItem = items.find(item => item._id === itemId);
      if (!currentItem) return;

      const newQuantity = currentItem.quantity + quantity;
      const newCostPerUnit = costPerUnit > 0 ? costPerUnit : currentItem.costPerUnit;

      await adminService.updateInventoryItem(itemId, {
        quantity: newQuantity,
        costPerUnit: newCostPerUnit,
        lastRestocked: new Date().toISOString()
      });
      
      await fetchItems();
      setShowRestockModal(false);
      setRestockData({ quantity: 0, costPerUnit: 0 });
    } catch (error) {
      console.error('Error restocking item:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({
      name: '',
      sku: '',
      category: 'linens',
      quantity: 0,
      unit: 'pieces',
      minimumThreshold: 0,
      maximumCapacity: 0,
      costPerUnit: 0,
      supplier: {
        name: '',
        contact: '',
        email: ''
      },
      location: {
        building: '',
        floor: '',
        room: '',
        shelf: ''
      }
    });
  };

  // Open create modal
  const openCreateModal = () => {
    resetFormData();
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (item: InventoryItem) => {
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      minimumThreshold: item.minimumThreshold,
      maximumCapacity: item.maximumCapacity,
      costPerUnit: item.costPerUnit || 0,
      supplier: item.supplier || { name: '', contact: '', email: '' },
      location: {
        building: item.location?.building || '',
        floor: item.location?.floor || '',
        room: item.location?.room || '',
        shelf: item.location?.shelf || ''
      }
    });
    setSelectedItem(item);
    setShowEditModal(true);
  };

  // Open restock modal
  const openRestockModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setRestockData({
      quantity: 0,
      costPerUnit: item.costPerUnit || 0
    });
    setShowRestockModal(true);
  };

  // Bulk operations
  const handleBulkRestock = async (quantity: number, costPerUnit: number) => {
    try {
      setUpdating(true);
      const promises = selectedItems.map(itemId => {
        const item = items.find(i => i._id === itemId);
        if (!item) return Promise.resolve();
        
        const newQuantity = item.quantity + quantity;
        const newCostPerUnit = costPerUnit > 0 ? costPerUnit : item.costPerUnit;
        
        return adminService.updateInventoryItem(itemId, {
          quantity: newQuantity,
          costPerUnit: newCostPerUnit,
          lastRestocked: new Date().toISOString()
        });
      });
      
      await Promise.all(promises);
      await fetchItems();
      setSelectedItems([]);
      setShowBulkModal(false);
    } catch (error) {
      console.error('Error in bulk restock:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkExport = () => {
    const selectedData = items.filter(item => selectedItems.includes(item._id));
    const csvData = selectedData.map(item => ({
      Name: item.name,
      SKU: item.sku,
      Category: item.category,
      Quantity: item.quantity,
      Unit: item.unit,
      'Cost Per Unit': item.costPerUnit || 0,
      'Min Threshold': item.minimumThreshold,
      'Max Capacity': item.maximumCapacity,
      'Low Stock': item.isLowStock ? 'Yes' : 'No',
      'Last Restocked': item.lastRestocked ? format(parseISO(item.lastRestocked), 'MMM dd, yyyy') : 'Never',
      'Supplier': item.supplier?.name || '',
      'Location': item.location ? `${item.location.building || ''} ${item.location.floor || ''} ${item.location.room || ''}`.trim() : ''
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    setSelectedItems([]);
    setShowBulkModal(false);
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAllItems = () => {
    setSelectedItems(items.map(item => item._id));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  // Phase 5: Advanced Analytics Functions
  const calculateAnalytics = () => {
    const categoryDistribution = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const costAnalysis = {
      totalValue: items.reduce((sum, item) => sum + (item.costPerUnit || 0) * item.quantity, 0),
      averageCost: items.reduce((sum, item) => sum + (item.costPerUnit || 0), 0) / items.length,
      highestCost: Math.max(...items.map(item => item.costPerUnit || 0)),
      lowestCost: Math.min(...items.map(item => item.costPerUnit || 0))
    };

    const supplierPerformance = items.reduce((acc, item) => {
      if (item.supplier?.name) {
        if (!acc[item.supplier.name]) {
          acc[item.supplier.name] = { items: 0, totalValue: 0, lowStockItems: 0 };
        }
        acc[item.supplier.name].items += 1;
        acc[item.supplier.name].totalValue += (item.costPerUnit || 0) * item.quantity;
        if (item.isLowStock) {
          acc[item.supplier.name].lowStockItems += 1;
        }
      }
      return acc;
    }, {} as { [key: string]: { items: number; totalValue: number; lowStockItems: number } });

    const lowStockAlerts = items
      .filter(item => item.isLowStock)
      .map(item => ({
        id: item._id,
        name: item.name,
        currentStock: item.quantity,
        minimumThreshold: item.minimumThreshold,
        category: item.category,
        urgency: item.quantity === 0 ? 'critical' : 'warning'
      }))
      .sort((a, b) => a.currentStock - b.currentStock);

    setAnalyticsData({
      categoryDistribution,
      stockTrends: [], // Would be populated from historical data
      lowStockAlerts,
      costAnalysis,
      supplierPerformance
    });
  };

  const generateInventoryReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalItems: items.length,
        totalValue: items.reduce((sum, item) => sum + (item.costPerUnit || 0) * item.quantity, 0),
        lowStockItems: items.filter(item => item.isLowStock).length,
        outOfStockItems: items.filter(item => item.quantity === 0).length
      },
      categoryBreakdown: Object.entries(analyticsData.categoryDistribution).map(([category, count]) => ({
        category,
        count,
        percentage: ((count / items.length) * 100).toFixed(1)
      })),
      lowStockItems: analyticsData.lowStockAlerts,
      topSuppliers: Object.entries(analyticsData.supplierPerformance)
        .sort(([, a], [, b]) => b.totalValue - a.totalValue)
        .slice(0, 5)
        .map(([supplier, data]) => ({
          supplier,
          items: data.items,
          totalValue: data.totalValue,
          lowStockItems: data.lowStockItems
        }))
    };

    const reportText = `
INVENTORY MANAGEMENT REPORT
Generated: ${new Date().toLocaleDateString()}

SUMMARY:
- Total Items: ${reportData.summary.totalItems}
- Total Inventory Value: ${formatCurrency(reportData.summary.totalValue, 'INR')}
- Low Stock Items: ${reportData.summary.lowStockItems}
- Out of Stock Items: ${reportData.summary.outOfStockItems}

CATEGORY BREAKDOWN:
${reportData.categoryBreakdown.map(cat => `- ${cat.category}: ${cat.count} items (${cat.percentage}%)`).join('\n')}

LOW STOCK ALERTS:
${reportData.lowStockItems.map(item => `- ${item.name} (${item.category}): ${item.currentStock}/${item.minimumThreshold}`).join('\n')}

TOP SUPPLIERS:
${reportData.topSuppliers.map(supplier => `- ${supplier.supplier}: ${supplier.items} items, ${formatCurrency(supplier.totalValue, 'INR')}`).join('\n')}
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const applyAdvancedFilters = () => {
    let filteredItems = [...items];

    // Date range filter (if we had date fields)
    if (advancedFilters.dateRange.start && advancedFilters.dateRange.end) {
      // Would filter by date fields
    }

    // Cost range filter
    filteredItems = filteredItems.filter(item => {
      const cost = item.costPerUnit || 0;
      return cost >= advancedFilters.costRange.min && cost <= advancedFilters.costRange.max;
    });

    // Supplier filter
    if (advancedFilters.supplier) {
      filteredItems = filteredItems.filter(item => 
        item.supplier?.name?.toLowerCase().includes(advancedFilters.supplier.toLowerCase())
      );
    }

    // Location filter
    if (advancedFilters.location) {
      filteredItems = filteredItems.filter(item => {
        const location = item.location;
        if (!location) return false;
        const locationString = `${location.building || ''} ${location.floor || ''} ${location.room || ''}`.toLowerCase();
        return locationString.includes(advancedFilters.location.toLowerCase());
      });
    }

    return filteredItems;
  };

  // Phase 5: Performance Optimizations
  const memoizedItems = React.useMemo(() => {
    return applyAdvancedFilters();
  }, [items, advancedFilters]);

  const memoizedStats = React.useMemo(() => {
    if (!items.length) return null;
    
    const total = items.length;
    const lowStock = items.filter(item => item.isLowStock).length;
    const outOfStock = items.filter(item => item.quantity === 0).length;
    const totalValue = items.reduce((sum, item) => {
      return sum + (item.costPerUnit || 0) * item.quantity;
    }, 0);
    
    const categories = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return {
      total,
      lowStock,
      outOfStock,
      totalValue,
      categories
    };
  }, [items]);

  // Phase 5: Data Visualization Helpers
  const getCategoryColor = (category: string) => {
    const colors = {
      linens: 'bg-blue-500',
      toiletries: 'bg-green-500',
      cleaning: 'bg-yellow-500',
      maintenance: 'bg-purple-500',
      food_beverage: 'bg-red-500',
      other: 'bg-gray-500'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500';
  };

  const getStockLevelColor = (item: InventoryItem) => {
    const percentage = (item.quantity / item.maximumCapacity) * 100;
    if (percentage <= 20) return 'text-red-600';
    if (percentage <= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  // Table columns
  const columns = [
    {
      key: 'selection',
      header: 'Select',
      render: (value: any, row: InventoryItem) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={selectedItems.includes(row._id)}
            onChange={() => toggleItemSelection(row._id)}
            className="rounded border-gray-300"
          />
        </div>
      ),
      align: 'center' as const
    },
    {
      key: 'name',
      header: 'Item',
      render: (value: string, row: InventoryItem) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">SKU: {row.sku}</div>
        </div>
      )
    },
    {
      key: 'category',
      header: 'Category',
      render: (value: string) => (
        <StatusBadge 
          status={value} 
          variant="pill" 
          size="sm"
          className="capitalize"
        />
      )
    },
    {
      key: 'quantity',
      header: 'Stock Level',
      render: (value: number, row: InventoryItem) => (
        <div className="flex items-center">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{value} {row.unit}</span>
              {row.isLowStock && (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  row.isLowStock ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ 
                  width: `${Math.min((value / row.maximumCapacity) * 100, 100)}%` 
                }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Min: {row.minimumThreshold} | Max: {row.maximumCapacity}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'costPerUnit',
      header: 'Cost',
      render: (value: number) => (
        <div className="flex items-center">
          <Coins className="h-4 w-4 text-gray-400 mr-1" />
          <span>{value ? formatCurrency(value, 'INR') : 'N/A'}</span>
        </div>
      ),
      align: 'center' as const
    },
    {
      key: 'location',
      header: 'Location',
      render: (value: any) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-sm">
            {value ? `${value.building || ''} ${value.floor || ''} ${value.room || ''}`.trim() : 'Not specified'}
          </span>
        </div>
      )
    },
    {
      key: 'lastRestocked',
      header: 'Last Restocked',
      render: (value: string) => (
        <div className="text-sm">
          {value ? format(parseISO(value), 'MMM dd, yyyy') : 'Never'}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value: any, row: InventoryItem) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedItem(row);
              setShowDetailsModal(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openRestockModal(row)}
          >
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </Button>
        </div>
      ),
      align: 'center' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Manage hotel supplies and stock levels</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          {selectedItems.length > 0 && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setBulkAction('restock');
                  setShowBulkModal(true);
                }}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Bulk Restock ({selectedItems.length})
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setBulkAction('export');
                  handleBulkExport();
                }}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Export ({selectedItems.length})
              </Button>
              <Button
                variant="ghost"
                onClick={clearSelection}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            onClick={() => openCreateModal()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button
            variant="secondary"
            onClick={generateInventoryReport}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {memoizedStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(memoizedStats.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(memoizedStats.lowStock)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(memoizedStats.outOfStock)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Coins className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(memoizedStats.totalValue, 'INR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={filters.category || ''}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All Categories</option>
                  <option value="linens">Linens</option>
                  <option value="toiletries">Toiletries</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="food_beverage">Food & Beverage</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={filters.lowStock ? 'true' : ''}
                  onChange={(e) => setFilters({ ...filters, lowStock: e.target.value === 'true', page: 1 })}
                >
                  <option value="">All Items</option>
                  <option value="true">Low Stock Only</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={() => setFilters({ page: 1, limit: 10 })}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={selectAllItems}
                  className="w-full"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Select All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 5: Advanced Filters */}
      {showAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Analytics & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Range (INR)</label>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={advancedFilters.costRange.min}
                    onChange={(e) => setAdvancedFilters({
                      ...advancedFilters,
                      costRange: { ...advancedFilters.costRange, min: parseInt(e.target.value) || 0 }
                    })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={advancedFilters.costRange.max}
                    onChange={(e) => setAdvancedFilters({
                      ...advancedFilters,
                      costRange: { ...advancedFilters.costRange, max: parseInt(e.target.value) || 10000 }
                    })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <Input
                  type="text"
                  placeholder="Search by supplier"
                  value={advancedFilters.supplier}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, supplier: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <Input
                  type="text"
                  placeholder="Search by location"
                  value={advancedFilters.location}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, location: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={() => setAdvancedFilters({
                    dateRange: { start: '', end: '' },
                    costRange: { min: 0, max: 10000 },
                    supplier: '',
                    location: '',
                    lastRestocked: ''
                  })}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear Advanced Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 5: Analytics Dashboard */}
      {showAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Inventory Value:</span>
                  <span className="font-semibold">{formatCurrency(analyticsData.costAnalysis.totalValue || 0, 'INR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Cost per Item:</span>
                  <span className="font-semibold">{formatCurrency(analyticsData.costAnalysis.averageCost || 0, 'INR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Highest Cost Item:</span>
                  <span className="font-semibold">{formatCurrency(analyticsData.costAnalysis.highestCost || 0, 'INR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Lowest Cost Item:</span>
                  <span className="font-semibold">{formatCurrency(analyticsData.costAnalysis.lowestCost || 0, 'INR')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analyticsData.categoryDistribution).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${getCategoryColor(category)}`}></div>
                      <span className="text-sm capitalize">{category}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{count}</span>
                      <span className="text-xs text-gray-500">
                        ({((count / items.length) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {analyticsData.lowStockAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <div className="flex items-center">
                      {getUrgencyIcon(alert.urgency)}
                      <div className="ml-2">
                        <div className="font-medium text-sm">{alert.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{alert.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${alert.urgency === 'critical' ? 'text-red-600' : 'text-yellow-600'}`}>
                        {alert.currentStock}/{alert.minimumThreshold}
                      </div>
                      <div className="text-xs text-gray-500">{alert.urgency}</div>
                    </div>
                  </div>
                ))}
                {analyticsData.lowStockAlerts.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No low stock alerts
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Suppliers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analyticsData.supplierPerformance)
                  .sort(([, a], [, b]) => b.totalValue - a.totalValue)
                  .slice(0, 5)
                  .map(([supplier, data]) => (
                    <div key={supplier} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{supplier}</div>
                        <div className="text-xs text-gray-500">{data.items} items</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(data.totalValue, 'INR')}</div>
                        <div className="text-xs text-gray-500">{data.lowStockItems} low stock</div>
                      </div>
                    </div>
                  ))}
                {Object.keys(analyticsData.supplierPerformance).length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No supplier data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inventory Table */}
      <DataTable
        title="Inventory Items"
        data={items}
        columns={columns}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search items..."
        pagination={true}
        pageSize={filters.limit || 10}
        emptyMessage="No inventory items found"
        onRowClick={(item) => {
          setSelectedItem(item);
          setShowDetailsModal(true);
        }}
      />

      {/* Phase 4: Advanced Functional Modals */}
      
      {/* Create/Edit Item Modal */}
      {(showCreateModal || showEditModal) && (
        <Modal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            resetFormData();
          }}
          title={showCreateModal ? "Add Inventory Item" : "Edit Inventory Item"}
        >
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <Input
                  type="text"
                  placeholder="Enter item name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                <Input
                  type="text"
                  placeholder="Enter SKU"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                >
                  <option value="linens">Linens</option>
                  <option value="toiletries">Toiletries</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="food_beverage">Food & Beverage</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                >
                  <option value="pieces">Pieces</option>
                  <option value="bottles">Bottles</option>
                  <option value="rolls">Rolls</option>
                  <option value="kg">Kilograms</option>
                  <option value="liters">Liters</option>
                  <option value="sets">Sets</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit (INR)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.costPerUnit}
                  onChange={(e) => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Stock Levels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Quantity</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Threshold</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.minimumThreshold}
                  onChange={(e) => setFormData({ ...formData, minimumThreshold: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Capacity</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.maximumCapacity}
                  onChange={(e) => setFormData({ ...formData, maximumCapacity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Supplier Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Supplier Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                  <Input
                    type="text"
                    placeholder="Enter supplier name"
                    value={formData.supplier.name}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      supplier: { ...formData.supplier, name: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                  <Input
                    type="text"
                    placeholder="Enter contact number"
                    value={formData.supplier.contact}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      supplier: { ...formData.supplier, contact: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={formData.supplier.email}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      supplier: { ...formData.supplier, email: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Storage Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                  <Input
                    type="text"
                    placeholder="Building"
                    value={formData.location.building}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, building: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                  <Input
                    type="text"
                    placeholder="Floor"
                    value={formData.location.floor}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, floor: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                  <Input
                    type="text"
                    placeholder="Room"
                    value={formData.location.room}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, room: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shelf</label>
                  <Input
                    type="text"
                    placeholder="Shelf"
                    value={formData.location.shelf}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, shelf: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetFormData();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (showCreateModal) {
                    handleCreateItem(formData);
                  } else if (showEditModal && selectedItem) {
                    handleUpdateItem(selectedItem._id, formData);
                    setShowEditModal(false);
                  }
                }}
                disabled={updating || !formData.name || !formData.sku}
              >
                <Save className="h-4 w-4 mr-2" />
                {showCreateModal ? 'Create Item' : 'Update Item'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Item Details Modal */}
      {showDetailsModal && selectedItem && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedItem(null);
          }}
          title="Item Details"
        >
          <div className="space-y-6">
            {/* Item Header */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedItem.name}</h3>
                  <p className="text-sm text-gray-500">SKU: {selectedItem.sku}</p>
                </div>
                <StatusBadge status={selectedItem.category} variant="pill" className="capitalize" />
              </div>
            </div>

            {/* Stock Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                  <div className="flex items-center mt-1">
                    <Package className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="font-medium">{selectedItem.quantity} {selectedItem.unit}</span>
                    {selectedItem.isLowStock && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 ml-2" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Level</label>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          selectedItem.isLowStock ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min((selectedItem.quantity / selectedItem.maximumCapacity) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Min: {selectedItem.minimumThreshold}</span>
                      <span>Max: {selectedItem.maximumCapacity}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost Information</label>
                  <div className="flex items-center mt-1">
                    <Coins className="h-4 w-4 text-gray-400 mr-2" />
                    <span>{selectedItem.costPerUnit ? formatCurrency(selectedItem.costPerUnit, 'INR') : 'Not set'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Restocked</label>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <span>{selectedItem.lastRestocked ? format(parseISO(selectedItem.lastRestocked), 'MMM dd, yyyy') : 'Never'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Supplier Information */}
                {selectedItem.supplier && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier</label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400 mr-2" />
                        <span>{selectedItem.supplier.name}</span>
                      </div>
                      {selectedItem.supplier.contact && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <span>{selectedItem.supplier.contact}</span>
                        </div>
                      )}
                      {selectedItem.supplier.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span>{selectedItem.supplier.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Location Information */}
                {selectedItem.location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Storage Location</label>
                    <div className="flex items-center mt-1">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <span>
                        {selectedItem.location.building || selectedItem.location.floor || selectedItem.location.room || selectedItem.location.shelf 
                          ? `${selectedItem.location.building || ''} ${selectedItem.location.floor || ''} ${selectedItem.location.room || ''} ${selectedItem.location.shelf || ''}`.trim()
                          : 'Not specified'
                        }
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedItem(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  openEditModal(selectedItem);
                  setShowDetailsModal(false);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Item
              </Button>
              <Button
                onClick={() => {
                  openRestockModal(selectedItem);
                  setShowDetailsModal(false);
                }}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Restock
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedItem && (
        <Modal
          isOpen={showRestockModal}
          onClose={() => {
            setShowRestockModal(false);
            setSelectedItem(null);
            setRestockData({ quantity: 0, costPerUnit: 0 });
          }}
          title="Restock Item"
        >
          <div className="space-y-6">
            {/* Item Info */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-900">{selectedItem.name}</h3>
              <p className="text-sm text-gray-500">Current stock: {selectedItem.quantity} {selectedItem.unit}</p>
            </div>

            {/* Restock Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Add</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={restockData.quantity}
                  onChange={(e) => setRestockData({ ...restockData, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit (INR)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={selectedItem.costPerUnit?.toString() || "0.00"}
                  value={restockData.costPerUnit}
                  onChange={(e) => setRestockData({ ...restockData, costPerUnit: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Restock Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Current Stock:</span>
                  <span>{selectedItem.quantity} {selectedItem.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Adding:</span>
                  <span>{restockData.quantity} {selectedItem.unit}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>New Total:</span>
                  <span>{selectedItem.quantity + restockData.quantity} {selectedItem.unit}</span>
                </div>
                {restockData.costPerUnit > 0 && (
                  <div className="flex justify-between">
                    <span>Total Cost:</span>
                    <span>{formatCurrency(restockData.quantity * restockData.costPerUnit, 'INR')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRestockModal(false);
                  setSelectedItem(null);
                  setRestockData({ quantity: 0, costPerUnit: 0 });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleRestock(selectedItem._id, restockData.quantity, restockData.costPerUnit)}
                disabled={updating || restockData.quantity <= 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Restock Item
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Operations Modal */}
      {showBulkModal && (
        <Modal
          isOpen={showBulkModal}
          onClose={() => {
            setShowBulkModal(false);
            setBulkAction('restock');
          }}
          title="Bulk Operations"
        >
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Restock</h3>
              <p className="text-sm text-gray-500">
                Restock {selectedItems.length} selected items
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Add</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={restockData.quantity}
                  onChange={(e) => setRestockData({ ...restockData, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit (INR)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={restockData.costPerUnit}
                  onChange={(e) => setRestockData({ ...restockData, costPerUnit: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Operation Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Selected Items:</span>
                  <span>{selectedItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity to Add:</span>
                  <span>{restockData.quantity}</span>
                </div>
                {restockData.costPerUnit > 0 && (
                  <div className="flex justify-between">
                    <span>Total Cost:</span>
                    <span>{formatCurrency(restockData.quantity * restockData.costPerUnit * selectedItems.length, 'INR')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkAction('restock');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleBulkRestock(restockData.quantity, restockData.costPerUnit)}
                disabled={updating || restockData.quantity <= 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Bulk Restock
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
