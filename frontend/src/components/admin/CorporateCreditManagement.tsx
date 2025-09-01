import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../LoadingSpinner';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { DataTable } from '../dashboard/DataTable';
import { MetricCard } from '../dashboard/MetricCard';
import { LineChart } from '../dashboard/charts/LineChart';
import { BarChart } from '../dashboard/charts/BarChart';
import { DonutChart } from '../dashboard/charts/PieChart';
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters';

interface CreditTransaction {
  _id: string;
  companyId: {
    _id: string;
    name: string;
    email: string;
  };
  amount: number;
  transactionType: 'debit' | 'credit' | 'adjustment' | 'refund' | 'payment';
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  description: string;
  dueDate?: string;
  balance: number;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CorporateCompany {
  _id: string;
  name: string;
  email: string;
  phone: string;
  creditLimit: number;
  availableCredit: number;
  creditUtilizationPercentage?: number;
  outstandingBalance?: number;
}

interface CreditAnalysis {
  creditUtilization: CorporateCompany[];
  overdueAnalysis: any[];
  paymentTrends: any[];
  creditLimitDistribution: any[];
  summary: {
    totalCompaniesWithCredit: number;
    totalOverdueAmount: number;
    averageCreditUtilization: number;
  };
}

const CorporateCreditManagement: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CorporateCompany | null>(null);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    transactionType: 'all',
    companyId: 'all'
  });

  const queryClient = useQueryClient();

  // Fetch credit transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['creditTransactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== 'all') params.append(key, value);
      });
      
      const response = await fetch(`/api/v1/corporate/credit/transactions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    }
  });

  // Fetch companies with credit info
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['corporateCompanies'],
    queryFn: async () => {
      const response = await fetch('/api/v1/corporate/companies');
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    }
  });

  // Fetch credit analysis
  const { data: creditAnalysis, isLoading: analysisLoading } = useQuery<CreditAnalysis>({
    queryKey: ['creditAnalysis'],
    queryFn: async () => {
      const response = await fetch('/api/v1/corporate/admin/credit-analysis');
      if (!response.ok) throw new Error('Failed to fetch credit analysis');
      return response.json();
    }
  });

  // Fetch low credit companies
  const { data: lowCreditCompanies } = useQuery({
    queryKey: ['lowCreditCompanies'],
    queryFn: async () => {
      const response = await fetch('/api/v1/corporate/companies/low-credit?threshold=10000');
      if (!response.ok) throw new Error('Failed to fetch low credit companies');
      return response.json();
    }
  });

  // Fetch monthly credit report
  const { data: monthlyReport } = useQuery({
    queryKey: ['monthlyReport'],
    queryFn: async () => {
      const response = await fetch('/api/v1/corporate/credit/monthly-report');
      if (!response.ok) throw new Error('Failed to fetch monthly report');
      return response.json();
    }
  });

  // Update credit mutation
  const updateCreditMutation = useMutation({
    mutationFn: async ({ companyId, amount, description }: { companyId: string; amount: number; description: string }) => {
      const response = await fetch(`/api/v1/corporate/companies/${companyId}/update-credit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description })
      });
      if (!response.ok) throw new Error('Failed to update credit');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporateCompanies'] });
      queryClient.invalidateQueries({ queryKey: ['creditTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['creditAnalysis'] });
      toast.success('Credit updated successfully');
      setShowCreditModal(false);
      setSelectedCompany(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update credit');
    }
  });

  // Approve transaction mutation
  const approveTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await fetch(`/api/v1/corporate/credit/transactions/${transactionId}/approve`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to approve transaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['creditAnalysis'] });
      toast.success('Transaction approved successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to approve transaction');
    }
  });

  // Reject transaction mutation
  const rejectTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await fetch(`/api/v1/corporate/credit/transactions/${transactionId}/reject`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to reject transaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['creditAnalysis'] });
      toast.success('Transaction rejected successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reject transaction');
    }
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (transactionIds: string[]) => {
      const response = await fetch('/api/v1/corporate/credit/bulk-approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds })
      });
      if (!response.ok) throw new Error('Failed to bulk approve transactions');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['creditAnalysis'] });
      toast.success('Transactions approved successfully');
      setSelectedTransactionIds([]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to bulk approve transactions');
    }
  });

  // Create credit transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/v1/corporate/credit/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create transaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['creditAnalysis'] });
      toast.success('Transaction created successfully');
      setShowTransactionModal(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create transaction');
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'credit': return 'bg-green-100 text-green-800';
      case 'debit': return 'bg-red-100 text-red-800';
      case 'payment': return 'bg-blue-100 text-blue-800';
      case 'adjustment': return 'bg-orange-100 text-orange-800';
      case 'refund': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (transactionsLoading || companiesLoading || analysisLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const transactionColumns = [
    {
      header: 'Company',
      accessor: (transaction: CreditTransaction) => transaction.companyId?.name || 'N/A'
    },
    {
      header: 'Amount',
      accessor: (transaction: CreditTransaction) => formatCurrency(Math.abs(transaction.amount))
    },
    {
      header: 'Type',
      accessor: (transaction: CreditTransaction) => (
        <Badge className={getTransactionTypeColor(transaction.transactionType)}>
          {transaction.transactionType}
        </Badge>
      )
    },
    {
      header: 'Status',
      accessor: (transaction: CreditTransaction) => (
        <Badge className={getStatusColor(transaction.status)}>
          {transaction.status}
        </Badge>
      )
    },
    {
      header: 'Description',
      accessor: (transaction: CreditTransaction) => transaction.description || 'N/A'
    },
    {
      header: 'Balance',
      accessor: (transaction: CreditTransaction) => formatCurrency(transaction.balance)
    },
    {
      header: 'Date',
      accessor: (transaction: CreditTransaction) => formatDate(transaction.createdAt)
    },
    {
      header: 'Actions',
      accessor: (transaction: CreditTransaction) => (
        <div className="flex space-x-2">
          {transaction.status === 'pending' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => approveTransactionMutation.mutate(transaction._id)}
                disabled={approveTransactionMutation.isPending}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => rejectTransactionMutation.mutate(transaction._id)}
                disabled={rejectTransactionMutation.isPending}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  const companyColumns = [
    {
      header: 'Company',
      accessor: (company: CorporateCompany) => company.name
    },
    {
      header: 'Credit Limit',
      accessor: (company: CorporateCompany) => formatCurrency(company.creditLimit)
    },
    {
      header: 'Available Credit',
      accessor: (company: CorporateCompany) => formatCurrency(company.availableCredit)
    },
    {
      header: 'Utilization',
      accessor: (company: CorporateCompany) => {
        const utilization = ((company.creditLimit - company.availableCredit) / company.creditLimit) * 100;
        return formatPercent(utilization / 100);
      }
    },
    {
      header: 'Outstanding',
      accessor: (company: CorporateCompany) => formatCurrency(company.outstandingBalance || 0)
    },
    {
      header: 'Actions',
      accessor: (company: CorporateCompany) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedCompany(company);
            setShowCreditModal(true);
          }}
        >
          Adjust Credit
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Corporate Credit Management</h1>
        <div className="flex space-x-3">
          {selectedTransactionIds.length > 0 && (
            <Button
              onClick={() => bulkApproveMutation.mutate(selectedTransactionIds)}
              disabled={bulkApproveMutation.isPending}
            >
              Bulk Approve ({selectedTransactionIds.length})
            </Button>
          )}
          <Button onClick={() => setShowTransactionModal(true)}>
            New Transaction
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Credit Exposure"
              value={formatCurrency(creditAnalysis?.summary?.totalOverdueAmount || 0)}
              icon="💳"
              trend={{
                value: 5.2,
                isPositive: false,
                label: "vs last month"
              }}
            />
            <MetricCard
              title="Companies with Credit"
              value={creditAnalysis?.summary?.totalCompaniesWithCredit || 0}
              icon="🏢"
              trend={{
                value: 3,
                isPositive: true,
                label: "new this month"
              }}
            />
            <MetricCard
              title="Avg Utilization"
              value={formatPercent((creditAnalysis?.summary?.averageCreditUtilization || 0) / 100)}
              icon="📊"
              trend={{
                value: 2.1,
                isPositive: false,
                label: "vs last month"
              }}
            />
            <MetricCard
              title="Low Credit Alerts"
              value={lowCreditCompanies?.data?.length || 0}
              icon="⚠️"
              trend={{
                value: 1,
                isPositive: false,
                label: "needs attention"
              }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Credit Utilization Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={creditAnalysis?.creditLimitDistribution?.map((item: any) => ({
                    name: `${item._id}`,
                    value: item.count,
                    percentage: (item.count / creditAnalysis.summary.totalCompaniesWithCredit) * 100
                  })) || []}
                  height={300}
                  centerContent={
                    <div className="text-center">
                      <div className="text-2xl font-bold">{creditAnalysis?.summary?.totalCompaniesWithCredit}</div>
                      <div className="text-sm text-gray-600">Total Companies</div>
                    </div>
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={creditAnalysis?.paymentTrends?.map((item: any) => ({
                    date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
                    amount: item.totalAmount || 0,
                    count: item.count || 0
                  })) || []}
                  xDataKey="date"
                  lines={[
                    {
                      dataKey: "amount",
                      name: "Payment Amount",
                      color: "#3B82F6"
                    },
                    {
                      dataKey: "count",
                      name: "Transaction Count",
                      color: "#10B981"
                    }
                  ]}
                  height={300}
                />
              </CardContent>
            </Card>
          </div>

          {lowCreditCompanies?.data?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>⚠️ Companies with Low Credit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {lowCreditCompanies.data.slice(0, 5).map((company: CorporateCompany) => (
                    <div key={company._id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <div>
                        <div className="font-medium">{company.name}</div>
                        <div className="text-sm text-gray-600">{company.email}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          {formatCurrency(company.availableCredit)}
                        </div>
                        <div className="text-sm text-gray-600">
                          of {formatCurrency(company.creditLimit)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="processed">Processed</option>
              </Select>
              <Select
                value={filters.transactionType}
                onValueChange={(value) => setFilters(prev => ({ ...prev, transactionType: value }))}
              >
                <option value="all">All Types</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
                <option value="payment">Payment</option>
                <option value="adjustment">Adjustment</option>
                <option value="refund">Refund</option>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent>
              <DataTable
                columns={transactionColumns}
                data={transactions?.data || []}
                searchPlaceholder="Search transactions..."
                onSelectionChange={setSelectedTransactionIds}
                selectable={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <Card>
            <CardContent>
              <DataTable
                columns={companyColumns}
                data={companies?.data || []}
                searchPlaceholder="Search companies..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Credit Utilizers</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={creditAnalysis?.creditUtilization?.slice(0, 10).map((company: any) => ({
                    name: company.name.substring(0, 15),
                    utilization: company.creditUtilizationPercentage || 0,
                    available: company.availableCredit || 0
                  })) || []}
                  xDataKey="name"
                  bars={[
                    {
                      dataKey: "utilization",
                      name: "Utilization %",
                      color: "#EF4444"
                    }
                  ]}
                  height={300}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Credit Report</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={monthlyReport?.data?.map((item: any) => ({
                    month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
                    totalCredits: item.totalCredits || 0,
                    totalDebits: Math.abs(item.totalDebits || 0),
                    netFlow: (item.totalCredits || 0) + (item.totalDebits || 0)
                  })) || []}
                  xDataKey="month"
                  lines={[
                    {
                      dataKey: "totalCredits",
                      name: "Credits",
                      color: "#10B981"
                    },
                    {
                      dataKey: "totalDebits",
                      name: "Debits",
                      color: "#EF4444"
                    },
                    {
                      dataKey: "netFlow",
                      name: "Net Flow",
                      color: "#3B82F6"
                    }
                  ]}
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Credit Adjustment Modal */}
      <CreditAdjustmentModal
        isOpen={showCreditModal}
        onClose={() => {
          setShowCreditModal(false);
          setSelectedCompany(null);
        }}
        company={selectedCompany}
        onSubmit={(data) => updateCreditMutation.mutate(data)}
        isLoading={updateCreditMutation.isPending}
      />

      {/* New Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        companies={companies?.data || []}
        onSubmit={(data) => createTransactionMutation.mutate(data)}
        isLoading={createTransactionMutation.isPending}
      />
    </div>
  );
};

// Credit Adjustment Modal Component
const CreditAdjustmentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  company: CorporateCompany | null;
  onSubmit: (data: { companyId: string; amount: number; description: string }) => void;
  isLoading: boolean;
}> = ({ isOpen, onClose, company, onSubmit, isLoading }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !amount || !description) return;

    onSubmit({
      companyId: company._id,
      amount: parseFloat(amount),
      description
    });
  };

  if (!company) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Credit Limit">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Company</label>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="font-medium">{company.name}</div>
            <div className="text-sm text-gray-600">
              Current: {formatCurrency(company.availableCredit)} / {formatCurrency(company.creditLimit)}
            </div>
          </div>
        </div>

        <Input
          type="number"
          step="0.01"
          placeholder="Adjustment amount (positive to add, negative to subtract)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <Input
          placeholder="Description of adjustment"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Credit'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Transaction Modal Component
const TransactionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  companies: CorporateCompany[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}> = ({ isOpen, onClose, companies, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    companyId: '',
    amount: '',
    transactionType: 'debit',
    description: '',
    dueDate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId || !formData.amount || !formData.description) return;

    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      dueDate: formData.dueDate || undefined
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Credit Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          value={formData.companyId}
          onValueChange={(value) => setFormData(prev => ({ ...prev, companyId: value }))}
          required
        >
          <option value="">Select Company</option>
          {companies.map((company) => (
            <option key={company._id} value={company._id}>
              {company.name}
            </option>
          ))}
        </Select>

        <Input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
          required
        />

        <Select
          value={formData.transactionType}
          onValueChange={(value) => setFormData(prev => ({ ...prev, transactionType: value }))}
        >
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
          <option value="payment">Payment</option>
          <option value="adjustment">Adjustment</option>
          <option value="refund">Refund</option>
        </Select>

        <Input
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />

        <Input
          type="date"
          placeholder="Due Date (optional)"
          value={formData.dueDate}
          onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
        />

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CorporateCreditManagement;