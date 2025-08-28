import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Wifi, Car, Coffee, Utensils, Waves, Dumbbell, Shield, MapPin, Award, Heart, Sparkles, Phone, Mail, Facebook, Twitter, Instagram, Youtube, MapIcon } from 'lucide-react';
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
        <div className="relative z-10 text-center text-white max-w-5xl mx-auto px-4">
          <div className="mb-4">
            <Sparkles className="h-8 w-8 text-yellow-400 mx-auto animate-pulse" />
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-white via-blue-100 to-yellow-200 bg-clip-text text-transparent leading-tight">
            Welcome to <span className="text-yellow-400">THE PENTOUZ</span>
          </h1>
          <p className="text-xl md:text-3xl mb-4 text-gray-100 font-light">
            Where luxury meets exclusivity
          </p>
          <p className="text-lg md:text-xl mb-10 text-gray-300 max-w-2xl mx-auto">
            The ultimate experience of luxury & sophistication
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link to="/rooms">
              <Button size="lg" className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-semibold px-8 py-4 transform hover:scale-105 transition-all duration-300 shadow-xl">
                Book Now
              </Button>
            </Link>
            <Link to="/rooms">
              <Button variant="secondary" size="lg" className="bg-white/10 backdrop-blur-md border border-white/30 text-white hover:bg-white/20 px-8 py-4 transform hover:scale-105 transition-all duration-300 shadow-xl">
                View Rooms
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 via-white to-blue-50 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-500 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full mb-6">
              <Award className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent mb-6">
              Why Choose The Pentouz?
            </h2>
            <div className="max-w-4xl mx-auto">
              <p className="text-lg text-gray-600 mb-6">
                The Pentouz offers a perfect blend of urban excitement and serene escapades, 
                creating unforgettable experiences across stunning locations.
              </p>
              
              <div className="grid md:grid-cols-2 gap-10 text-left">
                <div className="group relative bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-100">
                  <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-bold text-2xl text-gray-800 mb-4 group-hover:text-blue-700 transition-colors">Urban Luxury</h4>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    In the vibrant hubs of UB City and Indiranagar, Bangalore, indulge in world-class dining, 
                    high-end shopping, and buzzing nightlife. Explore art galleries, attend cultural events, 
                    or unwind at chic rooftop lounges with stunning city views.
                  </p>
                </div>
                
                <div className="group relative bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-green-100">
                  <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-bold text-2xl text-gray-800 mb-4 group-hover:text-green-700 transition-colors">Serene Retreat</h4>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    Escape to Ooty, where lush tea gardens, misty hills, and tranquil lakes await. 
                    Enjoy scenic drives, nature trails, and cozy stays in charming cottages 
                    surrounded by nature's beauty.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-16">
            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 border border-gray-100">
              <div className="h-20 w-20 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Star className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-yellow-600 transition-colors">5-Star Service</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Our dedicated staff provides exceptional service 24/7 to ensure your comfort
              </p>
            </div>
            
            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 border border-gray-100">
              <div className="h-20 w-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-green-600 transition-colors">Safe & Secure</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Your safety is our priority with advanced security systems and protocols
              </p>
            </div>
            
            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 border border-gray-100">
              <div className="h-20 w-20 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Waves className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-purple-600 transition-colors">Premium Amenities</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Enjoy our pool, fitness center, spa, and fine dining restaurant
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities Section */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-100 relative">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full mb-6">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-gray-900 bg-clip-text text-transparent mb-6">
              Hotel Amenities
            </h2>
            <p className="text-2xl text-gray-600 font-light">
              Everything you need for a perfect stay
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-10">
            {amenities.map((amenity, index) => (
              <div key={index} className="group text-center transform hover:scale-105 transition-all duration-300">
                <div className="h-20 w-20 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-xl flex items-center justify-center mx-auto mb-4 border border-gray-100 group-hover:border-blue-200 transition-all duration-300">
                  <amenity.icon className="h-8 w-8 text-blue-600 group-hover:text-blue-700 transition-colors" />
                </div>
                <p className="text-base font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">{amenity.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-24 bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full mb-6">
              <Star className="h-8 w-8 text-white fill-current" />
            </div>
            <h2 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent mb-6">
              Guest Reviews & Feedback
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See what our guests are saying about their unforgettable experiences at The Pentouz
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {/* Sample reviews with Indian content */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-600">5.0</span>
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed">
                "Amazing experience! Our stay at The Pentouz was truly memorable. The staff behavior and service was outstanding."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  P
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">Priya Sharma</p>
                  <p className="text-sm text-gray-600">Family Vacation</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-600">5.0</span>
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed">
                "Exceptional service and luxurious amenities! Rajesh's welcome and assistance was unforgettable. Perfect for business trips."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                  A
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">Arjun Patel</p>
                  <p className="text-sm text-gray-600">Business Travel</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400 mb-2">
                  {[...Array(4)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                  <Star className="h-5 w-5 text-gray-300" />
                </div>
                <span className="ml-2 text-sm text-gray-600">4.8</span>
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed">
                "Perfect place for our honeymoon trip! Romantic ambiance and beautiful rooms. Pool and spa facilities are amazing."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                  S
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">Sunita & Amit</p>
                  <p className="text-sm text-gray-600">Honeymoon</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100 mb-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">4.9</div>
                  <div className="text-sm text-gray-600">Overall Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">2,847</div>
                  <div className="text-sm text-gray-600">Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">98%</div>
                  <div className="text-sm text-gray-600">Recommend</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">4.8</div>
                  <div className="text-sm text-gray-600">Service</div>
                </div>
              </div>
            </div>
            
            <Link to="/reviews">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold px-8 py-4 transform hover:scale-105 transition-all duration-300 shadow-xl">
                View All Reviews
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-72 h-72 bg-yellow-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full mb-6">
              <Phone className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-5xl font-bold text-white mb-6">
              Contact <span className="text-yellow-400">The Pentouz</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Reach out to us for reservations, inquiries, or to plan your perfect stay
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Contact Information */}
            <div className="space-y-8">
              {/* Corporate Office */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-4">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Corporate Office</h3>
                </div>
                <div className="space-y-4 text-gray-300">
                  <p className="text-lg leading-relaxed">
                    46, 6th Cross, Lavelle Road<br />
                    Bangalore - 560001, India
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <a href="tel:+918884449930" className="text-white hover:text-yellow-400 transition-colors font-medium">
                        +91 8884449930
                      </a>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <a href="tel:+918970298300" className="text-white hover:text-yellow-400 transition-colors font-medium">
                        +91 8970298300
                      </a>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <a href="mailto:sales@pentouz.com" className="text-white hover:text-yellow-400 transition-colors font-medium">
                        sales@pentouz.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-4">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Stay Connected</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <a href="#" className="group flex flex-col items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                    <Facebook className="h-6 w-6 text-blue-400 group-hover:text-blue-300 mb-2" />
                    <span className="text-sm text-gray-300 group-hover:text-white">Facebook</span>
                  </a>
                  <a href="#" className="group flex flex-col items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                    <Twitter className="h-6 w-6 text-sky-400 group-hover:text-sky-300 mb-2" />
                    <span className="text-sm text-gray-300 group-hover:text-white">Twitter</span>
                  </a>
                  <a href="#" className="group flex flex-col items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                    <MapIcon className="h-6 w-6 text-red-400 group-hover:text-red-300 mb-2" />
                    <span className="text-sm text-gray-300 group-hover:text-white">Pinterest</span>
                  </a>
                  <a href="#" className="group flex flex-col items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                    <Youtube className="h-6 w-6 text-red-500 group-hover:text-red-400 mb-2" />
                    <span className="text-sm text-gray-300 group-hover:text-white">YouTube</span>
                  </a>
                  <a href="#" className="group flex flex-col items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                    <Instagram className="h-6 w-6 text-pink-400 group-hover:text-pink-300 mb-2" />
                    <span className="text-sm text-gray-300 group-hover:text-white">Instagram</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Send us a Message</h3>
                <p className="text-gray-300">We'll get back to you within 24 hours</p>
              </div>
              
              <div className="text-center">
                <p className="text-gray-300 mb-4">
                  Ready to make your reservation or have questions?
                </p>
                <Link to="/contact">
                  <Button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-semibold py-3 transform hover:scale-105 transition-all duration-300 shadow-xl">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-white/10 text-center">
            <p className="text-gray-400">
              © THE PENTOUZ HOTELS & RESORTS ALL RIGHTS RESERVED, 2024
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-700 relative overflow-hidden">
        {/* Background patterns */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-white/10 to-transparent"></div>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full"></div>
        </div>
        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              <Sparkles className="h-10 w-10 text-yellow-300 animate-pulse" />
            </div>
          </div>
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-8 leading-tight">
            Ready to Experience <span className="text-yellow-300">Luxury?</span>
          </h2>
          <div className="max-w-3xl mx-auto mb-8">
            <p className="text-lg text-blue-100 mb-4 leading-relaxed">
              Each room and suite is thoughtfully designed with timeless decor and modern comforts, 
              creating a tranquil retreat in the heart of vibrant urban settings.
            </p>
            <p className="text-lg text-blue-100 mb-4 leading-relaxed">
              Whether for business or leisure, our spaces promise sophistication and serenity. 
              What sets us apart is our commitment to personalized service.
            </p>
            <p className="text-lg text-blue-100 font-medium">
              At The Pentouz, every detail is tailored to ensure your stay is nothing short of exceptional.
            </p>
          </div>
          <Link to="/rooms">
            <Button size="lg" className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold px-12 py-4 text-xl transform hover:scale-105 transition-all duration-300 shadow-2xl">
              Book Your Stay
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}