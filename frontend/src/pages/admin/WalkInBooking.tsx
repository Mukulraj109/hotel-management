import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/dashboardUtils';
import { 
  User, 
  Home, 
  Calendar, 
  CreditCard, 
  Phone,
  Mail,
  MapPin,
  Users,
  Baby,
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface WalkInBookingProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface GuestForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  idType: 'passport' | 'driving_license' | 'national_id' | 'other';
  idNumber: string;
}

interface BookingForm {
  hotelId: string;
  roomIds: string[];
  checkIn: string;
  checkOut: string;
  guestDetails: {
    adults: number;
    children: number;
    specialRequests: string;
  };
  totalAmount: number;
  currency: string;
  paymentStatus: 'pending' | 'paid';
  status: 'checked_in';
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer';
  advanceAmount: number;
}

export default function WalkInBooking({ isOpen, onClose, onSuccess }: WalkInBookingProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  
  // Form states
  const [guestForm, setGuestForm] = useState<GuestForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    idType: 'passport',
    idNumber: ''
  });

  const [bookingForm, setBookingForm] = useState<BookingForm>({
    hotelId: '68b19648e35a38ee7b1d1828', // Default hotel ID
    roomIds: [],
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Set to 2 days later
    guestDetails: {
      adults: 1,
      children: 0,
      specialRequests: ''
    },
    totalAmount: 0,
    currency: 'INR',
    paymentStatus: 'pending',
    status: 'checked_in',
    paymentMethod: 'cash',
    advanceAmount: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch hotels on component mount
  useEffect(() => {
    if (isOpen) {
      fetchHotels();
    }
  }, [isOpen]);

  // Fetch available rooms when dates or hotel changes
  useEffect(() => {
    if (bookingForm.hotelId && bookingForm.checkIn && bookingForm.checkOut) {
      fetchAvailableRooms();
    }
  }, [bookingForm.hotelId, bookingForm.checkIn, bookingForm.checkOut]);

  const fetchHotels = async () => {
    try {
      const response = await adminService.getHotels();
      setHotels(response.data.hotels || []);
    } catch (error) {
      console.error('Error fetching hotels:', error);
    }
  };

  const fetchAvailableRooms = async () => {
    try {
      console.log('Fetching available rooms with params:', {
        hotelId: bookingForm.hotelId,
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut
      });
      
      console.log('Making API call to getAvailableRooms...');
      const response = await adminService.getAvailableRooms(
        bookingForm.hotelId,
        bookingForm.checkIn,
        bookingForm.checkOut
      );
      console.log('Available rooms response:', response);
      console.log('Response data:', response.data);
      console.log('Rooms array:', response.data.rooms);
      console.log('Number of rooms:', response.data.rooms?.length || 0);
      
      const rooms = response.data.rooms || [];
      console.log('Setting available rooms:', rooms);
      setAvailableRooms(rooms);
    } catch (error: any) {
      console.error('Error fetching available rooms:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      if (error.response?.status === 429) {
        console.log('Rate limit exceeded, will retry automatically');
      } else if (error.response) {
        console.error('Error response:', error.response.data);
      }
      setAvailableRooms([]);
    }
  };



  const validateGuestForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!guestForm.name.trim()) newErrors.name = 'Name is required';
    if (!guestForm.email.trim()) newErrors.email = 'Email is required';
    if (!guestForm.phone.trim()) newErrors.phone = 'Phone is required';
    if (!guestForm.address.trim()) newErrors.address = 'Address is required';
    if (!guestForm.city.trim()) newErrors.city = 'City is required';
    if (!guestForm.state.trim()) newErrors.state = 'State is required';
    if (!guestForm.idNumber.trim()) newErrors.idNumber = 'ID Number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBookingForm = () => {
    const newErrors: Record<string, string> = {};
    
    console.log('Validating booking form:', bookingForm);
    
    if (!bookingForm.roomIds.length) {
      newErrors.rooms = 'Please select at least one room';
      console.log('Room validation failed: no rooms selected');
    }
    if (!bookingForm.checkIn) {
      newErrors.checkIn = 'Check-in date is required';
      console.log('Check-in validation failed: no check-in date');
    }
    if (!bookingForm.checkOut) {
      newErrors.checkOut = 'Check-out date is required';
      console.log('Check-out validation failed: no check-out date');
    }
    if (bookingForm.guestDetails.adults < 1) {
      newErrors.adults = 'At least one adult is required';
      console.log('Adults validation failed: less than 1 adult');
    }

    // Validate that check-out is after check-in
    if (bookingForm.checkIn && bookingForm.checkOut) {
      const checkInDate = new Date(bookingForm.checkIn);
      const checkOutDate = new Date(bookingForm.checkOut);
      if (checkInDate >= checkOutDate) {
        newErrors.checkOut = 'Check-out date must be after check-in date';
        console.log('Date validation failed: check-out not after check-in');
      }
    }

    console.log('Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotalAmount = () => {
    if (!bookingForm.checkIn || !bookingForm.checkOut || bookingForm.roomIds.length === 0) {
      return 0;
    }

    const checkInDate = new Date(bookingForm.checkIn);
    const checkOutDate = new Date(bookingForm.checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const selectedRooms = availableRooms.filter(room => bookingForm.roomIds.includes(room._id) && room.isAvailable);
    const roomsTotal = selectedRooms.reduce((total, room) => total + (room.currentRate || 0), 0);
    
    return roomsTotal * nights;
  };

  const handleNext = () => {
    console.log('handleNext called, step:', step);
    if (step === 1) {
      const isValid = validateGuestForm();
      console.log('Step 1 validation result:', isValid);
      if (!isValid) return;
    }
    if (step === 2) {
      const isValid = validateBookingForm();
      console.log('Step 2 validation result:', isValid);
      console.log('Booking form state:', bookingForm);
      console.log('Available rooms:', availableRooms);
      if (!isValid) return;
    }
    
    console.log('Moving to next step:', step + 1);
    setStep(step + 1);
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleCreateBooking = async () => {
    try {
      setLoading(true);
      
      // Create user account for walk-in guest
      const userData = {
        name: guestForm.name,
        email: guestForm.email,
        phone: guestForm.phone,
        role: 'guest',
        password: Math.random().toString(36).substring(2, 15), // Generate random password
        preferences: {
          other: `Walk-in guest. Address: ${guestForm.address}, ${guestForm.city}, ${guestForm.state}, ${guestForm.country}. ID: ${guestForm.idType} - ${guestForm.idNumber}`
        }
      };

      let userId;
      try {
        // Create user and booking in sequence
        const userResponse = await adminService.createUser(userData);
        userId = userResponse.data.user._id;
        toast.success('Guest account created successfully');
      } catch (userError) {
        console.error('Error creating user:', userError);
        
        // Check if user already exists
        if (userError.response?.status === 400 && userError.response?.data?.message?.includes('already exists')) {
          toast.error(`User with email ${guestForm.email} already exists. Please use a different email.`);
          return;
        } else if (userError.response?.status === 400) {
          toast.error(`User creation failed: ${userError.response?.data?.message || 'Invalid user data'}`);
          return;
        } else {
          toast.error('Failed to create guest account. Please try again.');
          return;
        }
      }

      // Create booking
      try {
                 const bookingData = {
           hotelId: bookingForm.hotelId,
           userId: userId,
           roomIds: bookingForm.roomIds,
           checkIn: bookingForm.checkIn,
           checkOut: bookingForm.checkOut,
           guestDetails: bookingForm.guestDetails,
           totalAmount: calculateTotalAmount(),
           currency: bookingForm.currency,
           paymentStatus: bookingForm.paymentStatus,
           status: 'confirmed' as const
         };

        await adminService.createBooking(bookingData);
        
        toast.success('Walk-in booking created successfully!');
        
        // Invalidate all relevant queries to force refresh
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['rooms'] }); 
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['real-time'] });
        queryClient.invalidateQueries({ queryKey: ['occupancy'] });
        queryClient.invalidateQueries({ queryKey: ['kpis'] });
        
        // Call onSuccess to refresh parent component data
        onSuccess();
        
        // Refresh available rooms in this component too
        if (bookingForm.hotelId && bookingForm.checkIn && bookingForm.checkOut) {
          setTimeout(() => {
            fetchAvailableRooms();
          }, 500); // Small delay to allow backend to process
        }
        
        // Close modal after a short delay to show success message
        setTimeout(() => {
          handleClose();
        }, 1500);
      } catch (bookingError) {
        console.error('Error creating booking:', bookingError);
        
        if (bookingError.response?.status === 400) {
          toast.error(`Booking failed: ${bookingError.response?.data?.message || 'Invalid booking data'}`);
        } else if (bookingError.response?.status === 409) {
          toast.error('Selected rooms are no longer available. Please select different rooms.');
        } else {
          toast.error('Failed to create booking. Please try again.');
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setGuestForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      idType: 'passport',
      idNumber: ''
    });
    setBookingForm({
      hotelId: '68b19648e35a38ee7b1d1828', // Default hotel ID
      roomIds: [],
      checkIn: new Date().toISOString().split('T')[0],
      checkOut: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Set to 2 days later
      guestDetails: {
        adults: 1,
        children: 0,
        specialRequests: ''
      },
      totalAmount: 0,
      currency: 'INR',
      paymentStatus: 'pending',
      status: 'checked_in',
      paymentMethod: 'cash',
      advanceAmount: 0
    });
    setErrors({});
    onClose();
  };

  const totalAmount = calculateTotalAmount();
  const remainingAmount = totalAmount - bookingForm.advanceAmount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Walk-in Booking"
      size="xl"
    >
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          {[1, 2, 3].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNumber 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {stepNumber}
              </div>
              {stepNumber < 3 && (
                <div className={`w-12 h-1 mx-2 ${
                  step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Guest Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Guest Information</h3>
              <p className="text-sm text-gray-600">Enter details for the walk-in guest</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    type="text"
                    value={guestForm.name}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter full name"
                    className="pl-10"
                    error={errors.name}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    type="email"
                    value={guestForm.email}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                    className="pl-10"
                    error={errors.email}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    type="tel"
                    value={guestForm.phone}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                    className="pl-10"
                    error={errors.phone}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Type *
                </label>
                <select
                  value={guestForm.idType}
                  onChange={(e) => setGuestForm(prev => ({ 
                    ...prev, 
                    idType: e.target.value as 'passport' | 'driving_license' | 'national_id' | 'other' 
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="passport">Passport</option>
                  <option value="driving_license">Driving License</option>
                  <option value="national_id">National ID</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Number *
                </label>
                <Input
                  type="text"
                  value={guestForm.idNumber}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, idNumber: e.target.value }))}
                  placeholder="Enter ID number"
                  error={errors.idNumber}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <Input
                  type="text"
                  value={guestForm.country}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Enter country"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <div className="relative">
                <MapPin className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  type="text"
                  value={guestForm.address}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter street address"
                  className="pl-10"
                  error={errors.address}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <Input
                  type="text"
                  value={guestForm.city}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Enter city"
                  error={errors.city}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <Input
                  type="text"
                  value={guestForm.state}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="Enter state"
                  error={errors.state}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Booking Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Booking Details</h3>
              <p className="text-sm text-gray-600">Select rooms and dates for the stay</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hotel
                </label>
                <select
                  value={bookingForm.hotelId}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, hotelId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {hotels.map(hotel => (
                    <option key={hotel._id} value={hotel._id}>
                      {hotel.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in Date *
                </label>
                <div className="relative">
                  <Calendar className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    type="date"
                    value={bookingForm.checkIn}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, checkIn: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="pl-10"
                    error={errors.checkIn}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out Date *
                </label>
                <div className="relative">
                  <Calendar className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                                     <Input
                     type="date"
                     value={bookingForm.checkOut}
                     onChange={(e) => setBookingForm(prev => ({ ...prev, checkOut: e.target.value }))}
                     min={bookingForm.checkIn ? new Date(new Date(bookingForm.checkIn).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                     className="pl-10"
                     error={errors.checkOut}
                   />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Adults *
                </label>
                <div className="relative">
                  <Users className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    type="number"
                    min="1"
                    value={bookingForm.guestDetails.adults}
                    onChange={(e) => setBookingForm(prev => ({
                      ...prev,
                      guestDetails: { ...prev.guestDetails, adults: parseInt(e.target.value) || 1 }
                    }))}
                    className="pl-10"
                    error={errors.adults}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Children
                </label>
                <div className="relative">
                  <Baby className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    type="number"
                    min="0"
                    value={bookingForm.guestDetails.children}
                    onChange={(e) => setBookingForm(prev => ({
                      ...prev,
                      guestDetails: { ...prev.guestDetails, children: parseInt(e.target.value) || 0 }
                    }))}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

                         {/* Available Rooms */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-3">
                 Available Rooms * ({availableRooms.filter(room => room.isAvailable).length} rooms found)
               </label>
               {availableRooms.filter(room => room.isAvailable).length > 0 ? (
                 <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-2">
                   {availableRooms.filter(room => room.isAvailable).map((room) => (
                     <div
                       key={room._id}
                       className={`p-3 border rounded-lg cursor-pointer ${
                         bookingForm.roomIds.includes(room._id)
                           ? 'border-blue-500 bg-blue-50'
                           : 'border-gray-300 hover:border-gray-400'
                       }`}
                       onClick={() => {
                         setBookingForm(prev => ({
                           ...prev,
                           roomIds: prev.roomIds.includes(room._id)
                             ? prev.roomIds.filter(id => id !== room._id)
                             : [...prev.roomIds, room._id]
                         }));
                       }}
                     >
                       <div className="flex justify-between items-center">
                         <div>
                           <div className="flex items-center">
                             <Home className="h-4 w-4 text-gray-400 mr-2" />
                             <span className="font-medium">Room {room.roomNumber}</span>
                           </div>
                           <div className="text-sm text-gray-600">
                             {room.type} • Floor {room.floor}
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="font-medium">
                             {formatCurrency(room.currentRate || 0, 'INR')}/night
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
                             ) : (
                 <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                   <p className="text-gray-600 text-center">
                     {bookingForm.checkIn && bookingForm.checkOut 
                       ? `No rooms available for the selected dates (${availableRooms.length} total rooms found, ${availableRooms.filter(room => room.isAvailable).length} available). Please try different dates.`
                       : 'Please select check-in and check-out dates to see available rooms.'
                     }
                   </p>
                 </div>
               )}
              {errors.rooms && (
                <p className="text-red-500 text-sm mt-1">{errors.rooms}</p>
              )}
              
              {/* Temporary debug button for testing */}
              {availableRooms.length === 0 && (
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Add a test room for debugging
                      setBookingForm(prev => ({
                        ...prev,
                        roomIds: [...prev.roomIds, 'test-room-id']
                      }));
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Add Test Room (Debug)
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Requests
              </label>
              <div className="relative">
                <FileText className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <textarea
                  value={bookingForm.guestDetails.specialRequests}
                  onChange={(e) => setBookingForm(prev => ({
                    ...prev,
                    guestDetails: { ...prev.guestDetails, specialRequests: e.target.value }
                  }))}
                  placeholder="Any special requests or notes..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 pl-10"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payment & Confirmation */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Payment & Confirmation</h3>
              <p className="text-sm text-gray-600">Review booking details and handle payment</p>
            </div>

            {/* Guest Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Guest Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{guestForm.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{guestForm.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{guestForm.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ID</p>
                    <p className="font-medium">{guestForm.idType} - {guestForm.idNumber}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Check-in</p>
                      <p className="font-medium">{new Date(bookingForm.checkIn).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Check-out</p>
                      <p className="font-medium">{new Date(bookingForm.checkOut).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Nights</p>
                      <p className="font-medium">
                        {Math.ceil((new Date(bookingForm.checkOut).getTime() - new Date(bookingForm.checkIn).getTime()) / (1000 * 60 * 60 * 24))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Guests</p>
                      <p className="font-medium">
                        {bookingForm.guestDetails.adults} adult(s), {bookingForm.guestDetails.children} child(ren)
                      </p>
                    </div>
                  </div>

                                     <div>
                     <p className="text-sm text-gray-600 mb-2">Selected Rooms</p>
                     <div className="space-y-2">
                       {availableRooms
                         .filter(room => bookingForm.roomIds.includes(room._id) && room.isAvailable)
                         .map(room => (
                           <div key={room._id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                             <span>Room {room.roomNumber} ({room.type})</span>
                             <span className="font-medium">
                               {formatCurrency(room.currentRate || 0, 'INR')}/night
                             </span>
                           </div>
                         ))}
                     </div>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-lg font-medium">
                    <span>Total Amount</span>
                    <span className="text-blue-600">{formatCurrency(totalAmount, 'INR')}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method
                      </label>
                      <select
                        value={bookingForm.paymentMethod}
                        onChange={(e) => setBookingForm(prev => ({ 
                          ...prev, 
                          paymentMethod: e.target.value as 'cash' | 'card' | 'upi' | 'bank_transfer' 
                        }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Advance Amount
                      </label>
                      <div className="relative">
                        <CreditCard className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                        <Input
                          type="number"
                          min="0"
                          max={totalAmount}
                          value={bookingForm.advanceAmount}
                          onChange={(e) => setBookingForm(prev => ({ 
                            ...prev, 
                            advanceAmount: Math.min(parseFloat(e.target.value) || 0, totalAmount)
                          }))}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {bookingForm.advanceAmount > 0 && (
                    <div className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <span className="text-sm text-yellow-800">Remaining Amount</span>
                      <span className="font-medium text-yellow-800">
                        {formatCurrency(remainingAmount, 'INR')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm text-blue-800">Payment Status</span>
                    <span className={`font-medium ${
                      bookingForm.advanceAmount >= totalAmount ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {bookingForm.advanceAmount >= totalAmount ? 'Fully Paid' : 'Partially Paid'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t">
                     <Button
             variant="ghost"
             onClick={step === 1 ? handleClose : handlePrevious}
             disabled={loading}
           >
            {step === 1 ? 'Cancel' : 'Previous'}
          </Button>

          <div className="flex space-x-3">
            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleCreateBooking}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? 'Creating...' : 'Create Booking'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
