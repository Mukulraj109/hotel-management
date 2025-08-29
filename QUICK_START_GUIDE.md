# Quick Start Guide - User Features Implementation

## 🚀 IMMEDIATE NEXT STEPS

### Phase 1: Loyalty & Rewards System (Start Here)

#### Step 1: Install Required Dependencies

**Backend Dependencies:**
```bash
cd backend
npm install qrcode socket.io
```

**Frontend Dependencies:**
```bash
cd frontend
npm install qrcode.react socket.io-client
```

#### Step 2: Create Backend Models (Day 1 - Task 1.1)

Create `backend/src/models/Loyalty.js`:
```javascript
import mongoose from 'mongoose';

const loyaltySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  hotelId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hotel',
    required: true
  },
  type: {
    type: String,
    enum: ['earned', 'redeemed', 'expired', 'bonus'],
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  bookingId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking'
  },
  offerId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Offer'
  },
  expiresAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

export default mongoose.model('Loyalty', loyaltySchema);
```

#### Step 3: Create Offer Model (Day 1 - Task 1.2)

Create `backend/src/models/Offer.js`:
```javascript
import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hotel',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  pointsRequired: {
    type: Number,
    required: true
  },
  discountPercentage: Number,
  discountAmount: Number,
  type: {
    type: String,
    enum: ['discount', 'free_service', 'upgrade', 'bonus_points'],
    required: true
  },
  category: {
    type: String,
    enum: ['room', 'dining', 'spa', 'transport', 'general'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  validFrom: Date,
  validUntil: Date,
  maxRedemptions: Number,
  currentRedemptions: {
    type: Number,
    default: 0
  },
  minTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  }
}, {
  timestamps: true
});

export default mongoose.model('Offer', offerSchema);
```

#### Step 4: Create Loyalty Routes (Day 1 - Task 1.4)

Create `backend/src/routes/loyalty.js`:
```javascript
import express from 'express';
import Loyalty from '../models/Loyalty.js';
import Offer from '../models/Offer.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

const router = express.Router();

// Get user loyalty dashboard
router.get('/dashboard', authenticate, catchAsync(async (req, res) => {
  const user = await req.user.populate('loyalty');
  
  const recentTransactions = await Loyalty.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('bookingId', 'bookingNumber checkIn checkOut');
  
  const availableOffers = await Offer.find({
    hotelId: req.user.hotelId || { $exists: false },
    isActive: true,
    minTier: { $lte: user.loyalty.tier },
    $or: [
      { validUntil: { $gt: new Date() } },
      { validUntil: { $exists: false } }
    ]
  });

  res.json({
    status: 'success',
    data: {
      user: {
        points: user.loyalty.points,
        tier: user.loyalty.tier,
        nextTier: getNextTier(user.loyalty.points),
        pointsToNextTier: getPointsToNextTier(user.loyalty.points)
      },
      recentTransactions,
      availableOffers
    }
  });
}));

// Get available offers
router.get('/offers', authenticate, catchAsync(async (req, res) => {
  const offers = await Offer.find({
    hotelId: req.user.hotelId || { $exists: false },
    isActive: true,
    minTier: { $lte: req.user.loyalty.tier }
  }).sort({ pointsRequired: 1 });

  res.json({
    status: 'success',
    data: offers
  });
}));

// Redeem points for offer
router.post('/redeem', authenticate, catchAsync(async (req, res) => {
  const { offerId } = req.body;

  const offer = await Offer.findById(offerId);
  if (!offer || !offer.isActive) {
    throw new AppError('Offer not available', 400);
  }

  if (req.user.loyalty.points < offer.pointsRequired) {
    throw new AppError('Insufficient points', 400);
  }

  if (req.user.loyalty.tier < offer.minTier) {
    throw new AppError('Tier requirement not met', 400);
  }

  // Create redemption transaction
  await Loyalty.create({
    userId: req.user._id,
    hotelId: offer.hotelId,
    type: 'redeemed',
    points: -offer.pointsRequired,
    description: `Redeemed: ${offer.title}`,
    offerId: offer._id
  });

  // Update user points
  req.user.loyalty.points -= offer.pointsRequired;
  req.user.loyalty.updateLoyaltyTier();
  await req.user.save();

  // Update offer redemption count
  offer.currentRedemptions += 1;
  await offer.save();

  res.json({
    status: 'success',
    data: {
      message: 'Points redeemed successfully',
      remainingPoints: req.user.loyalty.points,
      newTier: req.user.loyalty.tier
    }
  });
}));

// Get transaction history
router.get('/history', authenticate, catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  
  const transactions = await Loyalty.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('bookingId', 'bookingNumber checkIn checkOut')
    .populate('offerId', 'title');

  const total = await Loyalty.countDocuments({ userId: req.user._id });

  res.json({
    status: 'success',
    data: {
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    }
  });
}));

function getNextTier(points) {
  if (points >= 10000) return null;
  if (points >= 5000) return 'platinum';
  if (points >= 1000) return 'gold';
  if (points >= 100) return 'silver';
  return 'bronze';
}

function getPointsToNextTier(points) {
  if (points >= 10000) return 0;
  if (points >= 5000) return 10000 - points;
  if (points >= 1000) return 5000 - points;
  if (points >= 100) return 1000 - points;
  return 100 - points;
}

export default router;
```

#### Step 5: Create Frontend Service (Day 3 - Task 1.8)

Create `frontend/src/services/loyaltyService.ts`:
```typescript
import { api } from './api';

export interface LoyaltyDashboard {
  user: {
    points: number;
    tier: string;
    nextTier: string | null;
    pointsToNextTier: number;
  };
  recentTransactions: LoyaltyTransaction[];
  availableOffers: Offer[];
}

export interface LoyaltyTransaction {
  _id: string;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus';
  points: number;
  description: string;
  createdAt: string;
  bookingId?: {
    _id: string;
    bookingNumber: string;
    checkIn: string;
    checkOut: string;
  };
  offerId?: {
    _id: string;
    title: string;
  };
}

export interface Offer {
  _id: string;
  title: string;
  description: string;
  pointsRequired: number;
  discountPercentage?: number;
  discountAmount?: number;
  type: 'discount' | 'free_service' | 'upgrade' | 'bonus_points';
  category: 'room' | 'dining' | 'spa' | 'transport' | 'general';
  minTier: string;
}

class LoyaltyService {
  async getDashboard(): Promise<LoyaltyDashboard> {
    const response = await api.get('/loyalty/dashboard');
    return response.data.data;
  }

  async getOffers(): Promise<Offer[]> {
    const response = await api.get('/loyalty/offers');
    return response.data.data;
  }

  async redeemPoints(offerId: string): Promise<{ message: string; remainingPoints: number; newTier: string }> {
    const response = await api.post('/loyalty/redeem', { offerId });
    return response.data.data;
  }

  async getHistory(page = 1, limit = 20): Promise<{
    transactions: LoyaltyTransaction[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    };
  }> {
    const response = await api.get(`/loyalty/history?page=${page}&limit=${limit}`);
    return response.data.data;
  }
}

export const loyaltyService = new LoyaltyService();
```

#### Step 6: Create Loyalty Dashboard Component (Day 3 - Task 1.9)

Create `frontend/src/pages/guest/LoyaltyDashboard.tsx`:
```typescript
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Star, 
  Gift, 
  TrendingUp, 
  Clock, 
  Award,
  ChevronRight,
  Zap
} from 'lucide-react';
import { loyaltyService, LoyaltyDashboard as LoyaltyDashboardType } from '../../services/loyaltyService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'platinum': return 'from-purple-500 to-purple-700';
    case 'gold': return 'from-yellow-500 to-yellow-700';
    case 'silver': return 'from-gray-400 to-gray-600';
    default: return 'from-amber-600 to-amber-800';
  }
};

const getTierIcon = (tier: string) => {
  switch (tier) {
    case 'platinum': return <Star className="h-6 w-6" />;
    case 'gold': return <Award className="h-6 w-6" />;
    case 'silver': return <TrendingUp className="h-6 w-6" />;
    default: return <Zap className="h-6 w-6" />;
  }
};

export default function LoyaltyDashboard() {
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['loyalty-dashboard'],
    queryFn: loyaltyService.getDashboard
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load loyalty dashboard</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Loyalty Dashboard
        </h1>
        <p className="text-gray-600">
          Earn points with every stay and unlock exclusive rewards
        </p>
      </div>

      {/* Points and Tier Overview */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Points Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Your Points</h3>
            <div className="text-2xl font-bold text-blue-600">
              {dashboard.user.points.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(100, (dashboard.user.points / 10000) * 100)}%` 
              }}
            />
          </div>
          {dashboard.user.nextTier && (
            <p className="text-sm text-gray-600">
              {dashboard.user.pointsToNextTier} points to {dashboard.user.nextTier} tier
            </p>
          )}
        </Card>

        {/* Tier Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Current Tier</h3>
            <div className={`p-2 rounded-full bg-gradient-to-r ${getTierColor(dashboard.user.tier)}`}>
              {getTierIcon(dashboard.user.tier)}
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 capitalize mb-2">
            {dashboard.user.tier}
          </div>
          <p className="text-sm text-gray-600">
            {getTierBenefits(dashboard.user.tier)}
          </p>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <Button variant="secondary" size="sm">
            View All
          </Button>
        </div>
        <div className="space-y-4">
          {dashboard.recentTransactions.map((transaction) => (
            <div key={transaction._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  transaction.points > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {transaction.points > 0 ? <TrendingUp className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{transaction.description}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className={`font-semibold ${
                transaction.points > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.points > 0 ? '+' : ''}{transaction.points} pts
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Available Offers */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Available Offers</h3>
          <Button variant="secondary" size="sm">
            View All Offers
          </Button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboard.availableOffers.slice(0, 6).map((offer) => (
            <div key={offer._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-600 capitalize">{offer.category}</span>
                <span className="text-sm text-gray-500">{offer.pointsRequired} pts</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{offer.title}</h4>
              <p className="text-sm text-gray-600 mb-3">{offer.description}</p>
              <Button size="sm" className="w-full">
                Redeem
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function getTierBenefits(tier: string): string {
  switch (tier) {
    case 'platinum': return 'Exclusive benefits, priority support, room upgrades';
    case 'gold': return 'Free breakfast, late checkout, welcome gifts';
    case 'silver': return 'Room preferences, faster check-in';
    default: return 'Basic loyalty benefits';
  }
}
```

#### Step 7: Register Routes in Server (Day 2 - Task 1.7)

Add to `backend/src/server.js`:
```javascript
// Add this import at the top
import loyaltyRoutes from './routes/loyalty.js';

// Add this route registration with other routes
app.use('/api/loyalty', loyaltyRoutes);
```

#### Step 8: Update Navigation (Day 4 - Task 1.12)

Add to `frontend/src/layouts/GuestLayout.tsx`:
```typescript
// Add this to the navigation items
{
  name: 'Loyalty',
  href: '/guest/loyalty',
  icon: Star,
  current: pathname === '/guest/loyalty'
}
```

Add to `frontend/src/App.tsx`:
```typescript
// Add this route
{
  path: '/guest/loyalty',
  element: <LoyaltyDashboard />
}
```

## 🎯 NEXT STEPS AFTER PHASE 1

1. **Test Phase 1 thoroughly** - Ensure loyalty system works end-to-end
2. **Move to Phase 2** - Hotel Services implementation
3. **Follow the detailed tracker** - Use `IMPLEMENTATION_TRACKER.md` for step-by-step guidance
4. **Update progress** - Mark completed tasks in the tracker

## 📞 SUPPORT

- **Technical Issues**: Check existing code patterns in similar files
- **Design Questions**: Follow existing UI patterns in `GuestDashboard.tsx`
- **API Issues**: Reference `bookingService.ts` for API patterns
- **Database Issues**: Check existing models like `User.js` and `Booking.js`

## 🚨 IMPORTANT NOTES

- **Preserve existing code** - Don't delete or modify existing functionality
- **Follow patterns** - Use existing authentication, error handling, and UI patterns
- **Test incrementally** - Test each component as you build it
- **Document changes** - Update this guide as you implement features
