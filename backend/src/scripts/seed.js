import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import Inventory from '../models/Inventory.js';
import Review from '../models/Review.js';
import GuestService from '../models/GuestService.js';
import MaintenanceTask from '../models/MaintenanceTask.js';
import IncidentReport from '../models/IncidentReport.js';
import Invoice from '../models/Invoice.js';
import SupplyRequest from '../models/SupplyRequest.js';
import Communication from '../models/Communication.js';
import MessageTemplate from '../models/MessageTemplate.js';
import Housekeeping from '../models/Housekeeping.js';
import Loyalty from '../models/Loyalty.js';
import Offer from '../models/Offer.js';
import MeetUpRequest from '../models/MeetUpRequest.js';
import HotelService from '../models/HotelService.js';
import Notification from '../models/Notification.js';
import TapeChartModels from '../models/TapeChart.js';
import POSOutlet from '../models/POSOutlet.js';
import POSMenu from '../models/POSMenu.js';
import POSOrder from '../models/POSOrder.js';
import CheckoutInventory from '../models/CheckoutInventory.js';
import BillingSession from '../models/BillingSession.js';
import ChartOfAccounts from '../models/ChartOfAccounts.js';
import GeneralLedger from '../models/GeneralLedger.js';
import JournalEntry from '../models/JournalEntry.js';
import BankAccount from '../models/BankAccount.js';
import Budget from '../models/Budget.js';
import logger from '../utils/logger.js';

const { RoomBlock, RoomAssignmentRules, AdvancedReservation } = TapeChartModels;

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL || process.env.MONGO_URI);
    logger.info('Database connected for seeding');
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Hotel.deleteMany({});
    await Room.deleteMany({});
    await Booking.deleteMany({});
    await Inventory.deleteMany({});
    await Review.deleteMany({});
    await GuestService.deleteMany({});
    await MaintenanceTask.deleteMany({});
    await IncidentReport.deleteMany({});
    await Invoice.deleteMany({});
    await SupplyRequest.deleteMany({});
    await Communication.deleteMany({});
    await MessageTemplate.deleteMany({});
    await Housekeeping.deleteMany({});
    await Loyalty.deleteMany({});
    await Offer.deleteMany({});
    await MeetUpRequest.deleteMany({});
    await HotelService.deleteMany({});
    await Notification.deleteMany({});
    await RoomBlock.deleteMany({});
    await RoomAssignmentRules.deleteMany({});
    await AdvancedReservation.deleteMany({});
    await POSOutlet.deleteMany({});
    await POSMenu.deleteMany({});
    await POSOrder.deleteMany({});
    await CheckoutInventory.deleteMany({});
    await BillingSession.deleteMany({});
    await ChartOfAccounts.deleteMany({});
    await GeneralLedger.deleteMany({});
    await JournalEntry.deleteMany({});
    await BankAccount.deleteMany({});
    await Budget.deleteMany({});

    logger.info('Cleared existing data');

    // Create a temporary user first to satisfy hotel's ownerId requirement
    const tempUser = await User.create({
      name: 'Temp User',
      email: 'temp@hotel.com', 
      password: 'temp123',
      role: 'guest'
    });

    // Create hotel with temp owner
    const hotel = await Hotel.create({
      name: 'THE PENTOUZ',
      description: 'A luxury hotel in the heart of the city',
      address: {
        street: '123 MG Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        zipCode: '400001',
        coordinates: {
          latitude: 19.0760,
          longitude: 72.8777
        }
      },
      contact: {
        phone: '+91-22-1234-5678',
        email: 'info@thepentouz.com',
        website: 'https://thepentouz.com'
      },
      amenities: [
        'Free WiFi',
        'Swimming Pool',
        'Fitness Center',
        'Restaurant',
        'Room Service',
        'Parking',
        'Concierge'
      ],
      images: [
        'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg',
        'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg'
      ],
      ownerId: tempUser._id
    });
    
    logger.info(`Hotel created with ID: ${hotel._id}`);

    // Create admin user with hotel ID
    const adminUser = await User.create({
      firstName: 'Hotel',
      lastName: 'Admin',
      name: 'Hotel Admin',
      email: 'admin@hotel.com',
      password: 'admin123',
      role: 'admin',
      hotelId: hotel._id
    });

    // Update hotel with admin as owner and delete temp user
    hotel.ownerId = adminUser._id;
    await hotel.save();
    await User.findByIdAndDelete(tempUser._id);

    // Create staff user
    const staffUser = await User.create({
      firstName: 'General',
      lastName: 'Staff',
      name: 'General Staff',
      email: 'staff@hotel.com',
      password: 'staff123',
      role: 'staff',
      hotelId: hotel._id
    });

    // Create manager users
    const managerUser = await User.create({
      firstName: 'Restaurant',
      lastName: 'Manager',
      name: 'Restaurant Manager',
      email: 'manager@hotel.com',
      password: 'manager123',
      role: 'manager',
      hotelId: hotel._id
    });

    const barManagerUser = await User.create({
      firstName: 'Bar',
      lastName: 'Manager',
      name: 'Bar Manager',
      email: 'barmanager@hotel.com',
      password: 'manager123',
      role: 'manager',
      hotelId: hotel._id
    });

    // Create additional staff users
    const frontDeskStaff = await User.create({
      firstName: 'Front Desk',
      lastName: 'Staff',
      name: 'Front Desk Staff',
      email: 'frontdesk@hotel.com',
      password: 'staff123',
      role: 'staff',
      hotelId: hotel._id
    });

    const kitchenStaff = await User.create({
      firstName: 'Kitchen',
      lastName: 'Staff',
      name: 'Kitchen Staff',
      email: 'kitchen@hotel.com',
      password: 'staff123',
      role: 'staff',
      hotelId: hotel._id
    });

    // Create guest users
    const guests = await User.create([
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'guest123',
        phone: '+91-98765-43210',
        role: 'guest',
        preferences: {
          bedType: 'king',
          floor: 'high',
          smokingAllowed: false
        },
        loyalty: {
          points: 1250,
          tier: 'silver'
        }
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'guest123',
        phone: '+91-98765-43211',
        role: 'guest',
        preferences: {
          bedType: 'queen',
          smokingAllowed: false
        },
        loyalty: {
          points: 750,
          tier: 'bronze'
        }
      },
      {
        name: 'Mike Johnson',
        email: 'mike@example.com',
        password: 'guest123',
        phone: '+91-98765-43212',
        role: 'guest'
      }
    ]);

    // Create rooms
    const roomTypes = ['single', 'double', 'suite', 'deluxe'];
    const rooms = [];

    for (let floor = 1; floor <= 10; floor++) {
      for (let roomNum = 1; roomNum <= 10; roomNum++) {
        const roomNumber = `${floor}${roomNum.toString().padStart(2, '0')}`;
        const type = roomTypes[Math.floor(Math.random() * roomTypes.length)];
        let baseRate;

        switch (type) {
          case 'single': baseRate = 2500; break;
          case 'double': baseRate = 3500; break;
          case 'suite': baseRate = 8000; break;
          case 'deluxe': baseRate = 6000; break;
          default: baseRate = 3000;
        }

        rooms.push({
          hotelId: hotel._id,
          roomNumber,
          type,
          baseRate,
          currentRate: baseRate + Math.floor(Math.random() * 50),
          floor,
          capacity: type === 'single' ? 1 : type === 'suite' ? 4 : 2,
          amenities: [
            'Air Conditioning',
            'TV',
            'WiFi',
            'Mini Fridge',
            ...(type === 'suite' || type === 'deluxe' ? ['Balcony', 'Coffee Machine'] : []),
            ...(type === 'suite' ? ['Living Area', 'Kitchenette'] : [])
          ],
          images: [
            'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg',
            'https://images.pexels.com/photos/775219/pexels-photo-775219.jpeg'
          ],
          description: `Beautiful ${type} room with modern amenities`
        });
      }
    }

    const createdRooms = await Room.create(rooms);
    logger.info(`Created ${createdRooms.length} rooms`);

    // Create sample bookings
    const bookings = [];
    const today = new Date();
    
    for (let i = 0; i < 20; i++) {
      const guest = guests[Math.floor(Math.random() * guests.length)];
      const room = createdRooms[Math.floor(Math.random() * createdRooms.length)];
      
      let checkIn, checkOut;
      if (i < 5) {
        // Create current active bookings (checked in yesterday, checking out tomorrow)
        checkIn = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000); // Yesterday
        checkOut = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000); // Day after tomorrow
      } else if (i < 10) {
        // Create current bookings (check-in 1-7 days ago, check-out 1-7 days from now)
        checkIn = new Date(today.getTime() - (1 + Math.random() * 6) * 24 * 60 * 60 * 1000);
        checkOut = new Date(today.getTime() + (1 + Math.random() * 6) * 24 * 60 * 60 * 1000);
      } else {
        // Create future bookings
        checkIn = new Date(today.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
        checkOut = new Date(checkIn.getTime() + (1 + Math.floor(Math.random() * 7)) * 24 * 60 * 60 * 1000);
      }
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      
      // Create a better distribution of statuses
      let status;
      if (i < 5) {
        // First 5: confirmed or checked_in for current occupancy
        status = ['confirmed', 'checked_in'][Math.floor(Math.random() * 2)];
      } else if (i < 10) {
        // Next 5: mostly pending with some confirmed
        status = ['pending', 'pending', 'pending', 'confirmed'][Math.floor(Math.random() * 4)];
      } else if (i < 15) {
        // Next 5: mix of all statuses
        status = ['pending', 'confirmed', 'checked_in', 'checked_out'][Math.floor(Math.random() * 4)];
      } else {
        // Last 5: mostly pending and confirmed
        status = ['pending', 'pending', 'confirmed', 'checked_out'][Math.floor(Math.random() * 4)];
      }

      bookings.push({
        hotelId: hotel._id,
        userId: guest._id,
        rooms: [{
          roomId: room._id,
          rate: room.currentRate
        }],
        checkIn,
        checkOut,
        nights,
        status,
        paymentStatus: ['pending', 'paid'][Math.floor(Math.random() * 2)],
        totalAmount: room.currentRate * nights,
        currency: 'INR',
        guestDetails: {
          adults: 1 + Math.floor(Math.random() * 3),
          children: Math.floor(Math.random() * 2),
          specialRequests: Math.random() > 0.7 ? 'Late check-in requested' : null
        },
        bookingNumber: `BK${Date.now()}${i.toString().padStart(3, '0')}`,
        idempotencyKey: `seed-${i}-${Date.now()}`,
        reservedUntil: ['confirmed', 'checked_in', 'checked_out'].includes(status) ? null : undefined
      });
    }

    const createdBookings = await Booking.create(bookings);
    logger.info(`Created ${createdBookings.length} bookings`);

    // Create inventory items
    const inventoryItems = [
      {
        name: 'Bed Sheets',
        sku: 'BS001',
        category: 'linens',
        quantity: 150,
        unit: 'sets',
        minimumThreshold: 20,
        maximumCapacity: 200,
        costPerUnit: 600.00, // ₹600 for bed sheets
        supplier: {
          name: 'Hotel Supplies Co',
          contact: '+1-555-0100',
          email: 'orders@hotelsupplies.com'
        }
      },
      {
        name: 'Towels',
        sku: 'TW001',
        category: 'linens',
        quantity: 200,
        unit: 'pieces',
        minimumThreshold: 30,
        maximumCapacity: 300,
        costPerUnit: 350.00 // ₹350 for towels
      },
      {
        name: 'Shampoo',
        sku: 'SH001',
        category: 'toiletries',
        quantity: 80,
        unit: 'bottles',
        minimumThreshold: 20,
        maximumCapacity: 150,
        costPerUnit: 85.00 // ₹85 for shampoo
      },
      {
        name: 'All-Purpose Cleaner',
        sku: 'CL001',
        category: 'cleaning',
        quantity: 45,
        unit: 'bottles',
        minimumThreshold: 10,
        maximumCapacity: 100,
        costPerUnit: 125.00 // ₹125 for cleaner
      },
      {
        name: 'Light Bulbs',
        sku: 'LB001',
        category: 'maintenance',
        quantity: 25,
        unit: 'pieces',
        minimumThreshold: 50,
        maximumCapacity: 200,
        costPerUnit: 65.00 // ₹65 for light bulbs
      }
    ].map(item => ({ ...item, hotelId: hotel._id }));

    const createdInventory = await Inventory.create(inventoryItems);
    logger.info(`Created ${createdInventory.length} inventory items`);

    // Create Reviews with Indian names and English content
    const reviewsData = [];
    const indianNames = [
      'Priya Sharma', 'Arjun Patel', 'Sunita Gupta', 'Rajesh Kumar', 'Anita Singh',
      'Vikram Mehta', 'Kavya Reddy', 'Rohit Agarwal', 'Deepika Joshi', 'Amit Shah',
      'Neha Verma', 'Sanjay Malhotra', 'Pooja Kapoor', 'Ravi Nair', 'Shreya Iyer'
    ];
    const reviewTitles = [
      'Excellent service and beautiful ambiance!',
      'Perfect for family vacation',
      'Outstanding hospitality',
      'Comfortable stay with great amenities',
      'Wonderful experience at The Pentouz'
    ];
    const reviewContents = [
      'Amazing experience! Our stay at The Pentouz was truly memorable. The staff behavior and service was outstanding.',
      'Exceptional service and luxurious amenities! Perfect for business trips.',
      'Perfect place for our honeymoon trip! Romantic ambiance and beautiful rooms. Pool and spa facilities are amazing.',
      'Great hotel with excellent facilities. The room was spacious and clean. Staff was very helpful throughout our stay.',
      'Wonderful experience with family. Kids loved the pool and the food was delicious. Highly recommended!'
    ];
    const visitTypes = ['business', 'leisure', 'family', 'couple', 'solo'];
    
    for (let i = 0; i < 25; i++) {
      const guest = guests[Math.floor(Math.random() * guests.length)];
      const booking = createdBookings[Math.floor(Math.random() * createdBookings.length)];
      const rating = Math.max(1, Math.min(5, Math.floor(Math.random() * 5) + 1));
      const guestName = indianNames[Math.floor(Math.random() * indianNames.length)];
      const title = reviewTitles[Math.floor(Math.random() * reviewTitles.length)];
      const content = reviewContents[Math.floor(Math.random() * reviewContents.length)];
      
      reviewsData.push({
        hotelId: hotel._id,
        userId: guest._id,
        bookingId: Math.random() > 0.3 ? booking._id : undefined,
        rating,
        title,
        content,
        categories: {
          cleanliness: Math.max(1, Math.min(5, rating + Math.floor(Math.random() * 3) - 1)),
          service: Math.max(1, Math.min(5, rating + Math.floor(Math.random() * 3) - 1)),
          location: Math.max(1, Math.min(5, rating + Math.floor(Math.random() * 3) - 1)),
          value: Math.max(1, Math.min(5, rating + Math.floor(Math.random() * 3) - 1)),
          amenities: Math.max(1, Math.min(5, rating + Math.floor(Math.random() * 3) - 1))
        },
        guestName,
        visitType: visitTypes[Math.floor(Math.random() * visitTypes.length)],
        stayDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        images: rating >= 4 ? ['https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg'] : [],
        helpfulVotes: Math.floor(Math.random() * 15),
        isVerified: Math.random() > 0.3,
        isPublished: true,
        moderationStatus: 'approved',
        source: 'direct',
        language: 'en'
      });
    }
    const createdReviews = await Review.create(reviewsData);
    logger.info(`Created ${createdReviews.length} reviews`);

    // Create Guest Services
    const serviceTypes = ['room_service', 'housekeeping', 'maintenance', 'concierge', 'laundry', 'spa', 'transport'];
    const guestServicesData = [];
    
    for (let i = 0; i < 30; i++) {
      const guest = guests[Math.floor(Math.random() * guests.length)];
      const room = createdRooms[Math.floor(Math.random() * createdRooms.length)];
      const booking = createdBookings[Math.floor(Math.random() * createdBookings.length)];
      const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
      const priority = ['now', 'later', 'low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 6)];
      const isLater = priority === 'later';
      
      // Service variations mapping
      const serviceVariations = {
        room_service: ['Food & Beverage Delivery', 'Ice & Water Request', 'Extra Towels', 'Extra Pillows & Blankets', 'Late Night Snacks', 'Breakfast in Room', 'Special Dietary Meal'],
        housekeeping: ['Room Cleaning', 'Fresh Towels', 'Bed Linen Change', 'Bathroom Cleaning', 'Trash Removal', 'Vacuum Cleaning', 'Deep Cleaning'],
        maintenance: ['AC/Heating Issue', 'Plumbing Problem', 'Electrical Issue', 'TV/Electronics Problem', 'Door/Lock Issue', 'Window/Curtain Problem', 'Furniture Repair'],
        concierge: ['Restaurant Reservation', 'Tour Booking', 'Transportation Arrangement', 'Ticket Booking', 'Local Information', 'Wake-up Call', 'Special Occasion Setup'],
        transport: ['Airport Pickup', 'Airport Drop-off', 'City Tour', 'Taxi Booking', 'Car Rental', 'Train Station Transfer', 'Sightseeing Trip'],
        spa: ['Massage Appointment', 'Facial Treatment', 'Spa Package', 'Manicure/Pedicure', 'Hair Styling', 'Wellness Consultation', 'Relaxation Therapy'],
        laundry: ['Clothes Washing', 'Dry Cleaning', 'Iron & Press', 'Express Laundry', 'Shoe Cleaning', 'Special Fabric Care', 'Pickup & Delivery'],
        other: ['Special Request', 'Event Setup', 'Medical Assistance', 'Baby/Child Services', 'Pet Services', 'Lost & Found', 'Complaint Resolution']
      };
      
      const variations = serviceVariations[serviceType];
      
      // Randomly select 1-3 service variations
      const numVariations = Math.floor(Math.random() * 3) + 1; // 1 to 3 variations
      const selectedVariations = [];
      const shuffled = [...variations].sort(() => 0.5 - Math.random());
      
      for (let j = 0; j < Math.min(numVariations, variations.length); j++) {
        selectedVariations.push(shuffled[j]);
      }
      
      const primaryVariation = selectedVariations[0];
      const title = selectedVariations.length === 1 
        ? primaryVariation 
        : `${selectedVariations.length} ${serviceType.replace('_', ' ')} services`;
      
      const status = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'][Math.floor(Math.random() * 5)];
      
      // For in_progress requests, randomly complete some services
      let completedServiceVariations = [];
      if (status === 'in_progress' && selectedVariations.length > 1) {
        const numCompleted = Math.floor(Math.random() * (selectedVariations.length - 1)); // At least 1 incomplete
        completedServiceVariations = selectedVariations.slice(0, numCompleted);
      } else if (status === 'completed') {
        completedServiceVariations = [...selectedVariations]; // All completed
      }
      
      guestServicesData.push({
        hotelId: hotel._id,
        userId: guest._id,
        bookingId: booking._id,
        serviceType,
        serviceVariation: primaryVariation,
        serviceVariations: selectedVariations,
        completedServiceVariations: completedServiceVariations,
        title: title,
        description: selectedVariations.length === 1 
          ? `Customer requested ${primaryVariation.toLowerCase()}`
          : `Customer requested multiple services: ${selectedVariations.join(', ').toLowerCase()}`,
        priority,
        status: status,
        requestDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        assignedTo: Math.random() > 0.5 ? staffUser._id : null,
        estimatedCost: Math.random() * 2000 + 500, // ₹500-2500
        actualCost: Math.random() * 1800 + 400, // ₹400-2200
        // Add scheduledTime for "later" priority or for "now" requests
        scheduledTime: isLater 
          ? new Date(Date.now() + Math.random() * 48 * 60 * 60 * 1000) // Next 48 hours for "later"
          : priority === 'now' 
          ? new Date() // Current time for "now" priority
          : undefined
      });
    }
    const createdGuestServices = await GuestService.create(guestServicesData);
    logger.info(`Created ${createdGuestServices.length} guest services`);

    // Create Maintenance Tasks
    const maintenanceData = [];
    for (let i = 0; i < 20; i++) {
      const room = createdRooms[Math.floor(Math.random() * createdRooms.length)];
      
      maintenanceData.push({
        hotelId: hotel._id,
        roomId: room._id,
        title: ['AC repair', 'Plumbing fix', 'Light replacement', 'Door lock repair', 'TV repair'][Math.floor(Math.random() * 5)],
        description: 'Maintenance task description',
        type: ['electrical', 'plumbing', 'hvac', 'cleaning', 'carpentry'][Math.floor(Math.random() * 5)],
        priority: ['low', 'medium', 'high', 'urgent', 'emergency'][Math.floor(Math.random() * 5)],
        status: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'][Math.floor(Math.random() * 5)],
        reportedBy: staffUser._id,
        assignedTo: Math.random() > 0.3 ? staffUser._id : null,
        roomOutOfOrder: Math.random() > 0.7,
        estimatedHours: 1 + Math.floor(Math.random() * 8),
        actualHours: 1 + Math.floor(Math.random() * 6),
        materials: [{
          name: 'Replacement parts',
          quantity: 1,
          cost: 500 + Math.random() * 2000 // ₹500-2500
        }],
        dueDate: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000)
      });
    }
    const createdMaintenance = await MaintenanceTask.create(maintenanceData);
    logger.info(`Created ${createdMaintenance.length} maintenance tasks`);

    // Create Incident Reports  
    const incidentData = [];
    for (let i = 0; i < 15; i++) {
      const room = createdRooms[Math.floor(Math.random() * createdRooms.length)];
      
      incidentData.push({
        incidentNumber: `INC-${Date.now()}-${i}`,
        hotelId: hotel._id,
        roomId: room._id,
        title: ['Guest complaint', 'Equipment failure', 'Safety issue', 'Security incident'][Math.floor(Math.random() * 4)],
        description: 'Incident description details',
        type: ['guest_complaint', 'safety', 'security', 'maintenance', 'accident'][Math.floor(Math.random() * 5)],
        category: ['guest_complaint', 'safety', 'security', 'maintenance', 'accident'][Math.floor(Math.random() * 5)],
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        status: ['reported', 'investigating', 'action_taken', 'resolved', 'closed'][Math.floor(Math.random() * 5)],
        reportedBy: Math.random() > 0.5 ? guests[Math.floor(Math.random() * guests.length)]._id : staffUser._id,
        assignedTo: staffUser._id,
        timeOccurred: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        location: `Room ${room.roomNumber}`,
        witnesses: Math.random() > 0.7 ? [{
          name: 'John Witness',
          contact: '+1-555-0999',
          statement: 'Witnessed the incident'
        }] : []
      });
    }
    const createdIncidents = await IncidentReport.create(incidentData);
    logger.info(`Created ${createdIncidents.length} incident reports`);

    // Create Invoices
    const invoiceData = [];
    for (let i = 0; i < 25; i++) {
      const guest = guests[Math.floor(Math.random() * guests.length)];
      const booking = createdBookings[Math.floor(Math.random() * createdBookings.length)];
      const issueDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
      const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const amount = 2500 + Math.random() * 15000; // ₹2500-17500
      const totalAmount = amount * 1.1;
      const isPaid = Math.random() > 0.3; // 70% chance of being paid
      const status = isPaid ? 
        (Math.random() > 0.8 ? 'partially_paid' : 'paid') : 
        ['draft', 'issued', 'overdue'][Math.floor(Math.random() * 3)];
      
      // Create payments array for paid/partially paid invoices
      let payments = [];
      let amountPaid = 0;
      
      if (status === 'paid') {
        // Full payment
        amountPaid = totalAmount;
        payments = [{
          amount: totalAmount,
          method: ['cash', 'credit_card', 'debit_card', 'bank_transfer'][Math.floor(Math.random() * 4)],
          transactionId: `TXN${Date.now()}${i}`,
          paidBy: guest._id,
          paidAt: new Date(issueDate.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000),
          notes: 'Payment received'
        }];
      } else if (status === 'partially_paid') {
        // Partial payment
        amountPaid = totalAmount * (0.3 + Math.random() * 0.5); // 30-80% paid
        payments = [{
          amount: amountPaid,
          method: ['cash', 'credit_card', 'debit_card'][Math.floor(Math.random() * 3)],
          transactionId: `TXN${Date.now()}${i}`,
          paidBy: guest._id,
          paidAt: new Date(issueDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000),
          notes: 'Partial payment received'
        }];
      }
      
      invoiceData.push({
        invoiceNumber: `INV-${Date.now()}-${i}`,
        hotelId: hotel._id,
        guestId: guest._id,
        bookingId: booking._id,
        issueDate,
        dueDate,
        status,
        type: ['accommodation', 'service', 'additional'][Math.floor(Math.random() * 3)],
        items: [{
          description: 'Room charges',
          quantity: booking.nights,
          unitPrice: booking.totalAmount / booking.nights,
          totalPrice: booking.totalAmount,
          category: 'accommodation',
          taxRate: 10,
          taxAmount: booking.totalAmount * 0.1
        }],
        subtotal: amount,
        taxAmount: amount * 0.1,
        totalAmount,
        payments,
        currency: 'INR',
        paidDate: status === 'paid' ? payments[0]?.paidAt : null
      });
    }
    // Add a few refund invoices
    for (let i = 0; i < 3; i++) {
      const guest = guests[Math.floor(Math.random() * guests.length)];
      const booking = createdBookings[Math.floor(Math.random() * createdBookings.length)];
      const refundAmount = 1000 + Math.random() * 5000;
      
      invoiceData.push({
        invoiceNumber: `REF-${Date.now()}-${i}`,
        hotelId: hotel._id,
        guestId: guest._id,
        bookingId: booking._id,
        issueDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        dueDate: new Date(), // Refunds are immediate
        status: 'refunded',
        type: 'refund',
        items: [{
          description: 'Refund for cancelled booking',
          quantity: 1,
          unitPrice: refundAmount,
          totalPrice: refundAmount,
          category: 'other',
          taxRate: 0,
          taxAmount: 0
        }],
        subtotal: refundAmount,
        taxAmount: 0,
        totalAmount: refundAmount,
        payments: [{
          amount: refundAmount,
          method: 'bank_transfer',
          transactionId: `REF${Date.now()}${i}`,
          paidBy: guest._id,
          paidAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
          notes: 'Refund processed'
        }],
        currency: 'INR',
        paidDate: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000)
      });
    }

    const createdInvoices = await Invoice.create(invoiceData);
    logger.info(`Created ${createdInvoices.length} invoices (including ${invoiceData.length - 25} refunds)`);

    // Create Supply Requests
    const supplyData = [];
    for (let i = 0; i < 15; i++) {
      supplyData.push({
        hotelId: hotel._id,
        title: 'Supply Request for Housekeeping',
        requestedBy: staffUser._id,
        requesterId: staffUser._id,
        department: ['housekeeping', 'maintenance', 'kitchen', 'front_desk'][Math.floor(Math.random() * 4)],
        items: [{
          name: 'Cleaning supplies',
          quantity: 5 + Math.floor(Math.random() * 20),
          unit: 'pieces',
          estimatedCost: 50 + Math.random() * 200,
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
        }],
        totalEstimatedCost: 100 + Math.random() * 300,
        justification: 'Required for daily operations',
        urgency: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        status: ['pending', 'approved', 'ordered', 'received', 'cancelled'][Math.floor(Math.random() * 5)],
        approvedBy: Math.random() > 0.5 ? adminUser._id : null,
        requestDate: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        neededBy: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
    }
    const createdSupplyRequests = await SupplyRequest.create(supplyData);
    logger.info(`Created ${createdSupplyRequests.length} supply requests`);

    // Create Communications
    const communicationData = [];
    for (let i = 0; i < 20; i++) {
      const recipient = guests[Math.floor(Math.random() * guests.length)];
      
      communicationData.push({
        hotelId: hotel._id,
        sentBy: adminUser._id,
        recipients: [{ 
          userId: recipient._id, 
          email: recipient.email, 
          name: recipient.name 
        }],
        type: ['email', 'sms'][Math.floor(Math.random() * 2)],
        channel: ['email', 'sms'][Math.floor(Math.random() * 2)],
        subject: 'Welcome to THE PENTOUZ',
        content: 'Thank you for choosing our hotel. We hope you enjoy your stay!',
        status: ['scheduled', 'sent', 'failed'][Math.floor(Math.random() * 3)],
        scheduledAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        sentAt: new Date(Date.now() - Math.random() * 29 * 24 * 60 * 60 * 1000),
        opens: Math.floor(Math.random() * 5),
        clicks: Math.floor(Math.random() * 3),
        deliveryStatus: {
          delivered: Math.random() > 0.1,
          bounced: Math.random() > 0.9,
          failed: false
        }
      });
    }
    const createdCommunications = await Communication.create(communicationData);
    logger.info(`Created ${createdCommunications.length} communications`);

    // Create Message Templates
    const templateData = [
      {
        hotelId: hotel._id,
        name: 'Welcome Email',
        type: 'email',
        category: 'welcome',
        subject: 'Welcome to {{hotelName}}!',
        content: 'Dear {{guestName}}, welcome to {{hotelName}}. Your booking confirmation is {{bookingNumber}}.',
        variables: [
          { name: 'hotelName', description: 'Hotel name', required: true, type: 'string' },
          { name: 'guestName', description: 'Guest name', required: true, type: 'string' },
          { name: 'bookingNumber', description: 'Booking confirmation', required: true, type: 'string' }
        ],
        isActive: true,
        createdBy: adminUser._id,
        usageCount: Math.floor(Math.random() * 50)
      },
      {
        hotelId: hotel._id,
        name: 'Booking Confirmation',
        type: 'email',
        category: 'confirmation',
        subject: 'Booking Confirmed - {{bookingNumber}}',
        content: 'Your booking has been confirmed. Check-in: {{checkIn}}, Check-out: {{checkOut}}',
        variables: [
          { name: 'bookingNumber', description: 'Booking number', required: true, type: 'string' },
          { name: 'checkIn', description: 'Check-in date', required: true, type: 'date' },
          { name: 'checkOut', description: 'Check-out date', required: true, type: 'date' }
        ],
        isActive: true,
        createdBy: adminUser._id,
        usageCount: Math.floor(Math.random() * 100)
      }
    ];
    const createdTemplates = await MessageTemplate.create(templateData);
    logger.info(`Created ${createdTemplates.length} message templates`);

    // Create Housekeeping Tasks
    const housekeepingData = [];
    for (let i = 0; i < 40; i++) {
      const room = createdRooms[Math.floor(Math.random() * createdRooms.length)];
      
      housekeepingData.push({
        hotelId: hotel._id,
        roomId: room._id,
        title: 'Room Cleaning Task',
        taskType: 'cleaning',
        assignedTo: staffUser._id,
        type: ['cleaning', 'maintenance', 'inspection'][Math.floor(Math.random() * 3)],
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        status: ['pending', 'assigned', 'in_progress', 'completed'][Math.floor(Math.random() * 4)],
        checkIn: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000),
        checkOut: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 60 * 60 * 1000) : null,
        roomStatus: ['dirty', 'clean', 'inspected', 'maintenance_required'][Math.floor(Math.random() * 4)],
        notes: Math.random() > 0.7 ? 'Additional cleaning required' : '',
        supplies: [{
          name: ['towels', 'bed_sheets', 'toiletries', 'cleaning_supplies'][Math.floor(Math.random() * 4)],
          quantity: 2,
          unit: 'pieces'
        }],
        timeSpent: Math.floor(Math.random() * 120) + 30
      });
    }
    const createdHousekeeping = await Housekeeping.create(housekeepingData);
    logger.info(`Created ${createdHousekeeping.length} housekeeping tasks`);

    // Create loyalty offers
    const offersData = [
      {
        hotelId: hotel._id,
        title: '10% Off Room Upgrade',
        description: 'Get 10% discount on your next room upgrade to a suite or deluxe room.',
        pointsRequired: 500,
        discountPercentage: 10,
        type: 'discount',
        category: 'room',
        minTier: 'bronze',
        isActive: true,
        validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        maxRedemptions: 50,
        currentRedemptions: 0,
        terms: 'Valid for suite and deluxe room upgrades only. Cannot be combined with other offers.'
      },
      {
        hotelId: hotel._id,
        title: 'Free Welcome Drink',
        description: 'Enjoy a complimentary welcome drink at our restaurant.',
        pointsRequired: 200,
        type: 'free_service',
        category: 'dining',
        minTier: 'bronze',
        isActive: true,
        validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        maxRedemptions: 100,
        currentRedemptions: 5,
        terms: 'Valid for one welcome drink per stay. Available at the hotel restaurant only.'
      },
      {
        hotelId: hotel._id,
        title: 'Late Checkout',
        description: 'Extend your checkout time until 2 PM at no extra charge.',
        pointsRequired: 300,
        type: 'free_service',
        category: 'room',
        minTier: 'silver',
        isActive: true,
        validFrom: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        maxRedemptions: 30,
        currentRedemptions: 2,
        terms: 'Subject to room availability. Must be requested at least 1 day in advance.'
      },
      {
        hotelId: hotel._id,
        title: 'Spa Service 20% Off',
        description: 'Get 20% discount on any spa service during your stay.',
        pointsRequired: 800,
        discountPercentage: 20,
        type: 'discount',
        category: 'spa',
        minTier: 'gold',
        isActive: true,
        validFrom: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
        maxRedemptions: 25,
        currentRedemptions: 8,
        terms: 'Valid for all spa services. Advance booking required.'
      },
      {
        hotelId: hotel._id,
        title: 'Free Airport Transfer',
        description: 'Get a complimentary airport transfer for your stay.',
        pointsRequired: 1000,
        type: 'free_service',
        category: 'transport',
        minTier: 'gold',
        isActive: true,
        validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        maxRedemptions: 20,
        currentRedemptions: 3,
        terms: 'Valid for airport transfers within city limits. Must be booked 24 hours in advance.'
      }
    ];
    const createdOffers = await Offer.create(offersData);
    logger.info(`Created ${createdOffers.length} loyalty offers`);

    // Create loyalty transactions for guests
    const loyaltyTransactions = [];
    
    // Add some historical transactions for John (silver tier guest)
    loyaltyTransactions.push(
      {
        userId: guests[0]._id,
        hotelId: hotel._id,
        type: 'earned',
        points: 500,
        description: 'Points earned from hotel booking',
        bookingId: createdBookings[0]._id,
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
      },
      {
        userId: guests[0]._id,
        hotelId: hotel._id,
        type: 'earned',
        points: 300,
        description: 'Points earned from restaurant dining',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        userId: guests[0]._id,
        hotelId: hotel._id,
        type: 'earned',
        points: 250,
        description: 'Points earned from spa services',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      },
      {
        userId: guests[0]._id,
        hotelId: hotel._id,
        type: 'redeemed',
        points: -200,
        description: 'Redeemed: Free Welcome Drink',
        offerId: createdOffers[1]._id,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      },
      {
        userId: guests[0]._id,
        hotelId: hotel._id,
        type: 'bonus',
        points: 100,
        description: 'Bonus points for excellent service',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        userId: guests[0]._id,
        hotelId: hotel._id,
        type: 'earned',
        points: 400,
        description: 'Points earned from recent stay',
        bookingId: createdBookings[1]._id,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    );

    // Add some transactions for Jane (bronze tier guest)
    loyaltyTransactions.push(
      {
        userId: guests[1]._id,
        hotelId: hotel._id,
        type: 'earned',
        points: 400,
        description: 'Points earned from hotel booking',
        bookingId: createdBookings[2]._id,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
      },
      {
        userId: guests[1]._id,
        hotelId: hotel._id,
        type: 'earned',
        points: 150,
        description: 'Points earned from room service',
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000)
      },
      {
        userId: guests[1]._id,
        hotelId: hotel._id,
        type: 'earned',
        points: 200,
        description: 'Points earned from additional services',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      }
    );

    const createdLoyaltyTransactions = await Loyalty.create(loyaltyTransactions);
    logger.info(`Created ${createdLoyaltyTransactions.length} loyalty transactions`);

    // Create hotel services
    const hotelServicesData = [
      {
        hotelId: hotel._id,
        name: 'Spa & Wellness',
        description: 'Relax and rejuvenate with our premium spa treatments and wellness facilities.',
        category: 'spa',
        type: 'spa',
        price: 2500,
        duration: 90,
        availability: 'available',
        isActive: true,
        isFeatured: true,
        images: ['https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg'],
        amenities: ['Steam room', 'Sauna', 'Massage therapy', 'Aromatherapy'],
        operatingHours: {
          monday: { open: '09:00', close: '21:00' },
          tuesday: { open: '09:00', close: '21:00' },
          wednesday: { open: '09:00', close: '21:00' },
          thursday: { open: '09:00', close: '21:00' },
          friday: { open: '09:00', close: '22:00' },
          saturday: { open: '08:00', close: '22:00' },
          sunday: { open: '08:00', close: '21:00' }
        }
      },
      {
        hotelId: hotel._id,
        name: 'Fine Dining Restaurant',
        description: 'Experience exquisite cuisine prepared by our award-winning chefs.',
        category: 'dining',
        type: 'dining',
        price: 1500,
        duration: 120,
        availability: 'available',
        isActive: true,
        isFeatured: true,
        images: ['https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg'],
        amenities: ['Multi-cuisine', 'Wine selection', 'Private dining', 'Outdoor seating'],
        operatingHours: {
          monday: { open: '07:00', close: '23:00' },
          tuesday: { open: '07:00', close: '23:00' },
          wednesday: { open: '07:00', close: '23:00' },
          thursday: { open: '07:00', close: '23:00' },
          friday: { open: '07:00', close: '00:00' },
          saturday: { open: '07:00', close: '00:00' },
          sunday: { open: '07:00', close: '23:00' }
        }
      },
      {
        hotelId: hotel._id,
        name: 'Airport Transfer',
        description: 'Convenient and comfortable transportation to and from the airport.',
        category: 'transport',
        type: 'transport',
        price: 800,
        duration: 45,
        availability: 'available',
        isActive: true,
        isFeatured: false,
        images: ['https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg'],
        amenities: ['Professional driver', 'Premium vehicle', 'Meet & greet', '24/7 service'],
        operatingHours: {
          monday: { open: '00:00', close: '23:59' },
          tuesday: { open: '00:00', close: '23:59' },
          wednesday: { open: '00:00', close: '23:59' },
          thursday: { open: '00:00', close: '23:59' },
          friday: { open: '00:00', close: '23:59' },
          saturday: { open: '00:00', close: '23:59' },
          sunday: { open: '00:00', close: '23:59' }
        }
      },
      {
        hotelId: hotel._id,
        name: 'Business Center',
        description: 'Complete business facilities including meeting rooms and office services.',
        category: 'business',
        type: 'business',
        price: 500,
        duration: 60,
        availability: 'available',
        isActive: true,
        isFeatured: false,
        images: ['https://images.pexels.com/photos/416405/pexels-photo-416405.jpeg'],
        amenities: ['High-speed internet', 'Printing services', 'Meeting rooms', 'Presentation equipment'],
        operatingHours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '22:00' },
          saturday: { open: '08:00', close: '20:00' },
          sunday: { open: '08:00', close: '20:00' }
        }
      },
      {
        hotelId: hotel._id,
        name: 'Fitness Center',
        description: 'Stay fit with our modern gym equipment and personal training services.',
        category: 'fitness',
        type: 'gym',
        price: 0,
        duration: 60,
        availability: 'available',
        isActive: true,
        isFeatured: true,
        images: ['https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg'],
        amenities: ['Modern equipment', 'Personal training', 'Group classes', 'Locker facilities'],
        operatingHours: {
          monday: { open: '05:00', close: '23:00' },
          tuesday: { open: '05:00', close: '23:00' },
          wednesday: { open: '05:00', close: '23:00' },
          thursday: { open: '05:00', close: '23:00' },
          friday: { open: '05:00', close: '23:00' },
          saturday: { open: '06:00', close: '22:00' },
          sunday: { open: '06:00', close: '22:00' }
        }
      }
    ];
    const createdHotelServices = await HotelService.create(hotelServicesData);
    logger.info(`Created ${createdHotelServices.length} hotel services`);

    // Create meet-up requests
    const meetUpRequestsData = [
      {
        requesterId: guests[0]._id,
        targetUserId: guests[1]._id,
        hotelId: hotel._id,
        title: 'Morning Jog Partners',
        description: 'Looking for fellow guests to join me for a morning jog around the city. Great way to start the day and explore!',
        type: 'activity',
        proposedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        proposedTime: {
          start: '07:00',
          end: '08:30'
        },
        location: {
          type: 'hotel_lobby',
          name: 'Hotel Main Lobby',
          details: 'Meet at the main reception area'
        },
        activity: {
          type: 'walk',
          duration: 90,
          cost: 0,
          costSharing: false
        },
        status: 'pending'
      },
      {
        requesterId: guests[1]._id,
        targetUserId: guests[0]._id,
        hotelId: hotel._id,
        title: 'City Food Tour',
        description: 'Join me for an evening food tour exploring the best local restaurants and street food. Perfect for food lovers!',
        type: 'social',
        proposedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        proposedTime: {
          start: '18:00',
          end: '21:00'
        },
        location: {
          type: 'restaurant',
          name: 'Hotel Restaurant',
          details: 'Starting point for the food tour'
        },
        status: 'pending'
      },
      {
        requesterId: guests[2]._id,
        targetUserId: guests[0]._id,
        hotelId: hotel._id,
        title: 'Business Networking Breakfast',
        description: 'Connect with fellow business travelers over breakfast. Share experiences and make professional connections.',
        type: 'business',
        proposedDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        proposedTime: {
          start: '08:00',
          end: '09:30'
        },
        location: {
          type: 'restaurant',
          name: 'Hotel Restaurant',
          details: 'Business breakfast meeting'
        },
        status: 'pending'
      }
    ];
    const createdMeetUpRequests = await MeetUpRequest.create(meetUpRequestsData);
    logger.info(`Created ${createdMeetUpRequests.length} meet-up requests`);

    // Create notifications for guests
    const notificationsData = [
      {
        userId: guests[0]._id,
        hotelId: hotel._id,
        title: 'Welcome to THE PENTOUZ!',
        message: 'Thank you for choosing our hotel. Enjoy our complimentary welcome drink at the restaurant.',
        type: 'welcome',
        channels: ['in_app'],
        priority: 'medium',
        status: 'sent',
        metadata: {
          category: 'promotional'
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        userId: guests[0]._id,
        hotelId: hotel._id,
        title: 'Meet-Up Request Response',
        message: 'Someone responded to your meet-up request. Check your requests for details.',
        type: 'system_alert',
        channels: ['in_app'],
        priority: 'medium',
        status: 'delivered',
        metadata: {
          category: 'system'
        },
        sentAt: new Date(Date.now() - 30 * 60 * 1000),
        deliveredAt: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        userId: guests[1]._id,
        hotelId: hotel._id,
        title: 'Loyalty Points Earned!',
        message: 'You earned 150 loyalty points from your recent room service order. Keep collecting to unlock rewards!',
        type: 'loyalty_points',
        channels: ['in_app'],
        priority: 'medium',
        status: 'sent',
        metadata: {
          category: 'loyalty',
          loyaltyTransactionId: createdLoyaltyTransactions[0]._id
        },
        sentAt: new Date(Date.now() - 45 * 60 * 1000)
      },
      {
        userId: guests[1]._id,
        hotelId: hotel._id,
        title: 'Room Service Available',
        message: 'Our 24/7 room service is now available. Order your favorite meals directly to your room.',
        type: 'promotional',
        channels: ['in_app'],
        priority: 'low',
        status: 'read',
        readAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        metadata: {
          category: 'service'
        },
        sentAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        deliveredAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        userId: guests[2]._id,
        hotelId: hotel._id,
        title: 'Booking Confirmation',
        message: 'Your upcoming stay has been confirmed. Check-in starts at 3 PM. Looking forward to welcoming you!',
        type: 'booking_confirmation',
        channels: ['in_app', 'email'],
        priority: 'high',
        status: 'delivered',
        metadata: {
          category: 'booking',
          bookingId: createdBookings[0]._id
        },
        sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        deliveredAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        userId: guests[0]._id,
        hotelId: hotel._id,
        title: 'Spa Appointment Reminder',
        message: 'Your spa appointment is scheduled for tomorrow at 3 PM. Please arrive 15 minutes early.',
        type: 'service_reminder',
        channels: ['in_app'],
        priority: 'high',
        status: 'pending',
        metadata: {
          category: 'service'
        },
        scheduledFor: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
      }
    ];
    const createdNotifications = await Notification.create(notificationsData);
    logger.info(`Created ${createdNotifications.length} notifications`);

    // Create Room Blocks
    const roomBlocksData = [
      {
        blockId: `RB-${Date.now()}-1`,
        blockName: 'Tech Conference 2025',
        groupName: 'TechCorp International',
        eventType: 'conference',
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-03-17'),
        rooms: createdRooms.slice(0, 5).map(room => ({
          roomId: room._id,
          roomNumber: room.roomNumber,
          roomType: room.type,
          rate: room.currentRate * 0.9, // 10% discount
          status: 'blocked'
        })),
        totalRooms: 5,
        roomsBooked: 2,
        roomsReleased: 0,
        blockRate: createdRooms[0].currentRate * 0.9,
        status: 'active',
        contactPerson: {
          name: 'Sarah Johnson',
          email: 'sarah@techcorp.com',
          phone: '+1-555-0123',
          title: 'Event Coordinator'
        },
        billingInstructions: 'master_account',
        specialInstructions: 'Setup AV equipment in all rooms',
        amenities: ['wifi', 'breakfast', 'parking'],
        cateringRequirements: 'Vegetarian lunch for 50 people on March 16th',
        createdBy: adminUser._id
      },
      {
        blockId: `RB-${Date.now()}-2`,
        blockName: 'Smith-Williams Wedding',
        groupName: 'Smith-Williams Family',
        eventType: 'wedding',
        startDate: new Date('2025-04-20'),
        endDate: new Date('2025-04-22'),
        rooms: createdRooms.slice(5, 10).map(room => ({
          roomId: room._id,
          roomNumber: room.roomNumber,
          roomType: room.type,
          rate: room.currentRate,
          status: 'blocked'
        })),
        totalRooms: 5,
        roomsBooked: 5,
        roomsReleased: 0,
        blockRate: createdRooms[5].currentRate,
        status: 'confirmed',
        contactPerson: {
          name: 'Emily Smith',
          email: 'emily.smith@email.com',
          phone: '+1-555-0456',
          title: 'Bride'
        },
        billingInstructions: 'individual_folios',
        specialInstructions: 'All rooms should have flower arrangements',
        amenities: ['champagne', 'late_checkout', 'spa_access'],
        cateringRequirements: 'Wedding reception for 100 guests',
        createdBy: staffUser._id
      },
      {
        blockId: `RB-${Date.now()}-3`,
        blockName: 'Annual Sales Meeting',
        groupName: 'GlobalSales Inc',
        eventType: 'corporate_event',
        startDate: new Date('2025-05-10'),
        endDate: new Date('2025-05-12'),
        rooms: createdRooms.slice(10, 15).map(room => ({
          roomId: room._id,
          roomNumber: room.roomNumber,
          roomType: room.type,
          rate: room.currentRate * 0.85, // 15% discount
          status: 'blocked'
        })),
        totalRooms: 5,
        roomsBooked: 1,
        roomsReleased: 1,
        blockRate: createdRooms[10].currentRate * 0.85,
        status: 'active',
        contactPerson: {
          name: 'Mike Thompson',
          email: 'mike@globalsales.com',
          phone: '+1-555-0789',
          title: 'Sales Director'
        },
        billingInstructions: 'master_account',
        specialInstructions: 'Meeting room required for presentations',
        amenities: ['business_center', 'early_checkin'],
        cateringRequirements: 'Continental breakfast daily, coffee breaks',
        createdBy: adminUser._id
      }
    ];

    const createdRoomBlocks = await RoomBlock.create(roomBlocksData);
    logger.info(`Created ${createdRoomBlocks.length} room blocks`);

    // Assignment Rules Seed Data
    const assignmentRulesData = [
      {
        ruleId: `AR-${Date.now()}-1`,
        ruleName: 'VIP Guest Priority Assignment',
        priority: 1,
        isActive: true,
        conditions: {
          guestType: ['vip'],
          reservationType: ['vip', 'corporate'],
          lengthOfStay: { min: 2 }
        },
        actions: {
          preferredFloors: [5, 6, 7],
          upgradeEligible: true,
          upgradeFromTypes: ['deluxe'],
          upgradeToTypes: ['suite', 'presidential'],
          amenityPackages: ['wifi', 'breakfast', 'spa_access', 'late_checkout'],
          specialServices: ['turndown_service', 'welcome_amenities', 'concierge_service']
        },
        restrictions: {
          maxUpgrades: 10,
          minimumRevenue: 500,
          requiredApproval: 'manager'
        },
        createdBy: adminUser._id
      },
      {
        ruleId: `AR-${Date.now()}-2`,
        ruleName: 'Corporate Booking Standard Assignment',
        priority: 2,
        isActive: true,
        conditions: {
          guestType: ['corporate'],
          reservationType: ['corporate'],
          lengthOfStay: { min: 3 },
          advanceBooking: { min: 7 }
        },
        actions: {
          preferredFloors: [3, 4],
          upgradeEligible: false,
          amenityPackages: ['wifi', 'business_center', 'early_checkin'],
          specialServices: ['priority_housekeeping']
        },
        restrictions: {
          maxUpgrades: 5,
          minimumRevenue: 200,
          requiredApproval: 'supervisor'
        },
        createdBy: staffUser._id
      },
      {
        ruleId: `AR-${Date.now()}-3`,
        ruleName: 'Group Booking Block Assignment',
        priority: 3,
        isActive: true,
        conditions: {
          guestType: ['group'],
          reservationType: ['group'],
          lengthOfStay: { min: 2, max: 7 }
        },
        actions: {
          preferredFloors: [2, 3],
          upgradeEligible: true,
          upgradeFromTypes: ['single', 'double'],
          upgradeToTypes: ['deluxe'],
          amenityPackages: ['wifi', 'parking']
        },
        restrictions: {
          maxUpgrades: 3,
          minimumRevenue: 150,
          requiredApproval: 'supervisor',
          blockoutDates: [
            {
              startDate: new Date('2025-12-20'),
              endDate: new Date('2025-12-31'),
              reason: 'Holiday season - premium rates only'
            }
          ]
        },
        createdBy: adminUser._id
      }
    ];

    const createdAssignmentRules = await RoomAssignmentRules.create(assignmentRulesData);
    logger.info(`Created ${createdAssignmentRules.length} assignment rules`);

    // Advanced Reservations Seed Data
    const advancedReservationsData = [
      {
        reservationId: `ADV-${Date.now()}-1`,
        bookingId: createdBookings[0]._id,
        reservationType: 'vip',
        priority: 'vip',
        roomPreferences: {
          preferredRooms: [createdRooms[5]._id.toString(), createdRooms[6]._id.toString()],
          preferredFloor: 6,
          preferredView: 'ocean',
          adjacentRooms: false,
          connectingRooms: false,
          accessibleRoom: false,
          smokingPreference: 'non_smoking'
        },
        guestProfile: {
          vipStatus: 'platinum',
          loyaltyNumber: 'PLT-789456',
          preferences: {
            bedType: 'king',
            pillowType: 'memory_foam',
            roomTemperature: 72,
            newspaper: 'Financial Times',
            wakeUpCall: false,
            turndownService: true
          },
          allergies: ['shellfish'],
          specialNeeds: [],
          dietaryRestrictions: ['vegetarian']
        },
        roomAssignments: [
          {
            roomId: createdRooms[5]._id,
            roomNumber: createdRooms[5].roomNumber,
            assignedDate: new Date(),
            assignmentType: 'preference',
            assignedBy: staffUser._id,
            notes: 'VIP guest preference - ocean view suite'
          }
        ],
        upgrades: [
          {
            fromRoomType: 'deluxe',
            toRoomType: 'suite',
            upgradeType: 'complimentary',
            upgradeReason: 'VIP status - platinum member',
            additionalCharge: 0,
            approvedBy: adminUser._id,
            upgradeDate: new Date()
          }
        ],
        specialRequests: [
          {
            type: 'amenities',
            description: 'Premium champagne and chocolate arrangement',
            priority: 'high',
            status: 'confirmed',
            assignedTo: staffUser._id,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            cost: 150,
            notes: 'VIP welcome amenity'
          },
          {
            type: 'services',
            description: 'Daily turndown service with rose petals',
            priority: 'medium',
            status: 'pending',
            cost: 50,
            notes: 'Special romantic package'
          }
        ],
        reservationFlags: [
          {
            flag: 'vip',
            severity: 'info',
            description: 'Platinum loyalty member - provide exceptional service',
            createdBy: staffUser._id,
            createdAt: new Date(),
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          }
        ]
      },
      {
        reservationId: `ADV-${Date.now()}-2`,
        bookingId: createdBookings[1]._id,
        reservationType: 'corporate',
        priority: 'high',
        roomPreferences: {
          preferredFloor: 4,
          preferredView: 'city',
          adjacentRooms: true,
          connectingRooms: false,
          accessibleRoom: false,
          smokingPreference: 'non_smoking'
        },
        guestProfile: {
          vipStatus: 'gold',
          loyaltyNumber: 'GLD-456789',
          preferences: {
            bedType: 'queen',
            pillowType: 'firm',
            roomTemperature: 70,
            newspaper: 'Wall Street Journal',
            wakeUpCall: true,
            turndownService: false
          },
          allergies: [],
          specialNeeds: [],
          dietaryRestrictions: []
        },
        roomAssignments: [
          {
            roomId: createdRooms[8]._id,
            roomNumber: createdRooms[8].roomNumber,
            assignedDate: new Date(),
            assignmentType: 'auto',
            assignedBy: staffUser._id,
            notes: 'Auto-assigned based on corporate preferences'
          }
        ],
        upgrades: [],
        specialRequests: [
          {
            type: 'room_setup',
            description: 'Business setup with desk and ergonomic chair',
            priority: 'medium',
            status: 'completed',
            assignedTo: staffUser._id,
            cost: 0,
            notes: 'Standard corporate amenity'
          },
          {
            type: 'services',
            description: 'Early check-in at 12:00 PM',
            priority: 'low',
            status: 'confirmed',
            cost: 0,
            notes: 'Corporate account privilege'
          }
        ],
        reservationFlags: [
          {
            flag: 'special_attention',
            severity: 'info',
            description: 'Corporate account - bill to company',
            createdBy: staffUser._id,
            createdAt: new Date()
          }
        ]
      },
      {
        reservationId: `ADV-${Date.now()}-3`,
        bookingId: createdBookings[2]._id,
        reservationType: 'standard',
        priority: 'medium',
        roomPreferences: {
          preferredView: 'garden',
          accessibleRoom: true,
          smokingPreference: 'non_smoking'
        },
        guestProfile: {
          vipStatus: 'member',
          preferences: {
            bedType: 'double',
            pillowType: 'soft'
          },
          allergies: ['nuts'],
          specialNeeds: ['wheelchair_accessible'],
          dietaryRestrictions: ['gluten_free']
        },
        roomAssignments: [],
        upgrades: [],
        specialRequests: [
          {
            type: 'room_setup',
            description: 'Wheelchair accessible room with roll-in shower',
            priority: 'high',
            status: 'pending',
            notes: 'Essential accessibility requirement'
          }
        ],
        reservationFlags: [
          {
            flag: 'special_attention',
            severity: 'warning',
            description: 'Guest requires wheelchair accessible accommodations',
            createdBy: staffUser._id,
            createdAt: new Date()
          }
        ],
        waitlistInfo: {
          waitlistPosition: 1,
          waitlistDate: new Date(),
          preferredRoomTypes: ['deluxe'],
          maxRate: 200,
          flexibleDates: {
            checkInRange: {
              start: new Date('2025-03-15'),
              end: new Date('2025-03-20')
            },
            checkOutRange: {
              start: new Date('2025-03-18'),
              end: new Date('2025-03-25')
            }
          },
          notificationPreferences: {
            email: true,
            sms: true,
            phone: false
          },
          autoConfirm: false
        }
      }
    ];

    const createdAdvancedReservations = await AdvancedReservation.create(advancedReservationsData);
    logger.info(`Created ${createdAdvancedReservations.length} advanced reservations`);

    logger.info('✅ Comprehensive seed data created successfully!');
    logger.info('\n📊 Data Summary:');
    logger.info(`🏨 Hotels: 1`);
    logger.info(`👥 Users: ${3 + guests.length} (1 admin, 1 staff, ${guests.length} guests)`);
    logger.info(`🏠 Rooms: ${createdRooms.length}`);
    logger.info(`📅 Bookings: ${createdBookings.length}`);
    logger.info(`📦 Inventory: ${createdInventory.length}`);
    logger.info(`⭐ Reviews: ${createdReviews.length}`);
    logger.info(`🛎️ Guest Services: ${createdGuestServices.length}`);
    logger.info(`🔧 Maintenance: ${createdMaintenance.length}`);
    logger.info(`🚨 Incidents: ${createdIncidents.length}`);
    logger.info(`💰 Invoices: ${createdInvoices.length}`);
    logger.info(`📋 Supply Requests: ${createdSupplyRequests.length}`);
    logger.info(`📧 Communications: ${createdCommunications.length}`);
    logger.info(`📝 Templates: ${createdTemplates.length}`);
    logger.info(`🧹 Housekeeping: ${createdHousekeeping.length}`);
    logger.info(`🎁 Loyalty Offers: ${createdOffers.length}`);
    logger.info(`💎 Loyalty Transactions: ${createdLoyaltyTransactions.length}`);
    logger.info(`🏨 Hotel Services: ${createdHotelServices.length}`);
    logger.info(`🤝 Meet-Up Requests: ${createdMeetUpRequests.length}`);
    logger.info(`🔔 Notifications: ${createdNotifications.length}`);
    logger.info(`🏢 Room Blocks: ${createdRoomBlocks.length}`);
    logger.info(`⚙️ Assignment Rules: ${createdAssignmentRules.length}`);
    logger.info(`🎯 Advanced Reservations: ${createdAdvancedReservations.length}`);

    // Create POS Outlets
    const posOutlets = [
      {
        outletId: 'outlet_restaurant_main',
        name: 'Main Restaurant',
        type: 'restaurant',
        location: 'Ground Floor',
        isActive: true,
        operatingHours: {
          monday: { open: '06:00', close: '23:00', closed: false },
          tuesday: { open: '06:00', close: '23:00', closed: false },
          wednesday: { open: '06:00', close: '23:00', closed: false },
          thursday: { open: '06:00', close: '23:00', closed: false },
          friday: { open: '06:00', close: '23:00', closed: false },
          saturday: { open: '06:00', close: '23:00', closed: false },
          sunday: { open: '06:00', close: '23:00', closed: false }
        },
        taxSettings: {
          defaultTaxRate: 5,
          serviceTaxRate: 10,
          gstRate: 18
        },
        paymentMethods: ['cash', 'card', 'room_charge', 'voucher'],
        manager: adminUser._id,
        staff: [staffUser._id],
        settings: {
          allowRoomCharges: true,
          requireSignature: false,
          printReceipts: true,
          allowDiscounts: true,
          maxDiscountPercent: 20
        }
      },
      {
        outletId: 'outlet_bar_sky',
        name: 'Sky Bar',
        type: 'bar',
        location: 'Rooftop',
        isActive: true,
        operatingHours: {
          monday: { open: '18:00', close: '02:00', closed: false },
          tuesday: { open: '18:00', close: '02:00', closed: false },
          wednesday: { open: '18:00', close: '02:00', closed: false },
          thursday: { open: '18:00', close: '02:00', closed: false },
          friday: { open: '18:00', close: '03:00', closed: false },
          saturday: { open: '18:00', close: '03:00', closed: false },
          sunday: { open: '18:00', close: '02:00', closed: false }
        },
        taxSettings: {
          defaultTaxRate: 5,
          serviceTaxRate: 10,
          gstRate: 18
        },
        paymentMethods: ['cash', 'card', 'room_charge'],
        manager: adminUser._id,
        staff: [staffUser._id],
        settings: {
          allowRoomCharges: true,
          requireSignature: true,
          printReceipts: true,
          allowDiscounts: false,
          maxDiscountPercent: 0
        }
      },
      {
        outletId: 'outlet_room_service',
        name: 'Room Service',
        type: 'room_service',
        location: 'Kitchen',
        isActive: true,
        operatingHours: {
          monday: { open: '00:00', close: '23:59', closed: false },
          tuesday: { open: '00:00', close: '23:59', closed: false },
          wednesday: { open: '00:00', close: '23:59', closed: false },
          thursday: { open: '00:00', close: '23:59', closed: false },
          friday: { open: '00:00', close: '23:59', closed: false },
          saturday: { open: '00:00', close: '23:59', closed: false },
          sunday: { open: '00:00', close: '23:59', closed: false }
        },
        taxSettings: {
          defaultTaxRate: 5,
          serviceTaxRate: 15,
          gstRate: 18
        },
        paymentMethods: ['room_charge'],
        manager: adminUser._id,
        staff: [staffUser._id],
        settings: {
          allowRoomCharges: true,
          requireSignature: false,
          printReceipts: true,
          allowDiscounts: true,
          maxDiscountPercent: 10
        }
      },
      {
        outletId: 'outlet_wellness_spa',
        name: 'Wellness Spa',
        type: 'spa',
        location: '2nd Floor',
        isActive: true,
        operatingHours: {
          monday: { open: '09:00', close: '21:00', isOpen: true },
          tuesday: { open: '09:00', close: '21:00', isOpen: true },
          wednesday: { open: '09:00', close: '21:00', isOpen: true },
          thursday: { open: '09:00', close: '21:00', isOpen: true },
          friday: { open: '09:00', close: '21:00', isOpen: true },
          saturday: { open: '09:00', close: '22:00', isOpen: true },
          sunday: { open: '09:00', close: '22:00', isOpen: true }
        },
        phoneExtension: '304',
        settings: {
          acceptsWalkIns: true,
          requiresReservation: true,
          allowDiscounts: true,
          maxDiscountPercent: 15
        }
      },
      {
        outletId: 'outlet_fitness_center',
        name: 'Fitness Center',
        type: 'gym',
        location: 'Basement',
        isActive: true,
        operatingHours: {
          monday: { open: '05:00', close: '23:00', isOpen: true },
          tuesday: { open: '05:00', close: '23:00', isOpen: true },
          wednesday: { open: '05:00', close: '23:00', isOpen: true },
          thursday: { open: '05:00', close: '23:00', isOpen: true },
          friday: { open: '05:00', close: '23:00', isOpen: true },
          saturday: { open: '06:00', close: '24:00', isOpen: true },
          sunday: { open: '06:00', close: '24:00', isOpen: true }
        },
        phoneExtension: '305',
        settings: {
          acceptsWalkIns: true,
          requiresReservation: false,
          allowDiscounts: true,
          maxDiscountPercent: 10
        }
      },
      {
        outletId: 'outlet_gift_shop',
        name: 'Gift Shop',
        type: 'shop',
        location: 'Lobby',
        isActive: true,
        operatingHours: {
          monday: { open: '08:00', close: '22:00', isOpen: true },
          tuesday: { open: '08:00', close: '22:00', isOpen: true },
          wednesday: { open: '08:00', close: '22:00', isOpen: true },
          thursday: { open: '08:00', close: '22:00', isOpen: true },
          friday: { open: '08:00', close: '22:00', isOpen: true },
          saturday: { open: '08:00', close: '22:00', isOpen: true },
          sunday: { open: '08:00', close: '22:00', isOpen: true }
        },
        phoneExtension: '306',
        settings: {
          acceptsWalkIns: true,
          requiresReservation: false,
          allowDiscounts: true,
          maxDiscountPercent: 5
        }
      },
      {
        outletId: 'outlet_valet_parking',
        name: 'Valet Parking',
        type: 'parking',
        location: 'Ground Floor',
        isActive: true,
        operatingHours: {
          monday: { open: '00:00', close: '23:59', isOpen: true },
          tuesday: { open: '00:00', close: '23:59', isOpen: true },
          wednesday: { open: '00:00', close: '23:59', isOpen: true },
          thursday: { open: '00:00', close: '23:59', isOpen: true },
          friday: { open: '00:00', close: '23:59', isOpen: true },
          saturday: { open: '00:00', close: '23:59', isOpen: true },
          sunday: { open: '00:00', close: '23:59', isOpen: true }
        },
        phoneExtension: '307',
        settings: {
          acceptsWalkIns: true,
          requiresReservation: false,
          allowDiscounts: false,
          maxDiscountPercent: 0
        }
      }
    ];

    const createdOutlets = await POSOutlet.insertMany(posOutlets);
    logger.info(`🍽️ POS Outlets created: ${createdOutlets.length}`);

    // Create POS Menus with items
    const posMenus = [
      {
        menuId: 'menu_restaurant_all_day',
        name: 'All Day Dining Menu',
        outlet: createdOutlets[0]._id,
        type: 'all_day',
        isActive: true,
        availableHours: {
          start: '06:00',
          end: '23:00'
        },
        categories: [
          { name: 'Appetizers', displayOrder: 1, isActive: true },
          { name: 'Main Course', displayOrder: 2, isActive: true },
          { name: 'Desserts', displayOrder: 3, isActive: true },
          { name: 'Beverages', displayOrder: 4, isActive: true }
        ],
        items: [
          {
            itemId: 'item_spring_rolls',
            name: 'Vegetable Spring Rolls',
            description: 'Crispy spring rolls with fresh vegetables and sweet chili sauce',
            category: 'Appetizers',
            price: 850,
            costPrice: 300,
            isActive: true,
            isAvailable: true,
            preparationTime: 15,
            allergens: ['gluten'],
            dietaryInfo: ['vegetarian'],
            ingredients: ['cabbage', 'carrot', 'spring onion', 'flour'],
            modifiers: [
              {
                name: 'Sauce',
                options: [
                  { name: 'Sweet Chili', price: 0 },
                  { name: 'Soy Sauce', price: 0 },
                  { name: 'Spicy Mayo', price: 50 }
                ]
              }
            ]
          },
          {
            itemId: 'item_chicken_tikka',
            name: 'Chicken Tikka Masala',
            description: 'Tender chicken pieces in rich tomato curry',
            category: 'Main Course',
            price: 1650,
            costPrice: 650,
            isActive: true,
            isAvailable: true,
            preparationTime: 25,
            allergens: ['dairy'],
            dietaryInfo: [],
            ingredients: ['chicken', 'tomato', 'cream', 'spices'],
            modifiers: [
              {
                name: 'Spice Level',
                options: [
                  { name: 'Mild', price: 0 },
                  { name: 'Medium', price: 0 },
                  { name: 'Hot', price: 0 }
                ]
              },
              {
                name: 'Bread',
                options: [
                  { name: 'Naan', price: 150 },
                  { name: 'Roti', price: 100 },
                  { name: 'Rice', price: 120 }
                ]
              }
            ]
          },
          {
            itemId: 'item_pasta_alfredo',
            name: 'Fettuccine Alfredo',
            description: 'Classic pasta with creamy parmesan sauce',
            category: 'Main Course',
            price: 1450,
            costPrice: 500,
            isActive: true,
            isAvailable: true,
            preparationTime: 20,
            allergens: ['gluten', 'dairy'],
            dietaryInfo: ['vegetarian'],
            ingredients: ['pasta', 'cream', 'parmesan', 'butter'],
            modifiers: [
              {
                name: 'Add Protein',
                options: [
                  { name: 'Chicken', price: 300 },
                  { name: 'Prawns', price: 400 },
                  { name: 'Mushroom', price: 150 }
                ]
              }
            ]
          },
          {
            itemId: 'item_chocolate_cake',
            name: 'Dark Chocolate Cake',
            description: 'Rich dark chocolate cake with vanilla ice cream',
            category: 'Desserts',
            price: 650,
            costPrice: 200,
            isActive: true,
            isAvailable: true,
            preparationTime: 10,
            allergens: ['gluten', 'dairy', 'eggs'],
            dietaryInfo: [],
            ingredients: ['chocolate', 'flour', 'eggs', 'butter']
          },
          {
            itemId: 'item_fresh_juice',
            name: 'Fresh Orange Juice',
            description: 'Freshly squeezed orange juice',
            category: 'Beverages',
            price: 350,
            costPrice: 100,
            isActive: true,
            isAvailable: true,
            preparationTime: 5,
            allergens: [],
            dietaryInfo: ['vegan'],
            ingredients: ['fresh oranges']
          }
        ]
      },
      {
        menuId: 'menu_bar_cocktails',
        name: 'Cocktail Menu',
        outlet: createdOutlets[1]._id,
        type: 'beverages',
        isActive: true,
        availableHours: {
          start: '18:00',
          end: '02:00'
        },
        categories: [
          { name: 'Cocktails', displayOrder: 1, isActive: true },
          { name: 'Spirits', displayOrder: 2, isActive: true },
          { name: 'Beer', displayOrder: 3, isActive: true }
        ],
        items: [
          {
            itemId: 'item_mojito',
            name: 'Classic Mojito',
            description: 'Fresh mint, lime, and white rum',
            category: 'Cocktails',
            price: 750,
            costPrice: 200,
            isActive: true,
            isAvailable: true,
            preparationTime: 8,
            allergens: [],
            dietaryInfo: ['vegan'],
            ingredients: ['white rum', 'mint', 'lime', 'soda']
          },
          {
            itemId: 'item_whiskey_neat',
            name: 'Single Malt Whiskey',
            description: 'Premium single malt served neat',
            category: 'Spirits',
            price: 1200,
            costPrice: 400,
            isActive: true,
            isAvailable: true,
            preparationTime: 2,
            allergens: [],
            dietaryInfo: ['vegan'],
            ingredients: ['single malt whiskey']
          }
        ]
      },
      {
        menuId: 'menu_spa_services',
        name: 'Wellness Spa Services',
        outlet: createdOutlets[3]._id, // Spa outlet
        type: 'services',
        isActive: true,
        availableHours: {
          start: '09:00',
          end: '21:00'
        },
        categories: [
          { name: 'Massage', displayOrder: 1, isActive: true },
          { name: 'Skincare', displayOrder: 2, isActive: true },
          { name: 'Wellness', displayOrder: 3, isActive: true },
          { name: 'Packages', displayOrder: 4, isActive: true }
        ],
        items: [
          {
            itemId: 'spa_swedish_massage',
            name: 'Swedish Massage (60 min)',
            description: 'Full body relaxing Swedish massage with aromatic oils',
            category: 'Massage',
            price: 3500,
            costPrice: 1200,
            isActive: true,
            isAvailable: true,
            preparationTime: 60,
            allergens: [],
            dietaryInfo: [],
            ingredients: ['essential oils', 'massage oil']
          },
          {
            itemId: 'spa_facial_treatment',
            name: 'Facial Treatment',
            description: 'Deep cleansing facial with organic products',
            category: 'Skincare',
            price: 2800,
            costPrice: 800,
            isActive: true,
            isAvailable: true,
            preparationTime: 45,
            allergens: [],
            dietaryInfo: [],
            ingredients: ['organic cleanser', 'moisturizer']
          },
          {
            itemId: 'spa_aromatherapy',
            name: 'Aromatherapy Session',
            description: 'Relaxing aromatherapy treatment with essential oils',
            category: 'Wellness',
            price: 2200,
            costPrice: 700,
            isActive: true,
            isAvailable: true,
            preparationTime: 30,
            allergens: [],
            dietaryInfo: [],
            ingredients: ['lavender oil', 'eucalyptus oil']
          },
          {
            itemId: 'spa_hot_stone',
            name: 'Hot Stone Massage',
            description: 'Therapeutic massage with heated volcanic stones',
            category: 'Massage',
            price: 4000,
            costPrice: 1300,
            isActive: true,
            isAvailable: true,
            preparationTime: 75,
            allergens: [],
            dietaryInfo: [],
            ingredients: ['volcanic stones', 'massage oil']
          },
          {
            itemId: 'spa_body_wrap',
            name: 'Body Wrap Treatment',
            description: 'Detoxifying body wrap with natural ingredients',
            category: 'Skincare',
            price: 3200,
            costPrice: 900,
            isActive: true,
            isAvailable: true,
            preparationTime: 50,
            allergens: [],
            dietaryInfo: [],
            ingredients: ['seaweed', 'clay', 'essential oils']
          }
        ]
      },
      {
        menuId: 'menu_gym_services',
        name: 'Fitness Center Services',
        outlet: createdOutlets[4]._id, // Gym outlet
        type: 'services',
        isActive: true,
        availableHours: {
          start: '05:00',
          end: '23:00'
        },
        categories: [
          { name: 'Training', displayOrder: 1, isActive: true },
          { name: 'Access', displayOrder: 2, isActive: true },
          { name: 'Classes', displayOrder: 3, isActive: true },
          { name: 'Equipment', displayOrder: 4, isActive: true }
        ],
        items: [
          {
            itemId: 'gym_personal_training',
            name: 'Personal Training (1 hr)',
            description: 'One-on-one training session with certified trainer',
            category: 'Training',
            price: 2000,
            costPrice: 800,
            isActive: true,
            isAvailable: true,
            preparationTime: 0,
            allergens: [],
            dietaryInfo: [],
            ingredients: []
          },
          {
            itemId: 'gym_day_pass',
            name: 'Day Pass',
            description: 'Full day access to gym facilities',
            category: 'Access',
            price: 500,
            costPrice: 100,
            isActive: true,
            isAvailable: true,
            preparationTime: 0,
            allergens: [],
            dietaryInfo: [],
            ingredients: []
          },
          {
            itemId: 'gym_group_class',
            name: 'Group Fitness Class',
            description: 'Participate in yoga, aerobics, or strength training classes',
            category: 'Classes',
            price: 800,
            costPrice: 200,
            isActive: true,
            isAvailable: true,
            preparationTime: 0,
            allergens: [],
            dietaryInfo: [],
            ingredients: []
          },
          {
            itemId: 'gym_weekly_pass',
            name: 'Weekly Membership',
            description: 'Seven days unlimited access to all gym facilities',
            category: 'Access',
            price: 2500,
            costPrice: 500,
            isActive: true,
            isAvailable: true,
            preparationTime: 0,
            allergens: [],
            dietaryInfo: [],
            ingredients: []
          },
          {
            itemId: 'gym_equipment_rental',
            name: 'Equipment Rental',
            description: 'Rent specialized equipment like heart rate monitors',
            category: 'Equipment',
            price: 200,
            costPrice: 50,
            isActive: true,
            isAvailable: true,
            preparationTime: 0,
            allergens: [],
            dietaryInfo: [],
            ingredients: []
          }
        ]
      },
      {
        menuId: 'menu_shop_items',
        name: 'Gift Shop Items',
        outlet: createdOutlets[5]._id, // Shop outlet
        type: 'retail',
        isActive: true,
        availableHours: {
          start: '08:00',
          end: '22:00'
        },
        categories: [
          { name: 'Apparel', displayOrder: 1, isActive: true },
          { name: 'Souvenirs', displayOrder: 2, isActive: true },
          { name: 'Food', displayOrder: 3, isActive: true },
          { name: 'Home', displayOrder: 4, isActive: true }
        ],
        items: [
          {
            itemId: 'shop_tshirt',
            name: 'Hotel Branded T-Shirt',
            description: 'Premium cotton t-shirt with hotel logo',
            category: 'Apparel',
            price: 1200,
            costPrice: 400,
            isActive: true,
            isAvailable: true,
            preparationTime: 0,
            allergens: [],
            dietaryInfo: [],
            ingredients: []
          },
          {
            itemId: 'shop_handicrafts',
            name: 'Local Handicrafts',
            description: 'Authentic local handmade crafts and artifacts',
            category: 'Souvenirs',
            price: 800,
            costPrice: 300,
            isActive: true,
            isAvailable: true,
            preparationTime: 0,
            allergens: [],
            dietaryInfo: [],
            ingredients: []
          },
          {
            itemId: 'shop_chocolates',
            name: 'Premium Chocolates',
            description: 'Luxury chocolate box with assorted flavors',
            category: 'Food',
            price: 950,
            costPrice: 400,
            isActive: true,
            isAvailable: true,
            preparationTime: 0,
            allergens: ['dairy', 'nuts'],
            dietaryInfo: [],
            ingredients: ['cocoa', 'milk', 'nuts']
          },
          {
            itemId: 'shop_candles',
            name: 'Luxury Candles',
            description: 'Scented candles with relaxing fragrances',
            category: 'Home',
            price: 1500,
            costPrice: 500,
            isActive: true,
            isAvailable: true,
            preparationTime: 0,
            allergens: [],
            dietaryInfo: [],
            ingredients: ['soy wax', 'essential oils']
          },
          {
            itemId: 'shop_coffee_beans',
            name: 'Artisan Coffee Beans',
            description: 'Premium locally roasted coffee beans',
            category: 'Food',
            price: 1800,
            costPrice: 600,
            isActive: true,
            isAvailable: true,
            preparationTime: 0,
            allergens: [],
            dietaryInfo: [],
            ingredients: ['coffee beans']
          }
        ]
      },
      {
        menuId: 'menu_parking_services',
        name: 'Parking Services',
        outlet: createdOutlets[6]._id, // Parking outlet
        type: 'services',
        isActive: true,
        availableHours: {
          start: '00:00',
          end: '23:59'
        },
        categories: [
          { name: 'Service', displayOrder: 1, isActive: true },
          { name: 'Parking', displayOrder: 2, isActive: true }
        ],
        items: [
          {
            itemId: 'parking_valet',
            name: 'Valet Service (per day)',
            description: 'Professional valet parking service',
            category: 'Service',
            price: 500,
            costPrice: 100,
            isActive: true,
            isAvailable: true,
            preparationTime: 0,
            allergens: [],
            dietaryInfo: [],
            ingredients: []
          },
          {
            itemId: 'parking_wash',
            name: 'Car Wash',
            description: 'Complete exterior and interior car wash',
            category: 'Service',
            price: 800,
            costPrice: 200,
            isActive: true,
            isAvailable: true,
            preparationTime: 30,
            allergens: [],
            dietaryInfo: [],
            ingredients: []
          },
          {
            itemId: 'parking_premium',
            name: 'Premium Parking (per day)',
            description: 'Covered parking in premium location',
            category: 'Parking',
            price: 300,
            costPrice: 50,
            isActive: true,
            isAvailable: true,
            preparationTime: 0,
            allergens: [],
            dietaryInfo: [],
            ingredients: []
          }
        ]
      }
    ];

    const createdMenus = await POSMenu.insertMany(posMenus);
    logger.info(`📋 POS Menus created: ${createdMenus.length}`);

    // Create sample POS Orders for today's stats
    const currentDate = new Date();
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);

    const posOrders = [
      // Completed orders for today's sales
      {
        orderId: 'order_today_001',
        orderNumber: `${currentDate.toISOString().slice(0, 10).replace(/-/g, '')}0001`,
        outlet: createdOutlets[0]._id,
        type: 'dine_in',
        status: 'completed',
        customer: {
          guest: guests[0]._id,
          roomNumber: '101'
        },
        items: [
          {
            itemId: 'item_spring_rolls',
            name: 'Vegetable Spring Rolls',
            price: 850,
            quantity: 1,
            status: 'served'
          },
          {
            itemId: 'item_chicken_tikka',
            name: 'Chicken Tikka Masala',
            price: 1650,
            quantity: 1,
            modifiers: [
              { name: 'Bread', option: 'Naan', price: 150 }
            ],
            status: 'served'
          }
        ],
        subtotal: 2650,
        taxes: {
          serviceTax: 265,
          gst: 477,
          totalTax: 742
        },
        totalAmount: 3392,
        payment: {
          method: 'room_charge',
          status: 'paid',
          paidAmount: 3392
        },
        staff: {
          server: staffUser._id,
          cashier: staffUser._id
        },
        orderTime: new Date(currentDate.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
        completedTime: new Date(currentDate.getTime() - 2.5 * 60 * 60 * 1000)
      },
      {
        orderId: 'order_today_002',
        orderNumber: `${currentDate.toISOString().slice(0, 10).replace(/-/g, '')}0002`,
        outlet: createdOutlets[1]._id,
        type: 'dine_in',
        status: 'completed',
        customer: {
          walkIn: {
            name: 'Sarah Wilson',
            phone: '+91-9876543210',
            email: 'sarah@example.com'
          }
        },
        items: [
          {
            itemId: 'item_mojito',
            name: 'Classic Mojito',
            price: 750,
            quantity: 2,
            status: 'served'
          },
          {
            itemId: 'item_whiskey_neat',
            name: 'Single Malt Whiskey',
            price: 1200,
            quantity: 1,
            status: 'served'
          }
        ],
        subtotal: 2700,
        taxes: {
          serviceTax: 270,
          gst: 486,
          totalTax: 756
        },
        totalAmount: 3456,
        payment: {
          method: 'card',
          status: 'paid',
          paidAmount: 3456,
          paymentDetails: {
            transactionId: 'TXN123456789',
            cardLast4: '1234'
          }
        },
        staff: {
          server: staffUser._id,
          cashier: adminUser._id
        },
        orderTime: new Date(currentDate.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        completedTime: new Date(currentDate.getTime() - 1.5 * 60 * 60 * 1000)
      },
      // Active orders (currently preparing)
      {
        orderId: 'order_active_001',
        orderNumber: `${currentDate.toISOString().slice(0, 10).replace(/-/g, '')}0003`,
        outlet: createdOutlets[0]._id,
        type: 'room_service',
        status: 'preparing',
        customer: {
          guest: guests[1]._id,
          roomNumber: '205'
        },
        items: [
          {
            itemId: 'item_pasta_alfredo',
            name: 'Fettuccine Alfredo',
            price: 1450,
            quantity: 1,
            modifiers: [
              { name: 'Add Protein', option: 'Chicken', price: 300 }
            ],
            status: 'preparing'
          },
          {
            itemId: 'item_fresh_juice',
            name: 'Fresh Orange Juice',
            price: 350,
            quantity: 2,
            status: 'ready'
          }
        ],
        subtotal: 2450,
        taxes: {
          serviceTax: 367.5,
          gst: 441,
          totalTax: 808.5
        },
        totalAmount: 3258.5,
        payment: {
          method: 'room_charge',
          status: 'pending'
        },
        staff: {
          server: staffUser._id
        },
        orderTime: new Date(currentDate.getTime() - 30 * 60 * 1000), // 30 minutes ago
        deliveryDetails: {
          address: 'Room 205'
        }
      },
      {
        orderId: 'order_active_002',
        orderNumber: `${currentDate.toISOString().slice(0, 10).replace(/-/g, '')}0004`,
        outlet: createdOutlets[0]._id,
        type: 'dine_in',
        status: 'ready',
        customer: {
          walkIn: {
            name: 'David Kumar',
            phone: '+91-8765432109'
          }
        },
        items: [
          {
            itemId: 'item_chocolate_cake',
            name: 'Dark Chocolate Cake',
            price: 650,
            quantity: 1,
            status: 'ready'
          }
        ],
        subtotal: 650,
        taxes: {
          serviceTax: 65,
          gst: 117,
          totalTax: 182
        },
        totalAmount: 832,
        payment: {
          method: 'cash',
          status: 'pending'
        },
        staff: {
          server: staffUser._id
        },
        orderTime: new Date(currentDate.getTime() - 15 * 60 * 1000), // 15 minutes ago
        tableNumber: 'T5'
      }
    ];

    const createdOrders = await POSOrder.insertMany(posOrders);
    logger.info(`🧾 POS Orders created: ${createdOrders.length}`);

    // Create Checkout Inventory samples
    const checkoutInventories = [
      {
        bookingId: createdBookings[0]._id, // John's confirmed booking
        roomId: createdRooms[0]._id, // Room 101
        checkedBy: staffUser._id,
        items: [
          {
            itemName: 'Bath Towel',
            category: 'bathroom',
            quantity: 1,
            unitPrice: 500,
            totalPrice: 500,
            status: 'damaged',
            notes: 'Small tear noticed'
          },
          {
            itemName: 'Mini Bar Bottle - Water',
            category: 'other',
            quantity: 2,
            unitPrice: 50,
            totalPrice: 100,
            status: 'used'
          },
          {
            itemName: 'TV Remote',
            category: 'electronics',
            quantity: 1,
            unitPrice: 800,
            totalPrice: 800,
            status: 'missing',
            notes: 'Remote not found during checkout'
          }
        ],
        status: 'completed',
        paymentStatus: 'pending',
        paymentMethod: 'card',
        notes: 'Guest checkout inspection completed'
      },
      {
        bookingId: createdBookings[1]._id, // Jane's confirmed booking
        roomId: createdRooms[1]._id, // Room 102
        checkedBy: adminUser._id,
        items: [
          {
            itemName: 'Coffee Mug',
            category: 'other',
            quantity: 1,
            unitPrice: 200,
            totalPrice: 200,
            status: 'damaged',
            notes: 'Handle broken'
          },
          {
            itemName: 'Hair Dryer',
            category: 'electronics',
            quantity: 1,
            unitPrice: 1500,
            totalPrice: 1500,
            status: 'intact'
          }
        ],
        status: 'paid',
        paymentStatus: 'paid',
        paymentMethod: 'upi',
        paidAt: new Date(),
        notes: 'Payment completed via UPI'
      },
      {
        bookingId: createdBookings[2]._id, // Mike's confirmed booking  
        roomId: createdRooms[2]._id, // Room 103
        checkedBy: staffUser._id,
        items: [
          {
            itemName: 'Pillow',
            category: 'bedroom',
            quantity: 1,
            unitPrice: 800,
            totalPrice: 800,
            status: 'missing',
            notes: 'Pillow missing from room'
          }
        ],
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'cash',
        notes: 'Checkout in progress'
      }
    ];

    const createdCheckoutInventories = await CheckoutInventory.insertMany(checkoutInventories);
    logger.info(`📦 Checkout Inventories created: ${createdCheckoutInventories.length}`);

    // Create POS billing sessions with various dates for reporting
    const todaysDate = new Date();
    const billingSessionsData = [
      {
        sessionId: `BS-${Date.now()}-001`,
        hotelId: hotel._id,
        guestName: 'John Smith',
        roomNumber: '101',
        bookingId: createdBookings[0]._id,
        bookingNumber: 'BK-2024-001',
        items: [
          {
            itemId: createdMenus[0].items[0]._id.toString(),
            name: 'Butter Chicken',
            category: 'Main Course',
            price: 450,
            outlet: 'Main Restaurant',
            quantity: 2,
            discount: 0,
            tax: 81,
            timestamp: new Date(todaysDate.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
          },
          {
            itemId: createdMenus[0].items[1]._id.toString(),
            name: 'Dal Makhani',
            category: 'Main Course',
            price: 350,
            outlet: 'Main Restaurant',
            quantity: 1,
            discount: 0,
            tax: 63,
            timestamp: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000)
          }
        ],
        subtotal: 1250,
        totalDiscount: 0,
        totalTax: 225,
        grandTotal: 1475,
        paymentMethod: 'cash',
        status: 'paid',
        staffName: 'Admin User',
        staffEmail: 'admin@hotel.com',
        createdBy: adminUser._id,
        paidAt: new Date(todaysDate.getTime() - 2 * 24 * 60 * 60 * 1000),
        notes: 'Delicious meal, guest was satisfied'
      },
      {
        sessionId: `BS-${Date.now()}-002`,
        hotelId: hotel._id,
        guestName: 'Jane Doe',
        roomNumber: '102',
        bookingId: createdBookings[1]._id,
        bookingNumber: 'BK-2024-002',
        items: [
          {
            itemId: createdMenus[1].items[0]._id.toString(),
            name: 'Cappuccino',
            category: 'Beverages',
            price: 150,
            outlet: 'Coffee Shop',
            quantity: 3,
            discount: 0,
            tax: 81,
            timestamp: new Date(todaysDate.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
          }
        ],
        subtotal: 450,
        totalDiscount: 0,
        totalTax: 81,
        grandTotal: 531,
        paymentMethod: 'card',
        status: 'paid',
        staffName: 'Staff User',
        staffEmail: 'staff@hotel.com',
        createdBy: staffUser._id,
        paidAt: new Date(todaysDate.getTime() - 1 * 24 * 60 * 60 * 1000),
        notes: 'Morning coffee order'
      },
      {
        sessionId: `BS-${Date.now()}-003`,
        hotelId: hotel._id,
        guestName: 'Mike Johnson',
        roomNumber: '103',
        bookingId: createdBookings[2]._id,
        bookingNumber: 'BK-2024-003',
        items: [
          {
            itemId: createdMenus[0].items[3]._id.toString(),
            name: 'Gulab Jamun',
            category: 'Dessert',
            price: 200,
            outlet: 'Main Restaurant',
            quantity: 2,
            discount: 20,
            tax: 64.8,
            timestamp: todaysDate // Today
          }
        ],
        subtotal: 400,
        totalDiscount: 20,
        totalTax: 68.4,
        grandTotal: 448.4,
        paymentMethod: 'room_charge',
        status: 'paid',
        staffName: 'Admin User',
        staffEmail: 'admin@hotel.com',
        createdBy: adminUser._id,
        paidAt: todaysDate,
        notes: 'Room service delivery'
      },
      {
        sessionId: `BS-${Date.now()}-004`,
        hotelId: hotel._id,
        guestName: 'Sarah Wilson',
        roomNumber: '201',
        bookingId: createdBookings[3]._id,
        bookingNumber: 'BK-2024-004',
        items: [
          {
            itemId: createdMenus[2].items[0]._id.toString(),
            name: 'Swedish Massage',
            category: 'Wellness',
            price: 2500,
            outlet: 'Spa',
            quantity: 1,
            discount: 250,
            tax: 405,
            timestamp: new Date(todaysDate.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
          }
        ],
        subtotal: 2500,
        totalDiscount: 250,
        totalTax: 405,
        grandTotal: 2655,
        paymentMethod: 'corporate',
        status: 'paid',
        staffName: 'Staff User',
        staffEmail: 'staff@hotel.com',
        createdBy: staffUser._id,
        paidAt: new Date(todaysDate.getTime() - 3 * 24 * 60 * 60 * 1000),
        notes: 'Corporate booking, wellness package'
      }
    ];

    const createdBillingSessions = await BillingSession.insertMany(billingSessionsData);
    logger.info(`💳 Billing Sessions created: ${createdBillingSessions.length}`);

    // Create Chart of Accounts
    const chartOfAccountsData = [
      // Assets
      {
        hotelId: hotel._id,
        accountCode: '1000',
        accountName: 'Assets',
        accountType: 'Asset',
        accountSubType: 'Other Asset',
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        normalBalance: 'Debit',
        description: 'All company assets',
        createdBy: adminUser._id,
        isSystemAccount: true
      },
      {
        hotelId: hotel._id,
        accountCode: '1100',
        accountName: 'Current Assets',
        accountType: 'Asset',
        accountSubType: 'Current Asset',
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        normalBalance: 'Debit',
        description: 'Short-term assets',
        createdBy: adminUser._id,
        isSystemAccount: true
      },
      {
        hotelId: hotel._id,
        accountCode: '1110',
        accountName: 'Cash and Bank',
        accountType: 'Asset',
        accountSubType: 'Current Asset',
        parentAccount: null,
        currentBalance: 850000,
        isActive: true,
        normalBalance: 'Debit',
        description: 'Cash in hand and bank accounts',
        createdBy: adminUser._id
      },
      {
        hotelId: hotel._id,
        accountCode: '1120',
        accountName: 'Accounts Receivable',
        accountType: 'Asset',
        accountSubType: 'Current Asset',
        parentAccount: null,
        currentBalance: 1193000,
        isActive: true,
        normalBalance: 'Debit',
        description: 'Amount owed by customers',
        createdBy: adminUser._id
      },
      {
        hotelId: hotel._id,
        accountCode: '1130',
        accountName: 'Inventory',
        accountType: 'Asset',
        accountSubType: 'Current Asset',
        parentAccount: null,
        currentBalance: 425000,
        isActive: true,
        normalBalance: 'Debit',
        description: 'Food, beverages, and supplies',
        createdBy: adminUser._id
      },
      
      // Liabilities
      {
        hotelId: hotel._id,
        accountCode: '2000',
        accountName: 'Liabilities',
        accountType: 'Liability',
        accountSubType: 'Current Liability',
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        normalBalance: 'Credit',
        description: 'All company liabilities',
        createdBy: adminUser._id,
        isSystemAccount: true
      },
      {
        hotelId: hotel._id,
        accountCode: '2100',
        accountName: 'Current Liabilities',
        accountType: 'Liability',
        accountSubType: 'Current Liability',
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        normalBalance: 'Credit',
        description: 'Short-term liabilities',
        createdBy: adminUser._id,
        isSystemAccount: true
      },
      {
        hotelId: hotel._id,
        accountCode: '2110',
        accountName: 'Accounts Payable',
        accountType: 'Liability',
        accountSubType: 'Current Liability',
        parentAccount: null,
        currentBalance: 385000,
        isActive: true,
        normalBalance: 'Credit',
        description: 'Amount owed to suppliers',
        createdBy: adminUser._id
      },
      {
        hotelId: hotel._id,
        accountCode: '2120',
        accountName: 'Taxes Payable',
        accountType: 'Liability',
        accountSubType: 'Current Liability',
        parentAccount: null,
        currentBalance: 125000,
        isActive: true,
        normalBalance: 'Credit',
        description: 'GST and other taxes payable',
        createdBy: adminUser._id
      },
      
      // Revenue
      {
        hotelId: hotel._id,
        accountCode: '4000',
        accountName: 'Revenue',
        accountType: 'Revenue',
        accountSubType: 'Operating Revenue',
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        normalBalance: 'Credit',
        description: 'All revenue accounts',
        createdBy: adminUser._id,
        isSystemAccount: true
      },
      {
        hotelId: hotel._id,
        accountCode: '4100',
        accountName: 'Room Revenue',
        accountType: 'Revenue',
        accountSubType: 'Operating Revenue',
        parentAccount: null,
        currentBalance: 2100000,
        isActive: true,
        normalBalance: 'Credit',
        description: 'Revenue from room bookings',
        createdBy: adminUser._id
      },
      {
        hotelId: hotel._id,
        accountCode: '4200',
        accountName: 'Food & Beverage Revenue',
        accountType: 'Revenue',
        accountSubType: 'Operating Revenue',
        parentAccount: null,
        currentBalance: 750000,
        isActive: true,
        normalBalance: 'Credit',
        description: 'Revenue from restaurant and bar',
        createdBy: adminUser._id
      },
      
      // Expenses
      {
        hotelId: hotel._id,
        accountCode: '6000',
        accountName: 'Expenses',
        accountType: 'Expense',
        accountSubType: 'Operating Expense',
        parentAccount: null,
        currentBalance: 0,
        isActive: true,
        normalBalance: 'Debit',
        description: 'All expense accounts',
        createdBy: adminUser._id,
        isSystemAccount: true
      },
      {
        hotelId: hotel._id,
        accountCode: '6100',
        accountName: 'Operating Expenses',
        accountType: 'Expense',
        accountSubType: 'Operating Expense',
        parentAccount: null,
        currentBalance: 850000,
        isActive: true,
        normalBalance: 'Debit',
        description: 'Day-to-day operating costs',
        createdBy: adminUser._id
      },
      {
        hotelId: hotel._id,
        accountCode: '6200',
        accountName: 'Staff Expenses',
        accountType: 'Expense',
        accountSubType: 'Operating Expense',
        parentAccount: null,
        currentBalance: 650000,
        isActive: true,
        normalBalance: 'Debit',
        description: 'Salaries and staff-related costs',
        createdBy: adminUser._id
      }
    ];

    const createdAccounts = await ChartOfAccounts.insertMany(chartOfAccountsData);
    logger.info(`📊 Chart of Accounts created: ${createdAccounts.length}`);

    // Create Journal Entries
    const cashAccount = createdAccounts.find(acc => acc.accountCode === '1110');
    const revenueAccount = createdAccounts.find(acc => acc.accountCode === '4100');
    const expenseAccount = createdAccounts.find(acc => acc.accountCode === '6100'); // Fixed: was '5100'
    const receivableAccount = createdAccounts.find(acc => acc.accountCode === '1120');
    const payableAccount = createdAccounts.find(acc => acc.accountCode === '2110');

    const journalEntriesData = [
      {
        hotelId: hotel._id,
        entryNumber: `JE-${new Date().getFullYear()}-001`,
        entryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        entryType: 'Manual',
        description: 'Weekly room revenue booking',
        referenceType: 'Invoice',
        referenceNumber: 'INV-001',
        fiscalYear: new Date().getFullYear(),
        fiscalPeriod: new Date().getMonth() + 1,
        status: 'Posted',
        lines: [
          {
            accountId: receivableAccount._id,
            debitAmount: 450000,
            creditAmount: 0,
            description: 'Room charges to be collected',
            currency: 'INR'
          },
          {
            accountId: revenueAccount._id,
            debitAmount: 0,
            creditAmount: 450000,
            description: 'Room revenue earned',
            currency: 'INR'
          }
        ],
        totalDebit: 450000,
        totalCredit: 450000,
        createdBy: adminUser._id,
        postedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        hotelId: hotel._id,
        entryNumber: `JE-${new Date().getFullYear()}-002`,
        entryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        entryType: 'Manual',
        description: 'Cash collection for room bookings',
        referenceType: 'Payment',
        referenceNumber: 'PAY-001',
        fiscalYear: new Date().getFullYear(),
        fiscalPeriod: new Date().getMonth() + 1,
        status: 'Posted',
        lines: [
          {
            accountId: cashAccount._id,
            debitAmount: 350000,
            creditAmount: 0,
            description: 'Cash received',
            currency: 'INR'
          },
          {
            accountId: receivableAccount._id,
            debitAmount: 0,
            creditAmount: 350000,
            description: 'Accounts receivable collection',
            currency: 'INR'
          }
        ],
        totalDebit: 350000,
        totalCredit: 350000,
        createdBy: adminUser._id,
        postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        hotelId: hotel._id,
        entryNumber: `JE-${new Date().getFullYear()}-003`,
        entryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        entryType: 'Manual',
        description: 'Kitchen and housekeeping supplies',
        referenceType: 'Expense',
        referenceNumber: 'EXP-001',
        fiscalYear: new Date().getFullYear(),
        fiscalPeriod: new Date().getMonth() + 1,
        status: 'Posted',
        lines: [
          {
            accountId: expenseAccount._id,
            debitAmount: 125000,
            creditAmount: 0,
            description: 'Operating supplies expense',
            currency: 'INR'
          },
          {
            accountId: payableAccount._id,
            debitAmount: 0,
            creditAmount: 125000,
            description: 'Amount owed to suppliers',
            currency: 'INR'
          }
        ],
        totalDebit: 125000,
        totalCredit: 125000,
        createdBy: adminUser._id,
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        hotelId: hotel._id,
        entryNumber: `JE-${new Date().getFullYear()}-004`,
        entryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        entryType: 'Manual',
        description: 'Payment to suppliers for purchases',
        referenceType: 'Payment',
        referenceNumber: 'PAY-002',
        fiscalYear: new Date().getFullYear(),
        fiscalPeriod: new Date().getMonth() + 1,
        status: 'Posted',
        lines: [
          {
            accountId: payableAccount._id,
            debitAmount: 100000,
            creditAmount: 0,
            description: 'Supplier payment',
            currency: 'INR'
          },
          {
            accountId: cashAccount._id,
            debitAmount: 0,
            creditAmount: 100000,
            description: 'Cash payment to suppliers',
            currency: 'INR'
          }
        ],
        totalDebit: 100000,
        totalCredit: 100000,
        createdBy: adminUser._id,
        postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];

    const createdJournalEntries = await JournalEntry.insertMany(journalEntriesData);
    logger.info(`📓 Journal Entries created: ${createdJournalEntries.length}`);

    // Create General Ledger entries from Journal Entries
    // Temporarily skipping General Ledger creation to focus on basic financial data
    logger.info(`📒 General Ledger entries creation skipped for now`);

    // Create Bank Accounts
    const bankAccountsData = [
      {
        hotelId: hotel._id,
        accountName: 'Primary Current Account',
        bankName: 'HDFC Bank',
        accountNumber: '12345678901',
        routingNumber: 'HDFC0001234',
        accountType: 'Checking',
        currency: 'INR',
        currentBalance: 850000,
        availableBalance: 825000,
        isActive: true,
        isPrimary: true,
        description: 'Main operating account',
        lastReconciledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastReconciledBalance: 832000,
        glAccountId: cashAccount._id,
        createdBy: adminUser._id,
        transactions: []
      },
      {
        hotelId: hotel._id,
        accountName: 'Savings Account',
        bankName: 'ICICI Bank',
        accountNumber: '98765432109',
        routingNumber: 'ICIC0009876',
        accountType: 'Savings',
        currency: 'INR',
        currentBalance: 500000,
        availableBalance: 500000,
        isActive: true,
        isPrimary: false,
        description: 'Emergency fund and savings',
        lastReconciledDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        lastReconciledBalance: 485000,
        glAccountId: cashAccount._id,
        createdBy: adminUser._id,
        transactions: []
      }
    ];

    const createdBankAccounts = await BankAccount.insertMany(bankAccountsData);
    logger.info(`🏦 Bank Accounts created: ${createdBankAccounts.length}`);

    // Create Budget for current year
    const currentYear = new Date().getFullYear();
    const budgetData = [
      {
        hotelId: hotel._id,
        budgetName: `Annual Budget ${currentYear}`,
        fiscalYear: currentYear,
        period: {
          startDate: new Date(currentYear, 0, 1), // January 1st
          endDate: new Date(currentYear, 11, 31)  // December 31st
        },
        currency: 'INR',
        status: 'active',
        budgetCategories: [
          {
            categoryName: 'Room Revenue',
            accountId: null, // Will be linked to account
            budgetedAmount: 25000000, // 2.5 Crore
            actualAmount: 21000000,   // 2.1 Crore YTD
            variance: -4000000,
            variancePercentage: -16
          },
          {
            categoryName: 'F&B Revenue',
            accountId: null,
            budgetedAmount: 8000000,  // 80 Lakh
            actualAmount: 7500000,    // 75 Lakh YTD
            variance: -500000,
            variancePercentage: -6.25
          },
          {
            categoryName: 'Operating Expenses',
            accountId: null,
            budgetedAmount: 12000000, // 1.2 Crore
            actualAmount: 8500000,    // 85 Lakh YTD
            variance: 3500000,        // Under budget
            variancePercentage: 29.17
          },
          {
            categoryName: 'Staff Expenses',
            accountId: null,
            budgetedAmount: 8000000,  // 80 Lakh
            actualAmount: 6500000,    // 65 Lakh YTD
            variance: 1500000,        // Under budget
            variancePercentage: 18.75
          }
        ],
        totalBudgetedAmount: 41000000,
        totalActualAmount: 28500000,
        approvedBy: adminUser._id,
        approvedDate: new Date(currentYear - 1, 11, 15), // Approved in December
        createdBy: adminUser._id,
        lastUpdated: new Date()
      }
    ];

    const createdBudgets = await Budget.insertMany(budgetData);
    logger.info(`💰 Budgets created: ${createdBudgets.length}`);

    logger.info(`🍽️ POS Outlets: ${createdOutlets.length}`);
    logger.info(`📋 POS Menus: ${createdMenus.length}`);
    logger.info(`🧾 POS Orders: ${createdOrders.length}`);
    logger.info(`💳 Billing Sessions: ${createdBillingSessions.length}`);
    logger.info(`📦 Checkout Inventories: ${createdCheckoutInventories.length}`);
    logger.info(`📊 Chart of Accounts: ${createdAccounts.length}`);
    logger.info(`🏦 Bank Accounts: ${createdBankAccounts.length}`);
    logger.info(`💰 Budgets: ${createdBudgets.length}`);
    
    logger.info('\n📋 Test Credentials:');
    logger.info('Admin: admin@hotel.com / admin123');
    logger.info('Staff: staff@hotel.com / staff123');
    logger.info('Guest: john@example.com / guest123');
    logger.info('Guest: jane@example.com / guest123');
    logger.info('Guest: mike@example.com / guest123');
    
  } catch (error) {
    logger.error('Seeding failed:', error);
    throw error;
  }
};

const main = async () => {
  await connectDB();
  await seedData();
  await mongoose.connection.close();
  logger.info('Database connection closed');
  process.exit(0);
};

main().catch((error) => {
  logger.error('Seeding process failed:', error);
  process.exit(1);
});