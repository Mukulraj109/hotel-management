# Reservation Engine & Inventory Control Implementation Plan

## Current Status Analysis

### ✅ **Already Implemented (Good Foundation)**

#### Reservation Engine - External Bookings
- **Source Field**: ✅ `source` enum in Booking model with values: `['direct', 'booking_com', 'expedia', 'airbnb']`
- **Channel Booking ID**: ✅ `channelBookingId` field for OTA reconciliation
- **Idempotency**: ✅ `idempotencyKey` field with unique constraint
- **Modification History**: ✅ `modifications` array for tracking changes
- **OTA Webhooks**: ✅ Basic webhook handlers for Booking.com, Expedia
- **Channel Sync**: ✅ Basic channel synchronization service

#### Inventory Control - Real-Time Safety
- **Stop Sell Flags**: ✅ `stopSellFlag` in RoomAvailability model
- **Closed to Arrival**: ✅ `closedToArrival` field implemented
- **MinLOS Support**: ✅ `minLengthOfStay` field exists
- **Daily Buckets**: ✅ `RoomAvailability` model uses daily granularity
- **Channel-Specific Overrides**: ✅ `channelInventory` array with restrictions
- **Overbooking Prevention**: ✅ Basic validation in pre-save hooks

### ❌ **Missing or Incomplete Features**

#### Reservation Engine Gaps
1. **Missing Source Types**: Need to add `PMS`, `OTA:Hotels.com`, `OTA:Agoda`, etc.
2. **Incomplete Idempotency**: Need proper duplicate prevention across all booking sources
3. **Modification Handling**: Need robust OTA modification/cancellation request handling
4. **External API Endpoints**: Need public endpoints for external booking systems
5. **Booking Reconciliation**: Need better conflict resolution between channels

#### Inventory Control Gaps
1. **Transaction Locking**: No database-level locking for inventory updates
2. **Race Condition Protection**: Need atomic operations for concurrent bookings
3. **Stop Sell Rules**: Need more granular stop sell controls (by room type, channel)
4. **Inventory Alerts**: No real-time alerts for low inventory or overbooking
5. **Audit Trail**: Need comprehensive logging of all inventory changes

## Implementation Plan

### Phase 1: Complete Reservation Engine (Priority: High)

#### 1.1 Update Booking Model Source Field
**File**: `backend/src/models/Booking.js`
**Changes**:
```javascript
source: {
  type: String,
  enum: [
    'direct',           // Hotel staff
    'PMS',             // Property Management System
    'OTA:booking_com', // Booking.com
    'OTA:expedia',     // Expedia
    'OTA:airbnb',      // Airbnb
    'OTA:hotels_com',  // Hotels.com
    'OTA:agoda',       // Agoda
    'OTA:ctrip',       // Ctrip
    'corporate',       // Corporate booking system
    'travel_agent',    // Travel agent
    'walk_in',         // Walk-in guests
    'phone',           // Phone bookings
    'email',           // Email bookings
    'website',         // Direct website
    'mobile_app'       // Mobile application
  ],
  default: 'direct'
}
```

#### 1.2 Add Channel-Specific Idempotency
**File**: `backend/src/models/Booking.js`
**Changes**:
```javascript
// Add compound unique index for channel-specific idempotency
channelIdempotency: {
  channel: {
    type: String,
    required: function() { return this.source !== 'direct'; }
  },
  channelBookingId: {
    type: String,
    required: function() { return this.source !== 'direct'; }
  }
}

// Add index
bookingSchema.index({ 
  'channelIdempotency.channel': 1, 
  'channelIdempotency.channelBookingId': 1 
}, { 
  unique: true, 
  sparse: true 
});
```

#### 1.3 Create External Booking API Endpoints
**New File**: `backend/src/routes/externalBookings.js`
**Features**:
- Public endpoints for external systems
- Rate limiting and authentication
- Idempotency key validation
- Booking creation/modification/cancellation
- Inventory availability checks

#### 1.4 Enhance OTA Webhook Handlers
**File**: `backend/src/routes/otaWebhooks.js`
**Improvements**:
- Better error handling and retry logic
- Webhook signature verification
- Rate limiting per channel
- Comprehensive logging and monitoring
- Conflict resolution for simultaneous updates

### Phase 2: Complete Inventory Control (Priority: High)

#### 2.1 Add Database Transaction Locking
**File**: `backend/src/models/RoomAvailability.js`
**Changes**:
```javascript
// Add static method with transaction support
roomAvailabilitySchema.statics.bookRoomsWithLock = async function(
  hotelId, 
  roomTypeId, 
  date, 
  roomsCount, 
  bookingId, 
  source = 'direct'
) {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const inventory = await this.findOne({
        hotelId,
        roomTypeId,
        date
      }).session(session).select('+availableRooms +soldRooms +blockedRooms');
      
      if (!inventory) {
        throw new Error('Inventory not found');
      }
      
      if (inventory.availableRooms < roomsCount) {
        throw new Error('Not enough rooms available');
      }
      
      // Atomic update
      await this.updateOne(
        { 
          _id: inventory._id,
          availableRooms: { $gte: roomsCount }
        },
        {
          $inc: { 
            soldRooms: roomsCount,
            availableRooms: -roomsCount
          },
          $push: {
            reservations: {
              bookingId,
              roomsReserved: roomsCount,
              source
            }
          }
        }
      ).session(session);
    });
    
    return true;
  } finally {
    await session.endSession();
  }
};
```

#### 2.2 Add Stop Sell Rules Engine
**New File**: `backend/src/models/StopSellRule.js`
**Features**:
- Date range-based rules
- Room type-specific rules
- Channel-specific rules
- Minimum length of stay rules
- Dynamic rule evaluation

#### 2.3 Implement Real-Time Inventory Alerts
**New File**: `backend/src/services/inventoryAlertService.js`
**Features**:
- Low inventory warnings
- Overbooking alerts
- Stop sell violation alerts
- Real-time notifications to staff
- Escalation procedures

#### 2.4 Add Inventory Audit Trail
**File**: `backend/src/models/RoomAvailability.js`
**Changes**:
```javascript
// Add audit trail
inventoryChanges: [{
  timestamp: { type: Date, default: Date.now },
  action: {
    type: String,
    enum: ['booking', 'cancellation', 'modification', 'stop_sell', 'rate_change']
  },
  userId: mongoose.Schema.ObjectId,
  source: String,
  oldValues: mongoose.Schema.Types.Mixed,
  newValues: mongoose.Schema.Types.Mixed,
  reason: String
}]
```

### Phase 3: Integration & Testing (Priority: Medium)

#### 3.1 Create Integration Tests
**New Files**:
- `backend/tests/integration/reservationEngine.test.js`
- `backend/tests/integration/inventoryControl.test.js`
- `backend/tests/integration/otaWebhooks.test.js`

#### 3.2 Performance Testing
**New Files**:
- `backend/tests/performance/concurrentBookings.test.js`
- `backend/tests/performance/inventoryUpdates.test.js`

#### 3.3 Monitoring & Alerting
**New Files**:
- `backend/src/services/monitoringService.js`
- `backend/src/services/alertingService.js`

## Implementation Steps

### Step 1: Database Schema Updates
1. Update Booking model with new source types
2. Add channel-specific idempotency fields
3. Update RoomAvailability model with audit trail
4. Create StopSellRule model

### Step 2: Backend Service Updates
1. Implement transaction-based inventory locking
2. Create external booking API endpoints
3. Enhance OTA webhook handlers
4. Add inventory alert service

### Step 3: Frontend Updates
1. Update booking forms to show source information
2. Add inventory management dashboard
3. Implement real-time inventory monitoring
4. Add stop sell rule management interface

### Step 4: Testing & Validation
1. Run integration tests
2. Test concurrent booking scenarios
3. Validate OTA webhook handling
4. Performance testing under load

### Step 5: Deployment & Monitoring
1. Deploy to staging environment
2. Monitor system performance
3. Validate with real OTA data
4. Gradual rollout to production

## Risk Mitigation

### Breaking Changes
- **Low Risk**: Most changes are additive
- **Database Migrations**: Use proper migration scripts
- **API Versioning**: Maintain backward compatibility
- **Feature Flags**: Use feature toggles for gradual rollout

### Performance Impact
- **Database Indexes**: Add proper indexes for new queries
- **Connection Pooling**: Optimize database connections
- **Caching**: Implement Redis caching for inventory data
- **Async Processing**: Use queues for non-critical operations

### Data Consistency
- **Transaction Support**: Use MongoDB transactions for critical operations
- **Idempotency**: Prevent duplicate bookings across channels
- **Conflict Resolution**: Handle simultaneous updates gracefully
- **Audit Logging**: Track all changes for reconciliation

## Success Metrics

### Reservation Engine
- ✅ 100% external booking source tracking
- ✅ Zero duplicate bookings across channels
- ✅ <100ms response time for booking operations
- ✅ 99.9% uptime for external APIs

### Inventory Control
- ✅ Zero overbooking incidents
- ✅ Real-time inventory accuracy
- ✅ <50ms inventory update response time
- ✅ 100% audit trail coverage

## Timeline Estimate

- **Phase 1**: 2-3 weeks
- **Phase 2**: 3-4 weeks  
- **Phase 3**: 2-3 weeks
- **Total**: 7-10 weeks

## Next Steps

1. **Review this plan** with your team
2. **Prioritize features** based on business needs
3. **Start with Phase 1** (Reservation Engine completion)
4. **Set up monitoring** early in the process
5. **Test thoroughly** before production deployment

## Files to Create/Modify

### New Files
- `backend/src/routes/externalBookings.js`
- `backend/src/models/StopSellRule.js`
- `backend/src/services/inventoryAlertService.js`
- `backend/src/services/monitoringService.js`
- `backend/src/services/alertingService.js`

### Modified Files
- `backend/src/models/Booking.js`
- `backend/src/models/RoomAvailability.js`
- `backend/src/routes/otaWebhooks.js`
- `backend/src/services/channelSyncService.js`
- `frontend/src/components/booking/BookingEngineWidget.tsx`

This plan ensures your system can handle external bookings properly and maintain real-time inventory control without breaking existing functionality.
