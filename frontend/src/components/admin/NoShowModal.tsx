import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertTriangle, DollarSign, FileText, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import toast from 'react-hot-toast';

interface NoShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    _id: string;
    bookingNumber: string;
    userId?: { name: string };
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    currency: string;
    status: string;
  };
  onSuccess?: () => void;
}

interface NoShowFormData {
  reason: string;
  chargeAmount: number;
}

const NoShowModal: React.FC<NoShowModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess
}) => {
  const [formData, setFormData] = useState<NoShowFormData>({
    reason: '',
    chargeAmount: 0
  });
  const [errors, setErrors] = useState<Partial<NoShowFormData>>({});

  const queryClient = useQueryClient();

  const markAsNoShowMutation = useMutation({
    mutationFn: async (data: NoShowFormData) => {
      const response = await fetch(`/api/v1/bookings/${booking._id}/no-show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to mark booking as no-show');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Booking marked as no-show successfully');

      // Invalidate and refetch booking queries
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-details', booking._id] });

      onSuccess?.();
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark booking as no-show');
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<NoShowFormData> = {};

    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    } else if (formData.reason.length > 500) {
      newErrors.reason = 'Reason must be less than 500 characters';
    }

    if (formData.chargeAmount < 0) {
      newErrors.chargeAmount = 'Charge amount cannot be negative';
    }

    if (formData.chargeAmount > booking.totalAmount) {
      newErrors.chargeAmount = 'Charge amount cannot exceed booking total';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    markAsNoShowMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({ reason: '', chargeAmount: 0 });
    setErrors({});
    onClose();
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Mark as No-Show</h2>
              <p className="text-sm text-gray-600">Booking #{booking.bookingNumber}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="p-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Booking Summary */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Guest:</span>
              <span className="font-medium">{booking.userId?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Check-in:</span>
              <span className="font-medium">{formatDate(booking.checkIn)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Check-out:</span>
              <span className="font-medium">{formatDate(booking.checkOut)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium">{formatCurrency(booking.totalAmount, booking.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Status:</span>
              <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 mb-1">Important Notice</p>
                <p className="text-yellow-700">
                  Marking this booking as no-show will change its status permanently.
                  This action can be reversed by an admin or manager if needed.
                </p>
              </div>
            </div>
          </div>

          {/* Reason Field */}
          <div>
            <Label htmlFor="reason" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4" />
              Reason for No-Show *
            </Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Enter the reason for marking this booking as no-show..."
              rows={3}
              className={`w-full ${errors.reason ? 'border-red-500 focus:border-red-500' : ''}`}
              disabled={markAsNoShowMutation.isPending}
            />
            {errors.reason && (
              <p className="text-red-500 text-xs mt-1">{errors.reason}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              {formData.reason.length}/500 characters
            </p>
          </div>

          {/* Charge Amount Field */}
          <div>
            <Label htmlFor="chargeAmount" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="h-4 w-4" />
              No-Show Charge Amount
            </Label>
            <div className="relative">
              <Input
                id="chargeAmount"
                type="number"
                min="0"
                max={booking.totalAmount}
                step="0.01"
                value={formData.chargeAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, chargeAmount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                className={`w-full pl-8 ${errors.chargeAmount ? 'border-red-500 focus:border-red-500' : ''}`}
                disabled={markAsNoShowMutation.isPending}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                {booking.currency || 'USD'}
              </span>
            </div>
            {errors.chargeAmount && (
              <p className="text-red-500 text-xs mt-1">{errors.chargeAmount}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Leave as 0 for no charge. Maximum: {formatCurrency(booking.totalAmount, booking.currency)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={markAsNoShowMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="flex-1"
              disabled={markAsNoShowMutation.isPending}
            >
              {markAsNoShowMutation.isPending ? 'Processing...' : 'Mark as No-Show'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default NoShowModal;