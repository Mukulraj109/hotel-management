import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  MapPin, 
  Users, 
  Calendar,
  Phone,
  Mail,
  Heart,
  HeartOff,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { hotelServicesService, HotelService, ServiceType } from '../../services/hotelServicesService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function HotelServicesDashboard() {
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [filterFeatured, setFilterFeatured] = useState(false);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('hotelServicesFavorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: string[]) => {
    setFavorites(newFavorites);
    localStorage.setItem('hotelServicesFavorites', JSON.stringify(newFavorites));
  };

  // Toggle favorite
  const toggleFavorite = (serviceId: string) => {
    const newFavorites = favorites.includes(serviceId)
      ? favorites.filter(id => id !== serviceId)
      : [...favorites, serviceId];
    saveFavorites(newFavorites);
  };

  // Get services based on filters
  const getServicesQuery = () => {
    const params: any = {};
    if (selectedType) params.type = selectedType;
    if (searchTerm) params.search = searchTerm;
    if (filterFeatured) params.featured = true;
    return params;
  };

  // Queries
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['hotel-services', getServicesQuery()],
    queryFn: () => hotelServicesService.getServices(getServicesQuery()),
    staleTime: 5 * 60 * 1000
  });

  const { data: serviceTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['service-types'],
    queryFn: hotelServicesService.getServiceTypes,
    staleTime: 10 * 60 * 1000
  });

  const { data: featuredServices, isLoading: featuredLoading } = useQuery({
    queryKey: ['featured-services'],
    queryFn: hotelServicesService.getFeaturedServices,
    staleTime: 5 * 60 * 1000
  });

  // Filter services based on favorites if needed
  const filteredServices = services?.filter(service => 
    !filterFeatured || service.featured
  ) || [];

  const handleServiceClick = (service: HotelService) => {
    // Navigate to service detail page
    window.location.href = `/app/services/${service._id}`;
  };

  const handleBookNow = (service: HotelService) => {
    // Navigate to booking page
    window.location.href = `/app/services/${service._id}/book`;
  };

  if (servicesLoading || typesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Hotel Services
        </h1>
        <p className="text-gray-600">
          Discover and book amazing hotel services and experiences
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Service Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {serviceTypes?.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Featured Filter */}
          <Button
            variant={filterFeatured ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterFeatured(!filterFeatured)}
          >
            <Star className="h-4 w-4 mr-2" />
            Featured Only
          </Button>

          {/* Clear Filters */}
          {(selectedType || searchTerm || filterFeatured) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedType('');
                setSearchTerm('');
                setFilterFeatured(false);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Featured Services Section */}
      {!selectedType && !searchTerm && !filterFeatured && featuredServices && featuredServices.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Featured Services
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredServices.slice(0, 3).map((service) => (
              <ServiceCard
                key={service._id}
                service={service}
                isFavorite={favorites.includes(service._id)}
                onToggleFavorite={toggleFavorite}
                onClick={() => handleServiceClick(service)}
                onBookNow={() => handleBookNow(service)}
                featured
              />
            ))}
          </div>
        </div>
      )}

      {/* All Services */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            {filterFeatured ? 'Featured Services' : 'All Services'}
          </h2>
          <p className="text-gray-600">
            {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg mb-2">No services found</p>
            <p className="text-gray-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service._id}
                service={service}
                isFavorite={favorites.includes(service._id)}
                onToggleFavorite={toggleFavorite}
                onClick={() => handleServiceClick(service)}
                onBookNow={() => handleBookNow(service)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ServiceCardProps {
  service: HotelService;
  isFavorite: boolean;
  onToggleFavorite: (serviceId: string) => void;
  onClick: () => void;
  onBookNow: () => void;
  featured?: boolean;
}

function ServiceCard({ 
  service, 
  isFavorite, 
  onToggleFavorite, 
  onClick, 
  onBookNow, 
  featured = false 
}: ServiceCardProps) {
  const typeInfo = hotelServicesService.getServiceTypeInfo(service.type);

  return (
    <Card className={`p-6 hover:shadow-lg transition-shadow cursor-pointer ${featured ? 'ring-2 ring-blue-200' : ''}`}>
      {/* Service Image */}
      <div className="relative mb-4">
        <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
          {service.images && service.images.length > 0 ? (
            <img
              src={service.images[0]}
              alt={service.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-4xl">{typeInfo.icon}</span>
            </div>
          )}
        </div>
        
        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(service._id);
          }}
          className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
        >
          {isFavorite ? (
            <Heart className="h-5 w-5 text-red-500 fill-current" />
          ) : (
            <HeartOff className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-2 left-2">
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              Featured
            </span>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute bottom-2 left-2">
          <span className={`text-xs px-2 py-1 rounded-full ${typeInfo.color}`}>
            {typeInfo.icon} {typeInfo.label}
          </span>
        </div>
      </div>

      {/* Service Info */}
      <div onClick={onClick}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {service.name}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {service.description}
        </p>

        {/* Service Details */}
        <div className="space-y-2 mb-4">
          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-blue-600">
              {hotelServicesService.formatPrice(service.price, service.currency)}
            </span>
            {service.duration && (
              <span className="text-sm text-gray-500">
                {hotelServicesService.formatDuration(service.duration)}
              </span>
            )}
          </div>

          {/* Rating */}
          {service.rating.count > 0 && (
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm text-gray-600">
                {service.rating.average.toFixed(1)} ({service.rating.count} reviews)
              </span>
            </div>
          )}

          {/* Location */}
          {service.location && (
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              <span>{service.location}</span>
            </div>
          )}

          {/* Operating Hours */}
          {service.operatingHours && (
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{hotelServicesService.formatOperatingHours(service.operatingHours)}</span>
            </div>
          )}

          {/* Capacity */}
          {service.capacity && (
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>Up to {service.capacity} people</span>
            </div>
          )}
        </div>

        {/* Amenities */}
        {service.amenities && service.amenities.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {service.amenities.slice(0, 3).map((amenity, index) => (
                <span
                  key={index}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                >
                  {amenity}
                </span>
              ))}
              {service.amenities.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{service.amenities.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onClick}
        >
          View Details
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onBookNow();
          }}
        >
          <Calendar className="h-4 w-4 mr-1" />
          Book Now
        </Button>
      </div>
    </Card>
  );
}
