# Hotel Management System - Claude Context

## Project Overview

**THE PENTOUZ Hotel Management System** - A comprehensive, production-ready hotel management platform with multi-tenant architecture supporting guest bookings, staff operations, and administrative functions.

### Key Features
- **Multi-role System**: Guest, Staff, Admin, Manager roles with RBAC
- **Booking Engine**: Full reservation system with real-time availability
- **Daily Operations**: Housekeeping, maintenance, inventory management
- **Revenue Management**: Room rates, taxes, corporate accounts
- **Guest Services**: Digital keys, notifications, service requests
- **OTA Integration**: Booking.com and channel manager support
- **Financial Management**: Invoicing, payments, GST, billing history
- **Analytics**: Revenue reports, occupancy tracking, KPI dashboards

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache/Queue**: Redis with Bull queues
- **Authentication**: JWT with RS256 signing
- **Payments**: Stripe Payment Intents
- **File Uploads**: Multer with Sharp image processing
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest with Supertest
- **Logging**: Winston logger

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: Zustand + React Query (TanStack)
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation
- **Charts**: Chart.js + Recharts
- **Drag & Drop**: React DnD + Hello Pangea DnD
- **Testing**: Vitest with Testing Library

## Project Structure

```
hotel-management-system/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth, validation, logging
│   │   ├── models/          # Mongoose schemas (70+ models)
│   │   ├── routes/          # API endpoints (100+ routes)
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helper functions
│   │   ├── scripts/         # Data seeding, migrations
│   │   └── server.js        # Application entry point
│   ├── uploads/             # File storage
│   ├── keys/                # JWT certificates
│   └── package.json
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route components
│   │   │   ├── admin/       # Admin dashboard pages (60+ pages)
│   │   │   ├── staff/       # Staff management pages
│   │   │   ├── guest/       # Guest portal pages
│   │   │   └── public/      # Public website pages
│   │   ├── services/        # API client services
│   │   ├── hooks/           # Custom React hooks
│   │   ├── context/         # React context providers
│   │   └── utils/           # Helper functions
│   └── package.json
└── README.md
```

## Development Commands

### Backend Commands
```bash
# Start development server
cd backend && npm run dev

# Start production server
cd backend && npm run start

# Run tests
cd backend && npm test

# Seed database with sample data
cd backend && npm run seed

# Lint code
cd backend && npm run lint

# Generate KPIs and analytics data
cd backend && npm run generate-kpis
```

### Frontend Commands
```bash
# Start development server
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Run tests
cd frontend && npm test

# Type checking
cd frontend && npm run type-check

# Lint code
cd frontend && npm run lint
```

## Database Configuration

### MongoDB Atlas Connection
- **Cloud Database**: MongoDB Atlas cluster
- **Connection**: `mongodb+srv://mukulraj756:Zk8q2W4uDCaUWRh3@cluster0.thahvbk.mongodb.net/`
- **Database Name**: `hotel-management` (auto-created)

### Key Collections
- `users` - Authentication and user management
- `hotels` - Hotel configurations
- `rooms` - Room inventory and details
- `bookings` - Reservation data
- `dailyroutinechecktemplates` - Daily check inventory templates
- `dailyroutinechecks` - Daily check assignments and completion
- `invoices` - Financial records
- `inventoryitems` - Hotel inventory management

## API Architecture

### Base URL
- **Local**: `http://localhost:4000/api/v1`
- **Production**: `https://hotel-management-xcsx.onrender.com/api/v1`

### Authentication
- **JWT Tokens**: RS256 signed with 7-day expiration
- **Header**: `Authorization: Bearer <token>`
- **Roles**: `guest`, `staff`, `admin`, `manager`

### Key Endpoints
```
Authentication:
POST   /auth/register          # User registration
POST   /auth/login             # User authentication
GET    /auth/me                # Get current user

Bookings:
GET    /bookings               # List bookings
POST   /bookings               # Create booking
POST   /bookings/change-room-by-guest  # TapeChart room assignment

Daily Operations:
GET    /daily-routine-check/rooms      # Get rooms for daily checks
POST   /daily-routine-check/assign     # Assign rooms to staff
GET    /daily-routine-check/my-assignments  # Staff assignments

Admin:
GET    /admin-dashboard/*      # Admin dashboard data
GET    /staff-dashboard/*      # Staff dashboard data
POST   /rooms                  # Create/manage rooms
```

## Key Features Implementation

### Daily Routine Check System
- **Templates**: Room-type specific inventory templates
- **Assignment**: Admin assigns rooms to staff members
- **Execution**: Staff complete checks via mobile-friendly interface
- **Tracking**: Real-time progress monitoring

### TapeChart (Room Management)
- **Drag & Drop**: Visual room assignment interface
- **Room Blocks**: Group bookings and reservations
- **Status Management**: Room status tracking
- **Integration**: Connected to booking system

### Multi-tenant Architecture
- **Hotel Isolation**: Data segregated by `hotelId`
- **Role-based Access**: Permissions based on user role and hotel
- **Scalable**: Supports multiple hotel properties

## Common Issues & Solutions

### TapeChart Room Assignment Errors
**Issue**: 404 errors when assigning rooms via drag & drop
**Solution**: Ensure user is authenticated and has proper permissions

### Build Failures
**Issue**: Case sensitivity errors on deployment (Linux vs Windows)
**Common Fix**: Check import statements match actual file names
```bash
# Example fix
# Incorrect: import { Modal } from '@/components/ui/modal'
# Correct:   import { Modal } from '@/components/ui/Modal'
```

### Database Connection Issues
**Check**: Verify MongoDB Atlas connection string and network access

## Environment Variables

### Backend (.env)
```bash
NODE_ENV=development
PORT=4000
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:4000/api/v1  # Local development
# Production uses: https://hotel-management-xcsx.onrender.com/api/v1
```

## Testing

### Backend Testing
- **Framework**: Jest with Supertest
- **Coverage**: Controllers, services, models
- **Command**: `npm test`

### Frontend Testing
- **Framework**: Vitest with React Testing Library
- **Coverage**: Components and hooks
- **Command**: `npm test`

## Deployment

### Platform
- **Current**: Render.com (backend) + Static hosting (frontend)
- **Alternative**: Google Cloud Run, Vercel, AWS

### Build Process
1. Backend: Express server with environment-based configs
2. Frontend: Vite build with production optimizations
3. Database: MongoDB Atlas cloud database

## Architecture Patterns

### Backend
- **RESTful API**: Consistent endpoint naming
- **Middleware Chain**: Auth → Validation → Controllers
- **Error Handling**: Centralized with AppError class
- **Async/Await**: Promise-based flow control

### Frontend
- **Component Architecture**: Reusable UI components
- **Service Layer**: API abstraction with axios interceptors
- **State Management**: React Query for server state, Zustand for client state
- **Type Safety**: Full TypeScript coverage

## Performance Considerations

### Backend Optimizations
- **Database Indexing**: Optimized queries for frequently accessed data
- **Caching**: Redis for session management and frequent queries
- **Compression**: Gzip middleware for response compression
- **Rate Limiting**: API rate limiting to prevent abuse

### Frontend Optimizations
- **Code Splitting**: Route-based lazy loading
- **Bundle Optimization**: Tree shaking and minification
- **Image Optimization**: Sharp for server-side image processing
- **Caching**: React Query for intelligent data caching

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Joi schema validation
- **XSS Protection**: Sanitized inputs and outputs
- **CORS**: Configured cross-origin resource sharing
- **Helmet**: Security headers middleware
- **Rate Limiting**: Request throttling
- **Data Encryption**: Sensitive data hashing

## Recent Implementations

### Daily Check Management (Recently Added)
- **Admin Interface**: Room assignment and template management
- **Staff Dashboard**: "My Assignments" tab with real-time updates
- **Backend APIs**: Complete CRUD operations for daily checks
- **Integration**: Connected to existing room and user systems

### TapeChart Integration
- **Visual Interface**: Drag-and-drop room assignments
- **Real-time Updates**: WebSocket integration for live updates
- **Booking Integration**: Seamless connection to reservation system

---

## Development Workflow

1. **Setup**: Clone repo, install dependencies, configure environment
2. **Development**: Use `npm run dev` for both frontend and backend
3. **Testing**: Run tests before committing changes
4. **Database**: Use `npm run seed` to populate with test data
5. **Deployment**: Push to main branch for automatic deployment

## Troubleshooting

### Common Commands for Issues
```bash
# Reset database with fresh data
cd backend && npm run seed

# Check API health
curl http://localhost:4000/health

# View logs for debugging
cd backend && tail -f logs/combined.log

# Rebuild and restart
cd frontend && npm run build
cd backend && npm run start
```

### Debug Checklist
1. ✓ Database connection established
2. ✓ Environment variables loaded
3. ✓ Authentication tokens valid
4. ✓ CORS configured correctly
5. ✓ API endpoints responding

This comprehensive system supports hotel operations from guest bookings to staff management, with robust architecture and modern development practices.