import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import Inventory from '../models/Inventory.js';
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
      
      const checkIn = new Date(today.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
      const checkOut = new Date(checkIn.getTime() + (1 + Math.floor(Math.random() * 7)) * 24 * 60 * 60 * 1000);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

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
        status: ['pending', 'confirmed', 'checked_in', 'checked_out'][Math.floor(Math.random() * 4)],
        paymentStatus: ['pending', 'paid'][Math.floor(Math.random() * 2)],
        totalAmount: room.currentRate * nights,
        guestDetails: {
          adults: 1 + Math.floor(Math.random() * 3),
          children: Math.floor(Math.random() * 2),
          specialRequests: Math.random() > 0.7 ? 'Late check-in requested' : null
        },
        idempotencyKey: `seed-${i}-${Date.now()}`
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

    logger.info('✅ Seed data created successfully!');
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