import mongoose from 'mongoose';
import Room from './src/models/Room.js';

// Connect to MongoDB
await mongoose.connect('mongodb://localhost:27017/hotel_management');

// Get all rooms
const rooms = await Room.find({ isActive: true });
console.log('Total rooms found:', rooms.length);

// Group by hotelId
const roomsByHotel = {};
rooms.forEach(room => {
  if (!roomsByHotel[room.hotelId]) {
    roomsByHotel[room.hotelId] = [];
  }
  roomsByHotel[room.hotelId].push({
    id: room._id,
    roomNumber: room.roomNumber,
    type: room.type,
    status: room.status
  });
});

console.log('Rooms by hotel:');
Object.keys(roomsByHotel).forEach(hotelId => {
  console.log(`Hotel ${hotelId}: ${roomsByHotel[hotelId].length} rooms`);
  console.log('Sample rooms:', roomsByHotel[hotelId].slice(0, 3));
});

process.exit(0);
