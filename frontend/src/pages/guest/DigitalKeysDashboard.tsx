import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Key, 
  QrCode, 
  Share2, 
  Trash2, 
  Eye, 
  Clock, 
  Users, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Download, 
  Copy, 
  MoreHorizontal,
  Calendar,
  MapPin,
  Building,
  User,
  Smartphone,
  Globe,
  Lock,
  Unlock,
  History,
  BarChart3,
  Filter,
  Search
} from 'lucide-react';
import { digitalKeyService, DigitalKey, KeyStats, GenerateKeyRequest, ShareKeyRequest } from '../../services/digitalKeyService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { QRCodeSVG as QRCode } from 'qrcode.react';

export default function DigitalKeysDashboard() {
  const [activeTab, setActiveTab] = useState<'my-keys' | 'shared-keys' | 'stats'>('my-keys');
  const [selectedKey, setSelectedKey] = useState<DigitalKey | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const queryClient = useQueryClient();

  // Queries
  const { data: keysData, isLoading: keysLoading } = useQuery({
    queryKey: ['digital-keys', currentPage, statusFilter, typeFilter],
    queryFn: () => digitalKeyService.getKeys({
      page: currentPage,
      status: statusFilter || undefined,
      type: typeFilter || undefined
    })
  });

  const { data: sharedKeysData, isLoading: sharedKeysLoading } = useQuery({
    queryKey: ['shared-keys', currentPage],
    queryFn: () => digitalKeyService.getSharedKeys({ page: currentPage }),
    enabled: activeTab === 'shared-keys'
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['key-stats'],
    queryFn: () => digitalKeyService.getStats(),
    enabled: activeTab === 'stats'
  });

  // Mutations
  const generateKeyMutation = useMutation({
    mutationFn: (request: GenerateKeyRequest) => digitalKeyService.generateKey(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-keys'] });
      setShowGenerateModal(false);
      toast.success('Digital key generated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate key');
    }
  });

  const shareKeyMutation = useMutation({
    mutationFn: ({ keyId, request }: { keyId: string; request: ShareKeyRequest }) =>
      digitalKeyService.shareKey(keyId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-keys'] });
      setShowShareModal(false);
      toast.success('Key shared successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to share key');
    }
  });

  const revokeKeyMutation = useMutation({
    mutationFn: (keyId: string) => digitalKeyService.revokeKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-keys'] });
      toast.success('Key revoked successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to revoke key');
    }
  });

  const revokeShareMutation = useMutation({
    mutationFn: ({ keyId, userIdOrEmail }: { keyId: string; userIdOrEmail: string }) =>
      digitalKeyService.revokeShare(keyId, userIdOrEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-keys'] });
      toast.success('Share revoked successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to revoke share');
    }
  });

  const filteredKeys = keysData?.keys.filter(key => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        key.roomId.number.toLowerCase().includes(searchLower) ||
        key.hotelId.name.toLowerCase().includes(searchLower) ||
        key.keyCode.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) || [];

  const handleGenerateKey = (formData: GenerateKeyRequest) => {
    generateKeyMutation.mutate(formData);
  };

  const handleShareKey = (keyId: string, formData: ShareKeyRequest) => {
    shareKeyMutation.mutate({ keyId, request: formData });
  };

  const handleRevokeKey = (keyId: string) => {
    if (window.confirm('Are you sure you want to revoke this key? This action cannot be undone.')) {
      revokeKeyMutation.mutate(keyId);
    }
  };

  const handleRevokeShare = (keyId: string, userIdOrEmail: string) => {
    if (window.confirm('Are you sure you want to revoke access for this user?')) {
      revokeShareMutation.mutate({ keyId, userIdOrEmail });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const downloadQRCode = (key: DigitalKey) => {
    const canvas = document.querySelector(`#qr-${key._id} canvas`) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `key-${key.keyCode}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  if (keysLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Digital Room Keys</h1>
          <p className="text-gray-600">Manage your digital room access keys</p>
        </div>
        <Button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Generate New Key
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'my-keys', label: 'My Keys', count: keysData?.pagination.totalItems || 0 },
            { id: 'shared-keys', label: 'Shared Keys', count: sharedKeysData?.pagination.totalItems || 0 },
            { id: 'stats', label: 'Statistics' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      {activeTab === 'my-keys' && (
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Input
              placeholder="Search keys..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
            <option value="used">Used</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">All Types</option>
            <option value="primary">Primary</option>
            <option value="temporary">Temporary</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      )}

      {/* Content */}
      {activeTab === 'my-keys' && (
        <div className="grid gap-6">
          {filteredKeys.length === 0 ? (
            <Card className="p-8 text-center">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No digital keys found</h3>
              <p className="text-gray-600 mb-4">
                Generate your first digital room key to get started.
              </p>
              <Button onClick={() => setShowGenerateModal(true)}>
                Generate Key
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredKeys.map((key) => (
                <KeyCard
                  key={key._id}
                  digitalKey={key}
                  onViewDetails={() => setSelectedKey(key)}
                  onShare={() => {
                    setSelectedKey(key);
                    setShowShareModal(true);
                  }}
                  onRevoke={() => handleRevokeKey(key._id)}
                  onViewLogs={() => {
                    setSelectedKey(key);
                    setShowLogsModal(true);
                  }}
                  onCopyCode={() => copyToClipboard(key.keyCode)}
                  onDownloadQR={() => downloadQRCode(key)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {keysData && keysData.pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={!keysData.pagination.hasPrev}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {keysData.pagination.currentPage} of {keysData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={!keysData.pagination.hasNext}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'shared-keys' && (
        <div className="grid gap-6">
          {sharedKeysLoading ? (
            <LoadingSpinner />
          ) : sharedKeysData?.keys.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shared keys</h3>
              <p className="text-gray-600">
                Keys shared with you will appear here.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sharedKeysData?.keys.map((key) => (
                <SharedKeyCard
                  key={key._id}
                  digitalKey={key}
                  onViewDetails={() => setSelectedKey(key)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="grid gap-6">
          {statsLoading ? (
            <LoadingSpinner />
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Keys"
                value={stats.totalKeys}
                icon={Key}
                color="bg-blue-100 text-blue-600"
              />
              <StatCard
                title="Active Keys"
                value={stats.activeKeys}
                icon={CheckCircle}
                color="bg-green-100 text-green-600"
              />
              <StatCard
                title="Shared Keys"
                value={stats.sharedKeys}
                icon={Users}
                color="bg-purple-100 text-purple-600"
              />
              <StatCard
                title="Total Uses"
                value={stats.totalUses}
                icon={BarChart3}
                color="bg-orange-100 text-orange-600"
              />
            </div>
          ) : null}
        </div>
      )}

      {/* Modals */}
      {showGenerateModal && (
        <GenerateKeyModal
          onClose={() => setShowGenerateModal(false)}
          onSubmit={handleGenerateKey}
          isLoading={generateKeyMutation.isPending}
        />
      )}

      {showShareModal && selectedKey && (
        <ShareKeyModal
          digitalKey={selectedKey}
          onClose={() => setShowShareModal(false)}
          onSubmit={(formData) => handleShareKey(selectedKey._id, formData)}
          isLoading={shareKeyMutation.isPending}
        />
      )}

      {showLogsModal && selectedKey && (
        <KeyLogsModal
          digitalKey={selectedKey}
          onClose={() => setShowLogsModal(false)}
        />
      )}
    </div>
  );
}

interface KeyCardProps {
  digitalKey: DigitalKey;
  onViewDetails: () => void;
  onShare: () => void;
  onRevoke: () => void;
  onViewLogs: () => void;
  onCopyCode: () => void;
  onDownloadQR: () => void;
}

function KeyCard({
  digitalKey,
  onViewDetails,
  onShare,
  onRevoke,
  onViewLogs,
  onCopyCode,
  onDownloadQR
}: KeyCardProps) {
  const typeInfo = digitalKeyService.getKeyTypeInfo(digitalKey.type);
  const statusInfo = digitalKeyService.getStatusInfo(digitalKey.status);
  const expirationStatus = digitalKeyService.getExpirationStatus(digitalKey);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">{typeInfo.icon}</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Room {digitalKey.roomId.number}
              </h3>
              <p className="text-sm text-gray-600">{digitalKey.hotelId.name}</p>
            </div>
            <div className="flex gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Key Code</p>
              <p className="font-mono text-sm font-medium">{digitalKey.keyCode}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Valid Until</p>
              <p className="text-sm font-medium">
                {new Date(digitalKey.validUntil).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Uses</p>
              <p className="text-sm font-medium">
                {digitalKey.currentUses} / {digitalKeyService.formatRemainingUses(digitalKey.remainingUses)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Shared</p>
              <p className="text-sm font-medium">
                {digitalKey.sharedWith.filter(s => s.isActive).length} users
              </p>
            </div>
          </div>

          {expirationStatus === 'expiring' && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  This key expires in less than 24 hours
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Details
            </Button>
            {digitalKeyService.canShareKey(digitalKey) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onViewLogs}
              className="flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              Logs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCopyCode}
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Code
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadQR}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download QR
            </Button>
            {digitalKeyService.canRevokeKey(digitalKey) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRevoke}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Revoke
              </Button>
            )}
          </div>
        </div>

        <div className="ml-6">
          <div id={`qr-${digitalKey._id}`}>
            <QRCode
              value={digitalKey.qrCode}
              size={120}
              level="M"
              includeMargin={true}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

interface SharedKeyCardProps {
  digitalKey: DigitalKey;
  onViewDetails: () => void;
}

function SharedKeyCard({ digitalKey, onViewDetails }: SharedKeyCardProps) {
  const typeInfo = digitalKeyService.getKeyTypeInfo(digitalKey.type);
  const statusInfo = digitalKeyService.getStatusInfo(digitalKey);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{typeInfo.icon}</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Room {digitalKey.roomId.number}
            </h3>
            <p className="text-sm text-gray-600">{digitalKey.hotelId.name}</p>
            <p className="text-xs text-gray-500">
              Shared by {digitalKey.userId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: any;
  color: string;
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

interface GenerateKeyModalProps {
  onClose: () => void;
  onSubmit: (data: GenerateKeyRequest) => void;
  isLoading: boolean;
}

function GenerateKeyModal({ onClose, onSubmit, isLoading }: GenerateKeyModalProps) {
  const [formData, setFormData] = useState<GenerateKeyRequest>({
    bookingId: '',
    type: 'primary',
    maxUses: -1,
    securitySettings: {
      requirePin: false,
      allowSharing: true,
      maxSharedUsers: 5,
      requireApproval: false
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Generate Digital Key</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Booking ID
            </label>
            <Input
              value={formData.bookingId}
              onChange={(e) => setFormData(prev => ({ ...prev, bookingId: e.target.value }))}
              placeholder="Enter booking ID"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="primary">Primary</option>
              <option value="temporary">Temporary</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Uses (-1 for unlimited)
            </label>
            <Input
              type="number"
              value={formData.maxUses}
              onChange={(e) => setFormData(prev => ({ ...prev, maxUses: parseInt(e.target.value) }))}
              min="-1"
            />
          </div>
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Key'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

interface ShareKeyModalProps {
  digitalKey: DigitalKey;
  onClose: () => void;
  onSubmit: (data: ShareKeyRequest) => void;
  isLoading: boolean;
}

function ShareKeyModal({ digitalKey, onClose, onSubmit, isLoading }: ShareKeyModalProps) {
  const [formData, setFormData] = useState<ShareKeyRequest>({
    email: '',
    name: '',
    expiresAt: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Share Digital Key</h2>
        <p className="text-sm text-gray-600 mb-4">
          Share access to Room {digitalKey.roomId.number} with another person.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter full name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires At (Optional)
            </label>
            <Input
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
            />
          </div>
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Sharing...' : 'Share Key'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

interface KeyLogsModalProps {
  digitalKey: DigitalKey;
  onClose: () => void;
}

function KeyLogsModal({ digitalKey, onClose }: KeyLogsModalProps) {
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['key-logs', digitalKey._id],
    queryFn: () => digitalKeyService.getKeyLogs(digitalKey._id)
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Access Logs</h2>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Activity history for Room {digitalKey.roomId.number}
        </p>
        
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-3">
            {logsData?.logs.map((log, index) => {
              const actionInfo = digitalKeyService.getActionInfo(log.action);
              return (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className={`p-2 rounded-full ${actionInfo.color}`}>
                    <span className="text-lg">{actionInfo.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{actionInfo.label}</p>
                    <p className="text-sm text-gray-600">
                      {digitalKeyService.formatTimeAgo(log.timestamp)}
                    </p>
                    {log.deviceInfo && (
                      <p className="text-xs text-gray-500">
                        {log.deviceInfo.ipAddress} • {log.deviceInfo.userAgent}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
