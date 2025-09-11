import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const PaymentManagement: React.FC = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Management</CardTitle>
          <CardDescription>Track and manage payments</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Payment management features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentManagement;