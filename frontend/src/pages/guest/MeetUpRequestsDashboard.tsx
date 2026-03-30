import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Users, Calendar, Clock, UserPlus, CheckCircle, XCircle, Plus, Ban, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { meetUpRequestService } from '../../services/meetUpRequestService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';

export default function MeetUpRequestsDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMeetUp, setSelectedMeetUp] = useState<{ targetUserId?: string } | null>(null);
  const PAGE_LIMIT = 20;

  // Debounce search input
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }, []);

  // Reset page when switching tabs
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // Queries
  const { data: meetUpsData, isLoading: meetUpsLoading, isError: meetUpsError } = useQuery({
    queryKey: ['meetUpRequests', activeTab, debouncedSearch, page],
    queryFn: () => {
      const params = { page, limit: PAGE_LIMIT };

      switch (activeTab) {
        case 'pending':
          return meetUpRequestService.getPendingRequests(params);
        case 'upcoming':
          return meetUpRequestService.getUpcomingMeetUps(params);
        default:
          return meetUpRequestService.getMeetUpRequests({
            ...params,
            ...(debouncedSearch ? { search: debouncedSearch } : {})
          });
      }
    },
    keepPreviousData: true
  });

  const { data: partnersData, isLoading: partnersLoading, isError: partnersError } = useQuery({
    queryKey: ['meetUpPartners'],
    queryFn: () => meetUpRequestService.searchPartners(),
    enabled: activeTab === 'partners'
  });

  const { data: statsData, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['meetUpStats'],
    queryFn: () => meetUpRequestService.getStats()
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: meetUpRequestService.createMeetUpRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetUpRequests'] });
      queryClient.invalidateQueries({ queryKey: ['meetUpStats'] });
      setIsCreateModalOpen(false);
      toast.success('Meet-up request created successfully!');
    },
    onError: (error) => {
      const axiosErr = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = axiosErr.response?.data?.error?.message || (error instanceof Error ? error.message : 'Failed to create meet-up request');
      toast.error(errorMessage);
    }
  });

  const acceptMutation = useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: Record<string, unknown> }) => meetUpRequestService.acceptMeetUpRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetUpRequests'] });
      queryClient.invalidateQueries({ queryKey: ['meetUpStats'] });
      toast.success('Meet-up request accepted!');
    },
    onError: () => {
      toast.error('Failed to accept meet-up request');
    }
  });

  const declineMutation = useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: Record<string, unknown> }) => meetUpRequestService.declineMeetUpRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetUpRequests'] });
      queryClient.invalidateQueries({ queryKey: ['meetUpStats'] });
      toast.success('Meet-up request declined');
    },
    onError: () => {
      toast.error('Failed to decline meet-up request');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (requestId: string) => meetUpRequestService.cancelMeetUpRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetUpRequests'] });
      queryClient.invalidateQueries({ queryKey: ['meetUpStats'] });
      toast.success('Meet-up request cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel meet-up request');
    }
  });

  const handleCreateMeetUp = (formData: Record<string, unknown>) => {
    createMutation.mutate(formData as Parameters<typeof meetUpRequestService.createMeetUpRequest>[0]);
  };

  const handleAcceptRequest = (requestId: string) => {
    acceptMutation.mutate({ requestId, data: { message: '' } });
  };

  const handleDeclineRequest = (requestId: string) => {
    declineMutation.mutate({ requestId, data: { message: '' } });
  };

  const [confirmCancelMeetUpId, setConfirmCancelMeetUpId] = useState<string | null>(null);

  const handleCancelRequest = (requestId: string) => {
    setConfirmCancelMeetUpId(requestId);
  };

  const confirmCancelMeetUp = () => {
    if (confirmCancelMeetUpId) {
      cancelMutation.mutate(confirmCancelMeetUpId);
      setConfirmCancelMeetUpId(null);
    }
  };

  if (meetUpsLoading && activeTab !== 'partners' && activeTab !== 'stats') {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (meetUpsError && activeTab !== 'partners' && activeTab !== 'stats') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load meet-ups</h3>
        <p className="text-gray-600 mb-4">Something went wrong while fetching your meet-up requests.</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['meetUpRequests'] })}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meet-Up Requests</h1>
          <p className="text-gray-600 mt-2">Connect with other guests and organize meet-ups</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Meet-Up
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'pending', label: 'Pending' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'partners', label: 'Find Partners' },
            { id: 'stats', label: 'Statistics' }
          ].map((tab) => (
            <button
              key={tab.id}
              aria-label={`View ${tab.label}`}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'all' && (
        <div className="space-y-6">
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search meet-ups..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {meetUpsData?.meetUps?.map((meetUp) => (
              <MeetUpCard
                key={meetUp._id}
                meetUp={meetUp}
                currentUserId={user?._id}
                onAccept={handleAcceptRequest}
                onDecline={handleDeclineRequest}
                onCancel={handleCancelRequest}
              />
            ))}
          </div>

          {meetUpsData?.meetUps?.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No meet-ups found</h3>
              <p className="text-gray-600">Create your first meet-up request to get started!</p>
            </div>
          )}

          {meetUpsData?.pagination && meetUpsData.pagination.totalPages > 1 && (
            <PaginationControls
              pagination={meetUpsData.pagination}
              page={page}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {meetUpsData?.meetUps?.map((meetUp) => (
              <MeetUpCard
                key={meetUp._id}
                meetUp={meetUp}
                currentUserId={user?._id}
                onAccept={handleAcceptRequest}
                onDecline={handleDeclineRequest}
                onCancel={handleCancelRequest}
              />
            ))}
          </div>

          {meetUpsData?.meetUps?.length === 0 && (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
              <p className="text-gray-600">You have no pending meet-up requests at this time.</p>
            </div>
          )}

          {meetUpsData?.pagination && meetUpsData.pagination.totalPages > 1 && (
            <PaginationControls
              pagination={meetUpsData.pagination}
              page={page}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {activeTab === 'upcoming' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {meetUpsData?.meetUps?.map((meetUp) => (
              <MeetUpCard
                key={meetUp._id}
                meetUp={meetUp}
                currentUserId={user?._id}
                onAccept={handleAcceptRequest}
                onDecline={handleDeclineRequest}
                onCancel={handleCancelRequest}
              />
            ))}
          </div>

          {meetUpsData?.meetUps?.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming meet-ups</h3>
              <p className="text-gray-600">You have no confirmed upcoming meet-ups. Create one to get started!</p>
            </div>
          )}

          {meetUpsData?.pagination && meetUpsData.pagination.totalPages > 1 && (
            <PaginationControls
              pagination={meetUpsData.pagination}
              page={page}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {activeTab === 'partners' && (
        <div className="space-y-6">
          {partnersLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : partnersError ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load partners</h3>
              <p className="text-gray-600 mb-4">Could not fetch potential meet-up partners.</p>
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['meetUpPartners'] })}>
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {partnersData?.users?.map((partner) => (
                  <PartnerCard
                    key={partner._id}
                    partner={partner}
                    onInvite={(partnerId) => {
                      setSelectedMeetUp({ targetUserId: partnerId });
                      setIsCreateModalOpen(true);
                    }}
                  />
                ))}
              </div>
              {partnersData?.users?.length === 0 && (
                <div className="text-center py-12">
                  <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No partners found</h3>
                  <p className="text-gray-600">No other guests are available for meet-ups right now.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : statsError ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load statistics</h3>
              <p className="text-gray-600 mb-4">Could not load meet-up statistics.</p>
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['meetUpStats'] })}>
                Try Again
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Meet-ups"
                value={statsData?.totalRequests || 0}
                icon={Calendar}
                color="blue"
              />
              <StatCard
                title="Pending Requests"
                value={statsData?.pendingRequests || 0}
                icon={Clock}
                color="yellow"
              />
              <StatCard
                title="Upcoming Meet-ups"
                value={statsData?.upcomingMeetUps || 0}
                icon={Users}
                color="green"
              />
              <StatCard
                title="Completed Meet-ups"
                value={statsData?.completedRequests || 0}
                icon={CheckCircle}
                color="purple"
              />
            </div>
          )}
        </div>
      )}

      {/* Create Meet-Up Modal */}
      {isCreateModalOpen && (
        <CreateMeetUpModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateMeetUp}
          targetUserId={selectedMeetUp?.targetUserId}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Cancel Meet-Up Confirmation Dialog */}
      {confirmCancelMeetUpId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-meetup-title">
          <Card className="max-w-md w-full p-6">
            <h3 id="cancel-meetup-title" className="text-lg font-semibold text-gray-900 mb-2">Cancel Meet-Up Request</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to cancel this meet-up request?</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmCancelMeetUpId(null)}>Keep Request</Button>
              <Button variant="secondary" className="text-red-600 hover:bg-red-50" onClick={confirmCancelMeetUp}>Cancel Meet-Up</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// MeetUpCard Component
function MeetUpCard({ meetUp, currentUserId, onAccept, onDecline, onCancel }: {
  meetUp: { _id: string; type: string; status: string; title: string; description: string; proposedDate: string; proposedTime: { start: string; end: string }; location?: { name?: string }; requesterId?: { _id: string; name?: string }; targetUserId?: { _id: string; name?: string } };
  currentUserId?: string;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const typeInfo = meetUpRequestService.getMeetUpTypeInfo(meetUp.type);
  const statusInfo = meetUpRequestService.getStatusInfo(meetUp.status);
  const canCancel = meetUp.requesterId?._id === currentUserId &&
    (meetUp.status === 'pending' || meetUp.status === 'accepted');

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{meetUp.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{meetUp.description}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Date & Time</p>
              <p className="text-sm font-medium">
                {meetUpRequestService.formatDateTime(meetUp.proposedDate, meetUp.proposedTime)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="text-sm font-medium">{meetUp.location?.name || 'Not specified'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {meetUp.status === 'pending' && meetUp.targetUserId?._id === currentUserId && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onAccept(meetUp._id)}
                  className="flex items-center gap-2 text-green-600 hover:text-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onDecline(meetUp._id)}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4" />
                  Decline
                </Button>
              </>
            )}
            {canCancel && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onCancel(meetUp._id)}
                className="flex items-center gap-2 text-gray-600 hover:text-red-600"
              >
                <Ban className="w-4 h-4" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// PaginationControls Component
function PaginationControls({ pagination, page, onPageChange }: {
  pagination: { currentPage: number; totalPages: number; totalItems: number; hasNext: boolean; hasPrev: boolean };
  page: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
      <p className="text-sm text-gray-600">
        Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total)
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!pagination.hasPrev}
          onClick={() => onPageChange(page - 1)}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(page + 1)}
          className="flex items-center gap-1"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// PartnerCard Component
function PartnerCard({ partner, onInvite }: {
  partner: { _id: string; name: string; email: string };
  onInvite: (partnerId: string) => void;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{partner.name}</h3>
            <p className="text-sm text-gray-600">{partner.email}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onInvite(partner._id)}
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Invite
        </Button>
      </div>
    </Card>
  );
}

// StatCard Component
function StatCard({ title, value, icon: Icon, color }: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

// CreateMeetUpModal Component
function CreateMeetUpModal({ onClose, onSubmit, targetUserId, isLoading }: {
  onClose: () => void;
  onSubmit: (formData: Record<string, unknown>) => void;
  targetUserId?: string;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    targetUserId: targetUserId || '',
    hotelId: '',
    type: 'casual',
    title: '',
    description: '',
    proposedDate: new Date().toISOString().split('T')[0], // Set to today's date
    proposedTime: {
      start: '',
      end: ''
    },
    location: {
      type: 'hotel_lobby',
      name: '',
      details: ''
    }
  });
  const [fetchingHotel, setFetchingHotel] = useState(true);
  const [users, setUsers] = useState<Array<{ _id?: string; id?: string; name: string; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Fetch hotel and users when modal opens
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch hotel data
        const hotelResponse = await api.get('/contact/hotels');
        const hotels = hotelResponse.data.data?.hotels || hotelResponse.data.hotels || [];
        
        if (hotels && hotels.length > 0) {
          const hotel = hotels[0];
          const hotelId = hotel.id || hotel._id;
          setFormData(prev => ({ ...prev, hotelId }));
        } else {
        }
      } catch (error) {
        toast.error('Failed to fetch hotel information');
      } finally {
        setFetchingHotel(false);
      }

      try {
        // Fetch users for dropdown
        const usersResponse = await api.get('/meet-up-requests/search/partners');
        const usersList = usersResponse.data.data?.users || [];
        setUsers(usersList);
      } catch (error) {
        toast.error('Failed to load users');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.targetUserId) {
      toast.error('Please select a user to meet up with');
      return;
    }

    if (!formData.hotelId) {
      toast.error('Hotel information is required');
      return;
    }

    if (!formData.proposedTime.start || !formData.proposedTime.end) {
      toast.error('Please specify both start and end times');
      return;
    }

    if (formData.proposedTime.start >= formData.proposedTime.end) {
      toast.error('End time must be after start time');
      return;
    }

    const selectedDate = new Date(formData.proposedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      toast.error('Please select a date in the future');
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Create Meet-Up Request</h2>
        
        {(fetchingHotel || loadingUsers) ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
            <span className="ml-2 text-gray-600">
              {fetchingHotel ? 'Loading hotel information...' : 'Loading users...'}
            </span>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select User
              </label>
              <select
                value={formData.targetUserId}
                onChange={(e) => setFormData(prev => ({ ...prev, targetUserId: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              >
                <option value="">Choose a user...</option>
                {users.map((user) => (
                  <option key={user._id || user.id} value={user._id || user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="casual">Casual</option>
                <option value="business">Business</option>
                <option value="social">Social</option>
                <option value="networking">Networking</option>
                <option value="activity">Activity</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter meet-up title"
                maxLength={200}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter meet-up description"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
              maxLength={1000}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={formData.proposedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData(prev => ({ ...prev, proposedDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <Input
                type="time"
                value={formData.proposedTime.start}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  proposedTime: { ...prev.proposedTime, start: e.target.value }
                }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <Input
                type="time"
                value={formData.proposedTime.end}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  proposedTime: { ...prev.proposedTime, end: e.target.value }
                }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Type
              </label>
              <select
                value={formData.location.type}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  location: { ...prev.location, type: e.target.value }
                }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="hotel_lobby">Hotel Lobby</option>
                <option value="restaurant">Restaurant</option>
                <option value="bar">Bar</option>
                <option value="meeting_room">Meeting Room</option>
                <option value="outdoor">Outdoor</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Name
              </label>
              <Input
                value={formData.location.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  location: { ...prev.location, name: e.target.value }
                }))}
                placeholder="Enter location name"
                maxLength={200}
                required
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Meet-Up'}
            </Button>
          </div>
        </form>
        )}
      </Card>
    </div>
  );
}
