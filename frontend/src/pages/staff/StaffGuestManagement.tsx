import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';
import UserManagement from '../../components/user/UserManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, User, Users, CreditCard, Edit } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface Guest {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  guestType: string;
  billingDetails?: {
    gstNumber?: string;
    companyName?: string;
  };
  hasCompleteBillingInfo?: boolean;
}

const StaffGuestManagement: React.FC = () => {
  const { user } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/guests?limit=100');
      setGuests(response.data.data.guests || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch guests');
    } finally {
      setLoading(false);
    }
  };

  const filteredGuests = guests.filter(guest =>
    guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (guest.billingDetails?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEditGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    setShowUserManagement(true);
  };

  const handleUserUpdate = () => {
    fetchGuests(); // Refresh the list
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest Management</h1>
          <p className="text-gray-600 mt-1">
            Manage guest profiles and billing information
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            <Users className="w-4 h-4 mr-1" />
            {filteredGuests.length} Guests
          </Badge>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search guests by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Guests List */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Billing Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGuests.map((guest) => (
                  <tr key={guest._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {guest.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {guest._id.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{guest.email}</div>
                      <div className="text-sm text-gray-500">
                        {guest.phone || 'No phone'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={guest.guestType === 'corporate' ? 'default' : 'secondary'}
                      >
                        {guest.guestType === 'corporate' ? 'Corporate' : 'Individual'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {guest.hasCompleteBillingInfo ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Complete
                          </Badge>
                        ) : guest.billingDetails?.gstNumber || guest.billingDetails?.companyName ? (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                            Partial
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            None
                          </Badge>
                        )}
                        {guest.billingDetails?.gstNumber && (
                          <CreditCard className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      {guest.billingDetails?.companyName && (
                        <div className="text-xs text-gray-500 mt-1">
                          {guest.billingDetails.companyName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditGuest(guest)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit Billing
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredGuests.length === 0 && (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No guests found matching your search' : 'No guests found'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Management Modal */}
      {showUserManagement && selectedGuest && (
        <Modal
          isOpen={showUserManagement}
          onClose={() => {
            setShowUserManagement(false);
            setSelectedGuest(null);
          }}
          title={`Manage Guest - ${selectedGuest.name}`}
          size="lg"
        >
          <UserManagement
            userId={selectedGuest._id}
            currentUser={user}
            onUserUpdate={handleUserUpdate}
          />
        </Modal>
      )}
    </div>
  );
};

export default StaffGuestManagement;