import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Public Pages
import HomePage from './pages/public/HomePage';
import RoomsPage from './pages/public/RoomsPage';
import RoomDetailPage from './pages/public/RoomDetailPage';
import BookingPage from './pages/public/BookingPage';
import ContactPage from './pages/public/ContactPage';
import ReviewsPage from './pages/public/ReviewsPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Guest App Pages
import GuestDashboard from './pages/guest/GuestDashboard';
import GuestBookings from './pages/guest/GuestBookings';
import GuestBookingDetail from './pages/guest/GuestBookingDetail';
import GuestProfile from './pages/guest/GuestProfile';
import GuestRequests from './pages/guest/GuestRequests';
import LoyaltyDashboard from './pages/guest/LoyaltyDashboard';
import HotelServicesDashboard from './pages/guest/HotelServicesDashboard';
import NotificationsDashboard from './pages/guest/NotificationsDashboard';
import DigitalKeysDashboard from './pages/guest/DigitalKeysDashboard';
import MeetUpRequestsDashboard from './pages/guest/MeetUpRequestsDashboard';
import GuestBillingHistory from './pages/guest/GuestBillingHistory';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRooms from './pages/admin/AdminRooms';
import RoomDetailsPage from './pages/admin/RoomDetailsPage';
import RoomBookingsPage from './pages/admin/RoomBookingsPage';
import AdminBookings from './pages/admin/AdminBookings';
import AdminHousekeeping from './pages/admin/AdminHousekeeping';
import AdminInventory from './pages/admin/AdminInventory';
import AdminReports from './pages/admin/AdminReports';
import AdminOTA from './pages/admin/AdminOTA';
import BillingHistory from './pages/admin/BillingHistory';

// Layout Components
import PublicLayout from './layouts/PublicLayout';
import GuestLayout from './layouts/GuestLayout';
import AdminLayout from './layouts/AdminLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="rooms/:id" element={<RoomDetailPage />} />
                <Route path="booking" element={<BookingPage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="reviews" element={<ReviewsPage />} />
              </Route>

              {/* Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Guest App Routes */}
              <Route path="/app" element={
                <ProtectedRoute allowedRoles={['guest']}>
                  <GuestLayout />
                </ProtectedRoute>
              }>
                <Route index element={<GuestDashboard />} />
                <Route path="bookings" element={<GuestBookings />} />
                            <Route path="bookings/:id" element={<GuestBookingDetail />} />
            <Route path="billing" element={<GuestBillingHistory />} />
            <Route path="loyalty" element={<LoyaltyDashboard />} />
            <Route path="services" element={<HotelServicesDashboard />} />
            <Route path="notifications" element={<NotificationsDashboard />} />
            <Route path="keys" element={<DigitalKeysDashboard />} />
            <Route path="meet-ups" element={<MeetUpRequestsDashboard />} />
            <Route path="profile" element={<GuestProfile />} />
            <Route path="requests" element={<GuestRequests />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin', 'staff']}>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="rooms" element={<AdminRooms />} />
                <Route path="rooms/:roomId" element={<RoomDetailsPage />} />
                <Route path="rooms/:roomId/bookings" element={<RoomBookingsPage />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="housekeeping" element={<AdminHousekeeping />} />
                <Route path="inventory" element={<AdminInventory />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="ota" element={<AdminOTA />} />
                <Route path="billing" element={<BillingHistory />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </div>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;