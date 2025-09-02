import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import RevenueDashboard from '../../components/revenue/RevenueDashboard';
import PricingRulesManagement from '../../components/revenue/PricingRulesManagement';
import RevenueManagementDashboard from '../../components/revenue/RevenueManagementDashboard';

const AdminRevenueManagement: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="pricing-rules">Pricing Rules</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="competitors">Rate Shopping</TabsTrigger>
          <TabsTrigger value="corporate">Corporate Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <RevenueManagementDashboard />
        </TabsContent>

        <TabsContent value="pricing-rules">
          <PricingRulesManagement />
        </TabsContent>

        <TabsContent value="packages">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Package Management</h2>
            <p className="text-gray-600">Package creation and management features coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="competitors">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Rate Shopping & Competitor Analysis</h2>
            <p className="text-gray-600">Competitor rate monitoring and analysis features coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="corporate">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Corporate Rate Management</h2>
            <p className="text-gray-600">Corporate and group rate management features coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminRevenueManagement;