import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const BudgetManagement: React.FC = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>Plan and track budgets</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Budget management features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetManagement;