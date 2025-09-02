import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const InvoiceManagement: React.FC = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice Management</CardTitle>
          <CardDescription>Manage invoices and billing</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Invoice management features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceManagement;