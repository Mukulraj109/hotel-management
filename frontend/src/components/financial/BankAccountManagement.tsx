import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const BankAccountManagement: React.FC = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Bank Account Management</CardTitle>
          <CardDescription>Manage bank accounts and reconciliation</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Bank account management features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BankAccountManagement;