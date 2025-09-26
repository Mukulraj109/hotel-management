2025-09-26 20:42:09 info: HTTP Request {
  "service": "hotel-management-system",
  "environment": "development",
  "version": "1.0.0",
  "method": "GET",
  "url": "/68d6784af1cf56ab8b6034da/settlement",
  "statusCode": 200,
  "duration": "104ms",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "ip": "::1"
}
Auth debug - flatRoles: [ 'admin', 'staff' ] user.role: admin
2025-09-26 20:42:20 warn: Request Error {
  "service": "hotel-management-system",
  "environment": "development",
  "version": "1.0.0",
  "errorId": "f59c3af4-8a90-42ae-b0ca-ff8adf52db70",
  "error": {
    "name": "ApplicationError",
    "message": "Valid amount and payment method are required",
    "code": null,
    "statusCode": 400,
    "stack": "ApplicationError: Valid amount and payment method are required\n    at file:///C:/Users/Mukul%20raj/Downloads/project-bolt-sb1-vhvvuqkj/project/backend/src/routes/bookings.js:2309:13\n    at file:///C:/Users/Mukul%20raj/Downloads/project-bolt-sb1-vhvvuqkj/project/backend/src/utils/catchAsync.js:3:5\n    at Layer.handle [as handle_request] (C:\\Users\\Mukul raj\\Downloads\\project-bolt-sb1-vhvvuqkj\\project\\backend\\node_modules\\express\\lib\\router\\layer.js:95:5)\n    at next (C:\\Users\\Mukul raj\\Downloads\\project-bolt-sb1-vhvvuqkj\\project\\backend\\node_modules\\express\\lib\\router\\route.js:149:13)\n    at file:///C:/Users/Mukul%20raj/Downloads/project-bolt-sb1-vhvvuqkj/project/backend/src/middleware/auth.js:44:5\n    at Layer.handle [as handle_request] (C:\\Users\\Mukul raj\\Downloads\\project-bolt-sb1-vhvvuqkj\\project\\backend\\node_modules\\express\\lib\\router\\layer.js:95:5)\n    at next (C:\\Users\\Mukul raj\\Downloads\\project-bolt-sb1-vhvvuqkj\\project\\backend\\node_modules\\express\\lib\\router\\route.js:149:13)\n    at file:///C:/Users/Mukul%20raj/Downloads/project-bolt-sb1-vhvvuqkj/project/backend/src/middleware/auth.js:33:3\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
  },
  "request": {
    "method": "POST",
    "url": "/api/v1/bookings/68d6784af1cf56ab8b6034da/settlement/payment",
    "path": "/api/v1/bookings/68d6784af1cf56ab8b6034da/settlement/payment",
    "query": {},
    "params": {},
    "headers": {
      "host": "localhost:4000",
      "connection": "close",
      "content-length": "315",
      "sec-ch-ua-platform": "\"Windows\"",
      "authorization": "[REDACTED]",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Brave\";v=\"140\"",
      "content-type": "application/json",
      "sec-ch-ua-mobile": "?0",
      "accept": "*/*",
      "sec-gpc": "1",
      "accept-language": "en-US,en;q=0.9",
      "origin": "http://localhost:5173",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      "referer": "http://localhost:5173/admin/upcoming-bookings",
      "accept-encoding": "gzip, deflate, br, zstd",
      "cookie": "[REDACTED]"
    },
    "body": {
      "paymentMethods": [
        {
          "method": "cash",
          "amount": 2165,
          "reference": "43098r09850",
          "notes": "Cash payment for extra person charges"
        }
      ],
      "settlementCharges": [
        {
          "adjustmentId": "settlement_outstanding",
          "amount": 21164.6,
          "description": "Settlement payment for booking BK20250926822",
          "type": "settlement_payment"
        }
      ],
      "totalAmount": 2165
    },
    "ip": "::1",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
  },
  "user": {
    "id": "68cd01414419c17b5f6b4c14",
    "role": "admin",
    "email": "admin@hotel.com",
    "hotelId": {
      "buffer": {
        "0": 104,
        "1": 205,
        "2": 1,
        "3": 65,
        "4": 68,
        "5": 25,
        "6": 193,
        "7": 123,
        "8": 95,
        "9": 107,
        "10": 76,
        "11": 18
      }
    }
  },
  "correlationId": "corr_1758899540564_c1b6c181",
  "requestId": "fc49b977-682e-40a1-8e11-0d9cfe219db7"
}
2025-09-26 20:42:20 warn: API Request/Response - Client Error {
  "service": "hotel-management-system",
  "environment": "development",
  "version": "1.0.0",
  "request": {
    "id": "fc49b977-682e-40a1-8e11-0d9cfe219db7",
    "correlationId": "corr_1758899540564_c1b6c181",
    "timestamp": "2025-09-26T15:12:20.564Z",
    "method": "POST",
    "url": "/api/v1/bookings/68d6784af1cf56ab8b6034da/settlement/payment",
    "path": "/api/v1/bookings/68d6784af1cf56ab8b6034da/settlement/payment",
    "query": {},
    "params": {},
    "headers": {
      "host": "localhost:4000",
      "connection": "close",
      "content-length": "315",
      "sec-ch-ua-platform": "\"Windows\"",
      "authorization": "[REDACTED]",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Brave\";v=\"140\"",
      "content-type": "application/json",
      "sec-ch-ua-mobile": "?0",
      "accept": "*/*",
      "sec-gpc": "1",
      "accept-language": "en-US,en;q=0.9",
      "origin": "http://localhost:5173",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      "referer": "http://localhost:5173/admin/upcoming-bookings",
      "accept-encoding": "gzip, deflate, br, zstd",
      "cookie": "[REDACTED]"
    },
    "ip": "::1",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    "contentType": "application/json",
    "contentLength": "315",
    "authenticated": false,
    "bodySize": 315,
    "body": {
      "paymentMethods": [
        {
          "method": "cash",
          "amount": 2165,
          "reference": "43098r09850",
          "notes": "Cash payment for extra person charges"
        }
      ],
      "settlementCharges": [
        {
          "adjustmentId": "settlement_outstanding",
          "amount": 21164.6,
          "description": "Settlement payment for booking BK20250926822",
          "type": "settlement_payment"
        }
      ],
      "totalAmount": 2165
    }
  },
  "response": {
    "requestId": "fc49b977-682e-40a1-8e11-0d9cfe219db7",
    "correlationId": "corr_1758899540564_c1b6c181",
    "statusCode": 400,
    "headers": {
      "content-security-policy": "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",     
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-resource-policy": "same-origin",
      "origin-agent-cluster": "?1",
      "referrer-policy": "no-referrer",
      "strict-transport-security": "max-age=15552000; includeSubDomains",
      "x-content-type-options": "nosniff",
      "x-dns-prefetch-control": "off",
      "x-download-options": "noopen",
      "x-frame-options": "SAMEORIGIN",
      "x-permitted-cross-domain-policies": "none",
      "x-xss-protection": "0",
      "access-control-allow-origin": "*",
      "access-control-allow-credentials": "true"
    },
    "duration": 47,
    "responseSize": 1467,
    "method": "json",
    "body": {
      "success": false,
      "error": {
        "id": "f59c3af4-8a90-42ae-b0ca-ff8adf52db70",
        "code": "INTERNAL_ERROR",
        "message": "Valid amount and payment method are required",
        "statusCode": 400,
        "timestamp": "2025-09-26T15:12:20.609Z",
        "stack": "ApplicationError: Valid amount and payment method are required\n    at file:///C:/Users/Mukul%20raj/Downloads/project-bolt-sb1-vhvvuqkj/project/backend/src/routes/bookings.js:2309:13\n    at file:///C:/Users/Mukul%20raj/Downloads/project-bolt-sb1-vhvvuqkj/project/backend/src/utils/catchAsync.js:3:5\n    at Layer.handle [as handle_request] (C:\\Users\\Mukul raj\\Downloads\\project-bolt-sb1-vhvvuqkj\\project\\backend\\node_modules\\express\\lib\\router\\layer.js:95:5)\n    at next (C:\\Users\\Mukul raj\\Downloads\\project-bolt-sb1-vhvvuqkj\\project\\backend\\node_modules\\express\\lib\\router\\route.js:149:13)\n    at file:///C:/Users/Mukul%20raj/Downloads/project-bolt-sb1-vhvvuqkj/project/backend/src/middleware/auth.js:44:5\n    at Layer.handle [as handle_request] (C:\\Users\\Mukul raj\\Downloads\\project-bolt-sb1-vhvvuqkj\\project\\backend\\node_modules\\express\\lib\\router\\layer.js:95:5)\n    at next (C:\\Users\\Mukul raj\\Downloads\\project-bolt-sb1-vhvvuqkj\\project\\backend\\node_modules\\express\\lib\\router\\route.js:149:13)\n    at file:///C:/Users/Mukul%20raj/Downloads/project-bolt-sb1-vhvvuqkj/project/backend/src/middleware/auth.js:33:3\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)"
      }
    }
  },
  "performance": {
    "duration": "47ms",
    "slow": false
  }
}
2025-09-26 20:42:20 error: HTTP Request {
  "service": "hotel-management-system",
  "environment": "development",
  "version": "1.0.0",
  "method": "POST",
  "url": "/api/v1/bookings/68d6784af1cf56ab8b6034da/settlement/payment",
  "statusCode": 400,
  "duration": "54ms",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "ip": "::1"
}