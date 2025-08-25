import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Wifi, 
  Car, 
  Coffee, 
  Tv, 
  Wind, 
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  Star,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { Room } from '../../types/booking';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const amenityIcons: Record<string, React.ReactNode> = {
  'wifi': <Wifi className="h-5 w-5" />,
  'free wifi': <Wifi className="h-5 w-5" />,
  'parking': <Car className="h-5 w-5" />,
  'coffee machine': <Coffee className="h-5 w-5" />,
  'tv': <Tv className="h-5 w-5" />,
  'air conditioning': <Wind className="h-5 w-5" />,
};

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['room', id],
    queryFn: () => bookingService.getRoomById(id!),
    enabled: !!id,
  });

  const room: Room | undefined = data?.data?.room;

  const handleBookNow = () => {
    navigate(`/booking?roomId=${id}`);
  };

  const nextImage = () => {
    if (room?.images) {
      setCurrentImageIndex((prev) => 
        prev === room.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (room?.images) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? room.images.length - 1 : prev - 1
      );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Room Not Found</h1>
          <p className="text-gray-600 mb-6">The room you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/rooms')}>
            View All Rooms
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {room.type.charAt(0).toUpperCase() + room.type.slice(1)} Room
              </h1>
              <p className="text-gray-600">Room {room.roomNumber}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                ${room.currentRate}
              </div>
              <div className="text-sm text-gray-500">per night</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Gallery */}
          <div className="lg:col-span-2">
            <Card className="p-0 overflow-hidden">
              <div className="relative">
                {room.images && room.images.length > 0 ? (
                  <>
                    <img
                      src={room.images[currentImageIndex]}
                      alt={`Room ${room.roomNumber} - Image ${currentImageIndex + 1}`}
                      className="w-full h-96 object-cover"
                    />
                    {room.images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                          {room.images.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-3 h-3 rounded-full ${
                                index === currentImageIndex
                                  ? 'bg-white'
                                  : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                    <div className="text-gray-500 text-center">
                      <MapPin className="h-12 w-12 mx-auto mb-4" />
                      <p>No images available</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Room Details */}
            <Card className="mt-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Room Details</h2>
                  {room.description && (
                    <p className="text-gray-600 leading-relaxed mb-6">
                      {room.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-gray-400" />
                    <span>Up to {room.capacity} guests</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <span>Floor {room.floor || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <span>Base rate: ${room.baseRate}/night</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Star className="h-5 w-5 text-gray-400" />
                    <span className="capitalize">{room.type} room</span>
                  </div>
                </div>

                {/* Amenities */}
                {room.amenities && room.amenities.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Amenities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {room.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          {amenityIcons[amenity.toLowerCase()] || (
                            <Star className="h-5 w-5 text-gray-400" />
                          )}
                          <span className="text-gray-700">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  ${room.currentRate}
                </div>
                <div className="text-gray-500">per night</div>
                {room.currentRate !== room.baseRate && (
                  <div className="text-sm text-gray-400 line-through">
                    ${room.baseRate}
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center text-gray-600 mb-2">
                    <Calendar className="h-5 w-5 mr-2" />
                    Select your dates
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    Choose check-in and check-out dates to see availability
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-sm text-green-600 font-medium mb-2">
                    ✓ Free cancellation
                  </div>
                  <div className="text-sm text-green-600 font-medium">
                    ✓ Instant confirmation
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleBookNow}
                className="w-full mb-4"
                size="lg"
              >
                Book This Room
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  You won't be charged yet
                </p>
              </div>
            </Card>

            {/* Room Status */}
            <Card className="mt-6">
              <h3 className="font-semibold mb-3">Room Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Availability:</span>
                  <span className={`font-medium ${
                    room.status === 'vacant' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {room.status === 'vacant' ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Room Type:</span>
                  <span className="font-medium capitalize">{room.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Occupancy:</span>
                  <span className="font-medium">{room.capacity} guests</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}