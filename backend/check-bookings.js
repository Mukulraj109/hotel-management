import mongoose from 'mongoose';
import Booking from './src/models/Booking.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkBookings() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hotel-management');
    
    const bookings = await Booking.find();
    console.log(`Total bookings found: ${bookings.length}`);
    
    bookings.forEach(booking => {
      console.log(`- ${booking.bookingNumber}: ${booking.status} (${booking.source}) - ${booking.totalAmount} ${booking.currency}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBookings();