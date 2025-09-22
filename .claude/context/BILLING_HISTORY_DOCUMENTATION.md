# Billing History System Documentation

## Overview

The Billing History System provides a comprehensive view of all financial transactions within the hotel management system, including invoices, payments, and refunds. This system supports role-based access control for admin, staff, and guest users.

## Features

### ✅ Completed Features

1. **Consolidated Billing History API**
   - Single endpoint for all billing-related data
   - Role-based data filtering
   - Advanced search and filtering capabilities
   - Export functionality (CSV format)
   - Statistics and analytics

2. **Role-Based Access Control**
   - **Admin**: Full access to all hotel billing data
   - **Staff**: Access to their hotel's billing data only
   - **Guest**: Access to their own transactions only

3. **Frontend Components**
   - Admin billing history page with advanced filters
   - Guest billing history page with simplified interface
   - Export functionality
   - Transaction detail modals
   - Responsive design

4. **Database Integration**
   - Utilizes existing Payment and Invoice models
   - No additional database migrations required
   - Optimized queries with proper indexing

## API Endpoints

### Base URL: `/api/v1/billing-history`

#### 1. Get Billing History
```
GET /api/v1/billing-history
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `type` (string): Filter by type ('all', 'invoice', 'payment', 'refund')
- `status` (string): Filter by status
- `startDate` (string): Start date filter (YYYY-MM-DD)
- `endDate` (string): End date filter (YYYY-MM-DD)
- `guestId` (string): Filter by guest (admin/staff only)
- `hotelId` (string): Filter by hotel (admin only)
- `search` (string): Search query

**Response:**
```json
{
  "status": "success",
  "data": {
    "history": [
      {
        "id": "string",
        "type": "invoice|payment|refund",
        "subType": "string",
        "date": "2024-01-01T00:00:00.000Z",
        "amount": 1000,
        "status": "string",
        "description": "string",
        "bookingNumber": "string",
        "guestName": "string",
        "invoiceNumber": "string",
        "paymentMethod": "string",
        "currency": "INR"
      }
    ],
    "summary": {
      "totalTransactions": 100,
      "totalAmount": 50000,
      "invoiceCount": 40,
      "paymentCount": 35,
      "refundCount": 5,
      "totalInvoiceAmount": 45000,
      "totalPaymentAmount": 42000,
      "totalRefundAmount": 3000
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

#### 2. Get Billing Statistics
```
GET /api/v1/billing-history/stats
```

**Query Parameters:**
- `period` (string): 'week', 'month', 'quarter', 'year' (default: 'month')
- `hotelId` (string): Hotel ID (admin only)

#### 3. Export Billing Data
```
GET /api/v1/billing-history/export
```

**Query Parameters:**
- `format` (string): 'csv', 'excel', 'pdf' (default: 'csv')
- `startDate` (string): Start date filter
- `endDate` (string): End date filter
- `type` (string): Transaction type filter
- `hotelId` (string): Hotel ID (admin only)

## Frontend Components

### Admin Components

#### 1. BillingHistory (`/admin/billing`)
- **Location**: `frontend/src/pages/admin/BillingHistory.tsx`
- **Features**:
  - Comprehensive filtering (type, status, date range, search)
  - Export functionality
  - Summary statistics
  - Pagination
  - Transaction detail modal
  - Responsive table view

#### 2. Admin Navigation
- Added "Billing & Payments" link to admin sidebar
- **Icon**: CreditCard icon from Lucide React

### Guest Components

#### 1. GuestBillingHistory (`/app/billing`)
- **Location**: `frontend/src/pages/guest/GuestBillingHistory.tsx`
- **Features**:
  - Personal transaction history
  - Quick stats overview
  - Period filters (month, quarter, year)
  - Type filters (invoices, payments, refunds)
  - Mobile-friendly card layout
  - Transaction detail modal

#### 2. Guest Navigation
- Added "Billing & Payments" link to guest sidebar
- **Icon**: CreditCard icon from Lucide React

## Frontend Service

### BillingHistoryService
- **Location**: `frontend/src/services/billingHistoryService.ts`
- **Features**:
  - TypeScript interfaces for all data structures
  - API methods for all endpoints
  - Utility methods for formatting and display
  - Export functionality with CSV generation
  - Currency and date formatting helpers

## Database Schema

The system utilizes existing models without requiring additional migrations:

### Payment Model
```javascript
{
  bookingId: ObjectId,
  hotelId: ObjectId,
  stripePaymentIntentId: String,
  amount: Number,
  currency: String,
  status: String,
  paymentMethod: String,
  refunds: [{
    stripeRefundId: String,
    amount: Number,
    reason: String,
    createdAt: Date
  }],
  createdAt: Date,
  processedAt: Date
}
```

### Invoice Model
```javascript
{
  hotelId: ObjectId,
  bookingId: ObjectId,
  guestId: ObjectId,
  invoiceNumber: String,
  type: String,
  status: String,
  items: Array,
  totalAmount: Number,
  currency: String,
  issueDate: Date,
  payments: Array,
  splitBilling: Object,
  discounts: Array
}
```

## Security & Access Control

### Role-Based Permissions

1. **Guest Users**:
   - Can only view their own billing history
   - Filter by `guestId` automatically applied
   - No access to other users' data

2. **Staff Users**:
   - Can view billing history for their hotel only
   - Filter by `hotelId` automatically applied
   - Can export data for their hotel

3. **Admin Users**:
   - Full access to all billing data
   - Can filter by any hotel
   - Can export data for any hotel

### Authentication
- All endpoints require valid JWT token
- Role validation performed on each request
- Automatic data filtering based on user role

## Usage Examples

### Admin Usage
1. Navigate to `/admin/billing`
2. Use filters to find specific transactions
3. Export data for reporting
4. View detailed transaction information

### Guest Usage
1. Navigate to `/app/billing`
2. View personal transaction history
3. Filter by time period or transaction type
4. Access detailed information for each transaction

### Staff Usage
- Same as admin but limited to their hotel's data

## Error Handling

The system includes comprehensive error handling:

- **401 Unauthorized**: Invalid or missing authentication
- **403 Forbidden**: Insufficient permissions for requested data
- **404 Not Found**: Requested resource not found
- **400 Bad Request**: Invalid query parameters
- **500 Internal Server Error**: Server-side errors

## Performance Optimizations

1. **Database Indexing**:
   - Indexes on `hotelId`, `guestId`, `createdAt`, `issueDate`
   - Optimized aggregation pipelines

2. **Frontend Optimizations**:
   - React Query for caching and data management
   - Pagination for large datasets
   - Debounced search inputs
   - Lazy loading of components

3. **API Optimizations**:
   - Efficient database queries
   - Proper use of MongoDB aggregation
   - Response size optimization

## Testing Recommendations

### Backend Testing
```bash
# Test API endpoints with different roles
npm test -- billing-history

# Test role-based access control
npm test -- auth

# Test data filtering
npm test -- filters
```

### Frontend Testing
```bash
# Test component rendering
npm test -- BillingHistory

# Test service methods
npm test -- billingHistoryService

# Test role-based UI
npm test -- roles
```

## Future Enhancements

### Planned Features
1. **Real-time Updates**: WebSocket integration for live transaction updates
2. **Advanced Analytics**: More detailed charts and metrics
3. **PDF Reports**: Generate detailed PDF reports
4. **Email Notifications**: Automatic billing notifications
5. **Bulk Operations**: Bulk payment processing and refunds

### API Extensions
1. **Webhook Support**: Integration with external payment systems
2. **Advanced Filtering**: More granular filtering options
3. **Batch Processing**: Handle large data exports efficiently

## Troubleshooting

### Common Issues

1. **Empty Billing History**
   - **Cause**: No transactions exist for the user/hotel
   - **Solution**: Create test bookings and payments

2. **Permission Denied**
   - **Cause**: User trying to access data outside their permission scope
   - **Solution**: Verify user role and hotel assignment

3. **Export Not Working**
   - **Cause**: Large dataset or server timeout
   - **Solution**: Apply date range filters to reduce dataset size

4. **Slow Loading**
   - **Cause**: Large number of transactions
   - **Solution**: Implement pagination and optimize queries

### Debugging

```javascript
// Enable debug mode in billingHistoryService
localStorage.setItem('billing-debug', 'true');

// Check API responses in browser console
// Verify user permissions in JWT token
// Monitor network requests in DevTools
```

## Support

For technical support or questions:
1. Check this documentation first
2. Review API response messages for specific errors
3. Check browser console for frontend errors
4. Verify user permissions and hotel assignments

---

**Last Updated**: August 2024  
**Version**: 1.0.0  
**Status**: ✅ Complete and Ready for Production