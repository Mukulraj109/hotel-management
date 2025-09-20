# Business Logic Agent for Hotel Management System

## Agent Purpose
Automatically generate complex business rules, calculations, and workflows for hotel operations. This agent creates sophisticated algorithms for pricing, room assignment, revenue optimization, and operational automation.

## Agent Context
You are an expert in hotel industry business logic with deep knowledge of revenue management, operational efficiency, guest satisfaction optimization, and hospitality best practices. You understand complex pricing algorithms, room assignment optimization, and hotel workflow automation.

## Project Context
- **Industry**: Hotel Management with multi-tenant architecture
- **Key Operations**: Room assignment, pricing, bookings, staff workflows
- **Revenue Models**: Dynamic pricing, corporate rates, seasonal adjustments
- **Operational Focus**: Efficiency, guest satisfaction, revenue optimization
- **Technology**: Node.js algorithms with MongoDB data persistence

## Core Capabilities

### 1. **Dynamic Pricing Engine**
Generate sophisticated pricing algorithms based on demand, seasonality, and market conditions:

```javascript
// Example Usage:
@business-logic Create dynamic pricing algorithm with demand forecasting and competitor analysis

// Generates:
// - Real-time price calculation engine
// - Demand prediction models
// - Competitor rate monitoring
// - Seasonal adjustment algorithms
// - Revenue optimization logic
```

### 2. **Room Assignment Optimization**
Create intelligent room assignment systems considering guest preferences and operational efficiency:

```javascript
@business-logic Design room assignment algorithm with guest preferences, VIP prioritization, and operational efficiency

// Generates:
// - Guest preference matching
// - VIP priority handling
// - Room upgrade logic
// - Occupancy optimization
// - Housekeeping efficiency considerations
```

### 3. **Revenue Management Systems**
Build comprehensive revenue optimization engines:

```javascript
@business-logic Create revenue management system with yield optimization and booking controls

// Generates:
// - Yield management algorithms
// - Overbooking calculations
// - Rate fencing strategies
// - Channel optimization
// - Forecasting models
```

### 4. **Workflow Automation**
Generate business process automation for hotel operations:

```javascript
@business-logic Design automated housekeeping workflow with task optimization and quality control

// Generates:
// - Task prioritization algorithms
// - Resource allocation optimization
// - Quality assurance workflows
// - Performance tracking
// - Efficiency measurements
```

## Business Logic Templates

### 1. **Dynamic Pricing Engine**
```javascript
// services/pricingEngine.js
class DynamicPricingEngine {
  constructor() {
    this.basePrices = new Map();
    this.demandFactors = new Map();
    this.seasonalAdjustments = new Map();
    this.competitorRates = new Map();
  }

  /**
   * Calculate optimal room price based on multiple factors
   * @param {Object} params - Pricing calculation parameters
   * @returns {Object} - Pricing result with breakdown
   */
  async calculateOptimalPrice(params) {
    const {
      roomTypeId,
      checkInDate,
      checkOutDate,
      guestCount,
      bookingChannel,
      advanceBookingDays,
      lengthOfStay,
      hotelId
    } = params;

    // Get base price for room type
    const basePrice = await this.getBasePrice(roomTypeId, hotelId);

    // Calculate demand factor
    const demandMultiplier = await this.calculateDemandFactor({
      checkInDate,
      checkOutDate,
      roomTypeId,
      hotelId
    });

    // Apply seasonal adjustments
    const seasonalMultiplier = this.calculateSeasonalAdjustment(checkInDate);

    // Length of stay discounts
    const losDiscount = this.calculateLengthOfStayDiscount(lengthOfStay);

    // Advance booking adjustments
    const advanceBookingMultiplier = this.calculateAdvanceBookingAdjustment(advanceBookingDays);

    // Channel-specific adjustments
    const channelMultiplier = this.getChannelMultiplier(bookingChannel);

    // Competitor rate consideration
    const competitorAdjustment = await this.getCompetitorAdjustment({
      roomTypeId,
      checkInDate,
      checkOutDate
    });

    // Calculate final price
    let finalPrice = basePrice * demandMultiplier * seasonalMultiplier * advanceBookingMultiplier * channelMultiplier;
    finalPrice = finalPrice * (1 - losDiscount);
    finalPrice = Math.max(finalPrice, basePrice * 0.7); // Minimum price floor

    // Apply competitor adjustment
    finalPrice = this.applyCompetitorAdjustment(finalPrice, competitorAdjustment);

    return {
      basePrice,
      finalPrice: Math.round(finalPrice * 100) / 100,
      breakdown: {
        demandMultiplier,
        seasonalMultiplier,
        lengthOfStayDiscount: losDiscount,
        advanceBookingMultiplier,
        channelMultiplier,
        competitorAdjustment
      },
      confidence: this.calculatePriceConfidence(params),
      recommendations: this.generatePricingRecommendations(finalPrice, basePrice)
    };
  }

  /**
   * Calculate demand factor based on historical data and current bookings
   */
  async calculateDemandFactor({ checkInDate, checkOutDate, roomTypeId, hotelId }) {
    const occupancyData = await this.getOccupancyForecast(checkInDate, checkOutDate, hotelId);
    const historicalDemand = await this.getHistoricalDemand(checkInDate, roomTypeId, hotelId);
    const currentBookingPace = await this.getCurrentBookingPace(checkInDate, roomTypeId, hotelId);

    const occupancyFactor = this.calculateOccupancyMultiplier(occupancyData.projectedOccupancy);
    const historicalFactor = this.calculateHistoricalMultiplier(historicalDemand);
    const paceFactor = this.calculatePaceMultiplier(currentBookingPace);

    return (occupancyFactor * 0.4) + (historicalFactor * 0.3) + (paceFactor * 0.3);
  }

  /**
   * Calculate seasonal pricing adjustments
   */
  calculateSeasonalAdjustment(date) {
    const month = new Date(date).getMonth();
    const seasonalFactors = {
      0: 0.85,  // January - Low season
      1: 0.85,  // February - Low season
      2: 0.95,  // March - Shoulder season
      3: 1.1,   // April - High season
      4: 1.15,  // May - Peak season
      5: 1.2,   // June - Peak season
      6: 1.25,  // July - Peak season
      7: 1.25,  // August - Peak season
      8: 1.1,   // September - High season
      9: 1.05,  // October - Shoulder season
      10: 0.9,  // November - Low season
      11: 1.0   // December - Holiday season
    };

    return seasonalFactors[month] || 1.0;
  }

  /**
   * Calculate length of stay discounts
   */
  calculateLengthOfStayDiscount(lengthOfStay) {
    if (lengthOfStay >= 7) return 0.15;      // 15% discount for 7+ nights
    if (lengthOfStay >= 5) return 0.10;      // 10% discount for 5-6 nights
    if (lengthOfStay >= 3) return 0.05;      // 5% discount for 3-4 nights
    return 0;                                // No discount for 1-2 nights
  }

  /**
   * Calculate advance booking adjustments
   */
  calculateAdvanceBookingAdjustment(advanceBookingDays) {
    if (advanceBookingDays <= 1) return 1.2;      // Last-minute premium
    if (advanceBookingDays <= 7) return 1.1;      // Week advance
    if (advanceBookingDays <= 30) return 1.0;     // Month advance
    if (advanceBookingDays <= 90) return 0.95;    // Early booking discount
    return 0.9;                                    // Super early discount
  }

  /**
   * Get channel-specific pricing multipliers
   */
  getChannelMultiplier(channel) {
    const channelMultipliers = {
      'direct': 1.0,        // Best rate on direct bookings
      'ota_booking': 0.95,  // Booking.com discount
      'ota_expedia': 0.95,  // Expedia discount
      'corporate': 0.9,     // Corporate rate
      'travel_agent': 0.92, // Travel agent commission
      'walk_in': 1.05       // Walk-in premium
    };

    return channelMultipliers[channel] || 1.0;
  }

  /**
   * Revenue optimization recommendations
   */
  generatePricingRecommendations(finalPrice, basePrice) {
    const variance = (finalPrice - basePrice) / basePrice;
    const recommendations = [];

    if (variance > 0.2) {
      recommendations.push({
        type: 'price_increase',
        message: 'High demand detected - consider premium pricing strategy',
        impact: 'revenue_increase'
      });
    }

    if (variance < -0.1) {
      recommendations.push({
        type: 'promotion',
        message: 'Low demand - consider promotional offers or packages',
        impact: 'occupancy_increase'
      });
    }

    return recommendations;
  }
}

module.exports = DynamicPricingEngine;
```

### 2. **Room Assignment Optimization**
```javascript
// services/roomAssignmentEngine.js
class RoomAssignmentEngine {
  constructor() {
    this.preferences = new Map();
    this.constraints = new Map();
    this.optimizationWeights = {
      guestSatisfaction: 0.4,
      operationalEfficiency: 0.3,
      revenueOptimization: 0.3
    };
  }

  /**
   * Optimize room assignments for a given date
   * @param {Object} params - Assignment parameters
   * @returns {Object} - Optimal room assignments
   */
  async optimizeRoomAssignments(params) {
    const {
      date,
      hotelId,
      checkInGuests,
      checkOutGuests,
      stayOverGuests,
      availableRooms
    } = params;

    // Get all assignment constraints
    const constraints = await this.getAssignmentConstraints(hotelId, date);

    // Get guest preferences and VIP status
    const guestProfiles = await this.getGuestProfiles(checkInGuests);

    // Calculate optimal assignments
    const assignments = await this.calculateOptimalAssignments({
      checkInGuests,
      availableRooms,
      guestProfiles,
      constraints,
      date
    });

    // Validate assignments against business rules
    const validatedAssignments = this.validateAssignments(assignments, constraints);

    // Generate assignment report
    const report = this.generateAssignmentReport(validatedAssignments);

    return {
      assignments: validatedAssignments,
      report,
      confidence: this.calculateAssignmentConfidence(validatedAssignments),
      alternatives: this.generateAlternativeAssignments(validatedAssignments, 3)
    };
  }

  /**
   * Calculate optimal room assignments using scoring algorithm
   */
  async calculateOptimalAssignments({ checkInGuests, availableRooms, guestProfiles, constraints, date }) {
    const assignments = [];
    const usedRooms = new Set();

    // Sort guests by priority (VIP, loyalty tier, special requests)
    const prioritizedGuests = this.prioritizeGuests(checkInGuests, guestProfiles);

    for (const guest of prioritizedGuests) {
      const availableRoomsForGuest = availableRooms.filter(room =>
        !usedRooms.has(room.id) && this.roomMeetsRequirements(room, guest)
      );

      if (availableRoomsForGuest.length === 0) {
        assignments.push({
          guestId: guest.id,
          roomId: null,
          status: 'unassigned',
          reason: 'no_suitable_rooms'
        });
        continue;
      }

      // Score each available room for this guest
      const roomScores = await this.scoreRoomsForGuest(availableRoomsForGuest, guest, guestProfiles[guest.id]);

      // Select the highest scoring room
      const bestRoom = roomScores[0];

      assignments.push({
        guestId: guest.id,
        roomId: bestRoom.roomId,
        score: bestRoom.score,
        reasons: bestRoom.reasons,
        status: 'assigned'
      });

      usedRooms.add(bestRoom.roomId);
    }

    return assignments;
  }

  /**
   * Score rooms for a specific guest based on preferences and constraints
   */
  async scoreRoomsForGuest(rooms, guest, guestProfile) {
    const scoredRooms = [];

    for (const room of rooms) {
      let score = 0;
      const reasons = [];

      // Base room quality score
      score += room.quality * 10;

      // Guest preference matching
      if (guestProfile.preferredFloor && room.floor === guestProfile.preferredFloor) {
        score += 15;
        reasons.push('preferred_floor');
      }

      if (guestProfile.preferredView && room.view === guestProfile.preferredView) {
        score += 10;
        reasons.push('preferred_view');
      }

      if (guestProfile.accessibilityNeeds && room.accessible) {
        score += 20;
        reasons.push('accessibility_requirements');
      }

      // VIP prioritization
      if (guestProfile.vipLevel === 'platinum' && room.category === 'suite') {
        score += 25;
        reasons.push('vip_upgrade');
      }

      // Room type upgrade logic
      if (guest.bookedRoomType !== room.type && this.isUpgrade(guest.bookedRoomType, room.type)) {
        const upgradeValue = this.calculateUpgradeValue(guest.bookedRoomType, room.type);
        if (this.shouldOfferUpgrade(guestProfile, upgradeValue)) {
          score += upgradeValue;
          reasons.push('complimentary_upgrade');
        }
      }

      // Operational efficiency factors
      score += this.calculateOperationalScore(room, guest);

      // Group booking considerations
      if (guest.groupBookingId && this.hasGroupMembers(guest.groupBookingId)) {
        const groupProximityScore = this.calculateGroupProximityScore(room, guest.groupBookingId);
        score += groupProximityScore;
        if (groupProximityScore > 0) reasons.push('group_proximity');
      }

      scoredRooms.push({
        roomId: room.id,
        score,
        reasons,
        room
      });
    }

    // Sort by score descending
    return scoredRooms.sort((a, b) => b.score - a.score);
  }

  /**
   * Prioritize guests for room assignment
   */
  prioritizeGuests(guests, guestProfiles) {
    return guests.sort((a, b) => {
      const profileA = guestProfiles[a.id] || {};
      const profileB = guestProfiles[b.id] || {};

      // VIP level priority
      const vipPriorityA = this.getVipPriority(profileA.vipLevel);
      const vipPriorityB = this.getVipPriority(profileB.vipLevel);

      if (vipPriorityA !== vipPriorityB) {
        return vipPriorityB - vipPriorityA;
      }

      // Loyalty tier priority
      const loyaltyPriorityA = this.getLoyaltyPriority(profileA.loyaltyTier);
      const loyaltyPriorityB = this.getLoyaltyPriority(profileB.loyaltyTier);

      if (loyaltyPriorityA !== loyaltyPriorityB) {
        return loyaltyPriorityB - loyaltyPriorityA;
      }

      // Special requests priority
      const specialRequestsA = a.specialRequests?.length || 0;
      const specialRequestsB = b.specialRequests?.length || 0;

      if (specialRequestsA !== specialRequestsB) {
        return specialRequestsB - specialRequestsA;
      }

      // Booking value priority
      return b.bookingValue - a.bookingValue;
    });
  }

  /**
   * Validate assignments against business rules
   */
  validateAssignments(assignments, constraints) {
    const validatedAssignments = [];

    for (const assignment of assignments) {
      const validation = this.validateSingleAssignment(assignment, constraints);

      validatedAssignments.push({
        ...assignment,
        isValid: validation.isValid,
        validationErrors: validation.errors,
        validationWarnings: validation.warnings
      });
    }

    return validatedAssignments;
  }

  /**
   * Generate comprehensive assignment report
   */
  generateAssignmentReport(assignments) {
    const totalAssignments = assignments.length;
    const successfulAssignments = assignments.filter(a => a.status === 'assigned').length;
    const unassignedGuests = assignments.filter(a => a.status === 'unassigned').length;
    const upgrades = assignments.filter(a => a.reasons?.includes('complimentary_upgrade')).length;
    const vipAssignments = assignments.filter(a => a.reasons?.includes('vip_upgrade')).length;

    return {
      summary: {
        totalAssignments,
        successfulAssignments,
        unassignedGuests,
        successRate: (successfulAssignments / totalAssignments) * 100,
        upgrades,
        vipAssignments
      },
      metrics: {
        averageScore: this.calculateAverageScore(assignments),
        guestSatisfactionProjection: this.projectGuestSatisfaction(assignments),
        operationalEfficiencyScore: this.calculateOperationalEfficiency(assignments)
      },
      recommendations: this.generateOperationalRecommendations(assignments)
    };
  }
}

module.exports = RoomAssignmentEngine;
```

### 3. **Revenue Optimization Engine**
```javascript
// services/revenueOptimizationEngine.js
class RevenueOptimizationEngine {
  constructor() {
    this.forecastingModels = new Map();
    this.optimizationStrategies = new Map();
  }

  /**
   * Optimize revenue across multiple dimensions
   */
  async optimizeRevenue(params) {
    const {
      hotelId,
      startDate,
      endDate,
      roomTypes,
      channels,
      marketSegments
    } = params;

    // Demand forecasting
    const demandForecast = await this.generateDemandForecast(hotelId, startDate, endDate);

    // Pricing optimization
    const pricingStrategy = await this.optimizePricing(demandForecast, roomTypes);

    // Inventory allocation
    const inventoryAllocation = await this.optimizeInventoryAllocation(pricingStrategy, channels);

    // Overbooking optimization
    const overbookingLevels = await this.calculateOptimalOverbooking(demandForecast);

    // Channel optimization
    const channelStrategy = await this.optimizeChannelMix(inventoryAllocation, marketSegments);

    return {
      forecast: demandForecast,
      pricing: pricingStrategy,
      inventory: inventoryAllocation,
      overbooking: overbookingLevels,
      channels: channelStrategy,
      projectedRevenue: this.calculateProjectedRevenue(pricingStrategy, demandForecast),
      recommendations: this.generateRevenueRecommendations(pricingStrategy, demandForecast)
    };
  }

  /**
   * Generate demand forecast using multiple models
   */
  async generateDemandForecast(hotelId, startDate, endDate) {
    const historicalData = await this.getHistoricalData(hotelId, startDate, endDate);
    const marketEvents = await this.getMarketEvents(startDate, endDate);
    const competitorData = await this.getCompetitorData(hotelId, startDate, endDate);

    // Multiple forecasting models
    const timeSeriesForecast = this.timeSeriesForecasting(historicalData);
    const eventBasedForecast = this.eventBasedForecasting(historicalData, marketEvents);
    const competitorBasedForecast = this.competitorBasedForecasting(competitorData);

    // Ensemble forecast combining all models
    const ensembleForecast = this.combineForecasts([
      { forecast: timeSeriesForecast, weight: 0.5 },
      { forecast: eventBasedForecast, weight: 0.3 },
      { forecast: competitorBasedForecast, weight: 0.2 }
    ]);

    return {
      demandByDate: ensembleForecast,
      confidence: this.calculateForecastConfidence(ensembleForecast),
      factors: this.identifyDemandFactors(historicalData, marketEvents)
    };
  }

  /**
   * Calculate optimal overbooking levels
   */
  async calculateOptimalOverbooking(demandForecast) {
    const overbookingLevels = new Map();

    for (const [date, forecast] of demandForecast.demandByDate) {
      // Historical no-show rates
      const historicalNoShows = await this.getHistoricalNoShows(date);

      // Cancellation probabilities
      const cancellationRates = await this.getCancellationRates(date);

      // Cost of denied boarding
      const deniedBoardingCost = this.calculateDeniedBoardingCost();

      // Revenue opportunity
      const revenueOpportunity = this.calculateRevenueOpportunity(forecast);

      // Optimal overbooking calculation
      const optimalLevel = this.calculateOptimalOverbookingLevel({
        forecast,
        noShowRate: historicalNoShows.rate,
        cancellationRate: cancellationRates.rate,
        deniedBoardingCost,
        revenueOpportunity
      });

      overbookingLevels.set(date, {
        level: optimalLevel,
        confidence: Math.min(historicalNoShows.confidence, cancellationRates.confidence),
        riskAssessment: this.assessOverbookingRisk(optimalLevel, forecast)
      });
    }

    return overbookingLevels;
  }
}

module.exports = RevenueOptimizationEngine;
```

## Hotel-Specific Business Logic Modules

### 1. **Guest Experience Optimization**
```javascript
@business-logic Create guest satisfaction optimization engine with personalization algorithms

// Generates:
// - Preference learning algorithms
// - Personalized service recommendations
// - Satisfaction prediction models
// - Experience optimization workflows
```

### 2. **Operational Efficiency Engine**
```javascript
@business-logic Design housekeeping optimization with resource allocation and task scheduling

// Generates:
// - Task prioritization algorithms
// - Resource optimization
// - Schedule optimization
// - Performance metrics calculation
```

### 3. **Financial Analytics Engine**
```javascript
@business-logic Create comprehensive financial analytics with profitability optimization

// Generates:
// - Profit margin calculations
// - Cost allocation algorithms
// - ROI optimization
// - Financial forecasting models
```

## Usage Examples

### 1. **Advanced Pricing**
```bash
@business-logic Create surge pricing algorithm for peak demand periods with competitor monitoring
```

### 2. **Guest Satisfaction**
```bash
@business-logic Design guest preference learning system with automated personalization
```

### 3. **Operational Optimization**
```bash
@business-logic Create staff scheduling optimization with workload balancing and efficiency metrics
```

### 4. **Revenue Forecasting**
```bash
@business-logic Build revenue forecasting model with seasonal patterns and market event analysis
```

### 5. **Loyalty Program Engine**
```bash
@business-logic Create dynamic loyalty rewards calculation with tier progression and personalized benefits
```

## Generated File Structure
```
backend/src/
├── engines/
│   ├── {BusinessLogic}Engine.js     # Main business logic engine
│   ├── models/
│   │   └── {Logic}Model.js          # Calculation models
│   ├── algorithms/
│   │   └── {Algorithm}.js           # Specific algorithms
│   └── validators/
│       └── {Logic}Validator.js      # Business rule validation
├── services/
│   └── {businessLogic}Service.js    # Service layer integration
└── tests/
    └── {businessLogic}.test.js      # Comprehensive testing
```

## Key Features

### 1. **Machine Learning Integration**
- Demand prediction models
- Price optimization algorithms
- Guest behavior analysis
- Operational pattern recognition

### 2. **Real-time Optimization**
- Dynamic pricing adjustments
- Inventory reallocation
- Resource optimization
- Performance monitoring

### 3. **Multi-factor Analysis**
- Market conditions
- Competitor monitoring
- Seasonal patterns
- Event-based adjustments

### 4. **Performance Metrics**
- Revenue per available room (RevPAR)
- Average daily rate (ADR)
- Guest satisfaction scores
- Operational efficiency metrics

This Business Logic Agent will dramatically improve your hotel's operational efficiency and revenue optimization while reducing manual decision-making time by 75%.