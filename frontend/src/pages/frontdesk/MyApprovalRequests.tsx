import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import approvalService, { ApprovalRequest } from '../../services/approvalService';
import ApprovalBadge from '../../components/approvals/ApprovalBadge';
import ApprovalRequestCard from '../../components/approvals/ApprovalRequestCard';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const MyApprovalRequests: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['myApprovalRequests', statusFilter],
    queryFn: () =>
      approvalService.getMyApprovalRequests(
        statusFilter !== 'all' ? { status: statusFilter } : undefined
      ),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => approvalService.cancelRequest(id),
    onSuccess: () => {
      toast.success('Request cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['myApprovalRequests'] });
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel request');
    },
  });

  const handleCancel = (request: ApprovalRequest) => {
    if (
      window.confirm(
        'Are you sure you want to cancel this request? This action cannot be undone.'
      )
    ) {
      cancelMutation.mutate(request._id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      price_change: 'Price Change',
      booking_modification: 'Booking Modification',
      refund: 'Refund Request',
      discount: 'Discount Request',
    };
    return labels[type] || type;
  };

  const statusCounts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const filteredRequests =
    statusFilter === 'all'
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          My Approval Requests
        </h1>
        <p className="text-gray-600">
          Track and manage your approval requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.all}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {statusCounts.pending}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {statusCounts.approved}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">
                {statusCounts.rejected}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✗</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="ml-2 text-xs">
                    ({statusCounts[status]})
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <span className="text-6xl mb-4 block">📭</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No requests found
          </h3>
          <p className="text-gray-600">
            {statusFilter === 'all'
              ? "You haven't submitted any approval requests yet."
              : `You have no ${statusFilter} requests.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <ApprovalRequestCard
              key={request._id}
              request={request}
              showActions={request.status === 'pending'}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyApprovalRequests;
