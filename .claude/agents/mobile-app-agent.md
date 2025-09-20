# Mobile App Agent

## Purpose
This specialized agent creates mobile-first components, implements mobile-specific features, and optimizes the hotel management system for mobile devices. It focuses on responsive design, touch interactions, mobile performance, and mobile-specific hotel operations like housekeeping, maintenance, and guest services.

## When to Use This Agent
- Converting desktop components to mobile-responsive versions
- Creating mobile-specific hotel operations interfaces
- Implementing touch gestures and mobile interactions
- Optimizing mobile performance and loading
- Creating mobile-first staff workflows
- Building Progressive Web App (PWA) features
- Mobile push notifications setup
- Offline functionality implementation

## Agent Capabilities

### 1. Mobile-First Component Creation
- **Responsive Design**: Creates components that work seamlessly across mobile devices
- **Touch Interactions**: Implements swipe, pinch, drag, and touch gestures
- **Mobile Navigation**: Bottom navigation, slide-out menus, mobile-optimized layouts
- **Form Optimization**: Mobile-friendly forms with proper input types and validation

### 2. Hotel Staff Mobile Workflows
- **Housekeeping Mobile**: Touch-friendly daily check interfaces for room cleaning staff
- **Maintenance Mobile**: Mobile maintenance request handling and completion
- **Front Desk Mobile**: Mobile check-in/check-out processes
- **Restaurant/POS Mobile**: Mobile ordering and payment processing

### 3. Guest Mobile Experience
- **Mobile Booking**: Optimized booking flow for mobile devices
- **Digital Key**: Mobile-first digital key interface
- **Mobile Concierge**: Touch-optimized guest service requests
- **Mobile Room Service**: Easy-to-use room service ordering

### 4. Mobile Performance & PWA
- **Progressive Web App**: Service workers, offline functionality, app-like experience
- **Mobile Performance**: Optimized loading, image compression, lazy loading
- **Push Notifications**: Mobile push notification system
- **Offline Support**: Critical features available without internet connection

## Usage Examples

### Mobile-Responsive Daily Check Interface

**Query**: "Create a mobile-optimized daily check interface for housekeeping staff"

**Agent Response**:
```typescript
// MobileDailyCheck.tsx
import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { CheckCircle, XCircle, Camera } from 'lucide-react';

interface MobileDailyCheckProps {
  roomId: string;
  checkItems: CheckItem[];
  onComplete: (results: CheckResult[]) => void;
}

const MobileDailyCheck: React.FC<MobileDailyCheckProps> = ({
  roomId,
  checkItems,
  onComplete
}) => {
  const [currentItem, setCurrentItem] = useState(0);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);

  const handleItemCheck = (itemId: string, status: 'ok' | 'issue', notes?: string, photo?: string) => {
    const newResult: CheckResult = {
      itemId,
      status,
      notes,
      photo,
      timestamp: new Date(),
      staffId: user.id
    };

    setResults(prev => [...prev.filter(r => r.itemId !== itemId), newResult]);
  };

  const takePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Create canvas to capture photo
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx?.drawImage(video, 0, 0);

      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhotos(prev => [...prev, photoDataUrl]);

      stream.getTracks().forEach(track => track.stop());
      return photoDataUrl;
    } catch (error) {
      console.error('Error taking photo:', error);
      return null;
    }
  };

  return (
    <div className="mobile-daily-check min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-semibold">Room {roomId} Check</h1>
        <div className="text-sm">
          {currentItem + 1} of {checkItems.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-200 h-2">
        <div
          className="bg-blue-600 h-2 transition-all duration-300"
          style={{ width: `${((currentItem + 1) / checkItems.length) * 100}%` }}
        />
      </div>

      {/* Check Items Swiper */}
      <Swiper
        spaceBetween={0}
        slidesPerView={1}
        onSlideChange={(swiper) => setCurrentItem(swiper.activeIndex)}
        className="h-full"
      >
        {checkItems.map((item, index) => (
          <SwiperSlide key={item.id}>
            <div className="p-6">
              {/* Item Details */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">{item.name}</h2>
                <p className="text-gray-600 mb-4">{item.description}</p>

                {/* Reference Image */}
                {item.referenceImage && (
                  <img
                    src={item.referenceImage}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {/* OK Button */}
                <button
                  onClick={() => handleItemCheck(item.id, 'ok')}
                  className="w-full flex items-center justify-center gap-3 bg-green-600 text-white py-4 rounded-xl text-lg font-medium touch-manipulation"
                >
                  <CheckCircle size={24} />
                  Mark as Complete
                </button>

                {/* Issue Button */}
                <button
                  onClick={() => {
                    // Open issue reporting modal
                    setShowIssueModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-red-600 text-white py-4 rounded-xl text-lg font-medium touch-manipulation"
                >
                  <XCircle size={24} />
                  Report Issue
                </button>

                {/* Photo Button */}
                <button
                  onClick={takePhoto}
                  className="w-full flex items-center justify-center gap-3 bg-gray-600 text-white py-4 rounded-xl text-lg font-medium touch-manipulation"
                >
                  <Camera size={24} />
                  Take Photo
                </button>
              </div>

              {/* Notes Section */}
              <div className="mt-6">
                <textarea
                  placeholder="Add notes (optional)"
                  className="w-full h-24 p-4 border rounded-lg text-base resize-none"
                  value={itemNotes[item.id] || ''}
                  onChange={(e) => setItemNotes(prev => ({
                    ...prev,
                    [item.id]: e.target.value
                  }))}
                />
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-4">
        <button
          onClick={() => setCurrentItem(Math.max(0, currentItem - 1))}
          disabled={currentItem === 0}
          className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50"
        >
          Previous
        </button>

        {currentItem === checkItems.length - 1 ? (
          <button
            onClick={() => onComplete(results)}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium"
          >
            Complete Check
          </button>
        ) : (
          <button
            onClick={() => setCurrentItem(Math.min(checkItems.length - 1, currentItem + 1))}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileDailyCheck;
```

### Mobile Booking Flow

**Query**: "Create a mobile-optimized booking flow with touch gestures"

**Agent Response**:
```typescript
// MobileBookingFlow.tsx
import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { ChevronLeft, ChevronRight, Calendar, Users, Bed } from 'lucide-react';

const MobileBookingFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    roomType: '',
    preferences: []
  });

  const steps = [
    { id: 'dates', title: 'Select Dates', icon: Calendar },
    { id: 'guests', title: 'Guests', icon: Users },
    { id: 'rooms', title: 'Choose Room', icon: Bed },
    { id: 'details', title: 'Details', icon: null },
    { id: 'payment', title: 'Payment', icon: null }
  ];

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => nextStep(),
    onSwipedRight: () => previousStep(),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="mobile-booking-flow min-h-screen bg-gray-50" {...swipeHandlers}>
      {/* Mobile Header with Progress */}
      <div className="bg-blue-600 text-white sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <button onClick={previousStep} className="p-2">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-semibold">{steps[currentStep].title}</h1>
          <div className="text-sm">
            {currentStep + 1}/{steps.length}
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="flex bg-blue-700">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 h-1 ${
                index <= currentStep ? 'bg-white' : 'bg-blue-500'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-4 pb-20">
        {currentStep === 0 && <DateSelectionStep />}
        {currentStep === 1 && <GuestSelectionStep />}
        {currentStep === 2 && <RoomSelectionStep />}
        {currentStep === 3 && <BookingDetailsStep />}
        {currentStep === 4 && <PaymentStep />}
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="flex gap-4">
          {currentStep > 0 && (
            <button
              onClick={previousStep}
              className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700"
            >
              Back
            </button>
          )}
          <button
            onClick={currentStep === steps.length - 1 ? handleBookingSubmit : nextStep}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium"
          >
            {currentStep === steps.length - 1 ? 'Book Now' : 'Continue'}
          </button>
        </div>
      </div>

      {/* Swipe Indicator */}
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center gap-1 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs">
          <ChevronLeft size={12} />
          Swipe to navigate
          <ChevronRight size={12} />
        </div>
      </div>
    </div>
  );
};

// Date Selection Step with Touch Calendar
const DateSelectionStep: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">When are you staying?</h2>
        <p className="text-gray-600">Select your check-in and check-out dates</p>
      </div>

      {/* Touch-Optimized Calendar */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <TouchCalendar
          mode="range"
          selected={dateRange}
          onSelect={setDateRange}
          className="w-full"
          classNames={{
            day_selected: "bg-blue-600 text-white rounded-full",
            day_today: "bg-blue-100 text-blue-600 rounded-full",
            day_range_middle: "bg-blue-100 text-blue-600"
          }}
        />
      </div>

      {/* Quick Date Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button className="py-3 bg-white rounded-lg border text-sm font-medium">
          Tonight
        </button>
        <button className="py-3 bg-white rounded-lg border text-sm font-medium">
          Weekend
        </button>
        <button className="py-3 bg-white rounded-lg border text-sm font-medium">
          Next Week
        </button>
      </div>
    </div>
  );
};
```

### Mobile Digital Key Interface

**Query**: "Create a mobile digital key interface with touch interactions"

**Agent Response**:
```typescript
// MobileDigitalKey.tsx
import React, { useState, useEffect } from 'react';
import { Key, Bluetooth, Wifi, Lock, Unlock } from 'lucide-react';

const MobileDigitalKey: React.FC = () => {
  const [keyActive, setKeyActive] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [proximity, setProximity] = useState<'far' | 'near' | 'close'>('far');

  // Simulate proximity detection
  useEffect(() => {
    if (keyActive) {
      const interval = setInterval(() => {
        // Simulate Bluetooth proximity detection
        const distance = Math.random();
        if (distance > 0.7) setProximity('close');
        else if (distance > 0.3) setProximity('near');
        else setProximity('far');
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [keyActive]);

  const handleUnlock = async () => {
    setIsUnlocking(true);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    try {
      await digitalKeyService.unlockRoom();
      // Success feedback
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    } catch (error) {
      console.error('Unlock failed:', error);
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="mobile-digital-key min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 text-white">
      {/* Header */}
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Digital Key</h1>
        <p className="text-blue-200">Room 301</p>
      </div>

      {/* Key Status */}
      <div className="px-6 mb-8">
        <div className="bg-white bg-opacity-20 rounded-2xl p-6 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bluetooth size={20} className={proximity === 'close' ? 'text-green-400' : 'text-gray-400'} />
              <span className="text-sm">
                {proximity === 'close' ? 'In Range' : proximity === 'near' ? 'Near Room' : 'Not Connected'}
              </span>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              proximity === 'close' ? 'bg-green-400' :
              proximity === 'near' ? 'bg-yellow-400' : 'bg-gray-400'
            }`} />
          </div>

          <div className="text-center">
            <div className="text-sm text-blue-200 mb-2">Valid Until</div>
            <div className="text-lg font-semibold">Dec 25, 2024 - 11:00 AM</div>
          </div>
        </div>
      </div>

      {/* Main Key Button */}
      <div className="px-6 mb-8">
        <div className="text-center">
          <button
            onTouchStart={() => setKeyActive(true)}
            onTouchEnd={() => setKeyActive(false)}
            onClick={handleUnlock}
            disabled={isUnlocking || proximity === 'far'}
            className={`
              relative w-48 h-48 mx-auto rounded-full
              ${proximity === 'close'
                ? 'bg-green-500 shadow-green-500/50'
                : 'bg-white bg-opacity-30 shadow-white/20'
              }
              shadow-2xl transition-all duration-300
              active:scale-95 disabled:opacity-50
              ${keyActive ? 'scale-105 shadow-3xl' : ''}
            `}
          >
            {isUnlocking ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {proximity === 'close' ? (
                  <Unlock size={48} className="text-white" />
                ) : (
                  <Lock size={48} className="text-white" />
                )}
              </div>
            )}
          </button>

          <div className="mt-6">
            <p className="text-lg font-medium mb-2">
              {proximity === 'close' ? 'Tap to Unlock' : 'Move Closer to Room'}
            </p>
            <p className="text-sm text-blue-200">
              {proximity === 'close'
                ? 'Press and hold to unlock your room'
                : 'Walk closer to your room to activate the key'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 space-y-3">
        <button className="w-full bg-white bg-opacity-20 backdrop-blur rounded-xl p-4 flex items-center gap-3">
          <Wifi size={20} />
          <span>Share Wi-Fi Password</span>
        </button>

        <button className="w-full bg-white bg-opacity-20 backdrop-blur rounded-xl p-4 flex items-center gap-3">
          <Key size={20} />
          <span>Key Settings</span>
        </button>
      </div>

      {/* Instructions */}
      <div className="px-6 mt-8">
        <div className="bg-white bg-opacity-10 backdrop-blur rounded-xl p-4">
          <h3 className="font-medium mb-2">How to use:</h3>
          <ul className="text-sm text-blue-200 space-y-1">
            <li>• Walk up to your room door</li>
            <li>• Wait for "In Range" status</li>
            <li>• Tap and hold the unlock button</li>
            <li>• Door will unlock automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MobileDigitalKey;
```

## Mobile Component Templates

### 1. Touch-Optimized Form

```typescript
// Mobile form with touch optimization
const MobileForm = () => {
  return (
    <form className="space-y-4">
      {/* Large touch targets */}
      <input
        type="text"
        className="w-full p-4 text-lg border rounded-xl focus:ring-2 focus:ring-blue-500"
        placeholder="Enter text..."
      />

      {/* Mobile-specific input types */}
      <input
        type="tel"
        className="w-full p-4 text-lg border rounded-xl"
        placeholder="Phone number"
        pattern="[0-9]*"
        inputMode="numeric"
      />

      {/* Touch-friendly buttons */}
      <button
        type="submit"
        className="w-full py-4 bg-blue-600 text-white text-lg font-medium rounded-xl touch-manipulation"
      >
        Submit
      </button>
    </form>
  );
};
```

### 2. Mobile Navigation

```typescript
// Bottom tab navigation for mobile
const MobileBottomNav = () => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'bookings', icon: Calendar, label: 'Bookings' },
    { id: 'services', icon: Bell, label: 'Services' },
    { id: 'profile', icon: User, label: 'Profile' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
      <div className="grid grid-cols-4 h-16">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-blue-600"
          >
            <tab.icon size={20} />
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
```

### 3. Swipe Gestures

```typescript
// Swipeable card component
const SwipeableCard = ({ onSwipeLeft, onSwipeRight, children }) => {
  const swipeHandlers = useSwipeable({
    onSwipedLeft: onSwipeLeft,
    onSwipedRight: onSwipeRight,
    delta: 50,
    preventDefaultTouchmoveEvent: true,
    trackTouch: true
  });

  return (
    <div
      {...swipeHandlers}
      className="bg-white rounded-xl shadow-sm p-4 touch-manipulation"
    >
      {children}
    </div>
  );
};
```

## Progressive Web App (PWA) Setup

### Service Worker

```javascript
// sw.js - Service Worker for offline functionality
const CACHE_NAME = 'hotel-app-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
```

### PWA Manifest

```json
// manifest.json - PWA configuration
{
  "name": "Hotel Management System",
  "short_name": "Hotel App",
  "description": "Complete hotel management solution",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "categories": ["business", "productivity"],
  "screenshots": [
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "540x720",
      "type": "image/png"
    }
  ]
}
```

## Best Practices

### Mobile UX Guidelines
- **Touch Targets**: Minimum 44px touch targets for accessibility
- **Thumb Navigation**: Place primary actions within thumb reach
- **Loading States**: Show progress indicators for slow operations
- **Offline Support**: Handle network failures gracefully
- **Haptic Feedback**: Use vibration for important interactions

### Performance Optimization
- **Lazy Loading**: Load components only when needed
- **Image Optimization**: Use WebP format and responsive images
- **Bundle Splitting**: Code split by routes and features
- **Service Workers**: Cache critical resources for offline use
- **Reduced Motion**: Respect user's motion preferences

### Accessibility
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **High Contrast**: Support for high contrast mode
- **Large Text**: Scalable fonts and layouts
- **Voice Control**: Support for voice navigation
- **Keyboard Navigation**: Full keyboard accessibility

This Mobile App Agent provides comprehensive mobile optimization for the hotel management system, ensuring an excellent mobile experience for both staff and guests.