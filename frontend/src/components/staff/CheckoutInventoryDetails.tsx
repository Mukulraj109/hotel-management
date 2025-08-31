import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { 
  X, 
  Package,
  CheckCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  Receipt,
  User,
  Calendar,
  Home
} from 'lucide-react';
import { checkoutInventoryService, CheckoutInventory } from '../../services/checkoutInventoryService';
import { formatDate, formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface CheckoutInventoryDetailsProps {
  inventory: CheckoutInventory;
  onSuccess: () => void;
  onClose: () => void;
}

export function CheckoutInventoryDetails({ inventory, onSuccess, onClose }: CheckoutInventoryDetailsProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'bank_transfer'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleProcessPayment = async () => {
    try {
      setProcessing(true);
      await checkoutInventoryService.processPayment(inventory._id, {
        paymentMethod,
        notes: paymentNotes
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to process payment:', error);
      toast.error('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'intact': return 'bg-green-100 text-green-800';
      case 'used': return 'bg-blue-100 text-blue-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      case 'missing': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'intact': return <CheckCircle className="h-4 w-4" />;
      case 'used': return <Clock className="h-4 w-4" />;
      case 'damaged': return <AlertTriangle className="h-4 w-4" />;
      case 'missing': return <X className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Checkout Inventory Details</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer & Booking Information */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer & Booking Details</h3>
              
              {/* Customer Information - Prominent Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-2">
                  <User className="h-6 w-6 text-blue-600 mr-3" />
                  <h4 className="text-lg font-semibold text-blue-900">
                    {inventory.bookingId.userId?.name || 'Walk-in Guest'}
                  </h4>
                </div>
                {inventory.bookingId.userId?.email && (
                  <p className="text-blue-700 ml-9">{inventory.bookingId.userId.email}</p>
                )}
                <div className="flex items-center mt-2 ml-9">
                  <Receipt className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-blue-800 font-medium">Booking #{inventory.bookingId.bookingNumber}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <Home className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Room</p>
                    <p className="font-medium">{inventory.roomId.roomNumber} ({inventory.roomId.type})</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Checked By Staff</p>
                    <p className="font-medium">{inventory.checkedBy.name}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Stay Period</p>
                    <p className="font-medium">
                      {formatDate(inventory.bookingId.checkIn)} - {formatDate(inventory.bookingId.checkOut)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Inventory Checked At</p>
                    <p className="font-medium">{formatDate(inventory.checkedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Package className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Items Status</p>
                    <p className="font-medium">
                      {inventory.items.filter(item => item.status !== 'intact').length} used / 
                      {inventory.items.filter(item => item.status === 'damaged').length} damaged / 
                      {inventory.items.filter(item => item.status === 'missing').length} missing
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Charges Due</p>
                    <p className="font-medium text-green-600">{formatCurrency(inventory.totalAmount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Status and Payment */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status & Payment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <Badge className={getStatusColor(inventory.status)}>
                    {inventory.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                  <Badge className={getPaymentStatusColor(inventory.paymentStatus)}>
                    {inventory.paymentStatus}
                  </Badge>
                </div>
                {inventory.paymentMethod && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                    <p className="font-medium capitalize">{inventory.paymentMethod.replace('_', ' ')}</p>
                  </div>
                )}
                {inventory.paidAt && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Paid At</p>
                    <p className="font-medium">{formatDate(inventory.paidAt)}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Items List */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Items</h3>
              <div className="space-y-3">
                {inventory.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.itemName}</h4>
                        <p className="text-sm text-gray-600 capitalize">{item.category}</p>
                      </div>
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusIcon(item.status)}
                        <span className="ml-1 capitalize">{item.status}</span>
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Quantity:</span>
                        <span className="ml-2 font-medium">{item.quantity}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Unit Price:</span>
                        <span className="ml-2 font-medium">{formatCurrency(item.unitPrice)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <span className="ml-2 font-medium">{formatCurrency(item.totalPrice)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 font-medium capitalize">{item.status}</span>
                      </div>
                    </div>
                    
                    {item.notes && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Notes: {item.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Billing Summary */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(inventory.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (18%):</span>
                  <span className="font-medium">{formatCurrency(inventory.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-green-600 border-t pt-2">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(inventory.totalAmount)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Notes */}
          {inventory.notes && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                <p className="text-gray-700">{inventory.notes}</p>
              </div>
            </Card>
          )}

          {/* Payment Form */}
          {inventory.status === 'completed' && inventory.paymentStatus === 'pending' && !showPaymentForm && (
            <div className="flex justify-center">
              <Button onClick={() => setShowPaymentForm(true)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Process Payment
              </Button>
            </div>
          )}

          {showPaymentForm && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Payment</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Notes
                    </label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Any notes about the payment..."
                      className="w-full p-2 border border-gray-300 rounded-md h-20"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Payment Confirmation</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Total amount to be collected: <strong>{formatCurrency(inventory.totalAmount)}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      onClick={handleProcessPayment} 
                      loading={processing}
                      className="flex-1"
                    >
                      Confirm Payment & Checkout
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPaymentForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
