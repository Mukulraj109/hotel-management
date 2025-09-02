import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  Users,
  FileText,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '../LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/dashboardUtils';
import toast from 'react-hot-toast';

interface CorporateCompany {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  gstNumber: string;
  panNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  creditLimit: number;
  paymentTerms: number;
  hrContacts: Array<{
    name: string;
    email: string;
    phone?: string;
    designation?: string;
    isPrimary: boolean;
  }>;
  contractDetails?: {
    contractNumber?: string;
    contractStartDate?: Date;
    contractEndDate?: Date;
    discountPercentage?: number;
    specialTerms?: string;
  };
  billingCycle: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CompanyFormData {
  name: string;
  email: string;
  phone: string;
  gstNumber: string;
  panNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  creditLimit: number;
  paymentTerms: number;
  hrContacts: Array<{
    name: string;
    email: string;
    phone: string;
    designation: string;
    isPrimary: boolean;
  }>;
  contractDetails: {
    contractNumber: string;
    contractStartDate: string;
    contractEndDate: string;
    discountPercentage: number;
    specialTerms: string;
  };
  billingCycle: string;
}

const initialFormData: CompanyFormData = {
  name: '',
  email: '',
  phone: '',
  gstNumber: '',
  panNumber: '',
  address: {
    street: '',
    city: '',
    state: '',
    country: 'India',
    zipCode: '',
  },
  creditLimit: 100000,
  paymentTerms: 30,
  hrContacts: [{
    name: '',
    email: '',
    phone: '',
    designation: '',
    isPrimary: true
  }],
  contractDetails: {
    contractNumber: '',
    contractStartDate: '',
    contractEndDate: '',
    discountPercentage: 0,
    specialTerms: ''
  },
  billingCycle: 'monthly'
};

// API functions
const fetchCorporateCompanies = async (): Promise<{ companies: CorporateCompany[] }> => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/v1/corporate/companies', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch corporate companies');
  }
  
  const data = await response.json();
  return data.data;
};

const createCorporateCompany = async (companyData: CompanyFormData): Promise<CorporateCompany> => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/v1/corporate/companies', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(companyData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create corporate company');
  }
  
  const data = await response.json();
  return data.data.company;
};

const updateCorporateCompany = async ({ id, ...companyData }: CompanyFormData & { id: string }): Promise<CorporateCompany> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/v1/corporate/companies/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(companyData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update corporate company');
  }
  
  const data = await response.json();
  return data.data.company;
};

const deleteCorporateCompany = async (id: string): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/v1/corporate/companies/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete corporate company');
  }
};

export default function CorporateCompanyManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CorporateCompany | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Fetch companies
  const {
    data: companiesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['corporate-companies'],
    queryFn: fetchCorporateCompanies,
  });

  // Create company mutation
  const createMutation = useMutation({
    mutationFn: createCorporateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate-companies'] });
      toast.success('Corporate company created successfully');
      setShowForm(false);
      setFormData(initialFormData);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update company mutation
  const updateMutation = useMutation({
    mutationFn: updateCorporateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate-companies'] });
      toast.success('Corporate company updated successfully');
      setShowForm(false);
      setEditingCompany(null);
      setFormData(initialFormData);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete company mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCorporateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate-companies'] });
      toast.success('Corporate company deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const companies = companiesData?.companies || [];

  // Filter companies based on search term
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.gstNumber.includes(searchTerm)
  );

  const handleCreateCompany = () => {
    setEditingCompany(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowForm(true);
  };

  const handleEditCompany = (company: CorporateCompany) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      email: company.email,
      phone: company.phone || '',
      gstNumber: company.gstNumber,
      panNumber: company.panNumber || '',
      address: company.address,
      creditLimit: company.creditLimit,
      paymentTerms: company.paymentTerms,
      hrContacts: company.hrContacts.length > 0 ? company.hrContacts : initialFormData.hrContacts,
      contractDetails: company.contractDetails ? {
        contractNumber: company.contractDetails.contractNumber || '',
        contractStartDate: company.contractDetails.contractStartDate ? 
          new Date(company.contractDetails.contractStartDate).toISOString().split('T')[0] : '',
        contractEndDate: company.contractDetails.contractEndDate ? 
          new Date(company.contractDetails.contractEndDate).toISOString().split('T')[0] : '',
        discountPercentage: company.contractDetails.discountPercentage || 0,
        specialTerms: company.contractDetails.specialTerms || ''
      } : initialFormData.contractDetails,
      billingCycle: company.billingCycle
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDeleteCompany = async (company: CorporateCompany) => {
    if (window.confirm(`Are you sure you want to delete ${company.name}? This action cannot be undone.`)) {
      deleteMutation.mutate(company._id);
    }
  };

  const handleAddHRContact = () => {
    setFormData(prev => ({
      ...prev,
      hrContacts: [
        ...prev.hrContacts,
        {
          name: '',
          email: '',
          phone: '',
          designation: '',
          isPrimary: false
        }
      ]
    }));
  };

  const handleRemoveHRContact = (index: number) => {
    if (formData.hrContacts.length > 1) {
      setFormData(prev => ({
        ...prev,
        hrContacts: prev.hrContacts.filter((_, i) => i !== index)
      }));
    }
  };

  const handleHRContactChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      hrContacts: prev.hrContacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) errors.name = 'Company name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.gstNumber.trim()) errors.gstNumber = 'GST number is required';
    if (!formData.address.street.trim()) errors.street = 'Street address is required';
    if (!formData.address.city.trim()) errors.city = 'City is required';
    if (!formData.address.state.trim()) errors.state = 'State is required';
    if (!formData.address.zipCode.trim()) errors.zipCode = 'ZIP code is required';
    
    // Validate at least one HR contact
    if (formData.hrContacts.length === 0) {
      errors.hrContacts = 'At least one HR contact is required';
    } else {
      formData.hrContacts.forEach((contact, index) => {
        if (!contact.name.trim()) errors[`hrContact_${index}_name`] = 'Name is required';
        if (!contact.email.trim()) errors[`hrContact_${index}_email`] = 'Email is required';
      });
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    if (editingCompany) {
      updateMutation.mutate({ ...formData, id: editingCompany._id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCompany(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load companies</h3>
        <p className="text-gray-500 mb-4">There was an error loading the corporate companies.</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Corporate Companies</h2>
          <p className="text-gray-600">Manage corporate clients and their information</p>
        </div>
        <Button onClick={handleCreateCompany} className="flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search companies by name, email, or GST number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Companies List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredCompanies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCompanies.map((company) => (
                  <tr key={company._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {company.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            GST: {company.gstNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Mail className="h-4 w-4 mr-1 text-gray-400" />
                        {company.email}
                      </div>
                      {company.phone && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Phone className="h-4 w-4 mr-1 text-gray-400" />
                          {company.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Limit: {formatCurrency(company.creditLimit)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Terms: {company.paymentTerms} days
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={company.isActive ? "success" : "secondary"}
                        className="flex items-center"
                      >
                        {company.isActive ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
                        {company.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCompany(company)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCompany(company)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              {searchTerm ? 'No companies found' : 'No corporate companies'}
            </h3>
            <p className="text-sm text-gray-500">
              {searchTerm 
                ? 'Try adjusting your search terms.' 
                : 'Get started by creating your first corporate company.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Company Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCompany ? 'Edit Company' : 'Add New Company'}
              </h3>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Basic Information
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={cn(
                        "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                        formErrors.name ? "border-red-300" : "border-gray-300"
                      )}
                      placeholder="Enter company name"
                    />
                    {formErrors.name && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className={cn(
                        "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                        formErrors.email ? "border-red-300" : "border-gray-300"
                      )}
                      placeholder="company@example.com"
                    />
                    {formErrors.email && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GST Number *
                    </label>
                    <input
                      type="text"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
                      className={cn(
                        "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                        formErrors.gstNumber ? "border-red-300" : "border-gray-300"
                      )}
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                    />
                    {formErrors.gstNumber && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.gstNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={formData.panNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Address Information
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, street: e.target.value }
                      }))}
                      className={cn(
                        "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                        formErrors.street ? "border-red-300" : "border-gray-300"
                      )}
                      placeholder="Enter street address"
                    />
                    {formErrors.street && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.street}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, city: e.target.value }
                      }))}
                      className={cn(
                        "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                        formErrors.city ? "border-red-300" : "border-gray-300"
                      )}
                      placeholder="Enter city"
                    />
                    {formErrors.city && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, state: e.target.value }
                      }))}
                      className={cn(
                        "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                        formErrors.state ? "border-red-300" : "border-gray-300"
                      )}
                      placeholder="Enter state"
                    />
                    {formErrors.state && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.state}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, country: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      value={formData.address.zipCode}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, zipCode: e.target.value }
                      }))}
                      className={cn(
                        "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                        formErrors.zipCode ? "border-red-300" : "border-gray-300"
                      )}
                      placeholder="Enter ZIP code"
                    />
                    {formErrors.zipCode && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.zipCode}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Financial Information
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credit Limit
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, creditLimit: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Terms (days)
                    </label>
                    <select
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={15}>15 days</option>
                      <option value={30}>30 days</option>
                      <option value={45}>45 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Billing Cycle
                    </label>
                    <select
                      value={formData.billingCycle}
                      onChange={(e) => setFormData(prev => ({ ...prev, billingCycle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="immediate">Immediate</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* HR Contacts */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-medium text-gray-900 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    HR Contacts
                  </h4>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddHRContact}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Contact
                  </Button>
                </div>

                {formData.hrContacts.map((contact, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        Contact {index + 1} {contact.isPrimary && <Badge variant="primary" size="sm">Primary</Badge>}
                      </span>
                      {formData.hrContacts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveHRContact(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => handleHRContactChange(index, 'name', e.target.value)}
                          className={cn(
                            "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                            formErrors[`hrContact_${index}_name`] ? "border-red-300" : "border-gray-300"
                          )}
                          placeholder="Contact name"
                        />
                        {formErrors[`hrContact_${index}_name`] && (
                          <p className="text-sm text-red-600 mt-1">{formErrors[`hrContact_${index}_name`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(e) => handleHRContactChange(index, 'email', e.target.value)}
                          className={cn(
                            "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                            formErrors[`hrContact_${index}_email`] ? "border-red-300" : "border-gray-300"
                          )}
                          placeholder="contact@company.com"
                        />
                        {formErrors[`hrContact_${index}_email`] && (
                          <p className="text-sm text-red-600 mt-1">{formErrors[`hrContact_${index}_email`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => handleHRContactChange(index, 'phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="+91 98765 43210"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={contact.designation}
                          onChange={(e) => handleHRContactChange(index, 'designation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="HR Manager"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={contact.isPrimary}
                          onChange={(e) => {
                            // If setting as primary, uncheck all others first
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                hrContacts: prev.hrContacts.map((c, i) => ({
                                  ...c,
                                  isPrimary: i === index
                                }))
                              }));
                            } else {
                              handleHRContactChange(index, 'isPrimary', false);
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Primary Contact</span>
                      </label>
                    </div>
                  </div>
                ))}

                {formErrors.hrContacts && (
                  <p className="text-sm text-red-600">{formErrors.hrContacts}</p>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex items-center"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {editingCompany ? 'Update Company' : 'Create Company'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}