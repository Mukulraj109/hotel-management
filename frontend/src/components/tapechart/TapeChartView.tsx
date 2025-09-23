import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/utils/toast';
import {
  CalendarIcon, ChevronLeft, ChevronRight, Filter, Settings, Maximize2,
  User, Clock, Bed, IndianRupee, AlertTriangle, CheckCircle,
  MoreHorizontal, Move, Copy, Trash2, Bell, Phone, Mail,
  Zap, Star, Crown, UserCheck, UserX, Coffee, Wifi, Users,
  UserPlus, Building2, Plane, Heart, Baby, RefreshCw, Check, X
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, formatISO } from 'date-fns';
import tapeChartService, { TapeChartData, TapeChartView as TapeChartViewType } from '@/services/tapeChartService';
import { formatCurrency } from '@/utils/currencyUtils';
import { dragDropManager, DraggedReservation, DropTarget } from '@/utils/DragDropManager';
import ReservationSidebar from './ReservationSidebar';
import CollapsibleSidebar from '@/components/ui/CollapsibleSidebar';
import GlobalSearch from '@/components/ui/GlobalSearch';
import LiveChatWidget from '@/components/ui/LiveChatWidget';
import NotificationSystem from '@/components/ui/NotificationSystem';
import ReservationWorkflowPanel from './ReservationWorkflowPanel';
import VIPGuestManager from './VIPGuestManager';
import { UpgradeProcessor } from './UpgradeProcessor';
import { SpecialRequestTracker } from './SpecialRequestTracker';
import { WaitlistProcessor } from './WaitlistProcessor';
import BlockManagementPanel from './BlockManagementPanel';

interface RoomCell {
  id: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance' | 'dirty' | 'clean' | 'out_of_order' | 'blocked';
  guestName?: string;
  bookingId?: string;
  checkIn?: string;
  checkOut?: string;
  rate?: number;
  vipStatus?: 'none' | 'vip' | 'svip' | 'corporate';
  specialRequests?: string[];
  amenities?: string[];
  isDragOver?: boolean;
  isSelected?: boolean;
  // New fields for task.md requirements
  guestGender?: 'male' | 'female' | 'other' | 'family';
  bookingType?: 'individual' | 'group' | 'corporate' | 'travel_agent';
  aiPrediction?: {
    demandLevel: 'high' | 'medium' | 'low';
    profitabilityScore: number; // 0-100
    recommendedRate: number;
    confidence: number; // 0-100
  };
  preferences?: {
    roomTemp?: number;
    pillow?: string;
    wakeUpCall?: boolean;
    newspaper?: boolean;
  };
}

interface TimelineCell {
  date: string;
  status: string;
  guestName?: string;
  bookingId?: string;
  rate?: number;
  isWeekend?: boolean;
  isToday?: boolean;
  isBlockedDate?: boolean;
}

// DraggedReservation is now imported from DragDropManager

interface DragState {
  isDragging: boolean;
  draggedItems: DraggedReservation[];
  dragPreview: HTMLElement | null;
  operationId: string | null;
}

interface ConflictIndicator {
  roomId: string;
  date: string;
  conflictType: 'locked' | 'occupied' | 'maintenance' | 'unsuitable';
  message: string;
  suggestions: string[];
}

const TapeChartView: React.FC = () => {
  const [chartData, setChartData] = useState<TapeChartData | null>(null);
  const [views, setViews] = useState<TapeChartViewType[]>([]);
  const [selectedView, setSelectedView] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date range management
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 7));
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // UI state
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<DraggedReservation | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItems: [],
    dragPreview: null,
    operationId: null
  });
  const [conflictIndicators, setConflictIndicators] = useState<Map<string, ConflictIndicator>>(new Map());
  const [roomSuggestions, setRoomSuggestions] = useState<Map<string, any[]>>(new Map());

  // Performance optimization states
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
  const [dragOverCache, setDragOverCache] = useState<Map<string, boolean>>(new Map());

  const [showFilters, setShowFilters] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [showGuestNames, setShowGuestNames] = useState(true);
  const [showRates, setShowRates] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isReservationSidebarCollapsed, setIsReservationSidebarCollapsed] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  
  // Refresh trigger for sidebar
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastAssignedCell, setLastAssignedCell] = useState<string | null>(null);
  const [recentlyUpdatedCells, setRecentlyUpdatedCells] = useState<Set<string>>(new Set());
  
  // Filters
  const [filters, setFilters] = useState({
    floors: [] as number[],
    roomTypes: [] as string[],
    statuses: [] as string[],
    buildings: [] as string[],
    wings: [] as string[]
  });
  
  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    roomId: string;
    roomNumber: string;
    roomType: string;
    floor: number;
    currentStatus: string;
    visible: boolean;
  }>({ x: 0, y: 0, roomId: '', roomNumber: '', roomType: '', floor: 0, currentStatus: '', visible: false });

  // Block creation mode
  const [blockCreationMode, setBlockCreationMode] = useState(false);
  const [selectedRoomsForBlock, setSelectedRoomsForBlock] = useState<Set<string>>(new Set());

  const chartRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(600);

  // Helper functions for task.md visual indicators
  const getGenderIcon = (gender?: string) => {
    switch (gender) {
      case 'male': return <User className="h-3 w-3 text-blue-600" />;
      case 'female': return <UserCheck className="h-3 w-3 text-pink-600" />;
      case 'family': return <Users className="h-3 w-3 text-green-600" />;
      case 'other': return <Heart className="h-3 w-3 text-purple-600" />;
      default: return null;
    }
  };

  const getBookingTypeIcon = (bookingType?: string) => {
    switch (bookingType) {
      case 'individual': return <User className="h-3 w-3 text-gray-600" />;
      case 'group': return <Users className="h-3 w-3 text-orange-600" />;
      case 'corporate': return <Building2 className="h-3 w-3 text-blue-700" />;
      case 'travel_agent': return <Plane className="h-3 w-3 text-indigo-600" />;
      default: return <User className="h-3 w-3 text-gray-400" />;
    }
  };

  const getBookingTypeColor = (bookingType?: string) => {
    switch (bookingType) {
      case 'individual': return 'bg-gray-100 border-gray-300';
      case 'group': return 'bg-orange-100 border-orange-300';
      case 'corporate': return 'bg-blue-100 border-blue-300';
      case 'travel_agent': return 'bg-indigo-100 border-indigo-300';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getProfitabilityRoomColor = (timelineData: any, status: string) => {
    // If room is available, show AI prediction profitability colors
    if (status === 'available' && timelineData?.aiPrediction) {
      const score = timelineData.aiPrediction.profitabilityScore;
      if (score >= 80) return 'bg-green-50 border-green-300 hover:bg-green-100';
      if (score >= 60) return 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100';
      return 'bg-red-50 border-red-300 hover:bg-red-100';
    }
    
    // For occupied rooms, enhance booking type colors with profitability hints
    if (status !== 'available' && timelineData?.bookingType) {
      const baseColor = getBookingTypeColor(timelineData.bookingType);
      // Add slight gradient for high-value bookings
      if (timelineData.rate && timelineData.rate > 15000) {
        return baseColor.replace('100', '200').replace('300', '400');
      }
      return baseColor;
    }
    
    // Fallback to original status color
    return getStatusColor(status);
  };

  const getRoomNotifications = (roomNumber: string, timelineData: any) => {
    const notifications = [];
    
    // Housekeeping notifications
    if (timelineData?.status === 'dirty') {
      notifications.push({ type: 'housekeeping', priority: 'high', message: 'Room needs cleaning' });
    }
    
    // Maintenance notifications
    if (timelineData?.status === 'maintenance') {
      notifications.push({ type: 'maintenance', priority: 'high', message: 'Under maintenance' });
    }
    
    // VIP guest notifications
    if (timelineData?.vipStatus === 'svip' || timelineData?.vipStatus === 'vip') {
      notifications.push({ type: 'vip', priority: 'medium', message: 'VIP guest' });
    }
    
    // Special requests notifications
    if (timelineData?.specialRequests?.length > 0) {
      notifications.push({ type: 'request', priority: 'medium', message: 'Special requests' });
    }
    
    // AI prediction alerts for high demand
    if (timelineData?.aiPrediction?.demandLevel === 'high' && timelineData?.status === 'available') {
      notifications.push({ type: 'demand', priority: 'low', message: 'High demand period' });
    }
    
    return notifications;
  };

  const getNotificationBadge = (notifications: any[]) => {
    if (notifications.length === 0) return null;
    
    const highPriority = notifications.filter(n => n.priority === 'high').length;
    const hasNotifications = notifications.length > 0;
    
    return (
      <div className="absolute -top-1 -right-1 z-10">
        {highPriority > 0 ? (
          <div className="bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
            {highPriority}
          </div>
        ) : hasNotifications ? (
          <div className="bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {notifications.length}
          </div>
        ) : null}
      </div>
    );
  };

  const getAIPredictionIndicator = (aiPrediction?: RoomCell['aiPrediction']) => {
    if (!aiPrediction) return null;
    
    const getDemandColor = (level: string) => {
      switch (level) {
        case 'high': return 'text-red-500';
        case 'medium': return 'text-yellow-500';
        case 'low': return 'text-green-500';
        default: return 'text-gray-400';
      }
    };

    const getProfitabilityColor = (score: number) => {
      if (score >= 80) return 'text-green-600';
      if (score >= 60) return 'text-yellow-600';
      if (score >= 40) return 'text-orange-600';
      return 'text-red-600';
    };

    return (
      <div className="flex items-center space-x-1">
        <Zap className={`h-3 w-3 ${getDemandColor(aiPrediction.demandLevel)}`} />
        <span className={`text-xs font-medium ${getProfitabilityColor(aiPrediction.profitabilityScore)}`}>
          {aiPrediction.profitabilityScore}%
        </span>
      </div>
    );
  };

  const getVipIcon = (vipStatus?: string) => {
    switch (vipStatus) {
      case 'vip': return <Star className="h-3 w-3 text-yellow-500" />;
      case 'svip': return <Crown className="h-3 w-3 text-gold-500" />;
      case 'corporate': return <Building2 className="h-3 w-3 text-blue-600" />;
      default: return null;
    }
  };

  const getPreferenceIcons = (preferences?: any) => {
    if (!preferences) return null;
    return (
      <div className="flex gap-1 mt-1">
        {preferences.wakeUpCall && <Bell className="h-2 w-2 text-orange-500" />}
        {preferences.newspaper && <Coffee className="h-2 w-2 text-brown-500" />}
        {preferences.roomTemp && <Zap className="h-2 w-2 text-blue-400" />}
      </div>
    );
  };

  useEffect(() => {
    fetchViews();
  }, []);

  useEffect(() => {
    if (selectedView) {
      fetchChartData();
    }
  }, [selectedView, startDate, endDate]);

  // Set up drag drop manager refresh callback for real-time updates
  useEffect(() => {
    dragDropManager.setRefreshCallback(() => {
      console.log('🔄 DragDropManager triggered refresh');
      fetchChartData();
      setRefreshTrigger(prev => prev + 1);
    });

    return () => {
      dragDropManager.setRefreshCallback(() => {});
    };
  }, []);

  // Auto-refresh every 30 seconds to keep data updated
  useEffect(() => {
    if (!selectedView) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing tape chart data...');
      fetchChartData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [selectedView, startDate, endDate]);

  const fetchViews = async () => {
    try {
      console.log('Fetching tape chart views...');
      const response = await tapeChartService.getTapeChartViews();
      console.log('Views response:', response);
      setViews(response.data || []);
      if (response.data?.length > 0) {
        console.log('Setting selected view to:', response.data[0]._id);
        setSelectedView(response.data[0]._id);
      } else {
        console.log('No views found');
      }
    } catch (err: any) {
      console.error('Views fetch error:', err);
      setError(err.message || 'Failed to fetch views');
      toast.error('Failed to load tape chart views');
    }
  };

  const fetchChartData = async () => {
    if (!selectedView) {
      console.log('No selectedView, skipping chart data fetch');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching chart data for view:', selectedView, 'dates:', startDate, endDate);
      const response = await tapeChartService.generateTapeChartData(selectedView, {
        startDate: formatISO(startDate, { representation: 'date' }),
        endDate: formatISO(endDate, { representation: 'date' })
      });
      console.log('Chart data response:', response);
      setChartData(response);
      setError(null);
    } catch (err: any) {
      console.error('Chart data fetch error:', err);
      setError(err.message || 'Failed to fetch chart data');
      toast.error('Failed to load tape chart data');
    } finally {
      setLoading(false);
    }
  };

  const getDatesInRange = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const getStatusColor = (status: string): string => {
    const colors = {
      available: 'bg-green-50 text-green-900 border-green-300 hover:bg-green-100',
      occupied: 'bg-red-50 text-red-900 border-red-300 hover:bg-red-100',
      reserved: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
      maintenance: 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100',
      dirty: 'bg-orange-50 text-orange-900 border-orange-300 hover:bg-orange-100',
      clean: 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100',
      out_of_order: 'bg-gray-50 text-gray-900 border-gray-300 hover:bg-gray-100',
      blocked: 'bg-indigo-50 text-indigo-900 border-indigo-300 hover:bg-indigo-100',
      checkout: 'bg-teal-50 text-teal-900 border-teal-300 hover:bg-teal-100',
      checkin: 'bg-cyan-50 text-cyan-900 border-cyan-300 hover:bg-cyan-100'
    };
    return colors[status as keyof typeof colors] || colors.available;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      available: <CheckCircle className="w-3 h-3 text-green-600" />,
      occupied: <User className="w-3 h-3 text-red-600" />,
      reserved: <Clock className="w-3 h-3 text-amber-600" />,
      maintenance: <AlertTriangle className="w-3 h-3 text-purple-600" />,
      dirty: <AlertTriangle className="w-3 h-3 text-orange-600" />,
      clean: <CheckCircle className="w-3 h-3 text-blue-600" />,
      out_of_order: <UserX className="w-3 h-3 text-gray-600" />,
      blocked: <UserX className="w-3 h-3 text-indigo-600" />,
      checkout: <UserCheck className="w-3 h-3 text-teal-600" />,
      checkin: <UserCheck className="w-3 h-3 text-cyan-600" />
    };
    return icons[status as keyof typeof icons] || icons.available;
  };




  const getBookingTypeIndicator = (bookingType?: string) => {
    const indicators = {
      individual: { color: 'bg-blue-500', label: 'IND' },
      group: { color: 'bg-green-500', label: 'GRP' },
      travel_agent: { color: 'bg-orange-500', label: 'TA' },
      corporate: { color: 'bg-purple-500', label: 'CORP' },
      online: { color: 'bg-cyan-500', label: 'OTA' },
      walk_in: { color: 'bg-gray-500', label: 'WI' }
    };
    
    const indicator = indicators[bookingType as keyof typeof indicators];
    if (!indicator) return null;
    
    return (
      <div className={`absolute bottom-1 left-1 ${indicator.color} text-white text-xs px-1 rounded-sm font-bold`}>
        {indicator.label}
      </div>
    );
  };

  const handleDragStart = (e: React.DragEvent, reservation: any) => {
    console.log('📋📋 TAPE CHART - handleDragStart called');
    console.log('📋📋 TAPE CHART - Reservation data received:', reservation);
    console.log('📋📋 TAPE CHART - Reservation type check - is DraggedReservation?', reservation.hasOwnProperty('_id'));

    // Transform reservation to DraggedReservation if needed
    let draggedReservation: DraggedReservation;

    if (reservation.hasOwnProperty('_id') && typeof reservation._id === 'string') {
      // This is already a DraggedReservation from timeline cell
      console.log('📋📋 TAPE CHART - Using existing DraggedReservation from timeline');
      draggedReservation = reservation;
    } else {
      // Transform from Reservation (sidebar) to DraggedReservation format
      console.log('📋📋 TAPE CHART - Converting Reservation to DraggedReservation');
      draggedReservation = {
        id: reservation.id,
        _id: reservation._id || reservation.id,
        bookingNumber: reservation.bookingNumber || reservation.id.slice(-6),
        guestName: reservation.guestName,
        roomType: reservation.roomType,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        status: reservation.status,
        vipStatus: reservation.vipStatus || 'none',
        totalAmount: reservation.totalAmount || (reservation.rate || 0),
        paymentStatus: reservation.paymentStatus || 'pending',
        adults: reservation.adults || 2,
        children: reservation.children || 0,
        nights: reservation.nights || 1,
        specialRequests: reservation.specialRequests || []
      };
      console.log('📋📋 TAPE CHART - Converted reservation:', draggedReservation);
    }

    setDraggedItem(draggedReservation);
    e.dataTransfer.effectAllowed = 'move';

    // Get selected reservations for batch operations
    const selectedIds = dragDropManager.getSelectedReservations();
    let draggedReservations: DraggedReservation[];

    if (selectedIds.length > 0 && selectedIds.includes(draggedReservation.id)) {
      // If the dragged reservation is part of a selection, drag all selected
      draggedReservations = [draggedReservation]; // Start with the clicked one
      // TODO: Add other selected reservations from the sidebar data
      console.log('📋📋 TAPE CHART - Multi-selection drag with', selectedIds.length, 'items');
    } else {
      // Single reservation drag
      draggedReservations = [draggedReservation];
      console.log('📋📋 TAPE CHART - Single reservation drag');
    }

    // Determine operation type based on selection
    const operationType = selectedIds.length > 1 ? 'batch_assign' : 'assign';

    // Start drag operation
    const operationId = dragDropManager.startDragOperation(draggedReservations, operationType);

    // Create enhanced drag image
    const dragImage = dragDropManager.createDragImage(draggedReservations);
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    // Update drag state
    setDragState({
      isDragging: true,
      draggedItems: draggedReservations,
      dragPreview: dragImage,
      operationId
    });

    // Clean up drag image
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);

    // Clear any existing conflict indicators
    setConflictIndicators(new Map());

    // Generate room suggestions for the dragged reservation
    generateRoomSuggestions(draggedReservation);

    console.log(`📋📋 TAPE CHART - Drag started: ${operationType} with ${draggedReservations.length} reservation(s)`);
    console.log('📋📋 TAPE CHART - Final dragged reservations:', draggedReservations);
  };

  const handleDragOver = async (e: React.DragEvent, cellId: string) => {
    e.preventDefault();

    if (!dragState.isDragging || dragState.draggedItems.length === 0) {
      return;
    }

    // Split cellId properly: "702-2025-09-23" -> roomNumber: "702", dateStr: "2025-09-23"
    const splitParts = cellId.split('-');
    const roomNumber = splitParts[0];
    const dateStr = splitParts.slice(1).join('-'); // Join back "2025-09-23"
    const room = chartData?.rooms?.find(r => r.config.roomNumber === roomNumber);

    if (!room) return;

    // Create drop target first
    const dropTarget: DropTarget = {
      roomId: room.room?._id || room.config.roomId,
      roomNumber: room.config.roomNumber,
      date: dateStr,
      isAvailable: true
    };

    // Register drop zone immediately to prevent "No drop target registered" errors
    dragDropManager.registerDropZone(cellId, dropTarget);
    setDragOverCell(cellId);

    // Enhanced visual feedback and validation
    const draggedReservation = dragState.draggedItems[0];
    if (draggedReservation) {
      // Check room type compatibility
      const draggedRoomType = draggedReservation.roomType?.toLowerCase();
      const targetRoomType = room.room?.type?.toLowerCase() || room.config.roomType?.toLowerCase();

      if (draggedRoomType && targetRoomType && draggedRoomType !== targetRoomType) {
        setConflictIndicators(new Map([[cellId, {
          reason: `Room type mismatch: Guest booked ${draggedReservation.roomType} but this is ${room.room?.type || room.config.roomType}`
        }]]));
        e.dataTransfer.dropEffect = 'none';
        return;
      }

      // Check date compatibility
      const targetDate = parseISO(dateStr);
      const checkInDate = parseISO(draggedReservation.checkIn);
      const checkOutDate = parseISO(draggedReservation.checkOut);

      // Normalize dates for comparison
      targetDate.setHours(0, 0, 0, 0);
      checkInDate.setHours(0, 0, 0, 0);
      checkOutDate.setHours(0, 0, 0, 0);

      if (targetDate < checkInDate || targetDate >= checkOutDate) {
        setConflictIndicators(new Map([[cellId, {
          reason: `Date mismatch: Cannot assign guest to ${targetDate.toDateString()}. Booking is only valid from ${checkInDate.toDateString()} to ${new Date(checkOutDate.getTime() - 1).toDateString()}`
        }]]));
        e.dataTransfer.dropEffect = 'none';
        return;
      }

      // Check if room is already occupied for this date
      const timelineData = room.timeline.find((t: any) => t.date === dateStr);

      if (timelineData?.status === 'occupied' || timelineData?.status === 'reserved') {
        setConflictIndicators(new Map([[cellId, {
          reason: `Room is ${timelineData.status} by ${timelineData.guestName || 'another guest'}`
        }]]));
        e.dataTransfer.dropEffect = 'none';
        return;
      }

      // Clear conflicts and add positive feedback
      setConflictIndicators(new Map());
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e: React.DragEvent, cellId?: string) => {
    // Performance optimization: clear hover timer on leave
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverCell(null);

      // Clear conflict indicators for this cell
      if (cellId) {
        setConflictIndicators(prev => {
          const newMap = new Map(prev);
          newMap.delete(cellId);
          return newMap;
        });
        dragDropManager.unregisterDropZone(cellId);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent, roomId: string, date: string, roomNumber?: string) => {
    console.log('🎯🎯 DROP EVENT TRIGGERED!');
    console.log('🎯🎯 DROP - Room ID:', roomId);
    console.log('🎯🎯 DROP - Room Number:', roomNumber);
    console.log('🎯🎯 DROP - Date:', date);
    console.log('🎯🎯 DROP - Current drag state:', dragState);
    console.log('🎯🎯 DROP - Dragged items count:', dragState.draggedItems?.length || 0);

    e.preventDefault();

    if (!dragState.isDragging || dragState.draggedItems.length === 0) {
      console.log('❌❌ DROP - No drag operation in progress or no items');
      console.log('❌❌ DROP - isDragging:', dragState.isDragging);
      console.log('❌❌ DROP - draggedItems length:', dragState.draggedItems?.length);
      return;
    }

    const cellId = `${roomNumber || roomId}-${date}`;
    console.log('🎯🎯 DROP - Generated cell ID:', cellId);

    const dropTarget = dragDropManager.getDropZone(cellId);
    console.log('🎯🎯 DROP - Found drop target:', dropTarget);

    if (!dropTarget) {
      console.log('❌❌ DROP - No drop target registered for cell:', cellId);
      console.log('❌❌ DROP - Available drop zones:', dragDropManager);
      return;
    }

    // Check for conflicts one more time
    const hasConflict = conflictIndicators.has(cellId);
    if (hasConflict) {
      const conflict = conflictIndicators.get(cellId)!;
      const proceedAnyway = window.confirm(
        `⚠️ Conflict detected: ${conflict.message}\n\nSuggestions:\n${conflict.suggestions.join('\n')}\n\nProceed anyway?`
      );

      if (!proceedAnyway) {
        endDragOperation();
        return;
      }
    }

    // Show confirmation for moves
    const reservationsText = dragState.draggedItems.length === 1
      ? `${dragState.draggedItems[0].guestName}'s reservation`
      : `${dragState.draggedItems.length} reservations`;

    console.log('🎯🎯 DROP - Showing confirmation dialog for:', reservationsText);

    const confirmed = window.confirm(
      `Move ${reservationsText} to room ${roomNumber || roomId} for ${date}?`
    );

    console.log('🎯🎯 DROP - User confirmation result:', confirmed);

    if (!confirmed) {
      console.log('❌❌ DROP - User cancelled, ending drag operation');
      endDragOperation();
      return;
    }

    try {
      console.log('🎯🎯 DROP - Starting assignment execution');
      console.log('🎯🎯 DROP - Dragged items:', dragState.draggedItems);
      console.log('🎯🎯 DROP - Drop target:', dropTarget);

      const result = await dragDropManager.executeAssignment(
        dragState.draggedItems,
        dropTarget,
        {
          notes: `Moved via enhanced drag & drop to room ${roomNumber || roomId} for ${date}`,
          moveReason: 'Staff reassignment via enhanced tape chart',
          sendNotification: true,
          lockRoom: true
        }
      );

      console.log('🎯🎯 DROP - Assignment execution result:', result);

      if (result.success) {
        console.log('✅✅ DROP - Assignment successful, refreshing data');

        // Clear all drag states immediately to prevent UI issues
        setDragOverCell(null);
        setConflictIndicators(new Map());
        setRoomSuggestions(new Map());
        setDragState({
          isDragging: false,
          draggedItems: [],
          dragPreview: null,
          operationId: null
        });

        // Force clear any lingering drag over states and classes
        const dragOverElements = document.querySelectorAll('[data-drag-over="true"]');
        dragOverElements.forEach(el => {
          el.removeAttribute('data-drag-over');
          el.classList.remove('drag-over', 'drag-hover');
        });

        // Force a React re-render to clear any lingering drag indicators
        setTimeout(() => {
          setDragOverCell(null);
        }, 0);

        // Track cells that were updated for immediate UI feedback
        const cellId = `${roomNumber}-${date}`;
        setRecentlyUpdatedCells(prev => new Set(prev).add(cellId));

        // Set success animation
        setLastAssignedCell(cellId);
        setTimeout(() => {
          setLastAssignedCell(null);
          // Clear the recently updated tracking after data refresh is complete
          setRecentlyUpdatedCells(prev => {
            const newSet = new Set(prev);
            newSet.delete(cellId);
            return newSet;
          });
        }, 3000); // Extended time to ensure data refresh

        fetchChartData();
        setRefreshTrigger(prev => prev + 1);
      } else {
        console.log('❌❌ DROP - Assignment failed:', result.errors);
      }

    } catch (err: any) {
      console.error('❌❌ DROP - Assignment error:', err);
      console.error('❌❌ DROP - Error details:', err.response?.data);

      // Enhanced error handling with specific user guidance
      let errorMessage = 'Failed to move reservation';
      let errorType = 'error';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;

        // Categorize errors for better UX
        if (errorMessage.includes('Room type mismatch')) {
          errorType = 'warning';
          errorMessage += '\n\n💡 Tip: Check that the room type matches the booking requirement.';
        } else if (errorMessage.includes('Date mismatch')) {
          errorType = 'warning';
          errorMessage += '\n\n📅 Tip: Guests can only be assigned to dates within their booking period.';
        } else if (errorMessage.includes('not active') || errorMessage.includes('maintenance')) {
          errorType = 'warning';
          errorMessage += '\n\n🔧 This room may need maintenance attention.';
        } else if (errorMessage.includes('conflict') || errorMessage.includes('occupied')) {
          errorType = 'warning';
          errorMessage += '\n\n📅 Try selecting a different date or room.';
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Network error handling
      if (!navigator.onLine) {
        errorMessage = '🌐 No internet connection. Please check your connection and try again.';
        errorType = 'error';
      } else if (err.code === 'NETWORK_ERROR') {
        errorMessage = '🔄 Network error. Please try again in a moment.';
        errorType = 'warning';
      }

      if (errorType === 'warning') {
        toast.warning(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      console.log('🎯🎯 DROP - Ending drag operation');
      endDragOperation();
    }
  };

  const handleRoomSelect = (roomId: string) => {
    const newSelection = new Set(selectedRooms);
    if (newSelection.has(roomId)) {
      newSelection.delete(roomId);
    } else {
      newSelection.add(roomId);
    }
    setSelectedRooms(newSelection);
  };

  const handleRightClick = (e: React.MouseEvent, roomData: {
    roomId: string;
    roomNumber: string;
    roomType: string;
    floor: number;
    currentStatus: string;
  }) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      roomId: roomData.roomId,
      roomNumber: roomData.roomNumber,
      roomType: roomData.roomType,
      floor: roomData.floor,
      currentStatus: roomData.currentStatus,
      visible: true
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        handleCloseContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  const hideContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Enhanced drag & drop helper functions
  const generateRoomSuggestions = async (reservation: DraggedReservation) => {
    try {
      const suggestions = await dragDropManager.getSuggestedRooms(reservation);
      const suggestionMap = new Map();

      suggestions.forEach(suggestion => {
        const cellId = `${suggestion.roomNumber}-${format(startDate, 'yyyy-MM-dd')}`;
        suggestionMap.set(cellId, suggestion);
      });

      setRoomSuggestions(suggestionMap);
    } catch (error) {
      console.error('Error generating room suggestions:', error);
    }
  };

  const endDragOperation = () => {
    console.log('🧹 Cleaning up drag operation state...');

    // Clear drag drop manager state
    dragDropManager.endDragOperation();

    // Force clear all UI states
    setDragState({
      isDragging: false,
      draggedItems: [],
      dragPreview: null,
      operationId: null
    });

    setDraggedItem(null);
    setDragOverCell(null);
    setConflictIndicators(new Map());
    setRoomSuggestions(new Map());

    // Remove any remaining drag preview elements
    const dragPreviews = document.querySelectorAll('.drag-preview');
    dragPreviews.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });

    // Force clear any drag over styling or attributes
    const allCells = document.querySelectorAll('[data-cell-id]');
    allCells.forEach(cell => {
      cell.classList.remove('drag-over', 'drag-hover');
      cell.removeAttribute('data-drag-over');
    });

    console.log('🧹 Drag operation cleanup complete');
  };

  // Cleanup drag state on component unmount or when drag ends unexpectedly
  useEffect(() => {
    const handleDragEnd = () => {
      if (dragState.isDragging) {
        console.log('Drag operation ended unexpectedly, cleaning up...');
        endDragOperation();
      }
    };

    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('mouseup', handleDragEnd);

    return () => {
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('mouseup', handleDragEnd);
      // Clean up hover timer
      if (hoverTimer) {
        clearTimeout(hoverTimer);
      }
      dragDropManager.cleanup();
    };
  }, [dragState.isDragging]);

  const handleStatusChange = async (roomId: string, newStatus: string) => {
    try {
      await tapeChartService.updateRoomStatus(roomId, {
        status: newStatus,
        notes: `Status changed to ${newStatus} via tape chart`,
        changeReason: 'Manual update'
      });
      toast.success(`Room ${roomId} status updated to ${newStatus}`);
      fetchChartData();
      hideContextMenu();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update room status');
    }
  };

  const handleCreateBlockFromSelection = async () => {
    try {
      if (selectedRoomsForBlock.size === 0) {
        toast.error('Please select rooms to create a block');
        return;
      }

      const roomIds = Array.from(selectedRoomsForBlock);
      // This would typically open a modal or form for block creation
      // For now, we'll just show a placeholder
      toast.info(`Creating block with ${roomIds.length} rooms`);

      // Reset selection and exit block mode
      setSelectedRoomsForBlock(new Set());
      setBlockCreationMode(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create block');
    }
  };

  const toggleBlockCreationMode = () => {
    setBlockCreationMode(!blockCreationMode);
    if (blockCreationMode) {
      // Exiting block mode, clear selections
      setSelectedRoomsForBlock(new Set());
    }
  };

  const renderRoomCell = (room: any, date: Date) => {
    const cellId = `${room.config.roomNumber}-${format(date, 'yyyy-MM-dd')}`;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isToday = isSameDay(date, new Date());
    const isDragOver = dragOverCell === cellId;
    const hasConflict = conflictIndicators.has(cellId);
    const conflict = conflictIndicators.get(cellId);
    const isRecommended = roomSuggestions.has(cellId);
    
    // Find timeline data for this date
    const timelineData = room.timeline.find((t: any) => 
      isSameDay(parseISO(t.date), date)
    );
    
    const status = timelineData?.status || 'available';
    const guestName = timelineData?.guestName;
    const rate = timelineData?.rate;
    
    return (
      <div
        key={cellId}
        className={`
          relative min-h-[${compactView ? '28px' : '40px'}] border border-gray-200/60
          ${getProfitabilityRoomColor(timelineData, status)}
          ${isDragOver && !hasConflict ? 'ring-2 ring-blue-400 bg-blue-50/80 border-blue-300 scale-[1.01]' : ''}
          ${isDragOver && hasConflict ? 'ring-2 ring-red-400 bg-red-50/80 border-red-300' : ''}
          ${isRecommended ? 'ring-1 ring-green-400 bg-green-50/60' : ''}
          ${isToday ? 'ring-1 ring-blue-300 bg-blue-50/30' : ''}
          ${isWeekend ? 'bg-opacity-50' : ''}
          transition-all duration-150 ease-out cursor-pointer hover:shadow-sm hover:border-gray-300
          ${dragState.isDragging ? 'hover:ring-1 hover:ring-blue-300' : ''}
          transform-gpu will-change-transform rounded-sm
        `}
        onDragOver={(e) => handleDragOver(e, cellId)}
        onDragLeave={(e) => handleDragLeave(e, cellId)}
        onDrop={(e) => handleDrop(e, room.room?._id || room.config.roomId, format(date, 'yyyy-MM-dd'), room.config.roomNumber)}
        onClick={() => handleRoomSelect(room.config._id)}
        onContextMenu={(e) => handleRightClick(e, {
          roomId: room.config._id,
          roomNumber: room.config.roomNumber,
          roomType: room.config.roomType,
          floor: room.config.floor,
          currentStatus: room.currentStatus
        })}
      >
        {/* Status indicator */}
        <div className={`absolute top-0 left-0 w-1 h-full ${getStatusColor(status).replace('bg-', 'bg-').replace('-50', '-500')}`} />
        
        {/* Status icon */}
        <div className="absolute top-1 left-1">
          {getStatusIcon(status)}
        </div>
        
        {/* Notification badges */}
        {getNotificationBadge(getRoomNotifications(room.config.roomNumber, timelineData))}
        
        {/* Enhanced drag drop indicators */}
        {isDragOver && !hasConflict && !recentlyUpdatedCells.has(cellId) && dragState.isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-100 bg-opacity-75 border-2 border-dashed border-green-400 animate-pulse">
            <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 shadow-lg">
              <Check className="w-3 h-3" />
              Drop to assign
            </div>
          </div>
        )}

        {/* Room type mismatch indicator */}
        {hasConflict && conflict?.reason?.includes('Room type mismatch') && (
          <div className="absolute inset-0 flex items-center justify-center bg-orange-100 bg-opacity-75 border-2 border-dashed border-orange-400">
            <div className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 shadow-lg">
              <AlertTriangle className="w-3 h-3" />
              Wrong type
            </div>
          </div>
        )}

        {/* Date mismatch indicator */}
        {hasConflict && conflict?.reason?.includes('Date mismatch') && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-75 border-2 border-dashed border-red-400">
            <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 shadow-lg">
              <CalendarIcon className="w-3 h-3" />
              Wrong date
            </div>
          </div>
        )}

        {/* Room occupied indicator */}
        {hasConflict && conflict?.reason?.includes('occupied') && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-75 border-2 border-dashed border-red-400">
            <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 shadow-lg">
              <X className="w-3 h-3" />
              Occupied
            </div>
          </div>
        )}


        {/* Room suggestion highlight */}
        {isRecommended && !isDragOver && (
          <div className="absolute inset-0 ring-2 ring-blue-400 ring-opacity-50 bg-blue-50 bg-opacity-30 animate-pulse">
            <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
              <Star className="w-3 h-3" />
            </div>
          </div>
        )}

        {/* Assignment success animation */}
        {cellId === lastAssignedCell && (
          <div className="absolute inset-0 bg-green-400 bg-opacity-50 animate-ping">
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        )}

        {/* Conflict indicator */}
        {isDragOver && hasConflict && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-90 border-2 border-dashed border-red-400">
            <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {conflict?.conflictType === 'locked' ? 'Room Locked' : 'Conflict!'}
            </div>
          </div>
        )}

        {/* Recommendation indicator */}
        {isRecommended && !isDragOver && (
          <div className="absolute top-1 right-1">
            <div className="bg-green-500 text-white rounded-full p-1 text-xs">
              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="p-1 pl-5 text-xs">
          {/* Show updating message for recently assigned cells */}
          {recentlyUpdatedCells.has(cellId) && (
            <div className="space-y-1 text-center text-blue-600 font-medium animate-pulse">
              <div>Updating...</div>
            </div>
          )}

          {showGuestNames && guestName && timelineData?.bookingId && !recentlyUpdatedCells.has(cellId) && (
            <div
              className="space-y-1 cursor-move hover:bg-blue-50 rounded p-1 -m-1 transition-colors duration-150"
              draggable={true}
              onDragStart={async (e) => {
                try {
                  // Find the actual booking data from the room.bookings array
                  const actualBooking = room.bookings?.find((booking: any) =>
                    booking._id.toString() === timelineData.bookingId.toString()
                  );

                  console.log('🚀 Found actual booking for drag:', actualBooking);
                  console.log('🚀 Room bookings available:', room.bookings?.length || 0);

                  if (!actualBooking) {
                    console.error('❌ No booking found with ID:', timelineData.bookingId);
                    toast.error('Booking data not found. Cannot move reservation.');
                    e.preventDefault();
                    return;
                  }

                  // Create proper draggable reservation data from actual booking
                  const draggedReservation: DraggedReservation = {
                    id: actualBooking._id.toString(),
                    _id: actualBooking._id.toString(),
                    bookingNumber: actualBooking.bookingNumber || actualBooking._id.toString().slice(-6),
                    guestName: actualBooking.userId?.name || guestName,
                    roomType: room.config.roomType || 'Standard',
                    checkIn: actualBooking.checkIn,
                    checkOut: actualBooking.checkOut,
                    status: actualBooking.status,
                    vipStatus: timelineData.vipStatus || 'none',
                    totalAmount: actualBooking.totalAmount || 0,
                    paymentStatus: actualBooking.paymentStatus || 'pending',
                    adults: actualBooking.guestDetails?.adults || 2,
                    children: actualBooking.guestDetails?.children || 0,
                    nights: actualBooking.nights || 1,
                    specialRequests: actualBooking.specialRequests || []
                  };

                  console.log('🚀 Starting drag from timeline cell with complete data:', draggedReservation);
                  handleDragStart(e, draggedReservation);

                } catch (error) {
                  console.error('❌ Error preparing drag data:', error);
                  toast.error('Failed to prepare booking data for move');
                  e.preventDefault();
                }
              }}
              title={recentlyUpdatedCells.has(cellId) ? "Updating room assignment..." : `Drag to move ${guestName} to another room`}
            >
              <div className="font-medium truncate flex items-center gap-1">
                {getGenderIcon(timelineData?.gender)}
                {getVipIcon(timelineData?.vipStatus)}
                {getBookingTypeIcon(timelineData?.bookingType)}
                <span className="select-none">{guestName}</span>
                <svg className="w-3 h-3 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                {getPreferenceIcons(timelineData?.preferences)}
                {getAIPredictionIndicator(timelineData?.aiPrediction)}
              </div>
              {timelineData?.bookingType && (
                <div className="text-xs opacity-75 capitalize">
                  {timelineData.bookingType.replace('_', ' ')}
                </div>
              )}
            </div>
          )}

          {/* Show room status when no guest */}
          {(!guestName || !timelineData?.bookingId) && (
            <div className="text-gray-500 capitalize text-center py-2">
              {status.replace('_', ' ')}
            </div>
          )}
          
          {showRates && rate && (
            <div className="text-gray-600 font-mono">
              {formatCurrency(rate)}
            </div>
          )}
          
          {timelineData?.bookingId && (
            <div className="text-gray-500 text-xs opacity-75">
              #{timelineData.bookingId.slice(-6)}
            </div>
          )}
        </div>
        
        {/* Special indicators */}
        {timelineData?.specialRequests?.length > 0 && (
          <Bell className="absolute top-1 right-1 w-3 h-3 text-orange-500" />
        )}
        
        {status === 'maintenance' && (
          <AlertTriangle className="absolute bottom-1 right-1 w-3 h-3 text-red-500" />
        )}
        
        {status === 'clean' && (
          <CheckCircle className="absolute bottom-1 right-1 w-3 h-3 text-green-500" />
        )}
        
        {/* Booking type indicator */}
        {timelineData?.bookingType && getBookingTypeIndicator(timelineData.bookingType)}
      </div>
    );
  };

  const renderRoomRow = (room: any, index: number) => {
    const isSelected = selectedRooms.has(room.config._id);
    
    return (
      <div key={room.config._id} className="flex min-w-fit border-b border-gray-200">
        {/* Room header */}
        <div className={`
          sticky left-0 z-10 bg-white border-r border-gray-200/60 p-1.5
          min-w-[120px] flex flex-col justify-center
          ${isSelected ? 'bg-blue-50/80 border-blue-200' : ''}
        `}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-xs truncate">{room.config.roomNumber}</div>
              <div className="text-xs text-gray-500 truncate">{room.config.roomType}</div>
              <div className="text-xs text-gray-400">F{room.config.floor}</div>
            </div>

            <div className="flex flex-col items-center gap-0.5 ml-1">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(room.currentStatus).replace('bg-', 'bg-').replace('-100', '-500')}`} />
              <div className="text-xs text-gray-500 capitalize px-1 py-0.5 bg-gray-50 rounded text-center leading-none">
                {room.currentStatus.replace('_', ' ')}
              </div>
            </div>
          </div>
          {room.room?.amenities?.length > 0 && (
            <div className="flex gap-1 mt-0.5 justify-center">
              {room.room.amenities.includes('wifi') && <Wifi className="w-2 h-2 text-gray-400" />}
              {room.room.amenities.includes('coffee') && <Coffee className="w-2 h-2 text-gray-400" />}
            </div>
          )}
        </div>
        
        {/* Timeline cells */}
        <div className="flex flex-1">
          {getDatesInRange.map(date => renderRoomCell(room, date))}
        </div>
      </div>
    );
  };

  if (loading && !chartData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex overflow-x-auto" onClick={hideContextMenu}>
        {/* Collapsible Menu Sidebar */}
        <CollapsibleSidebar
          isCollapsed={isMenuCollapsed}
          onToggle={() => setIsMenuCollapsed(!isMenuCollapsed)}
          className="h-full border-r border-gray-200"
        />
        
        {/* Reservations Sidebar */}
        {showSidebar && (
          <div className="w-80 border-r border-gray-200 bg-gray-50">
            <ReservationSidebar
              onDragStart={handleDragStart}
              selectedDate={startDate}
              isCompact={compactView}
              refreshTrigger={refreshTrigger}
              className="h-full"
            />
          </div>
        )}
        
        {/* Main content */}
        <div className="flex-1 p-1 space-y-2 flex flex-col min-w-fit">
        {/* Modern Compact Header */}
        <Card className="flex-none shadow-sm">
          <CardHeader className="pb-1 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Bed className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Tape Chart</h1>
                    <p className="text-xs text-gray-500">Room assignments & availability</p>
                  </div>
                </div>
                {selectedRooms.size > 0 && (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                    {selectedRooms.size} selected
                  </Badge>
                )}
              </div>

              {/* Compact Global Search */}
              <div className="flex-1 max-w-sm mx-4">
                <GlobalSearch
                  onResultSelect={(result) => {
                    console.log('Selected:', result);
                  }}
                  placeholder="Search guests, rooms..."
                />
              </div>
            </div>

            {/* Compact Controls Row */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-3">
                {/* Batch operation controls */}
                {dragDropManager.getSelectionCount() > 1 && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded-md">
                    <Users className="w-3 h-3 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">
                      {dragDropManager.getSelectionCount()} selected
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        dragDropManager.clearSelection();
                        setRefreshTrigger(prev => prev + 1);
                      }}
                      className="h-5 px-1 text-xs text-amber-700 hover:bg-amber-100"
                    >
                      ×
                    </Button>
                  </div>
                )}

                {/* Drag operation status */}
                {dragState.isDragging && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-md border border-blue-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-700 font-medium">
                      Moving {dragState.draggedItems.length} guest{dragState.draggedItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Compact View Selector */}
                <Select value={selectedView} onValueChange={setSelectedView}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue placeholder="View" />
                  </SelectTrigger>
                  <SelectContent>
                    {views.map(view => (
                      <SelectItem key={view._id} value={view._id} className="text-xs">
                        {view.viewName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Compact Date Range */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 h-8 px-2 text-xs">
                      <CalendarIcon className="w-3 h-3" />
                      {format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="p-2 space-y-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          const newStart = subDays(startDate, 7);
                          const newEnd = subDays(endDate, 7);
                          setStartDate(newStart);
                          setEndDate(newEnd);
                        }}>
                          Previous Week
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const today = new Date();
                          setStartDate(today);
                          setEndDate(addDays(today, 7));
                        }}>
                          This Week
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const newStart = addDays(startDate, 7);
                          const newEnd = addDays(endDate, 7);
                          setStartDate(newStart);
                          setEndDate(addDays(endDate, 7));
                        }}>
                          Next Week
                        </Button>
                      </div>
                      <CalendarComponent
                        mode="range"
                        selected={dateRange}
                        onSelect={(range) => {
                          if (range?.from) setStartDate(range.from);
                          if (range?.to) setEndDate(range.to);
                          setDateRange(range || {});
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Compact Quick Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={showSidebar ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="h-8 px-2 text-xs"
                    title="Toggle reservations sidebar"
                  >
                    <Users className="w-3 h-3" />
                  </Button>

                  <Button
                    variant={compactView ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCompactView(!compactView)}
                    className="h-8 px-2 text-xs"
                    title="Toggle compact view"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="h-8 px-2 text-xs"
                    title="Show filters"
                  >
                    <Filter className="w-3 h-3" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchChartData();
                    }}
                    title="Refresh tape chart data"
                    className="h-8 px-2 text-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>

                  {/* Undo button for drag operations */}
                  {dragDropManager.canUndo() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dragDropManager.undoLastOperation()}
                      title="Undo last operation"
                      className="h-8 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </Button>
                  )}

                  {/* Block creation controls */}
                  {blockCreationMode && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-200 rounded-lg">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">
                        Block Mode: {selectedRoomsForBlock.size} room{selectedRoomsForBlock.size !== 1 ? 's' : ''} selected
                      </span>
                      {selectedRoomsForBlock.size > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateBlockFromSelection}
                          className="h-6 px-2 text-xs border-purple-300 text-purple-700 hover:bg-purple-100"
                        >
                          Create Block
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleBlockCreationMode}
                        className="h-6 px-2 text-xs text-purple-600 hover:bg-purple-100"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  
                  {/* Advanced Enterprise Features */}
                  <div className="flex items-center gap-2">
                    <ReservationWorkflowPanel />
                    <VIPGuestManager />
                    <UpgradeProcessor />
                    <SpecialRequestTracker />
                    <WaitlistProcessor />
                    <BlockManagementPanel />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowGuestNames(!showGuestNames)}>
                          <UserCheck className="w-4 h-4 mr-2" />
                          {showGuestNames ? 'Hide' : 'Show'} Guest Names
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowRates(!showRates)}>
                          <IndianRupee className="w-4 h-4 mr-2" />
                          {showRates ? 'Hide' : 'Show'} Rates
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={fetchChartData}>
                          <Zap className="w-4 h-4 mr-2" />
                          Refresh Data
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Ultra-Compact Chart Summary */}
            {chartData?.summary && (
              <div className="pt-1 space-y-1">
                {/* Ultra-compact stats row */}
                <div className="grid grid-cols-6 gap-1 text-xs">
                  <div className="bg-gray-50 rounded-md p-2 text-center">
                    <div className="text-lg font-bold text-gray-800">{chartData.summary.totalRooms}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div className="bg-red-50 rounded-md p-2 text-center">
                    <div className="text-lg font-bold text-red-800">{chartData.summary.occupiedRooms}</div>
                    <div className="text-xs text-red-600">Occupied</div>
                  </div>
                  <div className="bg-green-50 rounded-md p-2 text-center">
                    <div className="text-lg font-bold text-green-800">{chartData.summary.availableRooms}</div>
                    <div className="text-xs text-green-600">Available</div>
                  </div>
                  <div className="bg-amber-50 rounded-md p-2 text-center">
                    <div className="text-lg font-bold text-amber-800">{chartData.summary.reservedRooms}</div>
                    <div className="text-xs text-amber-600">Reserved</div>
                  </div>
                  <div className="bg-purple-50 rounded-md p-2 text-center">
                    <div className="text-lg font-bold text-purple-800">{chartData.summary.maintenanceRooms}</div>
                    <div className="text-xs text-purple-600">Maintenance</div>
                  </div>
                  <div className="bg-blue-50 rounded-md p-2 text-center">
                    <div className="text-lg font-bold text-blue-800">{chartData.summary.occupancyRate.toFixed(1)}%</div>
                    <div className="text-xs text-blue-600">Occupancy</div>
                  </div>
                </div>

                {/* Compact occupancy progress bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8">0%</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-500 ease-out"
                      style={{ width: `${chartData.summary.occupancyRate}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8">100%</span>
                  <span className="text-xs text-blue-600 font-medium ml-2">Target: 85%</span>
                </div>
              </div>
            )}
          </CardHeader>
        </Card>
        
        {/* Main chart */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
            <div className="w-full h-full overflow-auto" ref={chartRef}>
              <div className="min-w-fit">
                {/* Date header */}
                <div className="sticky top-0 z-20 bg-white border-b border-gray-300">
                  <div className="flex min-w-fit">
                  <div className="sticky left-0 z-30 bg-gray-50 border-r border-gray-300 min-w-[150px] p-2">
                    <div className="font-medium">Room</div>
                  </div>
                  {getDatesInRange.map(date => {
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const isToday = isSameDay(date, new Date());
                    
                    return (
                      <div
                        key={format(date, 'yyyy-MM-dd')}
                        className={`
                          min-w-[100px] p-1.5 border-r border-gray-200/60 text-center
                          ${isWeekend ? 'bg-gray-50/80' : 'bg-white'}
                          ${isToday ? 'bg-blue-50/80 border-blue-200' : ''}
                        `}
                      >
                        <div className={`font-medium text-xs ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                          {format(date, 'EEE')}
                        </div>
                        <div className={`text-xs ${isToday ? 'text-blue-500 font-medium' : 'text-gray-500'}`}>
                          {format(date, 'MMM dd')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
                {/* Room rows */}
                <div className="divide-y divide-gray-200">
                  {chartData?.rooms?.map((room, index) => (
                    <div key={room.room?._id || `room-${index}`}>
                      {renderRoomRow(room, index)}
                    </div>
                  ))}
                </div>

                {(!chartData?.rooms || chartData.rooms.length === 0) && (
                  <div className="p-8 text-center text-gray-500">
                    <Bed className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No room data available</p>
                    <p className="text-sm">Try selecting a different view or date range</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Enhanced Scrollable Context Menu */}
        {contextMenu.visible && (
          <div
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 min-w-[280px] max-w-[320px] backdrop-blur-sm max-h-[80vh] overflow-hidden"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 320),
              top: Math.min(contextMenu.y, window.innerHeight - Math.min(600, window.innerHeight * 0.8))
            }}
          >
            {/* Scrollable Content Container */}
            <div className="max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {/* Modern Room Header with Close Button */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Room {contextMenu.roomNumber}</h3>
                  <p className="text-xs text-gray-600 capitalize">{contextMenu.roomType} • Floor {contextMenu.floor}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      contextMenu.currentStatus === 'available' ? 'bg-green-500' :
                      contextMenu.currentStatus === 'occupied' ? 'bg-red-500' :
                      contextMenu.currentStatus === 'maintenance' ? 'bg-yellow-500' :
                      contextMenu.currentStatus === 'dirty' ? 'bg-orange-500' :
                      'bg-gray-400'
                    }`}></div>
                    <span className="text-xs font-medium text-gray-700 capitalize bg-white px-2 py-1 rounded-full border">
                      {contextMenu.currentStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <button
                    onClick={handleCloseContextMenu}
                    className="p-1 hover:bg-white hover:bg-opacity-50 rounded-full transition-colors"
                    title="Close menu"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Compact Quick Actions Section */}
            <div className="py-2 border-b border-gray-100">
              <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</div>
              <div className="space-y-1 px-2">
                <button className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:border-blue-200 rounded-lg transition-all duration-200 border border-transparent">
                  <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center mr-3">
                    <UserPlus className="h-3 w-3 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">Check In Guest</span>
                </button>
                <button className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-red-50 hover:border-red-200 rounded-lg transition-all duration-200 border border-transparent">
                  <div className="w-6 h-6 bg-red-100 rounded-md flex items-center justify-center mr-3">
                    <UserX className="h-3 w-3 text-red-600" />
                  </div>
                  <span className="text-sm text-gray-700">Check Out Guest</span>
                </button>
                <button className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-green-50 hover:border-green-200 rounded-lg transition-all duration-200 border border-transparent">
                  <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center mr-3">
                    <CalendarIcon className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">New Reservation</span>
                </button>
                <button className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-orange-50 hover:border-orange-200 rounded-lg transition-all duration-200 border border-transparent">
                  <div className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center mr-3">
                    <Copy className="h-3 w-3 text-orange-600" />
                  </div>
                  <span className="text-sm text-gray-700">Duplicate Booking</span>
                </button>
              </div>
            </div>

            {/* Modern Housekeeping Section */}
            <div className="py-2">
              <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Housekeeping</div>
              <div className="space-y-1 px-2">
                <button
                  className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-green-50 hover:border-green-200 rounded-lg transition-all duration-200 border border-transparent"
                  onClick={() => handleStatusChange(contextMenu.roomId, 'clean')}
                >
                  <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center mr-3">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">Mark Clean</span>
                </button>
                <button
                  className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-yellow-50 hover:border-yellow-200 rounded-lg transition-all duration-200 border border-transparent"
                  onClick={() => handleStatusChange(contextMenu.roomId, 'dirty')}
                >
                  <div className="w-6 h-6 bg-yellow-100 rounded-md flex items-center justify-center mr-3">
                    <AlertTriangle className="h-3 w-3 text-yellow-600" />
                  </div>
                  <span className="text-sm text-gray-700">Mark Dirty</span>
                </button>
                <button className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:border-blue-200 rounded-lg transition-all duration-200 border border-transparent">
                  <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center mr-3">
                    <Settings className="h-3 w-3 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">Inspect Required</span>
                </button>
                <button
                  className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-red-50 hover:border-red-200 rounded-lg transition-all duration-200 border border-transparent"
                  onClick={() => handleStatusChange(contextMenu.roomId, 'maintenance')}
                >
                  <div className="w-6 h-6 bg-red-100 rounded-md flex items-center justify-center mr-3">
                    <Zap className="h-3 w-3 text-red-600" />
                  </div>
                  <span className="text-sm text-gray-700">Maintenance</span>
                </button>
              </div>
            </div>

            {/* Compact Guest Services Section */}
            <div className="py-2 border-b border-gray-100">
              <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest Services</div>
              <div className="space-y-1 px-2">
                <button className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:border-blue-200 rounded-lg transition-all duration-200 border border-transparent">
                  <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center mr-3">
                    <Phone className="h-3 w-3 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">Call Guest</span>
                </button>
                <button className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-green-50 hover:border-green-200 rounded-lg transition-all duration-200 border border-transparent">
                  <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center mr-3">
                    <Mail className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">Send Message</span>
                </button>
                <button className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-orange-50 hover:border-orange-200 rounded-lg transition-all duration-200 border border-transparent">
                  <div className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center mr-3">
                    <Coffee className="h-3 w-3 text-orange-600" />
                  </div>
                  <span className="text-sm text-gray-700">Room Service</span>
                </button>
                <button className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-yellow-50 hover:border-yellow-200 rounded-lg transition-all duration-200 border border-transparent">
                  <div className="w-6 h-6 bg-yellow-100 rounded-md flex items-center justify-center mr-3">
                    <Star className="h-3 w-3 text-yellow-600" />
                  </div>
                  <span className="text-sm text-gray-700">VIP Services</span>
                </button>
              </div>
            </div>

            {/* Compact Management Section */}
            <div className="py-2">
              <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Management</div>
              <div className="space-y-1 px-2">
                <button className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-purple-50 hover:border-purple-200 rounded-lg transition-all duration-200 border border-transparent">
                  <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center mr-3">
                    <Move className="h-3 w-3 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-700">Move Guest</span>
                </button>
                <button className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-green-50 hover:border-green-200 rounded-lg transition-all duration-200 border border-transparent">
                  <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center mr-3">
                    <IndianRupee className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">Billing Details</span>
                </button>
                <button className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 hover:border-indigo-200 rounded-lg transition-all duration-200 border border-transparent">
                  <div className="w-6 h-6 bg-indigo-100 rounded-md flex items-center justify-center mr-3">
                    <Users className="h-3 w-3 text-indigo-600" />
                  </div>
                  <span className="text-sm text-gray-700">Group Management</span>
                </button>
                <button className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-red-50 hover:border-red-200 rounded-lg transition-all duration-200 border border-transparent">
                  <div className="w-6 h-6 bg-red-100 rounded-md flex items-center justify-center mr-3">
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </div>
                  <span className="text-sm text-red-600">Cancel Booking</span>
                </button>
              </div>
            </div>
            </div>
          </div>
        )}
        </div>
        
        {/* Live Chat Widget */}
        <LiveChatWidget position="bottom-right" />
        
        {/* Notification System */}
        <NotificationSystem position="top-right" soundEnabled={true} />
      </div>
    </TooltipProvider>
  );
};

export default TapeChartView;