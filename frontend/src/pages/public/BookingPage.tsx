import React, { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import {
  Calendar,
  Users,
  ArrowLeft,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Minus,
  Plus,
  MapPin,
  Shield,
  Lock
} from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { paymentService } from '../../services/paymentService';
import { Room, CreateBookingRequest } from '../../types/booking';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// Initialize Stripe
const stripePromise = loadStripe((import.meta as any).env?.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51ABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZA567BCD890EFG');

// Payment Form Component
interface PaymentFormProps {
  onPaymentSuccess: () => void;
  totalAmount: number;
  clientSecret: string;
}

function PaymentForm({ onPaymentSuccess, totalAmount, clientSecret }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);

  const handlePayment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      return;
    }

    setIsProcessing(true);
    setPaymentError('');

    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      }
    });

    if (error) {
      setPaymentError(error.message || 'Payment failed');
      setIsProcessing(false);
    } else {
      setPaymentSucceeded(true);
      toast.success('Payment completed successfully!');
      setTimeout(() => onPaymentSuccess(), 2000);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  };

  if (paymentSucceeded) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-600">Processing your booking...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handlePayment} className="space-y-6">
      <div className="p-4 border border-gray-200 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        <div className="p-3 border border-gray-300 rounded-md bg-white">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {paymentError && (
        <div className="flex items-center p-3 text-red-700 bg-red-50 rounded-md">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span className="text-sm">{paymentError}</span>
        </div>
      )}

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <span className="text-lg font-medium">Total Amount:</span>
        <span className="text-2xl font-bold text-blue-600">
          ₹{totalAmount.toFixed(2)}
        </span>
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 mr-2" />
            Pay ₹{totalAmount.toFixed(2)}
          </>
        )}
      </button>

      <div className="flex items-center justify-center text-sm text-gray-500">
        <Shield className="h-4 w-4 mr-1" />
        Secured by Stripe
      </div>
    </form>
  );
}

// Booking form schema
const bookingSchema = z.object({
  checkIn: z.string().min(1, 'Check-in date is required'),
  checkOut: z.string().min(1, 'Check-out date is required'),
  adults: z.number().min(1, 'At least 1 adult is required').max(10, 'Maximum 10 adults'),
  children: z.number().min(0).max(10, 'Maximum 10 children'),
  specialRequests: z.string().optional(),
}).refine((data) => {
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  return checkOut > checkIn;
}, {
  message: 'Check-out date must be after check-in date',
  path: ['checkOut'],
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function BookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    searchParams.get('roomId')
  );
  const [step, setStep] = useState<'selection' | 'details' | 'payment' | 'confirmation'>('selection');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      checkIn: searchParams.get('checkIn') || '',
      checkOut: searchParams.get('checkOut') || '',
      adults: parseInt(searchParams.get('adults') || '2'),
      children: parseInt(searchParams.get('children') || '0'),
      specialRequests: '',
    },
  });

  const watchedValues = watch();

  // Fetch available rooms based on dates
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms', 'available', watchedValues.checkIn, watchedValues.checkOut],
    queryFn: () => bookingService.getRooms({
      checkIn: watchedValues.checkIn,
      checkOut: watchedValues.checkOut,
      adults: watchedValues.adults,
      children: watchedValues.children,
    }),
    enabled: !!(watchedValues.checkIn && watchedValues.checkOut),
  });

  // Fetch selected room details
  const { data: selectedRoomData } = useQuery({
    queryKey: ['room', selectedRoomId],
    queryFn: () => bookingService.getRoomById(selectedRoomId!),
    enabled: !!selectedRoomId,
  });

  const rooms = roomsData?.data?.rooms || [];
  const selectedRoom = selectedRoomData?.data?.room;

  // Calculate booking details
  const calculateBookingDetails = () => {
    if (!watchedValues.checkIn || !watchedValues.checkOut || !selectedRoom) {
      return null;
    }

    const checkIn = new Date(watchedValues.checkIn);
    const checkOut = new Date(watchedValues.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const roomTotal = selectedRoom.currentRate * nights;
    const taxes = roomTotal * 0.15; // 15% tax
    const total = roomTotal + taxes;

    return {
      nights,
      roomTotal,
      taxes,
      total,
      checkIn,
      checkOut,
    };
  };

  const bookingDetails = calculateBookingDetails();

  // Handle guest count changes
  const updateGuestCount = (type: 'adults' | 'children', increment: boolean) => {
    const currentValue = watchedValues[type];
    const newValue = increment ? currentValue + 1 : Math.max(type === 'adults' ? 1 : 0, currentValue - 1);
    const maxValue = 10;
    
    if (newValue <= maxValue) {
      setValue(type, newValue);
    }
  };

  // Handle room selection
  const handleRoomSelect = (room: Room) => {
    setSelectedRoomId(room._id);
    setStep('details');
  };

  // Create booking and payment intent
  const createBookingAndPaymentIntent = async () => {
    if (!bookingDetails) return;
    
    try {
      // Debug logging
      console.log('Selected room:', selectedRoom);
      console.log('Selected room ID:', selectedRoomId);
      console.log('Watched values:', watchedValues);
      
      // Get hotelId from selected room or first available room
      let hotelId: any = selectedRoom?.hotelId;
      if (!hotelId && rooms.length > 0) {
        hotelId = rooms[0].hotelId;
      }
      if (!hotelId) {
        throw new Error('No hotel ID available');
      }

      // First create the booking
      const bookingRequest: CreateBookingRequest = {
        hotelId: typeof hotelId === 'object' ? hotelId._id : hotelId,
        roomIds: [selectedRoomId!],
        checkIn: new Date(watchedValues.checkIn).toISOString(),
        checkOut: new Date(watchedValues.checkOut).toISOString(),
        guestDetails: {
          adults: watchedValues.adults,
          children: watchedValues.children,
          specialRequests: watchedValues.specialRequests || undefined,
        },
        idempotencyKey: `booking-${Date.now()}-${user?._id}`,
      };

      console.log('Booking request:', bookingRequest);

      const bookingResponse = await bookingService.createBooking(bookingRequest);
      
      if (bookingResponse.status !== 'success') {
        throw new Error('Failed to create booking');
      }

      const bookingId = bookingResponse.data.booking._id;

      // Then create payment intent with the real booking ID
      const paymentResponse = await paymentService.createPaymentIntent({
        bookingId: bookingId,
        amount: Math.round(bookingDetails.total * 100), // Convert to cents
        currency: 'INR'
      });
      
      setClientSecret(paymentResponse.data.clientSecret);
      setPaymentIntentId(paymentResponse.data.paymentIntentId);
      setStep('payment');
    } catch (error: any) {
      console.error('Failed to create booking or payment intent:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to initialize booking and payment';
      toast.error(errorMessage);
    }
  };

  // Handle details step submission - proceed to payment
  const onDetailsSubmit = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to make a booking');
      navigate('/login', { state: { from: location } });
      return;
    }

    if (!selectedRoomId || !bookingDetails) {
      toast.error('Please select a room and dates');
      return;
    }

    await createBookingAndPaymentIntent();
  };

  // Handle final booking submission after payment
  const onSubmit = async (data: BookingFormData) => {
    if (!paymentIntentId) {
      toast.error('Payment not completed');
      return;
    }

    setIsSubmitting(true);
    try {
      // The booking and payment are already completed
      // Just show confirmation
      setStep('confirmation');
      toast.success('Booking and payment completed successfully!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setStep('details')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Details
            </button>
            
            <Card>
              <div className="text-center mb-6">
                <CreditCard className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Payment</h1>
                <p className="text-gray-600">
                  Secure payment processing powered by Stripe
                </p>
              </div>

              {clientSecret && bookingDetails ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentForm
                    onPaymentSuccess={() => handleSubmit(onSubmit)()}
                    totalAmount={bookingDetails.total}
                    clientSecret={clientSecret}
                  />
                </Elements>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Initializing payment...</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'confirmation') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Booking Confirmed!
            </h1>
            <p className="text-gray-600 mb-8">
              Thank you for your booking. You will receive a confirmation email shortly.
            </p>
            <div className="space-x-4">
              <Button onClick={() => navigate('/app')}>
                View My Bookings
              </Button>
              <Button variant="secondary" onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => {
              if (step === 'details') {
                setStep('selection');
              } else {
                navigate(-1);
              }
            }}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {step === 'details' ? 'Back to Room Selection' : 'Back'}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {step === 'selection' ? 'Select Room & Dates' : 'Booking Details'}
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {step === 'selection' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Search Form */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <h2 className="text-xl font-bold mb-6">Search Availability</h2>
                <div className="space-y-4">
                  <Input
                    {...register('checkIn')}
                    type="date"
                    label="Check-in"
                    min={today}
                    error={errors.checkIn?.message}
                  />
                  <Input
                    {...register('checkOut')}
                    type="date"
                    label="Check-out"
                    min={watchedValues.checkIn || today}
                    error={errors.checkOut?.message}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Guests
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Adults</span>
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => updateGuestCount('adults', false)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                            disabled={watchedValues.adults <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium">
                            {watchedValues.adults}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateGuestCount('adults', true)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                            disabled={watchedValues.adults >= 10}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Children</span>
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => updateGuestCount('children', false)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                            disabled={watchedValues.children <= 0}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium">
                            {watchedValues.children}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateGuestCount('children', true)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                            disabled={watchedValues.children >= 10}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {errors.adults && (
                    <p className="text-sm text-red-600">{errors.adults.message}</p>
                  )}
                  {errors.children && (
                    <p className="text-sm text-red-600">{errors.children.message}</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Available Rooms */}
            <div className="lg:col-span-2">
              {!watchedValues.checkIn || !watchedValues.checkOut ? (
                <Card>
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Select Your Dates
                    </h3>
                    <p className="text-gray-600">
                      Choose check-in and check-out dates to see available rooms
                    </p>
                  </div>
                </Card>
              ) : roomsLoading ? (
                <Card>
                  <LoadingSpinner />
                </Card>
              ) : rooms.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Rooms Available
                    </h3>
                    <p className="text-gray-600">
                      No rooms are available for the selected dates. Please try different dates.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Available Rooms ({rooms.length})
                    </h2>
                  </div>
                  
                  <div className="space-y-4">
                    {rooms.map((room) => (
                      <Card key={room._id} className="overflow-hidden">
                        <div className="flex flex-col md:flex-row">
                          <div className="md:w-1/3">
                            {room.images && room.images.length > 0 ? (
                              <img
                                src={room.images[0]}
                                alt={`Room ${room.roomNumber}`}
                                className="w-full h-48 md:h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-48 md:h-full bg-gray-200 flex items-center justify-center">
                                <MapPin className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-xl font-bold capitalize">
                                  {room.type} Room
                                </h3>
                                <p className="text-gray-600">Room {room.roomNumber}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600">
                                  ₹{room.currentRate}
                                </div>
                                <div className="text-sm text-gray-500">per night</div>
                              </div>
                            </div>
                            
                            {room.description && (
                              <p className="text-gray-600 mb-4 line-clamp-2">
                                {room.description}
                              </p>
                            )}
                            
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="flex items-center space-x-1">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{room.capacity} guests</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">Floor {room.floor || 'N/A'}</span>
                              </div>
                            </div>
                            
                            {room.amenities && room.amenities.length > 0 && (
                              <div className="mb-4">
                                <div className="flex flex-wrap gap-2">
                                  {room.amenities.slice(0, 3).map((amenity, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      {amenity}
                                    </span>
                                  ))}
                                  {room.amenities.length > 3 && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      +{room.amenities.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center">
                              <div className="text-sm text-green-600 font-medium">
                                ✓ Free cancellation
                              </div>
                              <Button
                                onClick={() => handleRoomSelect(room)}
                                disabled={room.status !== 'vacant'}
                              >
                                {room.status === 'vacant' ? 'Select Room' : 'Unavailable'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'details' && selectedRoom && bookingDetails && (
          <form onSubmit={handleSubmit(onDetailsSubmit)} className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Booking Form */}
              <div className="lg:col-span-2">
                <Card>
                  <h2 className="text-2xl font-bold mb-6">Booking Details</h2>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        {...register('checkIn')}
                        type="date"
                        label="Check-in"
                        min={today}
                        error={errors.checkIn?.message}
                        readOnly
                      />
                      <Input
                        {...register('checkOut')}
                        type="date"
                        label="Check-out"
                        min={watchedValues.checkIn || today}
                        error={errors.checkOut?.message}
                        readOnly
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Adults
                        </label>
                        <div className="text-lg font-medium">{watchedValues.adults}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Children
                        </label>
                        <div className="text-lg font-medium">{watchedValues.children}</div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Special Requests (Optional)
                      </label>
                      <textarea
                        {...register('specialRequests')}
                        placeholder="Any special requirements or requests..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Booking Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-8">
                  <h3 className="text-xl font-bold mb-4">Booking Summary</h3>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex">
                      {selectedRoom.images && selectedRoom.images[0] ? (
                        <img
                          src={selectedRoom.images[0]}
                          alt={`Room ${selectedRoom.roomNumber}`}
                          className="w-20 h-20 object-cover rounded"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                          <MapPin className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="ml-4">
                        <h4 className="font-bold capitalize">
                          {selectedRoom.type} Room
                        </h4>
                        <p className="text-gray-600 text-sm">
                          Room {selectedRoom.roomNumber}
                        </p>
                        <p className="text-sm text-gray-500">
                          {selectedRoom.capacity} guests
                        </p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between mb-2">
                        <span>Check-in</span>
                        <span className="font-medium">
                          {bookingDetails.checkIn.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span>Check-out</span>
                        <span className="font-medium">
                          {bookingDetails.checkOut.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span>{bookingDetails.nights} nights</span>
                        <span className="font-medium">
                          ${bookingDetails.roomTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span>Taxes & fees</span>
                        <span className="font-medium">
                          ${bookingDetails.taxes.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>${bookingDetails.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={isSubmitting}
                    disabled={!isAuthenticated}
                  >
                    {!isAuthenticated ? 'Login to Book' : 'Proceed to Payment'}
                  </Button>
                  
                  {!isAuthenticated && (
                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={() => navigate('/login', { state: { from: location } })}
                        className="text-blue-600 hover:text-blue-500 text-sm"
                      >
                        Sign in to continue
                      </button>
                    </div>
                  )}
                  
                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                      You won't be charged until confirmation
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}