import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const FinancialReports: React.FC = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial Reports</CardTitle>
          <CardDescription>Generate and view financial reports</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Financial reports features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialReports;