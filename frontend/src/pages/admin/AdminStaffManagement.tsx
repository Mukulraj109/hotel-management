import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  UserPlus,
  Users,
  Mail,
  Phone,
  Shield,
  Eye,
  EyeOff,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { useAuth } from '../../context/AuthContext';
import { PropertyBreadcrumb } from '../../components/common/PropertyBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '../../components/dashboard/DataTable';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { staffService } from '../../services/staffService';
import { EditUserModal } from '../../components/user/EditUserModal';
import { CreateUserModal } from '../../components/user/CreateUserModal';

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'staff' | 'admin';
  isActive: boolean;
  hotelId: {
    _id: string;
    name: string;
  };
  createdAt: string;
  lastLogin?: string;
}

interface CreateStaffData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'staff' | 'admin';
}

interface UpdateStaffData {
  name?: string;
  phone?: string;
  role?: 'staff' | 'admin';
  isActive?: boolean;
}

export default function AdminStaffManagement() {
  const { selectedPropertyId, selectedProperty, viewMode } = useProperty();
  const { user } = useAuth();
  const isFrontDesk = user?.role === 'frontdesk';
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPassword, setShowPassword] = useState(false);

  const queryClient = useQueryClient();

  // Form state for create/edit
  const [formData, setFormData] = useState<CreateStaffData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff'
  });

  // Fetch staff members
  const { data: staffData, isLoading, error } = useQuery({
    queryKey: ['staff', selectedPropertyId, searchTerm, roleFilter, statusFilter],
    queryFn: () => staffService.getStaffMembers({
      hotelId: selectedPropertyId,
      search: searchTerm,
      role: roleFilter === 'all' ? undefined : roleFilter as 'staff' | 'admin',
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'true'
    }),
    enabled: !!selectedPropertyId,
    refetchOnMount: 'always', // Always refetch on mount to avoid 304 cache issues
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Consider data stale immediately
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: staffService.createStaffMember,
    onSuccess: () => {
      toast.success('Staff member created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err.response?.data?.message || err.message || 'Failed to create staff member');
    }
  });

  // Update staff mutation
  const updateStaffMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffData }) =>
      staffService.updateStaffMember(id, data),
    onSuccess: () => {
      toast.success('Staff member updated successfully');
      setIsEditModalOpen(false);
      setSelectedStaff(null);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err.response?.data?.message || err.message || 'Failed to update staff member');
    }
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: staffService.deleteStaffMember,
    onSuccess: () => {
      toast.success('Staff member deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedStaff(null);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err.response?.data?.message || err.message || 'Failed to delete staff member');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'staff'
    });
    setShowPassword(false);
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    createStaffMutation.mutate(formData);
  };

  const handleEditStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    
    const updateData: UpdateStaffData = {
      name: formData.name,
      phone: formData.phone,
      role: formData.role
    };
    
    updateStaffMutation.mutate({ id: selectedStaff._id, data: updateData });
  };

  const handleDeleteStaff = () => {
    if (!selectedStaff) return;
    deleteStaffMutation.mutate(selectedStaff._id);
  };

  const openEditModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || '',
      password: '',
      role: staff.role
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsDeleteModalOpen(true);
  };

  const toggleStaffStatus = (staff: StaffMember) => {
    updateStaffMutation.mutate({
      id: staff._id,
      data: { isActive: !staff.isActive }
    });
  };

  // Base columns shown to all users
  const baseColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (value: unknown, row: StaffMember) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Contact',
      render: (value: unknown, row: StaffMember) => (
        <div className="text-sm text-gray-600">
          {row.phone ? (
            <div className="flex items-center space-x-1">
              <Phone className="w-3 h-3" />
              <span>{row.phone}</span>
            </div>
          ) : (
            <span className="text-gray-400">No phone</span>
          )}
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role',
      render: (value: unknown, row: StaffMember) => (
        <Badge variant={row.role === 'admin' ? 'destructive' : 'secondary'}>
          <Shield className="w-3 h-3 mr-1" />
          {row.role}
        </Badge>
      )
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (value: unknown, row: StaffMember) => (
        <Badge variant={row.isActive ? 'default' : 'outline'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      render: (value: unknown, row: StaffMember) => (
        <div className="text-sm text-gray-600">
          {row.lastLogin ?
            new Date(row.lastLogin).toLocaleDateString() :
            'Never'
          }
        </div>
      )
    }
  ];

  // Actions column - only shown to admin/staff, not frontdesk
  const actionsColumn = {
    key: 'actions',
    header: 'Actions',
    render: (value: unknown, row: StaffMember) => (
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            toggleStaffStatus(row);
          }}
          disabled={updateStaffMutation.isPending}
        >
          {row.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            openEditModal(row);
          }}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            openDeleteModal(row);
          }}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    )
  };

  // Conditionally add actions column based on user role
  const columns = isFrontDesk ? baseColumns : [...baseColumns, actionsColumn];

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading staff members</div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PropertyBreadcrumb items={['Staff Management']} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">
            {isFrontDesk ? 'View hotel staff members' : 'Manage your hotel staff members'}
          </p>
        </div>
        {!isFrontDesk && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Staff Member
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">
                  {staffData?.pagination?.total || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Staff</p>
                <p className="text-2xl font-bold text-gray-900">
                  {staffData?.staff?.filter((s: StaffMember) => s.isActive).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {staffData?.staff?.filter((s: StaffMember) => s.role === 'admin').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Regular Staff</p>
                <p className="text-2xl font-bold text-gray-900">
                  {staffData?.staff?.filter((s: StaffMember) => s.role === 'staff').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search staff by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
                         <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">All Roles</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Staff Members</CardTitle>
            <div className="text-sm text-gray-500">
              Showing {staffData?.staff?.length || 0} of {staffData?.pagination?.total || 0} staff
              {viewMode === 'single' && selectedProperty && (
                <span className="ml-2 text-blue-600">
                  for {selectedProperty.name}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : staffData?.staff?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Users className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No staff members found</h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first staff member.'}
              </p>
              {!isFrontDesk && !searchTerm && roleFilter === 'all' && statusFilter === 'all' && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Staff Member
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={staffData?.staff || []}
              pagination={staffData?.pagination}
            />
          )}
        </CardContent>
      </Card>

      {/* Create User Modal - Comprehensive version with property access - Only for admin/staff */}
      {!isFrontDesk && (
        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* Edit User Modal - Comprehensive version with property access - Only for admin/staff */}
      {!isFrontDesk && selectedStaff && (
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedStaff(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            setIsEditModalOpen(false);
            setSelectedStaff(null);
          }}
          user={selectedStaff as any}
        />
      )}

      {/* Delete Confirmation Modal - Only for admin/staff */}
      {!isFrontDesk && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Staff Member"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{selectedStaff?.name}</strong>?
              This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteStaff}
                disabled={deleteStaffMutation.isPending}
              >
                {deleteStaffMutation.isPending ? 'Deleting...' : 'Delete Staff Member'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
