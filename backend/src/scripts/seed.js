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
import logger from '../utils/logger.js';

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
      name: 'Admin User',
      email: 'admin@thepentouz.com',
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
      name: 'Staff User',
      email: 'staff@thepentouz.com',
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
      
      guestServicesData.push({
        hotelId: hotel._id,
        userId: guest._id,
        bookingId: booking._id,
        roomId: room._id,
        serviceType,
        title: `${serviceType.replace('_', ' ')} request`,
        description: `Customer requested ${serviceType.replace('_', ' ')} service`,
        priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)],
        status: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'][Math.floor(Math.random() * 5)],
        requestDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        assignedTo: Math.random() > 0.5 ? staffUser._id : null,
        estimatedCost: Math.random() * 2000 + 500, // ₹500-2500
        actualCost: Math.random() * 1800 + 400 // ₹400-2200
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