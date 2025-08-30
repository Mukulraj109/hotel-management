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
import InventoryRequests from './pages/guest/InventoryRequests';
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
import { InventoryTemplateManagement } from './components/admin/InventoryTemplateManagement';

// Staff Pages
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffTasks from './pages/staff/StaffTasks';
import StaffHousekeeping from './pages/staff/StaffHousekeeping';
import StaffMaintenance from './pages/staff/StaffMaintenance';
import StaffGuestServices from './pages/staff/StaffGuestServices';
import StaffRooms from './pages/staff/StaffRooms';
import StaffInventory from './pages/staff/StaffInventory';
import StaffReports from './pages/staff/StaffReports';
import { DailyInventoryCheckForm } from './components/staff/DailyInventoryCheckForm';

// Layout Components
import PublicLayout from './layouts/PublicLayout';
import GuestLayout from './layouts/GuestLayout';
import AdminLayout from './layouts/AdminLayout';
import StaffLayout from './layouts/StaffLayout';

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
              {/* Public Routes - Accessible to all users */}
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
            <Route path="inventory-requests" element={<InventoryRequests />} />
          </Route>

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
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
                <Route path="inventory/templates" element={<InventoryTemplateManagement />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="ota" element={<AdminOTA />} />
                <Route path="billing" element={<BillingHistory />} />
              </Route>

              {/* Staff Routes */}
              <Route path="/staff" element={
                <ProtectedRoute allowedRoles={['staff']}>
                  <StaffLayout />
                </ProtectedRoute>
              }>
                <Route index element={<StaffDashboard />} />
                <Route path="tasks" element={<StaffTasks />} />
                <Route path="inventory-check/:roomId" element={<DailyInventoryCheckForm />} />
                <Route path="inventory-check" element={<DailyInventoryCheckForm />} />
                <Route path="housekeeping" element={<StaffHousekeeping />} />
                <Route path="maintenance" element={<StaffMaintenance />} />
                <Route path="guest-services" element={<StaffGuestServices />} />
                <Route path="rooms" element={<StaffRooms />} />
                <Route path="inventory" element={<StaffInventory />} />
                <Route path="reports" element={<StaffReports />} />
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