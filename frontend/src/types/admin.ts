export interface HousekeepingTask {
  _id: string;
  hotelId: string;
  roomId: {
    _id: string;
    roomNumber: string;
    type: string;
    floor: number;
  };
  taskType: 'cleaning' | 'maintenance' | 'inspection' | 'deep_clean' | 'checkout_clean';
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedToUserId?: {
    _id: string;
    name: string;
  };
  estimatedDuration: number;
  startedAt?: string;
  completedAt?: string;
  actualDuration?: number;
  notes?: string;
  supplies: {
    name: string;
    quantity: number;
    unit: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  _id: string;
  hotelId: string;
  name: string;
  sku: string;
  category: 'linens' | 'toiletries' | 'cleaning' | 'maintenance' | 'food_beverage' | 'other';
  quantity: number;
  unit: 'pieces' | 'bottles' | 'rolls' | 'kg' | 'liters' | 'sets';
  minimumThreshold: number;
  maximumCapacity: number;
  costPerUnit?: number;
  supplier?: {
    name: string;
    contact: string;
    email: string;
  };
  location?: {
    building?: string;
    floor?: string;
    room?: string;
    shelf?: string;
  };
  requests: {
    _id: string;
    userId: string;
    quantity: number;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
    requestedAt: string;
  }[];
  lastRestocked?: string;
  expiryDate?: string;
  isActive: boolean;
  isLowStock?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueData {
  date: string;
  totalRevenue: number;
  bookingCount: number;
  averageBookingValue: number;
}

export interface OccupancyData {
  occupancyRate: number;
  totalRoomNights: number;
  totalPossibleRoomNights: number;
  totalRooms: number;
  periodDays: number;
}