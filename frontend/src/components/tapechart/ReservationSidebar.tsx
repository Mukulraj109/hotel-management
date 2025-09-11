import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import DraggableReservation from './DraggableReservation';
import { Search, Filter, Users, Clock, Star } from 'lucide-react';
import { cn } from '@/utils/cn';
import { bookingService } from '@/services/bookingService';
import { format } from 'date-fns';

interface Reservation {
  id: string;
  _id: string; // MongoDB ObjectId
  bookingNumber: string;
  guestName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'checked_in' | 'checked_out' | 'no_show';
  vipStatus?: 'none' | 'vip' | 'svip' | 'corporate';
  rate?: number;
  specialRequests?: string[];
  nights: number;
  adults: number;
  children: number;
  assignedRoom?: string;
  priority?: 'high' | 'medium' | 'low';
  arrivalTime?: string;
  phoneNumber?: string;
  email?: string;
  companyName?: string;
  totalAmount: number;
  paymentStatus: string;
  source?: string;
}

interface ReservationSidebarProps {
  onDragStart: (e: React.DragEvent, reservation: any) => void;
  selectedDate: Date;
  isCompact?: boolean;
  className?: string;
}

const ReservationSidebar: React.FC<ReservationSidebarProps> = ({
  onDragStart,
  selectedDate,
  isCompact = false,
  className
}) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [showAssigned, setShowAssigned] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch real booking data from the database
  useEffect(() => {
    fetchReservations();
  }, [selectedDate]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      
      // Get bookings for the selected date range (check-ins and current stays)
      const startDate = format(selectedDate, 'yyyy-MM-dd');
      const endDatePlusWeek = format(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      
      const response = await bookingService.getBookings({
        // Get bookings that are checking in today or are currently staying
        page: 1,
        limit: 100 // Get more bookings for the sidebar
      });
      
      if (response.status === 'success' && response.data && Array.isArray(response.data)) {
        const bookings = response.data;
        
        // Transform booking data to match Reservation interface
        const transformedReservations: Reservation[] = bookings.map((booking: any) => {
          // Determine priority based on booking characteristics
          let priority: 'high' | 'medium' | 'low' = 'medium';
          if (booking.guestDetails?.adults > 3 || booking.totalAmount > 20000) {
            priority = 'high';
          } else if (booking.totalAmount < 5000) {
            priority = 'low';
          }
          
          // Determine VIP status based on total amount or corporate booking
          let vipStatus: 'none' | 'vip' | 'svip' | 'corporate' = 'none';
          if (booking.corporateBooking?.corporateCompanyId) {
            vipStatus = 'corporate';
          } else if (booking.totalAmount > 25000) {
            vipStatus = 'svip';
          } else if (booking.totalAmount > 15000) {
            vipStatus = 'vip';
          }
          
          return {
            id: booking._id,
            _id: booking._id,
            bookingNumber: booking.bookingNumber,
            guestName: booking.userId?.name || 'Unknown Guest',
            roomType: booking.roomType || booking.rooms?.[0]?.roomId?.type || 'Unknown',
            checkIn: format(new Date(booking.checkIn), 'yyyy-MM-dd'),
            checkOut: format(new Date(booking.checkOut), 'yyyy-MM-dd'),
            status: booking.status,
            vipStatus,
            rate: booking.rooms?.[0]?.rate || 0,
            specialRequests: booking.guestDetails?.specialRequests ? [booking.guestDetails.specialRequests] : [],
            nights: booking.nights,
            adults: booking.guestDetails?.adults || 1,
            children: booking.guestDetails?.children || 0,
            assignedRoom: booking.rooms?.[0]?.roomId?.roomNumber,
            priority,
            phoneNumber: booking.userId?.phone,
            email: booking.userId?.email,
            companyName: booking.corporateBooking?.corporateCompanyId?.name,
            totalAmount: booking.totalAmount,
            paymentStatus: booking.paymentStatus,
            source: booking.source
          };
        });
        
        setReservations(transformedReservations);
      } else {
        console.warn('ReservationSidebar: Unexpected API response structure:', response);
        setReservations([]);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      // Fall back to empty array instead of mock data
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter reservations based on search and filters
  useEffect(() => {
    let filtered = reservations;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(res => 
        res.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.roomType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.phoneNumber?.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(res => res.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(res => res.priority === priorityFilter);
    }

    // Room type filter
    if (roomTypeFilter !== 'all') {
      filtered = filtered.filter(res => res.roomType === roomTypeFilter);
    }

    // Assigned/unassigned filter
    if (!showAssigned) {
      filtered = filtered.filter(res => !res.assignedRoom);
    }

    setFilteredReservations(filtered);
  }, [reservations, searchTerm, statusFilter, priorityFilter, roomTypeFilter, showAssigned]);

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'high': return <Star className="w-3 h-3 text-red-500" />;
      case 'medium': return <Clock className="w-3 h-3 text-yellow-500" />;
      case 'low': return <Users className="w-3 h-3 text-green-500" />;
      default: return null;
    }
  };

  const getStatusCount = (status: string) => {
    return reservations.filter(res => status === 'all' || res.status === status).length;
  };

  const unassignedCount = reservations.filter(res => !res.assignedRoom).length;
  const assignedCount = reservations.filter(res => res.assignedRoom).length;

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className={cn('pb-3', isCompact && 'p-3')}>
        <CardTitle className={cn(
          'flex items-center justify-between',
          isCompact ? 'text-sm' : 'text-base'
        )}>
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Reservations
          </span>
          <Badge variant="outline">
            {filteredReservations.length}/{reservations.length}
          </Badge>
        </CardTitle>
        
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="font-medium text-red-700">{unassignedCount}</div>
            <div className="text-red-600">Unassigned</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-medium text-green-700">{assignedCount}</div>
            <div className="text-green-600">Assigned</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={cn('flex-1 flex flex-col gap-3 overflow-hidden', isCompact && 'p-3 pt-0')}>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search reservations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn('pl-8', isCompact && 'text-sm h-8')}
          />
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={isCompact ? 'text-xs h-8' : 'text-sm'}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status ({getStatusCount('all')})</SelectItem>
              <SelectItem value="confirmed">Confirmed ({getStatusCount('confirmed')})</SelectItem>
              <SelectItem value="pending">Pending ({getStatusCount('pending')})</SelectItem>
              <SelectItem value="checked_in">Checked In ({getStatusCount('checked_in')})</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className={isCompact ? 'text-xs h-8' : 'text-sm'}>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center justify-between">
          <Button
            variant={showAssigned ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAssigned(!showAssigned)}
            className={isCompact ? 'text-xs h-7' : 'text-sm'}
          >
            Show Assigned
          </Button>
          
          <Button variant="outline" size="sm" className={isCompact ? 'text-xs h-7' : 'text-sm'}>
            <Filter className="w-3 h-3 mr-1" />
            More Filters
          </Button>
        </div>
        
        {/* Reservations list */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded-md"></div>
                    </div>
                  ))}
                </div>
              ) : filteredReservations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className={isCompact ? 'text-xs' : 'text-sm'}>No reservations found</p>
                  <p className={cn('text-gray-400', isCompact ? 'text-xs' : 'text-xs')}>Try adjusting your filters</p>
                </div>
              ) : (
                filteredReservations.map(reservation => (
                  <div key={reservation.id} className="relative">
                    <DraggableReservation
                      reservation={reservation}
                      onDragStart={onDragStart}
                      isCompact={isCompact}
                    />
                    
                    {/* Priority indicator */}
                    {reservation.priority && (
                      <div className="absolute top-1 right-1">
                        {getPriorityIcon(reservation.priority)}
                      </div>
                    )}
                    
                    {/* Assigned room badge */}
                    {reservation.assignedRoom && (
                      <div className="absolute bottom-1 right-1">
                        <Badge variant="secondary" className="text-xs">
                          Room {reservation.assignedRoom}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReservationSidebar;