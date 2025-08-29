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
    totalAmount: number;
  };
  offerId?: {
    _id: string;
    title: string;
    category: string;
  };
  hotelId?: {
    _id: string;
    name: string;
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
  isActive: boolean;
  validFrom: string;
  validUntil?: string;
  maxRedemptions?: number;
  currentRedemptions: number;
  imageUrl?: string;
  terms?: string;
  hotelId?: {
    _id: string;
    name: string;
  };
}

export interface LoyaltyPoints {
  totalPoints: number;
  activePoints: number;
  tier: string;
  nextTier: string | null;
  pointsToNextTier: number;
}

export interface TransactionHistory {
  transactions: LoyaltyTransaction[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface RedemptionResult {
  message: string;
  transaction: LoyaltyTransaction;
  remainingPoints: number;
  newTier: string;
}

export interface OfferDetails {
  offer: Offer;
  canRedeem: boolean;
  userPoints: number;
  userTier: string;
}

class LoyaltyService {
  /**
   * Get user's loyalty dashboard
   */
  async getDashboard(): Promise<LoyaltyDashboard> {
    const response = await api.get('/loyalty/dashboard');
    return response.data.data;
  }

  /**
   * Get available loyalty offers
   */
  async getOffers(category?: string): Promise<Offer[]> {
    const params = category ? { category } : {};
    const response = await api.get('/loyalty/offers', { params });
    return response.data.data;
  }

  /**
   * Get specific offer details
   */
  async getOfferDetails(offerId: string): Promise<OfferDetails> {
    const response = await api.get(`/loyalty/offers/${offerId}`);
    return response.data.data;
  }

  /**
   * Redeem points for an offer
   */
  async redeemPoints(offerId: string): Promise<RedemptionResult> {
    const response = await api.post('/loyalty/redeem', { offerId });
    return response.data.data;
  }

  /**
   * Get transaction history
   */
  async getHistory(page = 1, limit = 20, type?: string): Promise<TransactionHistory> {
    const params: any = { page, limit };
    if (type) params.type = type;
    
    const response = await api.get('/loyalty/history', { params });
    return response.data.data;
  }

  /**
   * Get user's current points and tier
   */
  async getPoints(): Promise<LoyaltyPoints> {
    const response = await api.get('/loyalty/points');
    return response.data.data;
  }

  /**
   * Get offers by category
   */
  async getOffersByCategory(category: string): Promise<Offer[]> {
    return this.getOffers(category);
  }

  /**
   * Check if user can redeem an offer
   */
  async canRedeemOffer(offerId: string): Promise<boolean> {
    try {
      const details = await this.getOfferDetails(offerId);
      return details.canRedeem;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get tier benefits description
   */
  getTierBenefits(tier: string): string {
    switch (tier) {
      case 'platinum':
        return 'Exclusive benefits, priority support, room upgrades, late checkout, welcome gifts';
      case 'gold':
        return 'Free breakfast, late checkout, welcome gifts, room preferences';
      case 'silver':
        return 'Room preferences, faster check-in, priority booking';
      default:
        return 'Basic loyalty benefits, points earning';
    }
  }

  /**
   * Get tier color for UI
   */
  getTierColor(tier: string): string {
    switch (tier) {
      case 'platinum':
        return 'from-purple-500 to-purple-700';
      case 'gold':
        return 'from-yellow-500 to-yellow-700';
      case 'silver':
        return 'from-gray-400 to-gray-600';
      default:
        return 'from-amber-600 to-amber-800';
    }
  }

  /**
   * Get tier icon name
   */
  getTierIcon(tier: string): string {
    switch (tier) {
      case 'platinum':
        return 'Star';
      case 'gold':
        return 'Award';
      case 'silver':
        return 'TrendingUp';
      default:
        return 'Zap';
    }
  }

  /**
   * Format points with proper formatting
   */
  formatPoints(points: number): string {
    return points.toLocaleString();
  }

  /**
   * Get transaction type display info
   */
  getTransactionTypeInfo(type: string): {
    label: string;
    color: string;
    icon: string;
  } {
    switch (type) {
      case 'earned':
        return {
          label: 'Earned',
          color: 'text-green-600 bg-green-100',
          icon: 'TrendingUp'
        };
      case 'redeemed':
        return {
          label: 'Redeemed',
          color: 'text-red-600 bg-red-100',
          icon: 'Gift'
        };
      case 'bonus':
        return {
          label: 'Bonus',
          color: 'text-blue-600 bg-blue-100',
          icon: 'Star'
        };
      case 'expired':
        return {
          label: 'Expired',
          color: 'text-gray-600 bg-gray-100',
          icon: 'Clock'
        };
      default:
        return {
          label: 'Transaction',
          color: 'text-gray-600 bg-gray-100',
          icon: 'Circle'
        };
    }
  }

  /**
   * Get offer type display info
   */
  getOfferTypeInfo(type: string): {
    label: string;
    color: string;
    icon: string;
  } {
    switch (type) {
      case 'discount':
        return {
          label: 'Discount',
          color: 'text-green-600 bg-green-100',
          icon: 'Percent'
        };
      case 'free_service':
        return {
          label: 'Free Service',
          color: 'text-blue-600 bg-blue-100',
          icon: 'Gift'
        };
      case 'upgrade':
        return {
          label: 'Upgrade',
          color: 'text-purple-600 bg-purple-100',
          icon: 'ArrowUp'
        };
      case 'bonus_points':
        return {
          label: 'Bonus Points',
          color: 'text-yellow-600 bg-yellow-100',
          icon: 'Star'
        };
      default:
        return {
          label: 'Offer',
          color: 'text-gray-600 bg-gray-100',
          icon: 'Circle'
        };
    }
  }
}

export const loyaltyService = new LoyaltyService();
