# Test Admin Notification API

## Testing Commands

You can test the admin notification system using these curl commands:

### 1. Test Notification Summary Endpoint
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:4000/api/v1/inventory-notifications/summary
```

### 2. Test All Notifications Endpoint
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:4000/api/v1/inventory-notifications
```

### 3. Test Mark as Read Endpoint
```bash
curl -X PATCH \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"notificationIds": ["notification_id_here"]}' \
     http://localhost:4000/api/v1/inventory-notifications/mark-read
```

### 4. Test Guest Inventory Charges Endpoint
```bash
curl -H "Authorization: Bearer YOUR_GUEST_TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:4000/api/v1/daily-inventory-check/guest-charges/GUEST_ID?bookingId=BOOKING_ID
```

## Expected Responses

### Summary Response:
```json
{
  "status": "success",
  "data": {
    "total": 15,
    "unread": 3,
    "categories": {
      "damage": 5,
      "missing": 2,
      "charges": 8,
      "checkout_issues": 0,
      "low_stock": 0
    },
    "recent": [
      {
        "id": "notification_id",
        "type": "inventory_damage",
        "title": "Inventory Damage - Room 101",
        "message": "2 items damaged in Room 101...",
        "priority": "high",
        "createdAt": "2025-01-15T10:30:00Z",
        "isRead": false,
        "metadata": {
          "roomNumber": "101",
          "itemsCount": 2
        }
      }
    ]
  }
}
```