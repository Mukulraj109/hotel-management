import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from '../../utils/toast';
import {
  ShoppingCart,
  DollarSign,
  CreditCard,
  Receipt,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  User,
  Building,
  Coffee,
  Dumbbell,
  Scissors,
  Car,
  ShoppingBag,
  Percent,
  Calculator,
  Printer,
  Archive,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';

interface OutletItem {
  id: string;
  name: string;
  category: string;
  price: number;
  outlet: string;
  quantity: number;
  discount?: number;
  tax?: number;
  timestamp: Date;
}

interface BillingSession {
  id: string;
  guestName: string;
  roomNumber: string;
  bookingId?: string;
  items: OutletItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'card' | 'room_charge' | 'corporate' | 'split';
  status: 'draft' | 'paid' | 'room_charged' | 'void';
  createdAt: Date;
  paidAt?: Date;
  notes?: string;
  splitPayments?: Array<{
    method: string;
    amount: number;
  }>;
}

interface Outlet {
  id: string;
  name: string;
  type: 'restaurant' | 'spa' | 'gym' | 'shop' | 'pool' | 'parking';
  icon: React.ReactNode;
  isActive: boolean;
  location: string;
}

const UnifiedBillingSystem: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<BillingSession | null>(null);
  const [outlets] = useState<Outlet[]>([
    { id: 'restaurant', name: 'Main Restaurant', type: 'restaurant', icon: <Coffee className="w-4 h-4" />, isActive: true, location: 'Ground Floor' },
    { id: 'spa', name: 'Wellness Spa', type: 'spa', icon: <Scissors className="w-4 h-4" />, isActive: true, location: '2nd Floor' },
    { id: 'gym', name: 'Fitness Center', type: 'gym', icon: <Dumbbell className="w-4 h-4" />, isActive: true, location: 'Basement' },
    { id: 'shop', name: 'Gift Shop', type: 'shop', icon: <ShoppingBag className="w-4 h-4" />, isActive: true, location: 'Lobby' },
    { id: 'parking', name: 'Valet Parking', type: 'parking', icon: <Car className="w-4 h-4" />, isActive: true, location: 'Ground Floor' }
  ]);

  const [selectedOutlet, setSelectedOutlet] = useState<string>('restaurant');
  const [guestInfo, setGuestInfo] = useState({ name: '', roomNumber: '', bookingId: '' });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isPercentage, setIsPercentage] = useState(true);
  const [splitPayments, setSplitPayments] = useState<Array<{ method: string; amount: number }>>([]);

  // Mock items for different outlets
  const outletItems = {
    restaurant: [
      { id: 'food-1', name: 'Club Sandwich', category: 'Main Course', price: 850, outlet: 'restaurant' },
      { id: 'food-2', name: 'Caesar Salad', category: 'Appetizer', price: 650, outlet: 'restaurant' },
      { id: 'drink-1', name: 'Fresh Orange Juice', category: 'Beverages', price: 350, outlet: 'restaurant' },
      { id: 'food-3', name: 'Grilled Salmon', category: 'Main Course', price: 1450, outlet: 'restaurant' }
    ],
    spa: [
      { id: 'spa-1', name: 'Swedish Massage (60 min)', category: 'Massage', price: 3500, outlet: 'spa' },
      { id: 'spa-2', name: 'Facial Treatment', category: 'Skincare', price: 2800, outlet: 'spa' },
      { id: 'spa-3', name: 'Aromatherapy Session', category: 'Wellness', price: 2200, outlet: 'spa' }
    ],
    gym: [
      { id: 'gym-1', name: 'Personal Training (1 hr)', category: 'Training', price: 2000, outlet: 'gym' },
      { id: 'gym-2', name: 'Day Pass', category: 'Access', price: 500, outlet: 'gym' },
      { id: 'gym-3', name: 'Equipment Rental', category: 'Rental', price: 200, outlet: 'gym' }
    ],
    shop: [
      { id: 'shop-1', name: 'Hotel Branded T-Shirt', category: 'Apparel', price: 1200, outlet: 'shop' },
      { id: 'shop-2', name: 'Local Handicrafts', category: 'Souvenirs', price: 800, outlet: 'shop' },
      { id: 'shop-3', name: 'Premium Chocolates', category: 'Food', price: 950, outlet: 'shop' }
    ],
    parking: [
      { id: 'park-1', name: 'Valet Service (per day)', category: 'Service', price: 500, outlet: 'parking' },
      { id: 'park-2', name: 'Car Wash', category: 'Service', price: 800, outlet: 'parking' }
    ]
  };

  useEffect(() => {
    if (!currentSession && guestInfo.name && guestInfo.roomNumber) {
      initializeSession();
    }
  }, [guestInfo]);

  const initializeSession = () => {
    const newSession: BillingSession = {
      id: Date.now().toString(),
      guestName: guestInfo.name,
      roomNumber: guestInfo.roomNumber,
      bookingId: guestInfo.bookingId,
      items: [],
      subtotal: 0,
      totalDiscount: 0,
      totalTax: 0,
      grandTotal: 0,
      paymentMethod: 'room_charge',
      status: 'draft',
      createdAt: new Date()
    };
    setCurrentSession(newSession);
  };

  const addItemToSession = (item: any) => {
    if (!currentSession) {
      toast.error('Please start a billing session first');
      return;
    }

    const newItem: OutletItem = {
      id: `${item.id}-${Date.now()}`,
      name: item.name,
      category: item.category,
      price: item.price,
      outlet: item.outlet,
      quantity: 1,
      tax: item.price * 0.18, // 18% GST
      timestamp: new Date()
    };

    const updatedSession = {
      ...currentSession,
      items: [...currentSession.items, newItem]
    };

    calculateTotals(updatedSession);
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (!currentSession || quantity < 1) return;

    const updatedSession = {
      ...currentSession,
      items: currentSession.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    };

    calculateTotals(updatedSession);
  };

  const removeItem = (itemId: string) => {
    if (!currentSession) return;

    const updatedSession = {
      ...currentSession,
      items: currentSession.items.filter(item => item.id !== itemId)
    };

    calculateTotals(updatedSession);
  };

  const applyDiscount = () => {
    if (!currentSession) return;

    let discountValue = 0;
    if (isPercentage) {
      discountValue = (currentSession.subtotal * discountAmount) / 100;
    } else {
      discountValue = discountAmount;
    }

    const updatedSession = {
      ...currentSession,
      totalDiscount: discountValue
    };

    calculateTotals(updatedSession);
  };

  const calculateTotals = (session: BillingSession) => {
    const subtotal = session.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalTax = session.items.reduce((sum, item) => sum + ((item.tax || 0) * item.quantity), 0);
    const grandTotal = subtotal + totalTax - session.totalDiscount;

    const updatedSession = {
      ...session,
      subtotal,
      totalTax,
      grandTotal
    };

    setCurrentSession(updatedSession);
  };

  const processPayment = async (paymentMethod: string) => {
    if (!currentSession) return;

    try {
      // Mock API call for payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const updatedSession = {
        ...currentSession,
        paymentMethod: paymentMethod as any,
        status: paymentMethod === 'room_charge' ? 'room_charged' : 'paid',
        paidAt: new Date()
      };

      setCurrentSession(updatedSession);
      setPaymentDialogOpen(false);
      
      toast.success(`Payment processed successfully via ${paymentMethod}`);
      
      // Generate receipt
      generateReceipt(updatedSession);
    } catch (error) {
      toast.error('Payment processing failed');
    }
  };

  const processSplitPayment = async () => {
    if (!currentSession || splitPayments.length === 0) return;

    const totalSplitAmount = splitPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    if (Math.abs(totalSplitAmount - currentSession.grandTotal) > 0.01) {
      toast.error('Split payment amounts must equal the total bill');
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const updatedSession = {
        ...currentSession,
        paymentMethod: 'split',
        splitPayments,
        status: 'paid',
        paidAt: new Date()
      };

      setCurrentSession(updatedSession);
      setPaymentDialogOpen(false);
      toast.success('Split payment processed successfully');
      generateReceipt(updatedSession);
    } catch (error) {
      toast.error('Split payment processing failed');
    }
  };

  const generateReceipt = (session: BillingSession) => {
    // Mock receipt generation
    const receiptData = {
      sessionId: session.id,
      guestName: session.guestName,
      roomNumber: session.roomNumber,
      items: session.items,
      totals: {
        subtotal: session.subtotal,
        discount: session.totalDiscount,
        tax: session.totalTax,
        grandTotal: session.grandTotal
      },
      paymentMethod: session.paymentMethod,
      timestamp: session.paidAt || new Date()
    };

    console.log('Receipt generated:', receiptData);
    toast.success('Receipt generated and sent to printer');
  };

  const voidTransaction = () => {
    if (!currentSession) return;
    
    const updatedSession = { ...currentSession, status: 'void' as const };
    setCurrentSession(updatedSession);
    toast.success('Transaction voided successfully');
  };

  const clearSession = () => {
    setCurrentSession(null);
    setGuestInfo({ name: '', roomNumber: '', bookingId: '' });
    setDiscountAmount(0);
    setSplitPayments([]);
  };

  const addSplitPayment = () => {
    setSplitPayments([...splitPayments, { method: 'cash', amount: 0 }]);
  };

  const updateSplitPayment = (index: number, field: string, value: any) => {
    const updated = splitPayments.map((payment, i) => 
      i === index ? { ...payment, [field]: value } : payment
    );
    setSplitPayments(updated);
  };

  const removeSplitPayment = (index: number) => {
    setSplitPayments(splitPayments.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'room_charged': return <Building className="w-4 h-4 text-blue-500" />;
      case 'void': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'draft': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="h-screen flex">
      {/* Left Panel - Guest Info & Items */}
      <div className="flex-1 p-4 space-y-4">
        {/* Guest Information */}
        {!currentSession && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="guestName">Guest Name *</Label>
                  <Input
                    id="guestName"
                    value={guestInfo.name}
                    onChange={(e) => setGuestInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="roomNumber">Room Number *</Label>
                  <Input
                    id="roomNumber"
                    value={guestInfo.roomNumber}
                    onChange={(e) => setGuestInfo(prev => ({ ...prev, roomNumber: e.target.value }))}
                    placeholder="101"
                  />
                </div>
                <div>
                  <Label htmlFor="bookingId">Booking ID</Label>
                  <Input
                    id="bookingId"
                    value={guestInfo.bookingId}
                    onChange={(e) => setGuestInfo(prev => ({ ...prev, bookingId: e.target.value }))}
                    placeholder="BK-2024-001"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Header */}
        {currentSession && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(currentSession.status)}
                  <div>
                    <h3 className="font-medium">{currentSession.guestName}</h3>
                    <p className="text-sm text-gray-500">Room {currentSession.roomNumber} • Session #{currentSession.id.slice(-6)}</p>
                  </div>
                  <Badge className={
                    currentSession.status === 'paid' ? 'bg-green-100 text-green-800' :
                    currentSession.status === 'room_charged' ? 'bg-blue-100 text-blue-800' :
                    currentSession.status === 'void' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {currentSession.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={voidTransaction}>
                    <XCircle className="w-4 h-4 mr-1" />
                    Void
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSession}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    New Session
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Outlet Selection & Items */}
        <Card className="flex-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Add Items</CardTitle>
              <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map(outlet => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      <div className="flex items-center gap-2">
                        {outlet.icon}
                        {outlet.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {outletItems[selectedOutlet as keyof typeof outletItems]?.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-gray-500">{item.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatCurrency(item.price)}</span>
                  <Button size="sm" onClick={() => addItemToSession(item)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Bill Summary */}
      <div className="w-96 border-l bg-gray-50 p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Bill Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {currentSession?.items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.outlet}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm w-8 text-center">{item.quantity}</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(item.id)}
                      className="w-6 h-6 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {(!currentSession?.items || currentSession.items.length === 0) && (
                <p className="text-center text-gray-500 py-8">No items added</p>
              )}
            </div>

            <Separator />

            {/* Discount Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Discount</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-20"
                    placeholder="0"
                  />
                  <Select value={isPercentage ? 'percentage' : 'fixed'} onValueChange={(v) => setIsPercentage(v === 'percentage')}>
                    <SelectTrigger className="w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">₹</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={applyDiscount}>
                    Apply
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(currentSession?.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (18%):</span>
                <span>{formatCurrency(currentSession?.totalTax || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Discount:</span>
                <span>-{formatCurrency(currentSession?.totalDiscount || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatCurrency(currentSession?.grandTotal || 0)}</span>
              </div>
            </div>

            {/* Payment Buttons */}
            {currentSession && currentSession.status === 'draft' && currentSession.items.length > 0 && (
              <div className="space-y-2">
                <Button className="w-full" onClick={() => processPayment('room_charge')}>
                  <Building className="w-4 h-4 mr-2" />
                  Charge to Room
                </Button>
                <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Other Payment Methods
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Payment Options</DialogTitle>
                      <DialogDescription>
                        Total Amount: {formatCurrency(currentSession.grandTotal)}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="single" className="space-y-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="single">Single Payment</TabsTrigger>
                        <TabsTrigger value="split">Split Payment</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="single" className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <Button onClick={() => processPayment('cash')}>Cash</Button>
                          <Button onClick={() => processPayment('card')}>Card</Button>
                          <Button onClick={() => processPayment('corporate')}>Corporate</Button>
                          <Button onClick={() => processPayment('room_charge')}>Room Charge</Button>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="split" className="space-y-4">
                        <div className="space-y-2">
                          {splitPayments.map((payment, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Select
                                value={payment.method}
                                onValueChange={(value) => updateSplitPayment(index, 'method', value)}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="card">Card</SelectItem>
                                  <SelectItem value="corporate">Corporate</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                placeholder="Amount"
                                value={payment.amount || ''}
                                onChange={(e) => updateSplitPayment(index, 'amount', parseFloat(e.target.value) || 0)}
                                className="w-24"
                              />
                              <Button size="sm" variant="outline" onClick={() => removeSplitPayment(index)}>
                                <Minus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          
                          <Button onClick={addSplitPayment} variant="outline" className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Payment Method
                          </Button>
                          
                          <div className="text-sm text-gray-600">
                            Split Total: {formatCurrency(splitPayments.reduce((sum, p) => sum + p.amount, 0))} / {formatCurrency(currentSession.grandTotal)}
                          </div>
                          
                          <Button onClick={processSplitPayment} className="w-full">
                            Process Split Payment
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Receipt Actions */}
            {currentSession && (currentSession.status === 'paid' || currentSession.status === 'room_charged') && (
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
                <Button variant="outline" className="w-full">
                  <Archive className="w-4 h-4 mr-2" />
                  Email Receipt
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UnifiedBillingSystem;