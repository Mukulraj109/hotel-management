import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import MarketingDashboard from '../../components/marketing/MarketingDashboard';
import BookingWidgetManager from '../../components/marketing/BookingWidgetManager';
import BookingEngineWidget from '../../components/booking/BookingEngineWidget';
import ChannelDistributionHub from '../../components/channels/ChannelDistributionHub';

const AdminBookingEngine: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="widgets">Booking Widgets</TabsTrigger>
          <TabsTrigger value="engine">Booking Engine</TabsTrigger>
          <TabsTrigger value="channels">Channel Distribution</TabsTrigger>
          <TabsTrigger value="campaigns">Email Campaigns</TabsTrigger>
          <TabsTrigger value="promos">Promo Codes</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <MarketingDashboard />
        </TabsContent>

        <TabsContent value="widgets">
          <BookingWidgetManager />
        </TabsContent>

        <TabsContent value="engine">
          <BookingEngineWidget />
        </TabsContent>

        <TabsContent value="channels">
          <ChannelDistributionHub />
        </TabsContent>

        <TabsContent value="campaigns">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Email Campaign Management</h2>
            <p className="text-gray-600">Email campaign features coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="promos">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Promo Code Management</h2>
            <p className="text-gray-600">Promo code management features coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="crm">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Guest CRM</h2>
            <p className="text-gray-600">Guest relationship management features coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Review Management</h2>
            <p className="text-gray-600">Review management and response features coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminBookingEngine;