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
import logger from '../utils/logger.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
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
      name: 'Grand Palace Hotel',
      description: 'A luxury hotel in the heart of the city',
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        zipCode: '10001',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      },
      contact: {
        phone: '+1-555-0123',
        email: 'info@grandpalace.com',
        website: 'https://grandpalace.com'
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
      name: 'Staff User',
      email: 'staff@hotel.com',
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
        phone: '+1-555-0001',
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
        phone: '+1-555-0002',
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
        phone: '+1-555-0003',
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
          case 'single': baseRate = 100; break;
          case 'double': baseRate = 150; break;
          case 'suite': baseRate = 300; break;
          case 'deluxe': baseRate = 250; break;
          default: baseRate = 120;
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
        costPerUnit: 25.00,
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
        costPerUnit: 15.00
      },
      {
        name: 'Shampoo',
        sku: 'SH001',
        category: 'toiletries',
        quantity: 80,
        unit: 'bottles',
        minimumThreshold: 20,
        maximumCapacity: 150,
        costPerUnit: 3.50
      },
      {
        name: 'All-Purpose Cleaner',
        sku: 'CL001',
        category: 'cleaning',
        quantity: 45,
        unit: 'bottles',
        minimumThreshold: 10,
        maximumCapacity: 100,
        costPerUnit: 5.25
      },
      {
        name: 'Light Bulbs',
        sku: 'LB001',
        category: 'maintenance',
        quantity: 25,
        unit: 'pieces',
        minimumThreshold: 50,
        maximumCapacity: 200,
        costPerUnit: 2.75
      }
    ].map(item => ({ ...item, hotelId: hotel._id }));

    const createdInventory = await Inventory.create(inventoryItems);
    logger.info(`Created ${createdInventory.length} inventory items`);

    // Create Reviews
    const reviewsData = [];
    for (let i = 0; i < 25; i++) {
      const guest = guests[Math.floor(Math.random() * guests.length)];
      const booking = createdBookings[Math.floor(Math.random() * createdBookings.length)];
      const rating = 1 + Math.floor(Math.random() * 5);
      
      reviewsData.push({
        hotelId: hotel._id,
        userId: guest._id,
        bookingId: booking._id,
        rating,
        categories: {
          cleanliness: rating,
          service: Math.max(1, Math.min(5, rating + Math.floor(Math.random() * 3) - 1)),
          location: rating,
          value: Math.max(1, Math.min(5, rating + Math.floor(Math.random() * 3) - 1)),
          amenities: Math.max(1, Math.min(5, rating + Math.floor(Math.random() * 3) - 1))
        },
        title: ['Great stay!', 'Good experience', 'Average hotel', 'Could be better', 'Excellent service'][rating - 1],
        content: ['Amazing experience, would definitely stay again!', 'Nice hotel with good amenities', 'Decent stay for the price', 'Room was okay but service could improve', 'Outstanding service and facilities'][rating - 1],
        images: rating >= 4 ? ['https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg'] : [],
        helpfulVotes: Math.floor(Math.random() * 15),
        helpfulCount: Math.floor(Math.random() * 15),
        reportCount: 0,
        isVerified: booking ? true : Math.random() > 0.3,
        isPublished: true,
        status: 'approved',
        moderationStatus: 'approved',
        visitType: ['business', 'leisure', 'family', 'couple', 'solo'][Math.floor(Math.random() * 5)],
        stayDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        guestName: guest.name
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
        estimatedCost: Math.random() * 100,
        actualCost: Math.random() * 80
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
          cost: 20 + Math.random() * 80
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
      const amount = 100 + Math.random() * 500;
      
      invoiceData.push({
        invoiceNumber: `INV-${Date.now()}-${i}`,
        hotelId: hotel._id,
        guestId: guest._id,
        bookingId: booking._id,
        issueDate,
        dueDate,
        status: ['draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled'][Math.floor(Math.random() * 6)],
        items: [{
          description: 'Room charges',
          quantity: booking.nights,
          rate: booking.totalAmount / booking.nights,
          unitPrice: booking.totalAmount / booking.nights,
          totalPrice: booking.totalAmount,
          amount: booking.totalAmount
        }],
        subtotal: amount,
        taxes: amount * 0.1,
        totalAmount: amount * 1.1,
        amountPaid: Math.random() > 0.5 ? amount * 1.1 : 0,
        amountRemaining: Math.random() > 0.5 ? 0 : amount * 1.1,
        paymentHistory: []
      });
    }
    const createdInvoices = await Invoice.create(invoiceData);
    logger.info(`Created ${createdInvoices.length} invoices`);

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
        subject: 'Welcome to Grand Palace Hotel',
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