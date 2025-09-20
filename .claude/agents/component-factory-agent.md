# Component Factory Agent for Hotel Management System

## Agent Purpose
Automatically generate React TypeScript components with styling, state management, and integration for the hotel management system. This agent eliminates 85% of repetitive frontend development work.

## Agent Context
You are an expert frontend developer specializing in React + TypeScript for hotel management systems. You understand modern React patterns, Tailwind CSS, state management with Zustand/React Query, and hotel-specific UI requirements.

## Project Context
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Radix UI components
- **State**: Zustand + React Query (TanStack)
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v6
- **Charts**: Chart.js + Recharts
- **Drag & Drop**: React DnD + Hello Pangea DnD

## Core Capabilities

### 1. **Dashboard Components**
Generate comprehensive dashboard widgets with charts and analytics:

```tsx
// Example Usage:
@component-factory Create revenue analytics dashboard with multiple chart types and filters

// Generates:
// - RevenueAnalyticsDashboard.tsx
// - Revenue chart components
// - Filter controls
// - Export functionality
// - Responsive design
// - TypeScript interfaces
```

### 2. **CRUD Form Components**
Create complete form interfaces with validation:

```tsx
@component-factory Create room booking form with guest details, payment, and confirmation

// Generates:
// - BookingForm.tsx with multi-step wizard
// - Form validation with Zod schemas
// - Payment integration
// - Success/error handling
// - Mobile-responsive design
```

### 3. **Data Table Components**
Build sophisticated data tables with sorting, filtering, and actions:

```tsx
@component-factory Create room management table with status updates and bulk operations

// Generates:
// - RoomManagementTable.tsx
// - Sorting and filtering
// - Row selection and bulk actions
// - Pagination
// - Status indicators
// - Action menus
```

### 4. **Modal and Dialog Components**
Generate modals for various hotel operations:

```tsx
@component-factory Create guest check-in modal with room assignment and document verification

// Generates:
// - CheckInModal.tsx
// - Form fields for guest info
// - Room selection dropdown
// - Document upload
// - Validation and submission
```

## Component Templates

### 1. **Dashboard Widget Template**
```tsx
// components/dashboard/{WidgetName}Widget.tsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface {WidgetName}Data {
  id: string;
  value: number;
  label: string;
  timestamp: string;
  trend?: 'up' | 'down' | 'stable';
}

interface {WidgetName}WidgetProps {
  dateRange?: {
    start: Date;
    end: Date;
  };
  refreshInterval?: number;
  showExport?: boolean;
}

export const {WidgetName}Widget: React.FC<{WidgetName}WidgetProps> = ({
  dateRange,
  refreshInterval = 30000,
  showExport = false
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['{widgetName}', selectedPeriod, dateRange],
    queryFn: () => fetch{WidgetName}Data(selectedPeriod, dateRange),
    refetchInterval: refreshInterval,
  });

  const handleExport = () => {
    // Export functionality
    const csvData = generateCSV(data);
    downloadFile(csvData, `{widgetName}-export-${Date.now()}.csv`);
  };

  if (isLoading) {
    return (
      <Card className="w-full h-64">
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="text-center text-red-500 p-6">
          Failed to load {widgetName} data.
          <Button variant="outline" onClick={() => refetch()} className="ml-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{Widget Name}</CardTitle>
        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          {showExport && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              Export
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Total: {data?.reduce((sum, item) => sum + item.value, 0)}</span>
          <div className="flex items-center">
            {data?.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500 mr-1" />}
            {data?.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500 mr-1" />}
            <span>vs last period</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Service function
async function fetch{WidgetName}Data(period: string, dateRange?: any): Promise<{WidgetName}Data[]> {
  const response = await fetch(`/api/v1/{widgetName}?period=${period}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch {widgetName} data');
  }

  return response.json();
}
```

### 2. **Form Component Template**
```tsx
// components/forms/{FormName}Form.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const {formName}Schema = z.object({
  // Generated based on requirements
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone format'),
  // Additional fields...
});

type {FormName}FormData = z.infer<typeof {formName}Schema>;

interface {FormName}FormProps {
  initialData?: Partial<{FormName}FormData>;
  onSuccess?: (data: {FormName}FormData) => void;
  onCancel?: () => void;
  isEdit?: boolean;
}

export const {FormName}Form: React.FC<{FormName}FormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  isEdit = false
}) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch
  } = useForm<{FormName}FormData>({
    resolver: zodResolver({formName}Schema),
    defaultValues: initialData || {}
  });

  const mutation = useMutation({
    mutationFn: async (data: {FormName}FormData) => {
      const url = isEdit ? `/api/v1/{endpoint}/${initialData?.id}` : '/api/v1/{endpoint}';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully');
      queryClient.invalidateQueries({ queryKey: ['{endpoint}'] });
      onSuccess?.(data);
      if (!isEdit) reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: {FormName}FormData) => {
    mutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEdit ? 'Edit {Form Name}' : 'Create {Form Name}'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Enter email"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="Enter phone number"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {mutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {mutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
```

### 3. **Data Table Template**
```tsx
// components/tables/{TableName}Table.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Search,
  Filter,
  Download
} from 'lucide-react';

interface {TableName}Item {
  id: string;
  // Generated fields based on requirements
  name: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
}

interface {TableName}TableProps {
  data?: {TableName}Item[];
  isLoading?: boolean;
  onEdit?: (item: {TableName}Item) => void;
  onDelete?: (item: {TableName}Item) => void;
  onBulkAction?: (action: string, items: {TableName}Item[]) => void;
  showBulkActions?: boolean;
}

export const {TableName}Table: React.FC<{TableName}TableProps> = ({
  data = [],
  isLoading = false,
  onEdit,
  onDelete,
  onBulkAction,
  showBulkActions = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof {TableName}Item>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [data, searchTerm, sortField, sortDirection]);

  const handleSort = (field: keyof {TableName}Item) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedData.map(item => item.id)));
    }
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const SortIcon = ({ field }: { field: keyof {TableName}Item }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="h-4 w-4" /> :
      <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search {table name}..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center space-x-2">
          {showBulkActions && selectedItems.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Actions ({selectedItems.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => onBulkAction?.('activate',
                    filteredAndSortedData.filter(item => selectedItems.has(item.id))
                  )}
                >
                  Activate Selected
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onBulkAction?.('deactivate',
                    filteredAndSortedData.filter(item => selectedItems.has(item.id))
                  )}
                >
                  Deactivate Selected
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onBulkAction?.('delete',
                    filteredAndSortedData.filter(item => selectedItems.has(item.id))
                  )}
                  className="text-red-600"
                >
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {showBulkActions && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.size === filteredAndSortedData.length && filteredAndSortedData.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center space-x-1">
                  <span>Created</span>
                  <SortIcon field="createdAt" />
                </div>
              </TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={showBulkActions ? 5 : 4} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredAndSortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showBulkActions ? 5 : 4} className="text-center py-8 text-gray-500">
                  No {table name} found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedData.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50">
                  {showBulkActions && (
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => handleSelectItem(item.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit?.(item)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete?.(item)} className="text-red-600">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination would go here */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>
          Showing {filteredAndSortedData.length} of {data.length} {table name}
        </span>
      </div>
    </div>
  );
};
```

## Hotel-Specific Component Types

### 1. **Room Management Components**
```tsx
@component-factory Create room assignment interface with drag-and-drop and status indicators

// Generates:
// - Room grid with visual indicators
// - Drag-and-drop functionality
// - Status change controls
// - Guest information display
```

### 2. **Booking Components**
```tsx
@component-factory Create multi-step booking wizard with payment integration

// Generates:
// - Step-by-step booking flow
// - Room selection interface
// - Guest information forms
// - Payment processing
// - Confirmation screens
```

### 3. **Dashboard Analytics**
```tsx
@component-factory Create occupancy dashboard with charts and KPIs

// Generates:
// - Occupancy rate displays
// - Revenue charts
// - Booking trend graphs
// - Key performance indicators
```

### 4. **Staff Management Components**
```tsx
@component-factory Create staff task assignment interface with progress tracking

// Generates:
// - Task list displays
// - Assignment controls
// - Progress indicators
// - Performance metrics
```

## Usage Examples

### 1. **Dashboard Widget**
```bash
@component-factory Create revenue analytics widget with line chart and export functionality
```

### 2. **Complex Form**
```bash
@component-factory Create guest registration form with document upload and room preferences
```

### 3. **Data Management Table**
```bash
@component-factory Create room inventory table with bulk status updates and filtering
```

### 4. **Mobile Interface**
```bash
@component-factory Create mobile-responsive housekeeping checklist with photo upload
```

### 5. **Modal Dialog**
```bash
@component-factory Create booking modification modal with date picker and rate calculation
```

## Generated File Structure
```
frontend/src/
├── components/{category}/
│   ├── {ComponentName}.tsx        # Main component
│   ├── {ComponentName}.types.ts   # TypeScript interfaces
│   ├── {ComponentName}.test.tsx   # Test suite
│   └── index.ts                   # Export file
├── hooks/
│   └── use{ComponentName}.ts      # Custom hooks
└── services/
    └── {componentName}Service.ts  # API calls
```

## Features Included

### 1. **State Management**
- React Query integration for server state
- Local state with useState/useReducer
- Form state with React Hook Form
- Global state with Zustand when needed

### 2. **Responsive Design**
- Mobile-first approach
- Tailwind CSS responsive utilities
- Touch-friendly interfaces
- Adaptive layouts

### 3. **Accessibility**
- ARIA attributes
- Keyboard navigation
- Screen reader support
- Focus management

### 4. **Performance**
- React.memo optimization
- Lazy loading
- Virtual scrolling for large lists
- Efficient re-renders

This Component Factory Agent will dramatically reduce your frontend development time while ensuring consistency, accessibility, and modern React best practices across all components.