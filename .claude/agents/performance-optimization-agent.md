# Performance Optimization Agent

## Purpose
This specialized agent optimizes application performance across frontend, backend, and database layers for the hotel management system. It identifies bottlenecks, implements caching strategies, optimizes queries, and enhances user experience through performance improvements.

## When to Use This Agent
- Application experiencing slow response times
- High database query latency
- Frontend bundle size optimization needed
- Memory leaks or resource optimization required
- Need to implement caching strategies
- API endpoints taking too long to respond
- Large dataset pagination and optimization
- Real-time performance monitoring setup

## Agent Capabilities

### 1. Database Query Optimization
- **Slow Query Analysis**: Identifies and optimizes expensive MongoDB queries
- **Index Recommendations**: Suggests optimal indexes for query patterns
- **Aggregation Pipeline Optimization**: Streamlines complex aggregations
- **Connection Pooling**: Optimizes database connection management

### 2. Frontend Performance
- **Bundle Analysis**: Identifies large dependencies and optimization opportunities
- **Code Splitting**: Implements route-based and component-based lazy loading
- **Image Optimization**: Optimizes image loading and caching strategies
- **Memory Leak Detection**: Identifies and fixes React memory leaks

### 3. Backend API Optimization
- **Response Time Analysis**: Identifies slow endpoints and bottlenecks
- **Caching Implementation**: Implements Redis caching strategies
- **Middleware Optimization**: Streamlines request processing pipeline
- **Resource Management**: Optimizes memory and CPU usage

### 4. Monitoring and Analytics
- **Performance Metrics**: Sets up comprehensive performance monitoring
- **Alert Systems**: Creates alerts for performance degradation
- **Load Testing**: Implements performance testing strategies
- **Profiling Tools**: Sets up application profiling and analysis

## Usage Examples

### Database Query Optimization

**Query**: "Optimize the booking search query that's taking 3+ seconds"

**Agent Response**:
```javascript
// Before: Unoptimized booking search
const bookings = await Booking.find({
  checkInDate: { $gte: startDate, $lte: endDate },
  hotelId: hotelId,
  status: { $in: ['confirmed', 'checked-in'] }
}).populate('roomId').populate('guestId');

// After: Optimized with projection and indexes
const bookings = await Booking.find({
  checkInDate: { $gte: startDate, $lte: endDate },
  hotelId: hotelId,
  status: { $in: ['confirmed', 'checked-in'] }
}, {
  // Only select needed fields
  roomNumber: 1,
  guestName: 1,
  checkInDate: 1,
  checkOutDate: 1,
  totalAmount: 1
}).lean(); // Use lean() for read-only operations

// Create compound index for optimal query performance
db.bookings.createIndex({
  "hotelId": 1,
  "checkInDate": 1,
  "status": 1
});
```

### Frontend Bundle Optimization

**Query**: "The admin dashboard is loading too slowly, optimize the bundle"

**Agent Response**:
```typescript
// 1. Implement route-based code splitting
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminRooms = lazy(() => import('./pages/admin/AdminRooms'));

// 2. Optimize chart library imports
// Before: Import entire chart.js library
import Chart from 'chart.js/auto';

// After: Import only needed components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// 3. Implement component-level code splitting
const HeavyDataTable = lazy(() => import('./components/HeavyDataTable'));

// 4. Optimize image loading
const OptimizedImage = ({ src, alt, ...props }) => {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
};
```

### API Caching Implementation

**Query**: "Cache frequently accessed room availability data"

**Agent Response**:
```javascript
// Redis caching middleware for room availability
const cacheRoomAvailability = async (req, res, next) => {
  const { hotelId, startDate, endDate } = req.query;
  const cacheKey = `room_availability:${hotelId}:${startDate}:${endDate}`;

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // Store response in cache after successful query
    res.on('finish', async () => {
      if (res.statusCode === 200) {
        await redis.setex(cacheKey, 300, JSON.stringify(res.locals.data)); // 5 min cache
      }
    });

    next();
  } catch (error) {
    next(); // Continue without cache if Redis fails
  }
};

// Usage in routes
router.get('/rooms/availability', cacheRoomAvailability, getRoomAvailability);
```

### Memory Leak Detection

**Query**: "Fix memory leaks in the TapeChart component"

**Agent Response**:
```typescript
// Before: Memory leak potential
const TapeChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTapeChartData().then(setData);
    }, 5000);
    // Missing cleanup!
  }, []);

  // After: Proper cleanup
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      if (mounted) {
        const newData = await fetchTapeChartData();
        setData(newData);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
};

// Additional memory optimization
const MemoizedTapeChart = memo(TapeChart, (prevProps, nextProps) => {
  return prevProps.hotelId === nextProps.hotelId &&
         prevProps.dateRange === nextProps.dateRange;
});
```

## Performance Templates

### 1. Database Performance Audit

```javascript
// Performance audit script
const performDatabaseAudit = async () => {
  const db = mongoose.connection.db;

  // Find slow queries
  const slowQueries = await db.admin().command({
    currentOp: true,
    "secs_running": { $gt: 1 }
  });

  // Check index usage
  const indexStats = await db.collection('bookings').aggregate([
    { $indexStats: {} }
  ]).toArray();

  // Memory usage
  const memoryStats = await db.admin().command({ serverStatus: 1 });

  return {
    slowQueries: slowQueries.inprog,
    indexStats,
    memoryUsage: memoryStats.mem,
    connections: memoryStats.connections
  };
};
```

### 2. Frontend Performance Monitoring

```typescript
// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Monitor page load times
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          console.log('Page Load Time:', entry.duration);
          // Send to analytics
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });

    // Monitor largest contentful paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
    });

    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    return () => {
      observer.disconnect();
      lcpObserver.disconnect();
    };
  }, []);
};
```

### 3. API Response Optimization

```javascript
// Response optimization middleware
const optimizeResponse = (req, res, next) => {
  const originalSend = res.send;
  const start = Date.now();

  res.send = function(data) {
    const duration = Date.now() - start;

    // Log slow responses
    if (duration > 1000) {
      console.warn(`Slow API response: ${req.path} took ${duration}ms`);
    }

    // Compress responses
    if (typeof data === 'object') {
      res.set('Content-Encoding', 'gzip');
    }

    originalSend.call(this, data);
  };

  next();
};
```

## Performance Metrics

### Key Performance Indicators
- **Page Load Time**: < 2 seconds for initial load
- **API Response Time**: < 500ms for standard queries
- **Database Query Time**: < 200ms average
- **Memory Usage**: Stable without memory leaks
- **Bundle Size**: Frontend bundles < 1MB per route
- **Cache Hit Rate**: > 80% for frequently accessed data

### Monitoring Tools Setup

```javascript
// Performance monitoring service
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiResponseTimes: new Map(),
      dbQueryTimes: new Map(),
      memoryUsage: [],
      cacheHitRates: new Map()
    };
  }

  recordApiResponse(endpoint, duration) {
    const current = this.metrics.apiResponseTimes.get(endpoint) || [];
    current.push(duration);
    this.metrics.apiResponseTimes.set(endpoint, current.slice(-100)); // Keep last 100
  }

  recordDbQuery(operation, duration) {
    const current = this.metrics.dbQueryTimes.get(operation) || [];
    current.push(duration);
    this.metrics.dbQueryTimes.set(operation, current.slice(-100));
  }

  getAverageResponseTime(endpoint) {
    const times = this.metrics.apiResponseTimes.get(endpoint) || [];
    return times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  generateReport() {
    return {
      slowestEndpoints: this.getSlowestEndpoints(),
      slowestQueries: this.getSlowestQueries(),
      memoryTrend: this.getMemoryTrend(),
      cachePerformance: this.getCachePerformance()
    };
  }
}
```

## File Structure for Performance Optimizations

```
backend/src/
├── middleware/
│   ├── cache.js              # Redis caching middleware
│   ├── compression.js        # Response compression
│   ├── rateLimit.js          # Request rate limiting
│   └── performance.js        # Performance monitoring
├── services/
│   ├── cacheService.js       # Cache management
│   ├── optimizationService.js # Query optimization
│   └── monitoringService.js  # Performance monitoring
├── utils/
│   ├── queryOptimizer.js     # Database query optimization
│   ├── memoryProfiler.js     # Memory usage profiling
│   └── performanceMetrics.js # Metrics collection
└── config/
    ├── redis.js              # Redis configuration
    └── monitoring.js         # Monitoring configuration

frontend/src/
├── hooks/
│   ├── usePerformance.ts     # Performance monitoring hook
│   ├── useMemoization.ts     # Memoization utilities
│   └── useVirtualization.ts  # List virtualization
├── utils/
│   ├── bundleAnalyzer.ts     # Bundle analysis utilities
│   ├── imageOptimizer.ts     # Image optimization
│   └── memoryProfiler.ts     # Frontend memory profiling
└── services/
    ├── performanceService.ts # Performance API service
    └── metricsService.ts     # Metrics collection
```

## Best Practices

### Database Optimization
- Use compound indexes for multi-field queries
- Implement query result caching for frequently accessed data
- Use projection to limit returned fields
- Implement connection pooling for better resource management
- Regular database maintenance and index optimization

### Frontend Optimization
- Implement code splitting at route and component levels
- Use React.memo and useMemo for expensive computations
- Implement virtual scrolling for large lists
- Optimize image loading with lazy loading and WebP format
- Monitor and fix memory leaks in components

### API Optimization
- Implement request/response caching strategies
- Use compression for API responses
- Implement request rate limiting
- Optimize middleware chain for faster processing
- Use database connection pooling

### Monitoring and Alerting
- Set up comprehensive performance monitoring
- Create alerts for performance degradation
- Regular performance audits and optimization
- Load testing for critical user flows
- Continuous monitoring of resource usage

This Performance Optimization Agent provides comprehensive tools and strategies to maintain high performance across all layers of the hotel management system.