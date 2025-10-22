# Phase 2: Backend Endpoints - Remaining Updates

## ✅ Completed
- ✅ **propertyAccess.js middleware** - Created with 6 security functions
- ✅ **rooms.js** - Added `ensurePropertyAccess` to all routes (GET, POST, PATCH, DELETE, metrics)

## ⏳ Pending Backend Endpoints (Apply same pattern)

### Pattern to Apply:
```javascript
// 1. Import middleware
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';

// 2. Add to authenticated routes
router.get('/', authenticate, ensurePropertyAccess, controller);
router.post('/', authenticate, authorize('admin'), ensurePropertyAccess, controller);
```

### High Priority Endpoints (Week 2)
1. **bookings.js** - GET /bookings, POST /bookings, PATCH /bookings/:id
2. **guests.js** - GET /guests (user management)
3. **staff.js** - GET /staff?hotelId=xxx
4. **housekeeping.js** - GET /housekeeping/tasks?hotelId=xxx
5. **inventory.js** - GET /inventory?hotelId=xxx
6. **financial.js** - GET /financial/summary?hotelId=xxx
7. **reports.js** - GET /reports/occupancy?hotelId=xxx

### Medium Priority Endpoints (Week 3)
8. **services.js** - Guest services
9. **maintenance.js** - Maintenance requests
10. **pos.js** - POS system
11. **revenue.js** - Revenue management
12. **offers.js** - Offer management

### Backend Testing Checklist
For each updated endpoint:
- [ ] Import `ensurePropertyAccess` middleware
- [ ] Add middleware to all authenticated routes
- [ ] Test with Postman/curl
- [ ] Verify 403 error for unauthorized access
- [ ] Verify data isolation between properties

## Notes
- Guest/public endpoints (booking search) remain open
- Admin endpoints get automatic property filtering
- Staff endpoints filter by user's hotelId
