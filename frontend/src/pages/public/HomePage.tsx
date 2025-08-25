import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Wifi, Car, Coffee, Utensils, Waves, Dumbbell, Shield } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function HomePage() {
  const amenities = [
    { icon: Wifi, name: 'Free WiFi' },
    { icon: Car, name: 'Parking' },
    { icon: Coffee, name: 'Coffee Bar' },
    { icon: Utensils, name: 'Restaurant' },
    { icon: Waves, name: 'Swimming Pool' },
    { icon: Dumbbell, name: 'Fitness Center' },
    { icon: Shield, name: '24/7 Security' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-gray-900"
          style={{
            backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg)',
          }}
        />
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Welcome to Grand Palace Hotel
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-200">
            Experience luxury and comfort in the heart of the city
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/rooms">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Book Now
              </Button>
            </Link>
            <Link to="/rooms">
              <Button variant="secondary" size="lg" className="bg-white/20 backdrop-blur text-white hover:bg-white/30">
                View Rooms
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Grand Palace?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We offer world-class amenities and exceptional service to make your stay unforgettable
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">5-Star Service</h3>
              <p className="text-gray-600">
                Our dedicated staff provides exceptional service 24/7 to ensure your comfort
              </p>
            </div>
            
            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Safe & Secure</h3>
              <p className="text-gray-600">
                Your safety is our priority with advanced security systems and protocols
              </p>
            </div>
            
            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Waves className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Premium Amenities</h3>
              <p className="text-gray-600">
                Enjoy our pool, fitness center, spa, and fine dining restaurant
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Hotel Amenities
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need for a perfect stay
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-8">
            {amenities.map((amenity, index) => (
              <div key={index} className="text-center">
                <div className="h-16 w-16 bg-white rounded-full shadow-md flex items-center justify-center mx-auto mb-3">
                  <amenity.icon className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-700">{amenity.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Experience Luxury?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Book your stay today and enjoy our special rates
          </p>
          <Link to="/rooms">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Book Your Stay
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}