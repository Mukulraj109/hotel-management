import React from 'react';
import RoomTypeManagement from '../../components/admin/RoomTypeManagement';
import { useAuth } from '../../context/AuthContext';

const AdminRoomTypes: React.FC = () => {
  const { user } = useAuth();

  if (!user?.hotelId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Type Management</h1>
          <p className="text-gray-600">Manage room types, configurations, and OTA mappings</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Unable to load room types. Please check your hotel association.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Room Type Management</h1>
        <p className="text-gray-600">Manage room types, configurations, and OTA mappings</p>
      </div>

      <RoomTypeManagement hotelId={user.hotelId} />
    </div>
  );
};

export default AdminRoomTypes;