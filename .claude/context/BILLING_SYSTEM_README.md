# 🏨 Unified Billing System Implementation

## 📋 Overview

The Unified Billing System is a comprehensive solution for managing hotel billing operations, including POS transactions, room charges, and guest billing sessions. This system integrates with the existing hotel management infrastructure to provide seamless billing operations.

## 🏗️ Architecture

### Backend Components
- **BillingSession Model**: Core data model for billing sessions
- **BillingSession Controller**: Business logic for billing operations
- **BillingSession Routes**: RESTful API endpoints
- **Guest Lookup Service**: Guest information retrieval system
- **Data Seeding**: Comprehensive test data setup

### Frontend Components
- **UnifiedBillingSystem Component**: Main billing interface
- **BillingSession Service**: API integration service
- **Guest Lookup Service**: Guest search and retrieval
- **Real-time Updates**: Live billing calculations

## 🚀 Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already installed)
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string

# Seed the database with test data
node src/scripts/seedBillingData.js

# Start the server
npm start
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start the development server
npm run dev
```

### 3. Test the System

```bash
# Run backend tests
cd backend
node test-billing-system.js

# Test API endpoints
curl http://localhost:4000/health
```

## 📊 Data Models

### BillingSession Schema

```javascript
{
  sessionId: String,           // Unique session identifier
  hotelId: ObjectId,           // Reference to hotel
  guestName: String,           // Guest name
  roomNumber: String,          // Room number
  bookingId: ObjectId,         // Optional booking reference
  items: [                     // Array of billed items
    {
      itemId: String,
      name: String,
      category: String,
      price: Number,
      outlet: String,
      quantity: Number,
      discount: Number,
      tax: Number,
      timestamp: Date
    }
  ],
  subtotal: Number,            // Items subtotal
  totalDiscount: Number,       // Applied discount
  totalTax: Number,            // Total tax amount
  grandTotal: Number,          // Final amount
  paymentMethod: String,       // Payment method
  status: String,              // Session status
  createdBy: ObjectId,         // Staff member who created
  createdAt: Date,             // Creation timestamp
  paidAt: Date,                // Payment timestamp
  notes: String                // Additional notes
}
```

### Key Features
- **Automatic Calculations**: Real-time tax and discount calculations
- **Item Management**: Add, update, and remove items dynamically
- **Payment Processing**: Support for multiple payment methods
- **Status Tracking**: Draft, paid, room_charged, and void states
- **Audit Trail**: Complete transaction history

## 🔌 API Endpoints

### Billing Sessions

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/billing-sessions` | Create new session | Staff/Admin |
| GET | `/api/v1/billing-sessions/:id` | Get session details | Staff/Admin |
| PUT | `/api/v1/billing-sessions/:id` | Update session | Staff/Admin |
| DELETE | `/api/v1/billing-sessions/:id` | Delete session | Staff/Admin |
| POST | `/api/v1/billing-sessions/:id/items` | Add item | Staff/Admin |
| PUT | `/api/v1/billing-sessions/:id/items/:itemId` | Update item | Staff/Admin |
| DELETE | `/api/v1/billing-sessions/:id/items/:itemId` | Remove item | Staff/Admin |
| POST | `/api/v1/billing-sessions/:id/checkout` | Process payment | Staff/Admin |
| POST | `/api/v1/billing-sessions/:id/void` | Void session | Staff/Admin |
| GET | `/api/v1/billing-sessions/hotel/:hotelId` | List hotel sessions | Staff/Admin |

### Guest Lookup

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/guest-lookup/room/:roomNumber` | Find guest by room | Staff/Admin |
| GET | `/api/v1/guest-lookup/booking/:bookingId` | Find guest by booking | Staff/Admin |
| GET | `/api/v1/guest-lookup/search` | Search guests | Staff/Admin |
| GET | `/api/v1/guest-lookup/:guestId/bookings` | Get guest bookings | Staff/Admin |
| GET | `/api/v1/guest-lookup/:guestId/billing-history` | Get guest history | Staff/Admin |

## 💰 Business Logic

### Tax Calculations
- **GST Rate**: 18% (configurable per outlet)
- **Tax Application**: Applied per item based on outlet settings
- **Real-time Updates**: Automatic recalculation on item changes

### Discount System
- **Percentage Discounts**: Configurable per outlet
- **Fixed Amount Discounts**: Direct amount reduction
- **Maximum Limits**: Outlet-specific discount caps
- **Validation**: Prevents excessive discounting

### Payment Methods
- **Cash**: Immediate payment
- **Card**: Credit/debit card processing
- **Room Charge**: Added to guest's room bill
- **Corporate**: Corporate account billing
- **Split**: Multiple payment methods

## 🔐 Security & Access Control

### Authentication
- JWT-based authentication required for all endpoints
- Session validation on every request

### Authorization
- **Staff Role**: Can manage sessions for their hotel only
- **Admin Role**: Full system access
- **Guest Role**: Limited to own data access

### Data Validation
- Input sanitization and validation
- MongoDB injection protection
- Rate limiting on API endpoints

## 📱 Frontend Features

### Guest Information
- **Auto-lookup**: Search guests by room number or booking ID
- **Real-time Validation**: Immediate feedback on guest data
- **Booking Integration**: Automatic guest details population

### Item Management
- **Outlet Selection**: Choose from available POS outlets
- **Category Browsing**: Organized menu structure
- **Quantity Controls**: Easy item quantity adjustment
- **Real-time Pricing**: Live total calculations

### Payment Processing
- **Multiple Methods**: Support for all payment types
- **Split Payments**: Divide bill across methods
- **Receipt Generation**: Professional receipt output
- **Transaction History**: Complete audit trail

## 🧪 Testing

### Backend Testing
```bash
# Test the billing system
node test-billing-system.js

# Expected output:
# ✅ MongoDB connected successfully
# 🚀 Starting Billing System Tests...
# ✅ Hotel data available
# ✅ User data available for testing
# ✅ POS outlets data available
# ✅ POS menus data available
# ✅ BillingSession model test passed
# ✅ All tests completed!
```

### API Testing
```bash
# Test with authentication
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:4000/api/v1/billing-sessions

# Test guest lookup
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:4000/api/v1/guest-lookup/room/101?hotelId=HOTEL_ID"
```

## 🚨 Error Handling

### Common Error Scenarios
- **Guest Not Found**: Room number not associated with active booking
- **Session Conflicts**: Multiple active sessions for same room
- **Invalid Items**: Missing or invalid item data
- **Payment Failures**: Insufficient funds or declined transactions

### Error Responses
```json
{
  "status": "error",
  "message": "Guest not found for this room number",
  "code": "GUEST_NOT_FOUND"
}
```

## 🔧 Configuration

### Environment Variables
```bash
# Required
MONGODB_URI=mongodb://localhost:27017/hotel_management
JWT_SECRET=your_jwt_secret_key

# Optional
API_BASE_URL=http://localhost:4000
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000
```

### Outlet Settings
```javascript
// Per-outlet configuration
{
  taxSettings: {
    defaultTaxRate: 0,
    serviceTaxRate: 0,
    gstRate: 18
  },
  paymentMethods: ['cash', 'card', 'room_charge'],
  settings: {
    allowRoomCharges: true,
    maxDiscountPercent: 20
  }
}
```

## 📈 Performance Considerations

### Database Optimization
- **Indexes**: Strategic indexing on frequently queried fields
- **Aggregation**: Efficient data aggregation for reports
- **Connection Pooling**: Optimized database connections

### Caching Strategy
- **Redis Integration**: Session and user data caching
- **Query Optimization**: Minimized database round trips
- **Response Caching**: Frequently accessed data caching

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database indexes created
- [ ] SSL certificates installed
- [ ] Rate limiting enabled
- [ ] Monitoring configured
- [ ] Backup strategy implemented

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual containers
docker build -t billing-system-backend ./backend
docker build -t billing-system-frontend ./frontend
```

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Code review and merge

### Code Standards
- **Backend**: ES6+ JavaScript with JSDoc comments
- **Frontend**: TypeScript with React best practices
- **Testing**: Comprehensive unit and integration tests
- **Documentation**: Clear API documentation and examples

## 📞 Support

### Getting Help
- **Documentation**: Check this README and API docs
- **Issues**: Report bugs via GitHub issues
- **Discussions**: Use GitHub discussions for questions
- **Email**: Contact development team for urgent issues

### Common Issues
- **Connection Errors**: Check MongoDB connection string
- **Authentication Failures**: Verify JWT token validity
- **Data Not Loading**: Ensure seeding scripts have run
- **Permission Errors**: Check user role and hotel access

## 📝 Changelog

### Version 1.0.0 (Current)
- ✅ Complete billing session management
- ✅ Guest lookup and validation
- ✅ Real-time calculations
- ✅ Payment processing
- ✅ Comprehensive API endpoints
- ✅ Frontend integration
- ✅ Data seeding and testing

### Planned Features
- 🔄 Receipt generation (PDF/Email)
- 🔄 Advanced reporting and analytics
- 🔄 Multi-currency support
- 🔄 Integration with external payment gateways
- 🔄 Mobile app support

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for the Hotel Management System**
