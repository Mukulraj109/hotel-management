import React from 'react';
import { cn } from '@/utils/cn';
import { Star, Crown, Coffee, Bell, User, Calendar } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';

interface DraggableReservationProps {
  reservation: {
    id: string;
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
  };
  onDragStart: (e: React.DragEvent, reservation: any) => void;
  isCompact?: boolean;
}

const DraggableReservation: React.FC<DraggableReservationProps> = ({
  reservation,
  onDragStart,
  isCompact = false
}) => {
  const getAssignmentColor = (assignedRoom?: string): string => {
    if (assignedRoom) {
      // Assigned bookings - green theme
      return 'bg-green-100 text-green-800 border-green-200';
    } else {
      // Unassigned bookings - red theme  
      return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      checked_in: 'bg-blue-100 text-blue-800 border-blue-200',
      checked_out: 'bg-gray-100 text-gray-800 border-gray-200',
      no_show: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[status as keyof typeof colors] || colors.confirmed;
  };

  const getVipIcon = (vipStatus?: string) => {
    switch (vipStatus) {
      case 'vip': return <Star className="w-3 h-3 text-yellow-500" />;
      case 'svip': return <Crown className="w-3 h-3 text-purple-500" />;
      case 'corporate': return <Coffee className="w-3 h-3 text-blue-500" />;
      default: return null;
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, reservation)}
      className={cn(
        'relative rounded-md border-2 border-dashed border-gray-300 p-3 cursor-move group',
        'hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all duration-200',
        'bg-white shadow-sm transform hover:scale-[1.02]',
        getAssignmentColor(reservation.assignedRoom),
        isCompact && 'p-2'
      )}
      title={`Drag to assign ${reservation.guestName} to a room`}
    >
      {/* Drag handle indicator */}
      <div className="absolute top-1 left-1">
        <div className="flex flex-col gap-0.5">
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        </div>
      </div>

      <div className="ml-4">
        {/* Guest name with VIP status */}
        <div className="flex items-center gap-2 mb-1">
          {getVipIcon(reservation.vipStatus)}
          <span className={cn(
            'font-medium truncate',
            isCompact ? 'text-xs' : 'text-sm'
          )}>
            {reservation.guestName}
          </span>
        </div>

        {/* Room type */}
        <div className={cn(
          'text-gray-600 mb-1',
          isCompact ? 'text-xs' : 'text-sm'
        )}>
          {reservation.roomType}
        </div>

        {/* Check-in/out dates */}
        <div className={cn(
          'flex items-center gap-1 mb-1 text-gray-500',
          isCompact ? 'text-xs' : 'text-sm'
        )}>
          <Calendar className="w-3 h-3" />
          <span>{reservation.checkIn} - {reservation.checkOut}</span>
        </div>

        {/* Additional info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <User className="w-3 h-3" />
            <span>{reservation.adults}A{reservation.children > 0 ? `, ${reservation.children}C` : ''}</span>
            <span>•</span>
            <span>{reservation.nights}N</span>
          </div>
          
          {reservation.rate && (
            <div className="text-xs font-medium text-gray-700">
              {formatCurrency(reservation.rate)}
            </div>
          )}
        </div>

        {/* Special requests indicator */}
        {reservation.specialRequests && reservation.specialRequests.length > 0 && (
          <div className="absolute top-2 right-2">
            <Bell className="w-3 h-3 text-orange-500" />
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="absolute top-2 right-2">
        <span className={cn(
          'px-1.5 py-0.5 rounded-full text-xs font-medium uppercase',
          reservation.assignedRoom ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        )}>
          {reservation.assignedRoom ? 'ASSIGNED' : 'UNASSIGNED'}
        </span>
      </div>
    </div>
  );
};

export default DraggableReservation;