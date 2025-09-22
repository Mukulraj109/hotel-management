# PMS Channel Manager Integration - API Restructuring Guide

## Current Status Analysis

Your current codebase has **partial implementation** of the recommended API structure but needs restructuring to fully support Channel Manager integration.

### ✅ What's Already Implemented:
- **Inventory Management**: `/api/v1/inventory-management` with date-range queries
- **Rate Management**: `/api/v1/rates` with room type and date filtering
- **Reservations**: Basic booking endpoints in `/api/v1/bookings`
- **Channel Manager**: Basic structure in `/api/v1/channel-manager`
- **OTA Webhooks**: Webhook handlers for Booking.com and Expedia

### ❌ What's Missing/Needs Restructuring:
- **Standardized inventory endpoint**: `/inventory?hotel_id&date_range`
- **Idempotent inventory updates**: `/inventory/update`
- **Channel Manager reservation creation**: `/reservations/create`
- **Reservation cancellation**: `/reservations/:id/cancel`
- **Standardized rates endpoint**: `/rates?hotel_id&date_range`

## Required API Restructuring

### 1. **GET /inventory?hotel_id&date_range** → Returns Availability

#### Current Implementation:
```javascript
// ✅ EXISTS: /api/v1/inventory-management
// ✅ EXISTS: /api/v1/availability/check
```

#### Required Changes:
```javascript
// NEW ENDPOINT: /api/v1/inventory
router.get('/', async (req, res) => {
  const { hotel_id, date_range, room_type } = req.query;
  
  // Standardized response format for Channel Managers
  const availability = await inventoryService.getAvailabilityForChannel(
    hotel_id, 
    date_range, 
    room_type
  );
  
  res.json({
    success: true,
    data: {
      hotel_id,
      date_range,
      availability: availability.map(item => ({
        room_type: item.roomType,
        date: item.date,
        available_rooms: item.availableRooms,
        total_rooms: item.totalRooms,
        base_rate: item.baseRate,
        restrictions: item.restrictions
      }))
    }
  });
});
```

#### Implementation Steps:
1. **Create new route file**: `backend/src/routes/inventory.js` (separate from inventory-management)
2. **Update server.js**: Add `app.use('/api/v1/inventory', inventoryRoutes);`
3. **Modify existing inventory controller**: Extract channel-friendly logic
4. **Add rate limiting**: Implement per-channel rate limiting

### 2. **POST /inventory/update** → Update Rates/Availability (Idempotent)

#### Current Implementation:
```javascript
// ✅ EXISTS: /api/v1/inventory-management/update
// ❌ MISSING: Idempotency support
// ❌ MISSING: Channel Manager authentication
```

#### Required Changes:
```javascript
// ENHANCED ENDPOINT: /api/v1/inventory/update
router.post('/update', 
  authenticateChannel, // New middleware for channel authentication
  validateInventoryUpdate,
  async (req, res) => {
    const { 
      hotel_id, 
      room_type, 
      date, 
      available_rooms, 
      base_rate,
      idempotency_key, // NEW: Required for idempotency
      channel_id 
    } = req.body;
    
    // Check idempotency
    const existingUpdate = await InventoryUpdate.findOne({ idempotency_key });
    if (existingUpdate) {
      return res.json({
        success: true,
        data: existingUpdate,
        message: 'Update already processed'
      });
    }
    
    // Process update
    const update = await inventoryService.updateInventoryForChannel({
      hotel_id,
      room_type,
      date,
      available_rooms,
      base_rate,
      channel_id,
      idempotency_key
    });
    
    res.json({
      success: true,
      data: update,
      idempotency_key
    });
  }
);
```

#### Implementation Steps:
1. **Add idempotency support**: Create `InventoryUpdate` model with idempotency keys
2. **Create channel authentication middleware**: `authenticateChannel` for OTA API keys
3. **Enhance validation**: Add channel-specific validation rules
4. **Add audit logging**: Track all channel updates

### 3. **POST /reservations/create** → For Inbound OTA Bookings

#### Current Implementation:
```javascript
// ✅ EXISTS: /api/v1/bookings (basic)
// ❌ MISSING: Channel Manager specific endpoint
// ❌ MISSING: OTA booking validation
```

#### Required Changes:
```javascript
// NEW ENDPOINT: /api/v1/reservations/create
router.post('/create',
  authenticateChannel,
  validateChannelReservation,
  async (req, res) => {
    const {
      hotel_id,
      channel_id,
      channel_booking_id,
      guest_details,
      room_type,
      check_in,
      check_out,
      total_amount,
      currency,
      idempotency_key
    } = req.body;
    
    // Check for duplicate channel booking
    const existingBooking = await ReservationMapping.findOne({
      channelReservationId: channel_booking_id,
      channel: channel_id
    });
    
    if (existingBooking) {
      return res.json({
        success: true,
        data: existingBooking,
        message: 'Booking already exists'
      });
    }
    
    // Create hotel booking
    const booking = await bookingService.createChannelBooking({
      hotel_id,
      channel_id,
      channel_booking_id,
      guest_details,
      room_type,
      check_in,
      check_out,
      total_amount,
      currency
    });
    
    // Create reservation mapping
    await ReservationMapping.create({
      hotelReservationId: booking._id,
      channelReservationId: channel_booking_id,
      channel: channel_id,
      status: 'confirmed'
    });
    
    res.status(201).json({
      success: true,
      data: {
        hotel_booking_id: booking._id,
        channel_booking_id,
        status: 'confirmed'
      }
    });
  }
);
```

#### Implementation Steps:
1. **Create new route file**: `backend/src/routes/reservations.js`
2. **Add to server.js**: `app.use('/api/v1/reservations', reservationRoutes);`
3. **Enhance booking service**: Add `createChannelBooking` method
4. **Add channel validation**: Validate OTA-specific booking data

### 4. **PUT /reservations/:id/cancel** → Handle Cancellations

#### Current Implementation:
```javascript
// ✅ EXISTS: Basic cancellation in /api/v1/bookings
// ❌ MISSING: Channel Manager specific endpoint
// ❌ MISSING: Inventory release for channels
```

#### Required Changes:
```javascript
// NEW ENDPOINT: /api/v1/reservations/:id/cancel
router.put('/:id/cancel',
  authenticateChannel,
  async (req, res) => {
    const { id } = req.params;
    const { 
      channel_id, 
      cancellation_reason,
      refund_amount 
    } = req.body;
    
    // Find reservation mapping
    const mapping = await ReservationMapping.findOne({
      hotelReservationId: id,
      channel: channel_id
    });
    
    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found'
      });
    }
    
    // Cancel hotel booking
    const booking = await bookingService.cancelChannelBooking(id, {
      reason: cancellation_reason,
      refund_amount,
      channel_id
    });
    
    // Update mapping status
    mapping.status = 'cancelled';
    await mapping.save();
    
    // Release inventory for channel
    await inventoryService.releaseInventoryForChannel(
      booking.hotelId,
      booking.roomType,
      booking.checkIn,
      booking.checkOut,
      channel_id
    );
    
    res.json({
      success: true,
      data: {
        hotel_booking_id: id,
        status: 'cancelled',
        inventory_released: true
      }
    });
  }
);
```

#### Implementation Steps:
1. **Add cancellation endpoint**: Implement in reservations route
2. **Enhance inventory service**: Add `releaseInventoryForChannel` method
3. **Add audit logging**: Track all cancellations
4. **Implement inventory release**: Update channel-specific inventory

### 5. **GET /rates?hotel_id&date_range** → Return Rates Per Room+Rate Plan

#### Current Implementation:
```javascript
// ✅ EXISTS: /api/v1/rates/best-rate
// ✅ EXISTS: /api/v1/rates/all-rates
// ❌ MISSING: Standardized format for Channel Managers
```

#### Required Changes:
```javascript
// ENHANCED ENDPOINT: /api/v1/rates
router.get('/', async (req, res) => {
  const { 
    hotel_id, 
    date_range, 
    room_type,
    rate_plan 
  } = req.query;
  
  const rates = await rateService.getRatesForChannel({
    hotel_id,
    date_range,
    room_type,
    rate_plan
  });
  
  res.json({
    success: true,
    data: {
      hotel_id,
      date_range,
      rates: rates.map(rate => ({
        room_type: rate.roomType,
        rate_plan: rate.ratePlan,
        date: rate.date,
        base_rate: rate.baseRate,
        selling_rate: rate.sellingRate,
        currency: rate.currency,
        restrictions: rate.restrictions,
        availability: rate.availability
      }))
    }
  });
});
```

#### Implementation Steps:
1. **Enhance existing rate controller**: Add channel-friendly response format
2. **Add rate plan filtering**: Support for different rate plans
3. **Standardize response format**: Consistent structure for all channels
4. **Add caching**: Implement Redis caching for rate queries

## Database Schema Updates

### 1. **New Models Required**

#### InventoryUpdate Model (for idempotency):
```javascript
// backend/src/models/InventoryUpdate.js
const inventoryUpdateSchema = new mongoose.Schema({
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  roomTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoomType',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  availableRooms: Number,
  baseRate: Number,
  sellingRate: Number,
  restrictions: Object,
  processedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
});
```

#### ChannelReservation Model:
```javascript
// backend/src/models/ChannelReservation.js
const channelReservationSchema = new mongoose.Schema({
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  channelBookingId: {
    type: String,
    required: true
  },
  hotelBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'modified'],
    default: 'confirmed'
  },
  channelData: Object,
  lastSync: Date
}, {
  timestamps: true
});
```

### 2. **Existing Model Updates**

#### RoomAvailability Model:
```javascript
// Add channel-specific fields
channelInventory: [{
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  },
  availableRooms: Number,
  rate: Number,
  restrictions: Object,
  lastUpdate: Date
}]
```

## Middleware Updates

### 1. **Channel Authentication Middleware**
```javascript
// backend/src/middleware/channelAuth.js
export const authenticateChannel = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const channelId = req.headers['x-channel-id'];
    
    if (!apiKey || !channelId) {
      return res.status(401).json({
        success: false,
        error: 'Missing API key or channel ID'
      });
    }
    
    const channel = await Channel.findOne({
      _id: channelId,
      'credentials.apiKey': apiKey,
      isActive: true
    });
    
    if (!channel) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key or channel ID'
      });
    }
    
    req.channel = channel;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};
```

### 2. **Rate Limiting for Channels**
```javascript
// backend/src/middleware/channelRateLimit.js
import rateLimit from 'express-rate-limit';

export const channelRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Different limits for different channels
    const channel = req.channel;
    switch (channel?.category) {
      case 'booking.com': return 1000;
      case 'expedia': return 800;
      default: return 500;
    }
  },
  message: {
    success: false,
    error: 'Rate limit exceeded for this channel'
  },
  keyGenerator: (req) => req.channel?._id || req.ip
});
```

## Service Layer Updates

### 1. **Enhanced Inventory Service**
```javascript
// backend/src/services/inventoryService.js
class InventoryService {
  async getAvailabilityForChannel(hotelId, dateRange, roomType) {
    const { startDate, endDate } = this.parseDateRange(dateRange);
    
    const availability = await RoomAvailability.find({
      hotelId,
      date: { $gte: startDate, $lte: endDate },
      ...(roomType && { roomTypeId: roomType })
    }).populate('roomTypeId');
    
    return availability.map(item => ({
      roomType: item.roomTypeId.code,
      date: item.date,
      availableRooms: item.availableRooms,
      totalRooms: item.totalRooms,
      baseRate: item.baseRate,
      restrictions: item.restrictions
    }));
  }
  
  async updateInventoryForChannel(updateData) {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Check idempotency
        const existingUpdate = await InventoryUpdate.findOne({
          idempotencyKey: updateData.idempotency_key
        });
        
        if (existingUpdate) {
          return existingUpdate;
        }
        
        // Update inventory
        const inventory = await RoomAvailability.findOneAndUpdate(
          {
            hotelId: updateData.hotel_id,
            roomTypeId: updateData.room_type,
            date: updateData.date
          },
          {
            $set: {
              availableRooms: updateData.available_rooms,
              baseRate: updateData.base_rate
            }
          },
          { new: true, session }
        );
        
        // Create update record
        const updateRecord = await InventoryUpdate.create([{
          idempotencyKey: updateData.idempotency_key,
          hotelId: updateData.hotel_id,
          channelId: updateData.channel_id,
          roomTypeId: updateData.room_type,
          date: updateData.date,
          availableRooms: updateData.available_rooms,
          baseRate: updateData.base_rate,
          status: 'processed'
        }], { session });
        
        return updateRecord[0];
      });
    } finally {
      session.endSession();
    }
  }
}
```

### 2. **Enhanced Rate Service**
```javascript
// backend/src/services/rateService.js
class RateService {
  async getRatesForChannel(params) {
    const { hotel_id, date_range, room_type, rate_plan } = params;
    const { startDate, endDate } = this.parseDateRange(date_range);
    
    const rates = await RoomAvailability.find({
      hotelId: hotel_id,
      date: { $gte: startDate, $lte: endDate },
      ...(room_type && { roomTypeId: room_type })
    }).populate('roomTypeId');
    
    return rates.map(rate => ({
      room_type: rate.roomTypeId.code,
      rate_plan: rate.ratePlan || 'BAR',
      date: rate.date,
      base_rate: rate.baseRate,
      selling_rate: rate.sellingRate || rate.baseRate,
      currency: 'INR',
      restrictions: rate.restrictions,
      availability: rate.availableRooms
    }));
  }
}
```

## Error Handling & Validation

### 1. **Channel-Specific Error Responses**
```javascript
// backend/src/utils/channelErrorHandler.js
export const handleChannelError = (error, channel) => {
  const errorResponse = {
    success: false,
    error: error.message,
    timestamp: new Date().toISOString(),
    request_id: uuidv4()
  };
  
  // Add channel-specific error codes
  if (channel) {
    errorResponse.channel_id = channel._id;
    errorResponse.channel_category = channel.category;
  }
  
  // Log error for monitoring
  logger.error('Channel API Error', {
    error: error.message,
    channel: channel?._id,
    stack: error.stack
  });
  
  return errorResponse;
};
```

### 2. **Validation Schemas**
```javascript
// backend/src/validation/channelSchemas.js
export const inventoryUpdateSchema = Joi.object({
  hotel_id: Joi.string().required(),
  room_type: Joi.string().required(),
  date: Joi.date().required(),
  available_rooms: Joi.number().min(0).required(),
  base_rate: Joi.number().min(0).required(),
  idempotency_key: Joi.string().required(),
  channel_id: Joi.string().required()
});

export const channelReservationSchema = Joi.object({
  hotel_id: Joi.string().required(),
  channel_id: Joi.string().required(),
  channel_booking_id: Joi.string().required(),
  guest_details: Joi.object().required(),
  room_type: Joi.string().required(),
  check_in: Joi.date().required(),
  check_out: Joi.date().required(),
  total_amount: Joi.number().min(0).required(),
  currency: Joi.string().default('INR')
});
```

## Testing & Monitoring

### 1. **API Testing Endpoints**
```javascript
// Add to each route for testing
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Channel API endpoint is working',
    timestamp: new Date().toISOString()
  });
});
```

### 2. **Health Check Endpoints**
```javascript
// backend/src/routes/health.js
router.get('/channels', async (req, res) => {
  const channels = await Channel.find({ isActive: true });
  
  const status = channels.map(channel => ({
    id: channel._id,
    name: channel.name,
    category: channel.category,
    status: channel.connectionStatus,
    last_sync: channel.lastSync,
    api_endpoints: [
      '/inventory',
      '/inventory/update',
      '/reservations/create',
      '/reservations/:id/cancel',
      '/rates'
    ]
  }));
  
  res.json({
    success: true,
    data: status
  });
});
```

## Implementation Priority

### Phase 1 (Week 1-2): Core Infrastructure
1. ✅ Create new route files
2. ✅ Update database schemas
3. ✅ Implement channel authentication middleware
4. ✅ Add idempotency support

### Phase 2 (Week 3-4): Core Endpoints
1. ✅ Implement `/inventory` endpoint
2. ✅ Implement `/inventory/update` endpoint
3. ✅ Implement `/reservations/create` endpoint
4. ✅ Implement `/reservations/:id/cancel` endpoint

### Phase 3 (Week 5-6): Enhanced Features
1. ✅ Implement `/rates` endpoint
2. ✅ Add rate limiting and monitoring
3. ✅ Implement comprehensive error handling
4. ✅ Add testing and documentation

### Phase 4 (Week 7-8): Integration & Testing
1. ✅ Test with real OTA channels
2. ✅ Performance optimization
3. ✅ Security audit
4. ✅ Production deployment

## Migration Notes

### Breaking Changes:
- **None**: All new endpoints are additive
- **Existing endpoints**: Continue to work as before
- **Authentication**: New channel authentication is separate from user authentication

### Backward Compatibility:
- **Maintained**: All existing functionality preserved
- **Enhanced**: New features build on existing infrastructure
- **Gradual**: Can be deployed incrementally

### Performance Impact:
- **Minimal**: New endpoints use existing data models
- **Optimized**: Redis caching for frequently accessed data
- **Scalable**: Rate limiting prevents abuse

This restructuring will make your PMS fully compatible with Channel Manager requirements while maintaining all existing functionality.
