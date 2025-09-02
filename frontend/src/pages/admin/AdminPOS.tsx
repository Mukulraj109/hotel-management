import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import POSDashboard from '../../components/pos/POSDashboard';
import POSOrderEntry from '../../components/pos/POSOrderEntry';
import OutletManagement from '../../components/pos/OutletManagement';
import UnifiedBillingSystem from '../../components/pos/UnifiedBillingSystem';

const AdminPOS: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="orders">New Order</TabsTrigger>
          <TabsTrigger value="outlets">Outlets</TabsTrigger>
          <TabsTrigger value="billing">Unified Billing</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <POSDashboard />
        </TabsContent>

        <TabsContent value="orders">
          <POSOrderEntry />
        </TabsContent>

        <TabsContent value="outlets">
          <OutletManagement />
        </TabsContent>

        <TabsContent value="billing">
          <UnifiedBillingSystem />
        </TabsContent>

        <TabsContent value="reports">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">POS Reports</h2>
            <p className="text-gray-600">POS reporting features coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPOS;