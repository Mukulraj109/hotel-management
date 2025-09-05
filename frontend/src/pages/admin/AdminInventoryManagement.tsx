import React from 'react';
import { useAuth } from '../../context/AuthContext';
import InventoryCalendar from '../../components/inventory/InventoryCalendar';

const AdminInventoryManagement: React.FC = () => {
  const { user } = useAuth();
  
  // Use user's hotelId, fallback to default hotel ID if not available
  const hotelId = user?.hotelId || '68afe8080c02fcbe30092b8e';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-600">Manage room availability, rates, and restrictions by date</p>
      </div>
      
      <InventoryCalendar hotelId={hotelId} />
    </div>
  );
};

export default AdminInventoryManagement;