import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Settings, Users, Clock } from 'lucide-react';

interface Outlet {
  _id: string;
  outletId: string;
  name: string;
  type: string;
  location: string;
  isActive: boolean;
  operatingHours: any;
  manager?: any;
  staff: any[];
}

const OutletManagement: React.FC = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    location: '',
    operatingHours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '22:00', closed: false },
      saturday: { open: '09:00', close: '22:00', closed: false },
      sunday: { open: '09:00', close: '22:00', closed: false }
    },
    taxSettings: {
      defaultTaxRate: 18,
      serviceTaxRate: 10,
      gstRate: 18
    },
    paymentMethods: ['cash', 'card', 'room_charge'],
    settings: {
      allowRoomCharges: true,
      requireSignature: false,
      printReceipts: true,
      allowDiscounts: true,
      maxDiscountPercent: 20
    }
  });

  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      const response = await fetch('/api/pos/outlets');
      const data = await response.json();
      if (data.success) {
        setOutlets(data.data);
      }
    } catch (error) {
      console.error('Error fetching outlets:', error);
    }
  };

  const handleCreateOutlet = async () => {
    try {
      const response = await fetch('/api/pos/outlets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        fetchOutlets();
        setIsCreateModalOpen(false);
        resetForm();
        alert('Outlet created successfully!');
      } else {
        alert('Error creating outlet: ' + data.message);
      }
    } catch (error) {
      console.error('Error creating outlet:', error);
      alert('Error creating outlet');
    }
  };

  const handleUpdateOutlet = async () => {
    if (!selectedOutlet) return;

    try {
      const response = await fetch(`/api/pos/outlets/${selectedOutlet._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        fetchOutlets();
        setIsEditModalOpen(false);
        setSelectedOutlet(null);
        resetForm();
        alert('Outlet updated successfully!');
      } else {
        alert('Error updating outlet: ' + data.message);
      }
    } catch (error) {
      console.error('Error updating outlet:', error);
      alert('Error updating outlet');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      location: '',
      operatingHours: {
        monday: { open: '09:00', close: '22:00', closed: false },
        tuesday: { open: '09:00', close: '22:00', closed: false },
        wednesday: { open: '09:00', close: '22:00', closed: false },
        thursday: { open: '09:00', close: '22:00', closed: false },
        friday: { open: '09:00', close: '22:00', closed: false },
        saturday: { open: '09:00', close: '22:00', closed: false },
        sunday: { open: '09:00', close: '22:00', closed: false }
      },
      taxSettings: {
        defaultTaxRate: 18,
        serviceTaxRate: 10,
        gstRate: 18
      },
      paymentMethods: ['cash', 'card', 'room_charge'],
      settings: {
        allowRoomCharges: true,
        requireSignature: false,
        printReceipts: true,
        allowDiscounts: true,
        maxDiscountPercent: 20
      }
    });
  };

  const openEditModal = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setFormData({
      name: outlet.name,
      type: outlet.type,
      location: outlet.location,
      operatingHours: outlet.operatingHours,
      taxSettings: outlet.taxSettings || {
        defaultTaxRate: 18,
        serviceTaxRate: 10,
        gstRate: 18
      },
      paymentMethods: outlet.paymentMethods || ['cash', 'card', 'room_charge'],
      settings: outlet.settings || {
        allowRoomCharges: true,
        requireSignature: false,
        printReceipts: true,
        allowDiscounts: true,
        maxDiscountPercent: 20
      }
    });
    setIsEditModalOpen(true);
  };

  const getOutletTypeColor = (type: string) => {
    const colors = {
      restaurant: 'bg-blue-100 text-blue-800',
      bar: 'bg-purple-100 text-purple-800',
      spa: 'bg-green-100 text-green-800',
      gym: 'bg-orange-100 text-orange-800',
      shop: 'bg-yellow-100 text-yellow-800',
      room_service: 'bg-indigo-100 text-indigo-800',
      banquet: 'bg-red-100 text-red-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Outlet Management</h1>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Outlet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Outlet</DialogTitle>
            </DialogHeader>
            <OutletForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleCreateOutlet}
              onCancel={() => setIsCreateModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Outlets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {outlets.map((outlet) => (
          <Card key={outlet._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{outlet.name}</CardTitle>
                  <Badge className={getOutletTypeColor(outlet.type)}>
                    {outlet.type.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(outlet)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Settings className="w-4 h-4 mr-2" />
                  {outlet.location}
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  {outlet.staff.length} staff members
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  {outlet.operatingHours?.monday?.open} - {outlet.operatingHours?.monday?.close}
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <Badge variant={outlet.isActive ? "default" : "secondary"}>
                    {outlet.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Outlet</DialogTitle>
          </DialogHeader>
          <OutletForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdateOutlet}
            onCancel={() => setIsEditModalOpen(false)}
            isEdit
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const OutletForm: React.FC<{
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEdit?: boolean;
}> = ({ formData, setFormData, onSubmit, onCancel, isEdit }) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  const updateOperatingHours = (day: string, field: string, value: any) => {
    setFormData({
      ...formData,
      operatingHours: {
        ...formData.operatingHours,
        [day]: {
          ...formData.operatingHours[day],
          [field]: value
        }
      }
    });
  };

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList>
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="hours">Operating Hours</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Outlet Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter outlet name"
            />
          </div>

          <div>
            <Label htmlFor="type">Outlet Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select outlet type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="spa">Spa</SelectItem>
                <SelectItem value="gym">Gym</SelectItem>
                <SelectItem value="shop">Shop</SelectItem>
                <SelectItem value="room_service">Room Service</SelectItem>
                <SelectItem value="minibar">Minibar</SelectItem>
                <SelectItem value="banquet">Banquet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Enter outlet location"
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="hours" className="space-y-4">
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day} className="flex items-center space-x-4">
              <div className="w-24 capitalize font-medium">{day}</div>
              <input
                type="checkbox"
                checked={!formData.operatingHours[day].closed}
                onChange={(e) => updateOperatingHours(day, 'closed', !e.target.checked)}
              />
              <Label className="text-sm">Open</Label>
              {!formData.operatingHours[day].closed && (
                <>
                  <Input
                    type="time"
                    value={formData.operatingHours[day].open}
                    onChange={(e) => updateOperatingHours(day, 'open', e.target.value)}
                    className="w-32"
                  />
                  <span>to</span>
                  <Input
                    type="time"
                    value={formData.operatingHours[day].close}
                    onChange={(e) => updateOperatingHours(day, 'close', e.target.value)}
                    className="w-32"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="settings" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gst">GST Rate (%)</Label>
            <Input
              id="gst"
              type="number"
              value={formData.taxSettings.gstRate}
              onChange={(e) => setFormData({
                ...formData,
                taxSettings: { ...formData.taxSettings, gstRate: parseFloat(e.target.value) }
              })}
            />
          </div>

          <div>
            <Label htmlFor="service">Service Tax (%)</Label>
            <Input
              id="service"
              type="number"
              value={formData.taxSettings.serviceTaxRate}
              onChange={(e) => setFormData({
                ...formData,
                taxSettings: { ...formData.taxSettings, serviceTaxRate: parseFloat(e.target.value) }
              })}
            />
          </div>

          <div>
            <Label htmlFor="discount">Max Discount (%)</Label>
            <Input
              id="discount"
              type="number"
              value={formData.settings.maxDiscountPercent}
              onChange={(e) => setFormData({
                ...formData,
                settings: { ...formData.settings, maxDiscountPercent: parseFloat(e.target.value) }
              })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.settings.allowRoomCharges}
              onChange={(e) => setFormData({
                ...formData,
                settings: { ...formData.settings, allowRoomCharges: e.target.checked }
              })}
            />
            <Label>Allow Room Charges</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.settings.printReceipts}
              onChange={(e) => setFormData({
                ...formData,
                settings: { ...formData.settings, printReceipts: e.target.checked }
              })}
            />
            <Label>Print Receipts</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.settings.allowDiscounts}
              onChange={(e) => setFormData({
                ...formData,
                settings: { ...formData.settings, allowDiscounts: e.target.checked }
              })}
            />
            <Label>Allow Discounts</Label>
          </div>
        </div>
      </TabsContent>

      <div className="flex justify-end space-x-2 mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>
          {isEdit ? 'Update' : 'Create'} Outlet
        </Button>
      </div>
    </Tabs>
  );
};

export default OutletManagement;