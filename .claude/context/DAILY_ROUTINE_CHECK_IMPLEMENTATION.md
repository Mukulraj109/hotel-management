# Daily Routine Check System Implementation

## Overview

The Daily Routine Check system is a comprehensive solution for hotel staff to perform daily inventory checks in all rooms. It allows staff to systematically verify both fixed (permanent) and daily (consumable) inventory items, track their condition, and manage replacements, laundry, and reuse decisions.

## Features

### 🏠 **Room Management**
- View all rooms that need daily checks
- Filter rooms by status (pending, completed, overdue)
- Search rooms by number or type
- Track last check date and estimated duration

### 📦 **Inventory Types**

#### **Fixed Inventory (Permanent Items)**
- **Electronics**: TV, AC, coffee machines
- **Furniture**: Beds, wardrobes, tables
- **Appliances**: Mini fridges, coffee makers
- **Fixtures**: Bathroom fixtures, lighting
- **Actions Available**: Replace, Reuse

#### **Daily Inventory (Consumable Items)**
- **Bathroom**: Towels, toiletries, bathrobes
- **Bedroom**: Bed sheets, pillowcases
- **Kitchen**: Tea/coffee supplies
- **Amenities**: Water bottles, slippers
- **Actions Available**: Add, Laundry, Reuse

### 🛒 **Cart System**
- Add items to cart with specific actions
- Track quantities and costs
- Manage different action types
- Calculate total costs for replacements

### 📊 **Status Tracking**
- **Pending**: Room needs daily check
- **Completed**: Daily check finished
- **Overdue**: Room hasn't been checked recently
- **In Progress**: Check currently being performed

## Technical Implementation

### **Frontend Components**

#### **DailyRoutineCheck.tsx**
- Main component for daily routine checks
- Room grid with status indicators
- Search and filter functionality
- Cart management system
- Room detail modal for inventory checks

#### **Features**
- Responsive design for mobile and desktop
- Real-time status updates
- Interactive cart management
- Action buttons for different inventory types

### **Backend Models**

#### **DailyRoutineCheck.js**
```javascript
{
  hotelId: ObjectId,
  roomId: ObjectId,
  checkedBy: ObjectId,
  checkDate: Date,
  status: 'pending' | 'in_progress' | 'completed' | 'overdue',
  items: [{
    itemId: ObjectId,
    action: 'replace' | 'add' | 'laundry' | 'reuse',
    quantity: Number,
    notes: String
  }],
  totalCost: Number,
  qualityScore: Number
}
```

#### **DailyRoutineCheckTemplate.js**
```javascript
{
  hotelId: ObjectId,
  roomType: String,
  fixedInventory: [{
    name: String,
    category: String,
    description: String,
    unitPrice: Number,
    standardQuantity: Number
  }],
  dailyInventory: [{
    name: String,
    category: String,
    description: String,
    unitPrice: Number,
    standardQuantity: Number
  }]
}
```

### **API Endpoints**

#### **GET /api/v1/daily-routine-check/rooms**
- Get all rooms that need daily checks
- Support filtering by status, floor, type
- Include inventory templates for each room

#### **GET /api/v1/daily-routine-check/rooms/:roomId/inventory**
- Get detailed inventory for a specific room
- Include fixed and daily inventory items
- Provide check instructions and expected conditions

#### **POST /api/v1/daily-routine-check/rooms/:roomId/complete**
- Complete daily check for a room
- Process cart items with actions
- Calculate total costs and quality scores

#### **GET /api/v1/daily-routine-check/summary**
- Get daily check summary for dashboard
- Count pending, completed, and overdue checks
- Estimate time remaining for completion

## Usage Workflow

### **1. Staff Login & Navigation**
- Staff logs into the system
- Navigates to "Daily Routine Check" from sidebar
- Views all rooms that need daily checks

### **2. Room Selection & Check**
- Staff selects a room to check
- Opens room detail modal
- Reviews fixed and daily inventory items

### **3. Inventory Assessment**
- **Fixed Items**: Check if working, damaged, or need replacement
- **Daily Items**: Check if clean, adequate quantity, need laundry

### **4. Action Selection**
- **Replace**: Add to cart for replacement (costs money)
- **Add**: Add to cart for replenishment (costs money)
- **Laundry**: Send to laundry (no cost, item reused)
- **Reuse**: Mark as reusable (no cost, item kept)

### **5. Cart Management**
- Review all selected actions
- Adjust quantities if needed
- See total cost implications
- Clear cart or proceed with completion

### **6. Check Completion**
- Submit the daily check
- System records all actions taken
- Updates room status to completed
- Creates follow-up tasks if needed

## Setup Instructions

### **1. Database Setup**
```bash
# The models will be created automatically when the server starts
# No manual database setup required
```

### **2. Seed Sample Data**
```bash
# Run the seeding script to create sample templates
cd backend/src/scripts
node seedDailyRoutineCheckTemplates.js
```

### **3. Frontend Integration**
- The component is already integrated into the staff layout
- Added to sidebar navigation
- Available at `/staff/daily-routine-check`

### **4. Backend Integration**
- Routes are registered in `server.js`
- Available at `/api/v1/daily-routine-check/*`

## Configuration

### **Room Types Supported**
- Standard
- Deluxe
- Suite
- Presidential
- Family
- Accessible

### **Inventory Categories**
- **Fixed**: electronics, furniture, appliances, fixtures, other
- **Daily**: bathroom, bedroom, kitchen, amenities, other

### **Check Durations**
- Standard Room: 15 minutes
- Deluxe Room: 20 minutes
- Suite: 25 minutes

## Benefits

### **For Staff**
- **Systematic Approach**: Clear checklist for each room type
- **Efficiency**: Streamlined process with cart management
- **Accountability**: Track what was checked and when
- **Cost Awareness**: See financial impact of replacements

### **For Management**
- **Quality Control**: Ensure consistent room standards
- **Cost Tracking**: Monitor replacement and maintenance costs
- **Performance Metrics**: Track staff efficiency and completion rates
- **Inventory Management**: Better control over consumable items

### **For Guests**
- **Consistent Experience**: All rooms meet quality standards
- **Well-Maintained Rooms**: Regular checks prevent issues
- **Fresh Amenities**: Daily replenishment of consumables

## Future Enhancements

### **Planned Features**
- **Photo Documentation**: Before/after photos for issues
- **QR Code Scanning**: Quick room identification
- **Offline Mode**: Work without internet connection
- **Voice Notes**: Audio recording of issues
- **Integration**: Connect with maintenance and housekeeping systems

### **Advanced Analytics**
- **Trend Analysis**: Identify recurring issues
- **Cost Optimization**: Suggest cost-effective solutions
- **Predictive Maintenance**: Flag items likely to need replacement
- **Staff Performance**: Track individual staff efficiency

## Troubleshooting

### **Common Issues**

#### **No Rooms Showing**
- Check if hotel has rooms in the database
- Verify room types match template types
- Ensure rooms are marked as active

#### **Inventory Not Loading**
- Check if templates exist for room types
- Verify database connections
- Check server logs for errors

#### **Cart Not Working**
- Ensure JavaScript is enabled
- Check browser console for errors
- Verify API endpoints are accessible

### **Support**
- Check server logs in `backend/logs/`
- Verify API responses in browser network tab
- Ensure all models are properly imported

## Conclusion

The Daily Routine Check system provides a comprehensive solution for hotel staff to maintain room quality standards through systematic inventory checks. It combines efficiency with accountability, ensuring that all rooms meet guest expectations while providing management with valuable insights into operations and costs.

The system is designed to be intuitive for staff while providing robust tracking and reporting capabilities for management. With its flexible action system, it accommodates various scenarios from simple replenishment to complex maintenance issues.
