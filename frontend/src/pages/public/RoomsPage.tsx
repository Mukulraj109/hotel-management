import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, Users, Wifi, Tv, Coffee, Car } from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { Room } from '../../types/booking';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function RoomsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    roomType: searchParams.get('type') || '',
    adults: parseInt(searchParams.get('adults') || '2'),
    children: parseInt(searchParams.get('children') || '0'),
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await bookingService.getRooms(filters);
      setRooms(response.data.rooms);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    // Update URL params
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value.toString());
    });
    setSearchParams(params);
    
    // Fetch rooms with new filters
    fetchRooms();
  };

  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case 'single': return '🛏️';
      case 'double': return '🛏️🛏️';
      case 'suite': return '🏨';
      case 'deluxe': return '✨';
      default: return '🛏️';
    }
  };

  const amenityIcons: Record<string, any> = {
    'WiFi': Wifi,
    'TV': Tv,
    'Coffee': Coffee,
    'Parking': Car,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Available Rooms</h1>
          
          {/* Search Filters */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Input
                type="date"
                label="Check-in"
                value={filters.checkIn}
                onChange={(e) => handleFilterChange('checkIn', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <Input
                type="date"
                label="Check-out"
                value={filters.checkOut}
                onChange={(e) => handleFilterChange('checkOut', e.target.value)}
                min={filters.checkIn || new Date().toISOString().split('T')[0]}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                <select
                  value={filters.roomType}
                  onChange={(e) => handleFilterChange('roomType', e.target.value)}
                  className="input-field"
                >
                  <option value="">All Types</option>
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="suite">Suite</option>
                  <option value="deluxe">Deluxe</option>
                </select>
              </div>
              <Input
                type="number"
                label="Adults"
                value={filters.adults}
                onChange={(e) => handleFilterChange('adults', parseInt(e.target.value))}
                min="1"
                max="10"
              />
              <div className="flex items-end">
                <Button onClick={handleSearch} className="w-full">
                  Search Rooms
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {rooms.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No rooms available</h2>
            <p className="text-gray-600">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {rooms.map((room) => (
              <div key={room._id} className="room-card bg-white rounded-lg shadow-md overflow-hidden">
                <div className="aspect-w-16 aspect-h-10">
                  <img
                    src={room.images[0] || 'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg'}
                    alt={`${room.type} room`}
                    className="w-full h-48 object-cover"
                  />
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 capitalize">
                      {getRoomTypeIcon(room.type)} {room.type} Room
                    </h3>
                    <span className="text-sm text-gray-500">#{room.roomNumber}</span>
                  </div>
                  
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {room.description || `Comfortable ${room.type} room with modern amenities`}
                  </p>
                  
                  {/* Amenities */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {room.amenities.slice(0, 4).map((amenity, index) => {
                      const IconComponent = amenityIcons[amenity];
                      return (
                        <div key={index} className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {IconComponent && <IconComponent className="h-3 w-3" />}
                          <span>{amenity}</span>
                        </div>
                      );
                    })}
                    {room.amenities.length > 4 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        +{room.amenities.length - 4} more
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">
                        {formatCurrency(room.currentRate)}
                      </span>
                      <span className="text-gray-500 text-sm">/night</span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Link to={`/rooms/${room._id}`}>
                        <Button variant="secondary" size="sm">
                          View Details
                        </Button>
                      </Link>
                      <Link 
                        to={`/booking?roomId=${room._id}&checkIn=${filters.checkIn}&checkOut=${filters.checkOut}`}
                      >
                        <Button size="sm">
                          Book Now
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}