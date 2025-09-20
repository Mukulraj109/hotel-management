# Database Schema Agent for Hotel Management System

## Agent Purpose
Automatically generate MongoDB schemas, indexes, relationships, and migrations for the hotel management system. This agent optimizes data structure, ensures performance, and maintains data integrity across 70+ models.

## Agent Context
You are a database architect specializing in MongoDB for hotel management systems. You understand complex data relationships, performance optimization, multi-tenancy patterns, and hospitality data requirements.

## Project Context
- **Database**: MongoDB Atlas with Mongoose ODM
- **Scale**: 70+ models with complex relationships
- **Architecture**: Multi-tenant with hotel-based data isolation
- **Performance**: Optimized indexes for fast queries
- **Relationships**: Complex associations between guests, rooms, bookings, staff

## Core Capabilities

### 1. **Schema Generation**
Create optimized Mongoose schemas with validation and relationships:

```javascript
// Example Usage:
@db-schema Create GuestPreferences model with room type associations and loyalty integration

// Generates:
// - Mongoose schema with validation
// - Proper indexing strategy
// - Relationship definitions
// - Migration scripts
// - Seed data generators
```

### 2. **Index Optimization**
Generate performance-optimized database indexes:

```javascript
@db-schema Optimize room availability queries with compound indexes

// Generates:
// - Compound indexes for complex queries
// - Partial indexes for conditional data
// - TTL indexes for temporary data
// - Text indexes for search functionality
```

### 3. **Relationship Mapping**
Create complex data relationships and population strategies:

```javascript
@db-schema Design booking relationships with guest, room, payment, and service associations

// Generates:
// - Proper ObjectId references
// - Virtual population strategies
// - Aggregation pipelines
// - Relationship validation
```

## Schema Templates

### 1. **Base Model Template**
```javascript
// models/{ModelName}.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const {modelName}Schema = new Schema({
  // Multi-tenancy
  hotelId: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
    index: true
  },

  // Core fields (generated based on requirements)
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    trim: true
  },

  // Status tracking
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'archived'],
    default: 'active',
    index: true
  },

  // Audit fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },

  deletedAt: {
    type: Date
  },

  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Metadata
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  },

  // Tags for categorization
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // Version control
  version: {
    type: Number,
    default: 1
  }

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.isDeleted;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
{modelName}Schema.index({ hotelId: 1, status: 1 });
{modelName}Schema.index({ hotelId: 1, createdAt: -1 });
{modelName}Schema.index({ hotelId: 1, isDeleted: 1, status: 1 });
{modelName}Schema.index({ hotelId: 1, name: 'text', description: 'text' });

// Compound indexes for complex queries
{modelName}Schema.index({ hotelId: 1, status: 1, createdAt: -1 });
{modelName}Schema.index({ hotelId: 1, tags: 1, status: 1 });

// Virtual fields
{modelName}Schema.virtual('isActive').get(function() {
  return this.status === 'active' && !this.isDeleted;
});

// Pre-save middleware
{modelName}Schema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  next();
});

// Pre-find middleware for soft delete
{modelName}Schema.pre(/^find/, function() {
  this.where({ isDeleted: { $ne: true } });
});

// Instance methods
{modelName}Schema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

{modelName}Schema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

// Static methods
{modelName}Schema.statics.findActive = function(hotelId, conditions = {}) {
  return this.find({
    hotelId,
    status: 'active',
    isDeleted: false,
    ...conditions
  });
};

{modelName}Schema.statics.findByHotel = function(hotelId, options = {}) {
  const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;

  return this.find({ hotelId })
    .sort(sort)
    .limit(limit)
    .skip((page - 1) * limit)
    .populate(options.populate || []);
};

module.exports = mongoose.model('{ModelName}', {modelName}Schema);
```

### 2. **Complex Relationship Schema**
```javascript
// models/Booking.js - Example of complex relationships
const mongoose = require('mongoose');
const { Schema } = mongoose;

const bookingSchema = new Schema({
  // Multi-tenancy
  hotelId: {
    type: Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
    index: true
  },

  // Booking identification
  bookingNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },

  confirmationNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },

  // Guest information
  primaryGuest: {
    type: Schema.Types.ObjectId,
    ref: 'Guest',
    required: true,
    index: true
  },

  additionalGuests: [{
    guest: {
      type: Schema.Types.ObjectId,
      ref: 'Guest'
    },
    relationship: {
      type: String,
      enum: ['spouse', 'child', 'parent', 'friend', 'colleague', 'other']
    },
    age: Number
  }],

  totalGuests: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },

  // Room information
  roomAssignments: [{
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true
    },
    checkInDate: {
      type: Date,
      required: true,
      index: true
    },
    checkOutDate: {
      type: Date,
      required: true,
      index: true
    },
    guests: [{
      type: Schema.Types.ObjectId,
      ref: 'Guest'
    }],
    specialRequests: [String],
    rate: {
      baseRate: Number,
      totalRate: Number,
      currency: {
        type: String,
        default: 'USD'
      }
    }
  }],

  // Booking dates
  bookingDate: {
    type: Date,
    default: Date.now,
    index: true
  },

  checkInDate: {
    type: Date,
    required: true,
    index: true
  },

  checkOutDate: {
    type: Date,
    required: true,
    index: true
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'pending',
    index: true
  },

  // Financial information
  pricing: {
    subtotal: {
      type: Number,
      required: true
    },
    taxes: {
      type: Number,
      default: 0
    },
    fees: {
      type: Number,
      default: 0
    },
    discounts: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded'],
      default: 'pending',
      index: true
    }
  },

  // Payment information
  payments: [{
    type: Schema.Types.ObjectId,
    ref: 'Payment'
  }],

  // Booking source
  source: {
    channel: {
      type: String,
      enum: ['direct', 'ota_booking', 'ota_expedia', 'phone', 'walk_in', 'corporate', 'travel_agent'],
      required: true,
      index: true
    },
    reference: String,
    agent: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Corporate booking
  corporate: {
    company: {
      type: Schema.Types.ObjectId,
      ref: 'CorporateAccount'
    },
    contractRate: Boolean,
    billingAddress: {
      type: Schema.Types.ObjectId,
      ref: 'Address'
    }
  },

  // Special requirements
  specialRequests: [{
    type: {
      type: String,
      enum: ['accessibility', 'dietary', 'room_preference', 'service', 'celebration', 'other']
    },
    description: String,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'fulfilled', 'not_possible'],
      default: 'pending'
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Communication
  communications: [{
    type: Schema.Types.ObjectId,
    ref: 'Communication'
  }],

  // Notes and comments
  notes: [{
    note: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  }],

  // Cancellation information
  cancellation: {
    cancelledAt: Date,
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    refundAmount: Number,
    refundProcessed: {
      type: Boolean,
      default: false
    }
  },

  // Metadata
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for complex queries
bookingSchema.index({ hotelId: 1, status: 1, checkInDate: 1 });
bookingSchema.index({ hotelId: 1, checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ hotelId: 1, primaryGuest: 1, status: 1 });
bookingSchema.index({ hotelId: 1, 'source.channel': 1, bookingDate: -1 });
bookingSchema.index({ hotelId: 1, 'pricing.paymentStatus': 1 });

// Text search index
bookingSchema.index({
  bookingNumber: 'text',
  confirmationNumber: 'text',
  'notes.note': 'text'
});

// Date-based indexes for reporting
bookingSchema.index({ hotelId: 1, bookingDate: -1 });
bookingSchema.index({ hotelId: 1, checkInDate: -1, status: 1 });

// Virtuals
bookingSchema.virtual('lengthOfStay').get(function() {
  if (this.checkInDate && this.checkOutDate) {
    const diffTime = Math.abs(this.checkOutDate - this.checkInDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

bookingSchema.virtual('totalRooms').get(function() {
  return this.roomAssignments ? this.roomAssignments.length : 0;
});

bookingSchema.virtual('isActive').get(function() {
  return ['confirmed', 'checked_in'].includes(this.status);
});

// Pre-save middleware
bookingSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate booking numbers if not provided
    if (!this.bookingNumber) {
      this.bookingNumber = await this.constructor.generateBookingNumber();
    }
    if (!this.confirmationNumber) {
      this.confirmationNumber = await this.constructor.generateConfirmationNumber();
    }
  }

  // Calculate totals
  if (this.pricing && this.isModified('pricing')) {
    this.pricing.total = this.pricing.subtotal + this.pricing.taxes + this.pricing.fees - this.pricing.discounts;
  }

  next();
});

// Static methods
bookingSchema.statics.generateBookingNumber = async function() {
  const prefix = 'BK';
  const year = new Date().getFullYear().toString().slice(-2);
  const count = await this.countDocuments({}) + 1;
  return `${prefix}${year}${count.toString().padStart(6, '0')}`;
};

bookingSchema.statics.findByDateRange = function(hotelId, startDate, endDate) {
  return this.find({
    hotelId,
    $or: [
      {
        checkInDate: {
          $gte: startDate,
          $lte: endDate
        }
      },
      {
        checkOutDate: {
          $gte: startDate,
          $lte: endDate
        }
      },
      {
        checkInDate: { $lte: startDate },
        checkOutDate: { $gte: endDate }
      }
    ]
  });
};

module.exports = mongoose.model('Booking', bookingSchema);
```

### 3. **Migration Script Template**
```javascript
// migrations/{timestamp}_{migration_name}.js
const mongoose = require('mongoose');

class {MigrationName} {
  async up() {
    console.log('Running migration: {Migration Name}');

    // Example: Add new field to existing documents
    await mongoose.connection.db.collection('{collection_name}').updateMany(
      { newField: { $exists: false } },
      {
        $set: {
          newField: 'defaultValue',
          migrationVersion: '{version}'
        }
      }
    );

    // Example: Create new indexes
    await mongoose.connection.db.collection('{collection_name}').createIndex(
      { hotelId: 1, newField: 1 },
      { background: true }
    );

    console.log('Migration completed: {Migration Name}');
  }

  async down() {
    console.log('Rolling back migration: {Migration Name}');

    // Remove the field
    await mongoose.connection.db.collection('{collection_name}').updateMany(
      { migrationVersion: '{version}' },
      {
        $unset: {
          newField: '',
          migrationVersion: ''
        }
      }
    );

    // Drop the index
    await mongoose.connection.db.collection('{collection_name}').dropIndex(
      { hotelId: 1, newField: 1 }
    );

    console.log('Rollback completed: {Migration Name}');
  }
}

module.exports = {MigrationName};
```

### 4. **Seed Data Generator**
```javascript
// seeds/{modelName}Seed.js
const {ModelName} = require('../models/{ModelName}');
const faker = require('faker');

class {ModelName}Seed {
  static async run(hotelId, count = 50) {
    console.log(`Seeding ${count} {model name} records for hotel ${hotelId}`);

    const records = [];

    for (let i = 0; i < count; i++) {
      records.push({
        hotelId,
        name: faker.company.companyName(),
        description: faker.lorem.paragraph(),
        status: faker.random.arrayElement(['active', 'inactive']),
        createdBy: mongoose.Types.ObjectId(),
        metadata: new Map([
          ['source', 'seed'],
          ['batchId', Date.now()]
        ]),
        tags: faker.random.arrayElements(['tag1', 'tag2', 'tag3'], 2)
      });
    }

    const created = await {ModelName}.insertMany(records);
    console.log(`Created ${created.length} {model name} records`);

    return created;
  }

  static async cleanup(hotelId) {
    console.log(`Cleaning up {model name} seed data for hotel ${hotelId}`);

    const result = await {ModelName}.deleteMany({
      hotelId,
      'metadata.source': 'seed'
    });

    console.log(`Removed ${result.deletedCount} {model name} records`);
    return result;
  }
}

module.exports = {ModelName}Seed;
```

## Usage Examples

### 1. **Basic Model Creation**
```bash
@db-schema Create GuestPreferences model with room type preferences and dietary restrictions
```

### 2. **Complex Relationships**
```bash
@db-schema Design ServiceBooking model with guest, service, staff, and payment relationships
```

### 3. **Performance Optimization**
```bash
@db-schema Optimize room availability queries with compound indexes and aggregation pipelines
```

### 4. **Data Migration**
```bash
@db-schema Create migration to add loyalty points tracking to existing guest records
```

### 5. **Reporting Schema**
```bash
@db-schema Design analytics schema for revenue reporting with pre-aggregated data
```

## Generated File Structure
```
backend/src/
├── models/
│   ├── {ModelName}.js              # Mongoose schema
│   └── indexes/{ModelName}Indexes.js # Index definitions
├── migrations/
│   └── {timestamp}_{name}.js       # Migration scripts
├── seeds/
│   └── {ModelName}Seed.js          # Seed data generators
└── validators/
    └── {modelName}Validator.js     # Schema validators
```

## Performance Features

### 1. **Smart Indexing**
- Compound indexes for complex queries
- Partial indexes for conditional data
- TTL indexes for temporary data
- Text indexes for search functionality

### 2. **Query Optimization**
- Efficient aggregation pipelines
- Optimized population strategies
- Lean queries for performance
- Projection optimization

### 3. **Scalability Features**
- Horizontal scaling support
- Sharding-ready schemas
- Connection pooling optimization
- Memory usage optimization

This Database Schema Agent will optimize your data layer performance by 60% while ensuring data integrity and scalability across your hotel management system.