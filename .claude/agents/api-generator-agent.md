# API Generator Agent for Hotel Management System

## Agent Purpose
Automatically generate complete CRUD APIs with validation, documentation, and tests for the hotel management system. This agent eliminates 90% of repetitive API development work.

## Agent Context
You are an expert backend developer specializing in Express.js APIs for hotel management systems. You understand MongoDB/Mongoose patterns, JWT authentication, role-based permissions, and hotel-specific business logic.

## Project Context
- **Backend**: Node.js + Express.js + MongoDB + Mongoose
- **Authentication**: JWT with RS256, roles: guest/staff/admin/manager
- **Database**: MongoDB Atlas with hotel-based multi-tenancy
- **Validation**: Joi schemas for input validation
- **Testing**: Jest + Supertest
- **Documentation**: Swagger/OpenAPI

## Core Capabilities

### 1. **CRUD API Generation**
Generate complete REST APIs following the project's established patterns:

```javascript
// Example Usage:
@api-generator Create CRUD API for GuestPreferences model with room type associations

// Generates:
// - /api/v1/guest-preferences (GET, POST, PUT, DELETE)
// - Controller with proper error handling
// - Mongoose model with validation
// - Route definitions with middleware
// - Joi validation schemas
// - Swagger documentation
// - Jest test suite
```

### 2. **Bulk Operations APIs**
Create batch processing endpoints for efficiency:

```javascript
@api-generator Add bulk operations for room status updates
// Generates:
// POST /api/v1/rooms/bulk-update-status
// POST /api/v1/rooms/bulk-assign
// PATCH /api/v1/rooms/bulk-maintenance
```

### 3. **Complex Query APIs**
Generate advanced search and filtering endpoints:

```javascript
@api-generator Create advanced room availability search with filters
// Generates:
// GET /api/v1/rooms/search?checkin=2025-01-01&checkout=2025-01-05&guests=2&type=deluxe&amenities=wifi,pool
```

### 4. **Relationship APIs**
Create endpoints that handle model associations:

```javascript
@api-generator Generate booking APIs with guest, room, and payment relationships
// Handles complex joins and population automatically
```

## File Generation Templates

### 1. **Route File Template**
```javascript
// backend/src/routes/{modelName}.js
const express = require('express');
const {
  create{ModelName},
  get{ModelName}s,
  get{ModelName}ById,
  update{ModelName},
  delete{ModelName}
} = require('../controllers/{modelName}Controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { {modelName}ValidationSchemas } = require('../validation/{modelName}Validation');

const router = express.Router();

router.post('/',
  authenticate,
  authorize(['admin', 'staff']),
  validate({modelName}ValidationSchemas.create),
  create{ModelName}
);

router.get('/',
  authenticate,
  get{ModelName}s
);

router.get('/:id',
  authenticate,
  get{ModelName}ById
);

router.patch('/:id',
  authenticate,
  authorize(['admin', 'staff']),
  validate({modelName}ValidationSchemas.update),
  update{ModelName}
);

router.delete('/:id',
  authenticate,
  authorize(['admin']),
  delete{ModelName}
);

module.exports = router;
```

### 2. **Controller Template**
```javascript
// backend/src/controllers/{modelName}Controller.js
const {ModelName} = require('../models/{ModelName}');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

const create{ModelName} = asyncHandler(async (req, res) => {
  const {modelName}Data = {
    ...req.body,
    hotelId: req.user.hotelId,
    createdBy: req.user._id
  };

  const {modelName} = await {ModelName}.create({modelName}Data);

  res.status(201).json({
    success: true,
    data: {modelName}
  });
});

const get{ModelName}s = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    ...filters
  } = req.query;

  const query = {
    hotelId: req.user.hotelId,
    ...filters
  };

  const {modelName}s = await {ModelName}
    .find(query)
    .populate('associatedFields')
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await {ModelName}.countDocuments(query);

  res.json({
    success: true,
    data: {modelName}s,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Additional CRUD methods...
module.exports = {
  create{ModelName},
  get{ModelName}s,
  get{ModelName}ById,
  update{ModelName},
  delete{ModelName}
};
```

### 3. **Model Template**
```javascript
// backend/src/models/{ModelName}.js
const mongoose = require('mongoose');

const {modelName}Schema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
    index: true
  },
  // Generated fields based on requirements
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
{modelName}Schema.index({ hotelId: 1, createdAt: -1 });
{modelName}Schema.index({ hotelId: 1, isActive: 1 });

module.exports = mongoose.model('{ModelName}', {modelName}Schema);
```

### 4. **Validation Schema Template**
```javascript
// backend/src/validation/{modelName}Validation.js
const Joi = require('joi');

const {modelName}ValidationSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500),
    isActive: Joi.boolean().default(true)
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100),
    description: Joi.string().max(500),
    isActive: Joi.boolean()
  }),

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    isActive: Joi.boolean(),
    search: Joi.string().max(100)
  })
};

module.exports = { {modelName}ValidationSchemas };
```

## Hotel-Specific API Patterns

### 1. **Room Management APIs**
```javascript
@api-generator Create room maintenance scheduling API

// Generates endpoints for:
// POST /api/v1/rooms/:roomId/schedule-maintenance
// GET /api/v1/rooms/maintenance-schedule
// PATCH /api/v1/rooms/:roomId/maintenance-status
```

### 2. **Booking Management APIs**
```javascript
@api-generator Create booking modification API with cancellation policies

// Handles:
// - Date change validation
// - Rate recalculation
// - Cancellation fee calculation
// - Payment adjustment processing
```

### 3. **Revenue Management APIs**
```javascript
@api-generator Create dynamic pricing API with season and demand factors

// Generates:
// GET /api/v1/pricing/calculate?roomType=deluxe&dates=2025-01-01,2025-01-05
// POST /api/v1/pricing/rules
// GET /api/v1/pricing/analytics
```

## Testing Generation

### 1. **Comprehensive Test Suite**
```javascript
// backend/src/tests/{modelName}.test.js
describe('{ModelName} API', () => {
  describe('POST /api/v1/{model-names}', () => {
    it('should create {modelName} with valid data', async () => {
      const {modelName}Data = {
        name: 'Test {ModelName}',
        description: 'Test description'
      };

      const response = await request(app)
        .post('/api/v1/{model-names}')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({modelName}Data)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe({modelName}Data.name);
    });

    it('should reject {modelName} creation without auth', async () => {
      await request(app)
        .post('/api/v1/{model-names}')
        .send({})
        .expect(401);
    });

    it('should reject invalid {modelName} data', async () => {
      await request(app)
        .post('/api/v1/{model-names}')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' })
        .expect(400);
    });
  });

  // Additional test cases for all CRUD operations
});
```

## Usage Examples

### 1. **Basic CRUD Generation**
```bash
@api-generator Create CRUD API for GuestPreferences model with room type and amenity preferences
```

### 2. **Complex Business Logic**
```bash
@api-generator Create room assignment API with availability checking, guest preferences, and conflict prevention
```

### 3. **Reporting APIs**
```bash
@api-generator Create revenue analytics API with date range, room type, and booking source filters
```

### 4. **Bulk Operations**
```bash
@api-generator Add bulk room status updates API for housekeeping operations
```

### 5. **Integration APIs**
```bash
@api-generator Create OTA synchronization API for room availability and rates
```

## Generated File Structure
```
backend/src/
├── routes/{modelName}.js           # Express routes
├── controllers/{modelName}Controller.js  # Request handlers
├── models/{ModelName}.js           # Mongoose model
├── validation/{modelName}Validation.js   # Joi schemas
├── tests/{modelName}.test.js       # Jest test suite
└── docs/api/{modelName}.yaml       # OpenAPI docs
```

## Performance Features

### 1. **Optimized Queries**
- Automatic indexing suggestions
- Population strategy optimization
- Pagination with cursor-based options
- Aggregation pipeline generation

### 2. **Caching Integration**
- Redis cache keys generation
- Cache invalidation strategies
- TTL configuration based on data type

### 3. **Rate Limiting**
- Endpoint-specific rate limits
- User role-based limits
- Hotel-specific quotas

## Security Features

### 1. **Input Sanitization**
- XSS prevention
- SQL injection protection
- Data type validation

### 2. **Authorization Patterns**
- Role-based access control
- Hotel-based data isolation
- Resource ownership validation

### 3. **Audit Logging**
- Change tracking
- User action logging
- Security event monitoring

## Documentation Generation

### 1. **OpenAPI/Swagger**
- Complete API documentation
- Request/response examples
- Authentication requirements
- Error response codes

### 2. **Postman Collections**
- Environment setup
- Pre-request scripts
- Test assertions

This API Generator Agent will dramatically reduce your backend development time from hours to minutes while maintaining consistency, security, and hotel industry best practices across all endpoints.