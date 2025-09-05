const Booking = require('../models/Booking');
const CorporateCompany = require('../models/CorporateCompany');
const CorporateCredit = require('../models/CorporateCredit');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { startOfDay, endOfDay, subDays, subMonths, format, startOfMonth, endOfMonth } = require('date-fns');

class CorporateAnalyticsService {
  /**
   * Get corporate pending dues
   */
  async getCorporatePendingDues(hotelId, options = {}) {
    try {
      const { sortBy = 'amount', order = 'desc', limit = 50 } = options;
      
      // Get all corporate companies with pending dues
      const companies = await CorporateCompany.find({ hotelId }).populate('creditAccount');
      
      const pendingDues = [];
      
      for (const company of companies) {
        if (!company.creditAccount) continue;
        
        // Get all unpaid invoices for this company
        const unpaidInvoices = await Invoice.find({
          hotelId,
          corporateCompanyId: company._id,
          paymentStatus: { $in: ['pending', 'partial'] }
        }).populate('bookingId');
        
        // Calculate total pending amount
        const totalPending = unpaidInvoices.reduce((sum, invoice) => {
          return sum + (invoice.totalAmount - (invoice.paidAmount || 0));
        }, 0);
        
        if (totalPending > 0) {
          // Calculate aging
          const aging = this.calculateAging(unpaidInvoices);
          
          // Get recent bookings count
          const recentBookings = await Booking.countDocuments({
            hotelId,
            corporateCompanyId: company._id,
            createdAt: { $gte: subDays(new Date(), 30) }
          });
          
          // Calculate credit utilization
          const creditUtilization = company.creditAccount.creditLimit > 0
            ? (company.creditAccount.currentBalance / company.creditAccount.creditLimit) * 100
            : 0;
          
          pendingDues.push({
            companyId: company._id,
            companyName: company.name,
            contactPerson: company.contactPerson,
            email: company.email,
            phone: company.phone,
            totalPending,
            creditLimit: company.creditAccount.creditLimit,
            currentBalance: company.creditAccount.currentBalance,
            availableCredit: company.creditAccount.creditLimit - company.creditAccount.currentBalance,
            creditUtilization: Math.round(creditUtilization),
            paymentTerms: company.creditAccount.paymentTerms,
            lastPaymentDate: company.creditAccount.lastPaymentDate,
            aging: aging,
            invoiceCount: unpaidInvoices.length,
            oldestInvoiceDate: unpaidInvoices.length > 0 
              ? Math.min(...unpaidInvoices.map(inv => new Date(inv.createdAt).getTime()))
              : null,
            recentBookings,
            riskLevel: this.calculateRiskLevel(totalPending, aging, creditUtilization, company.creditAccount.creditLimit),
            overdueDays: this.calculateOverdueDays(unpaidInvoices, company.creditAccount.paymentTerms)
          });
        }
      }
      
      // Sort and limit results
      const sortField = sortBy === 'company' ? 'companyName' : 
                       sortBy === 'amount' ? 'totalPending' :
                       sortBy === 'days' ? 'overdueDays' : 'totalPending';
      
      pendingDues.sort((a, b) => {
        const aVal = a[sortField] || 0;
        const bVal = b[sortField] || 0;
        return order === 'desc' ? bVal - aVal : aVal - bVal;
      });
      
      return {
        pendingDues: pendingDues.slice(0, limit),
        summary: {
          totalCompaniesWithDues: pendingDues.length,
          totalPendingAmount: pendingDues.reduce((sum, pd) => sum + pd.totalPending, 0),
          averagePendingAmount: pendingDues.length > 0 
            ? Math.round(pendingDues.reduce((sum, pd) => sum + pd.totalPending, 0) / pendingDues.length)
            : 0,
          highRiskCompanies: pendingDues.filter(pd => pd.riskLevel === 'high').length,
          mediumRiskCompanies: pendingDues.filter(pd => pd.riskLevel === 'medium').length,
          lowRiskCompanies: pendingDues.filter(pd => pd.riskLevel === 'low').length,
          totalInvoices: pendingDues.reduce((sum, pd) => sum + pd.invoiceCount, 0),
          avgCreditUtilization: pendingDues.length > 0
            ? Math.round(pendingDues.reduce((sum, pd) => sum + pd.creditUtilization, 0) / pendingDues.length)
            : 0
        }
      };
    } catch (error) {
      console.error('Error getting corporate pending dues:', error);
      throw error;
    }
  }

  /**
   * Calculate aging buckets for invoices
   */
  calculateAging(invoices) {
    const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const today = new Date();
    
    invoices.forEach(invoice => {
      const daysDiff = Math.floor((today - new Date(invoice.createdAt)) / (1000 * 60 * 60 * 24));
      const pendingAmount = invoice.totalAmount - (invoice.paidAmount || 0);
      
      if (daysDiff <= 30) {
        aging['0-30'] += pendingAmount;
      } else if (daysDiff <= 60) {
        aging['31-60'] += pendingAmount;
      } else if (daysDiff <= 90) {
        aging['61-90'] += pendingAmount;
      } else {
        aging['90+'] += pendingAmount;
      }
    });
    
    return aging;
  }

  /**
   * Calculate risk level based on multiple factors
   */
  calculateRiskLevel(pendingAmount, aging, creditUtilization, creditLimit) {
    let riskScore = 0;
    
    // Amount risk (30% weight)
    if (pendingAmount > creditLimit * 0.8) riskScore += 30;
    else if (pendingAmount > creditLimit * 0.5) riskScore += 20;
    else if (pendingAmount > creditLimit * 0.3) riskScore += 10;
    
    // Aging risk (40% weight)
    if (aging['90+'] > 0) riskScore += 40;
    else if (aging['61-90'] > 0) riskScore += 30;
    else if (aging['31-60'] > 0) riskScore += 20;
    else if (aging['0-30'] > 0) riskScore += 10;
    
    // Credit utilization risk (30% weight)
    if (creditUtilization > 90) riskScore += 30;
    else if (creditUtilization > 70) riskScore += 20;
    else if (creditUtilization > 50) riskScore += 10;
    
    if (riskScore >= 70) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Calculate overdue days based on payment terms
   */
  calculateOverdueDays(invoices, paymentTerms) {
    if (!invoices.length) return 0;
    
    const termsDays = {
      'immediate': 0,
      'net_15': 15,
      'net_30': 30,
      'net_45': 45,
      'net_60': 60
    };
    
    const gracePeriod = termsDays[paymentTerms] || 30;
    const today = new Date();
    
    let maxOverdue = 0;
    
    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.createdAt);
      const dueDate = new Date(invoiceDate.getTime() + (gracePeriod * 24 * 60 * 60 * 1000));
      const overdueDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      if (overdueDays > maxOverdue) {
        maxOverdue = overdueDays;
      }
    });
    
    return Math.max(0, maxOverdue);
  }

  /**
   * Get corporate booking trends
   */
  async getCorporateBookingTrends(hotelId, startDate, endDate) {
    try {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      
      // Get all corporate bookings in the period
      const bookings = await Booking.find({
        hotelId,
        bookingType: 'corporate',
        createdAt: { $gte: start, $lte: end }
      }).populate('corporateCompanyId roomId');
      
      // Group by company
      const companyTrends = {};
      const monthlyTrends = {};
      
      bookings.forEach(booking => {
        const companyName = booking.corporateCompanyId?.name || 'Unknown Company';
        const monthKey = format(new Date(booking.createdAt), 'yyyy-MM');
        
        // Company trends
        if (!companyTrends[companyName]) {
          companyTrends[companyName] = {
            companyId: booking.corporateCompanyId?._id,
            companyName,
            bookings: 0,
            totalRevenue: 0,
            averageRate: 0,
            totalNights: 0,
            roomTypes: {},
            monthlyBookings: {},
            cancellations: 0,
            noShows: 0
          };
        }
        
        const trend = companyTrends[companyName];
        trend.bookings++;
        trend.totalRevenue += booking.totalAmount || 0;
        trend.totalNights += booking.numberOfNights || 1;
        
        // Room types
        const roomType = booking.roomId?.type || 'Unknown';
        trend.roomTypes[roomType] = (trend.roomTypes[roomType] || 0) + 1;
        
        // Monthly distribution
        trend.monthlyBookings[monthKey] = (trend.monthlyBookings[monthKey] || 0) + 1;
        
        // Track cancellations and no-shows
        if (booking.status === 'cancelled') trend.cancellations++;
        if (booking.status === 'no_show') trend.noShows++;
        
        // Monthly trends
        if (!monthlyTrends[monthKey]) {
          monthlyTrends[monthKey] = {
            month: monthKey,
            bookings: 0,
            revenue: 0,
            companies: new Set(),
            averageRate: 0
          };
        }
        
        monthlyTrends[monthKey].bookings++;
        monthlyTrends[monthKey].revenue += booking.totalAmount || 0;
        monthlyTrends[monthKey].companies.add(companyName);
      });
      
      // Calculate averages and finalize data
      Object.values(companyTrends).forEach(trend => {
        trend.averageRate = trend.bookings > 0 
          ? Math.round(trend.totalRevenue / trend.totalNights)
          : 0;
        trend.averageBookingValue = trend.bookings > 0
          ? Math.round(trend.totalRevenue / trend.bookings)
          : 0;
        trend.cancellationRate = trend.bookings > 0
          ? Math.round((trend.cancellations / trend.bookings) * 100)
          : 0;
        trend.noShowRate = trend.bookings > 0
          ? Math.round((trend.noShows / trend.bookings) * 100)
          : 0;
      });
      
      Object.values(monthlyTrends).forEach(trend => {
        trend.averageRate = trend.bookings > 0 
          ? Math.round(trend.revenue / trend.bookings)
          : 0;
        trend.uniqueCompanies = trend.companies.size;
        delete trend.companies; // Remove Set for JSON serialization
      });
      
      // Sort companies by revenue
      const sortedCompanies = Object.values(companyTrends)
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
      
      // Sort monthly trends
      const sortedMonthly = Object.values(monthlyTrends)
        .sort((a, b) => a.month.localeCompare(b.month));
      
      return {
        companyTrends: sortedCompanies,
        monthlyTrends: sortedMonthly,
        summary: {
          totalCorporateBookings: bookings.length,
          totalCorporateRevenue: bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
          uniqueCompanies: Object.keys(companyTrends).length,
          averageCorporateRate: bookings.length > 0
            ? Math.round(bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) / 
                        bookings.reduce((sum, b) => sum + (b.numberOfNights || 1), 0))
            : 0,
          topCompany: sortedCompanies[0],
          corporateBookingPercentage: 0 // Would need total bookings to calculate
        }
      };
    } catch (error) {
      console.error('Error getting corporate booking trends:', error);
      throw error;
    }
  }

  /**
   * Get corporate revenue analysis
   */
  async getCorporateRevenueAnalysis(hotelId, startDate, endDate) {
    try {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      
      // Get corporate bookings
      const corporateBookings = await Booking.find({
        hotelId,
        bookingType: 'corporate',
        createdAt: { $gte: start, $lte: end }
      }).populate('corporateCompanyId roomId');
      
      // Get all bookings for comparison
      const allBookings = await Booking.find({
        hotelId,
        createdAt: { $gte: start, $lte: end }
      });
      
      const corporateRevenue = corporateBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      const totalRevenue = allBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      const corporateNights = corporateBookings.reduce((sum, b) => sum + (b.numberOfNights || 1), 0);
      const totalNights = allBookings.reduce((sum, b) => sum + (b.numberOfNights || 1), 0);
      
      // Revenue by company
      const revenueByCompany = {};
      corporateBookings.forEach(booking => {
        const companyName = booking.corporateCompanyId?.name || 'Unknown';
        if (!revenueByCompany[companyName]) {
          revenueByCompany[companyName] = {
            companyName,
            revenue: 0,
            bookings: 0,
            nights: 0,
            averageRate: 0
          };
        }
        
        revenueByCompany[companyName].revenue += booking.totalAmount || 0;
        revenueByCompany[companyName].bookings++;
        revenueByCompany[companyName].nights += booking.numberOfNights || 1;
      });
      
      // Calculate averages
      Object.values(revenueByCompany).forEach(company => {
        company.averageRate = company.nights > 0 
          ? Math.round(company.revenue / company.nights)
          : 0;
      });
      
      // Revenue trends by month
      const monthlyRevenue = {};
      corporateBookings.forEach(booking => {
        const monthKey = format(new Date(booking.createdAt), 'yyyy-MM');
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (booking.totalAmount || 0);
      });
      
      const monthlyTrends = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
        month,
        revenue,
        displayMonth: format(new Date(month + '-01'), 'MMM yyyy')
      })).sort((a, b) => a.month.localeCompare(b.month));
      
      // Previous period comparison
      const periodLength = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      const previousStart = subDays(start, periodLength);
      const previousEnd = subDays(end, periodLength);
      
      const previousCorporateBookings = await Booking.find({
        hotelId,
        bookingType: 'corporate',
        createdAt: { $gte: previousStart, $lte: previousEnd }
      });
      
      const previousRevenue = previousCorporateBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      const revenueGrowth = previousRevenue > 0 
        ? ((corporateRevenue - previousRevenue) / previousRevenue) * 100
        : 0;
      
      return {
        totalCorporateRevenue: corporateRevenue,
        corporateRevenuePercentage: totalRevenue > 0 ? (corporateRevenue / totalRevenue) * 100 : 0,
        averageCorporateRate: corporateNights > 0 ? corporateRevenue / corporateNights : 0,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        revenueByCompany: Object.values(revenueByCompany)
          .sort((a, b) => b.revenue - a.revenue),
        monthlyTrends,
        comparison: {
          currentPeriod: {
            revenue: corporateRevenue,
            bookings: corporateBookings.length,
            averageBookingValue: corporateBookings.length > 0 
              ? corporateRevenue / corporateBookings.length
              : 0
          },
          previousPeriod: {
            revenue: previousRevenue,
            bookings: previousCorporateBookings.length,
            averageBookingValue: previousCorporateBookings.length > 0 
              ? previousRevenue / previousCorporateBookings.length
              : 0
          }
        },
        topRevenueCompanies: Object.values(revenueByCompany)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting corporate revenue analysis:', error);
      throw error;
    }
  }

  /**
   * Get corporate credit utilization analysis
   */
  async getCorporateCreditUtilization(hotelId) {
    try {
      const companies = await CorporateCompany.find({ hotelId }).populate('creditAccount');
      
      const utilizationData = [];
      let totalCreditLimit = 0;
      let totalUtilized = 0;
      
      for (const company of companies) {
        if (!company.creditAccount) continue;
        
        const creditLimit = company.creditAccount.creditLimit || 0;
        const currentBalance = company.creditAccount.currentBalance || 0;
        const availableCredit = creditLimit - currentBalance;
        const utilizationPercentage = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;
        
        // Get recent activity
        const recentBookings = await Booking.countDocuments({
          hotelId,
          corporateCompanyId: company._id,
          createdAt: { $gte: subDays(new Date(), 30) }
        });
        
        const recentRevenue = await Booking.aggregate([
          {
            $match: {
              hotelId,
              corporateCompanyId: company._id,
              createdAt: { $gte: subDays(new Date(), 30) }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ]);
        
        totalCreditLimit += creditLimit;
        totalUtilized += currentBalance;
        
        utilizationData.push({
          companyId: company._id,
          companyName: company.name,
          creditLimit,
          currentBalance,
          availableCredit,
          utilizationPercentage: Math.round(utilizationPercentage * 10) / 10,
          paymentTerms: company.creditAccount.paymentTerms,
          lastPaymentDate: company.creditAccount.lastPaymentDate,
          recentBookings,
          recentRevenue: recentRevenue[0]?.total || 0,
          status: this.getCreditStatus(utilizationPercentage),
          riskLevel: this.getCreditRiskLevel(utilizationPercentage, company.creditAccount.lastPaymentDate)
        });
      }
      
      // Sort by utilization percentage
      utilizationData.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);
      
      // Calculate distribution by utilization bands
      const utilizationBands = {
        '0-25%': utilizationData.filter(u => u.utilizationPercentage <= 25).length,
        '26-50%': utilizationData.filter(u => u.utilizationPercentage > 25 && u.utilizationPercentage <= 50).length,
        '51-75%': utilizationData.filter(u => u.utilizationPercentage > 50 && u.utilizationPercentage <= 75).length,
        '76-90%': utilizationData.filter(u => u.utilizationPercentage > 75 && u.utilizationPercentage <= 90).length,
        '91-100%': utilizationData.filter(u => u.utilizationPercentage > 90).length
      };
      
      return {
        utilizationData,
        summary: {
          totalCreditLimit,
          totalUtilized,
          totalAvailable: totalCreditLimit - totalUtilized,
          averageUtilization: companies.length > 0 
            ? Math.round((totalUtilized / totalCreditLimit) * 100 * 10) / 10
            : 0,
          companiesCount: utilizationData.length,
          highUtilizationCompanies: utilizationData.filter(u => u.utilizationPercentage > 80).length,
          overlimitCompanies: utilizationData.filter(u => u.utilizationPercentage > 100).length,
          utilizationBands
        },
        recommendations: this.generateCreditRecommendations(utilizationData)
      };
    } catch (error) {
      console.error('Error getting corporate credit utilization:', error);
      throw error;
    }
  }

  /**
   * Get credit status based on utilization percentage
   */
  getCreditStatus(utilizationPercentage) {
    if (utilizationPercentage > 100) return 'overlimit';
    if (utilizationPercentage > 90) return 'critical';
    if (utilizationPercentage > 75) return 'high';
    if (utilizationPercentage > 50) return 'medium';
    return 'low';
  }

  /**
   * Get credit risk level
   */
  getCreditRiskLevel(utilizationPercentage, lastPaymentDate) {
    let risk = 0;
    
    // Utilization risk
    if (utilizationPercentage > 90) risk += 3;
    else if (utilizationPercentage > 75) risk += 2;
    else if (utilizationPercentage > 50) risk += 1;
    
    // Payment recency risk
    if (lastPaymentDate) {
      const daysSincePayment = Math.floor((new Date() - new Date(lastPaymentDate)) / (1000 * 60 * 60 * 24));
      if (daysSincePayment > 60) risk += 2;
      else if (daysSincePayment > 30) risk += 1;
    } else {
      risk += 3; // No payment history
    }
    
    if (risk >= 5) return 'high';
    if (risk >= 3) return 'medium';
    return 'low';
  }

  /**
   * Generate credit recommendations
   */
  generateCreditRecommendations(utilizationData) {
    const recommendations = [];
    
    // High utilization warnings
    const highUtilization = utilizationData.filter(u => u.utilizationPercentage > 80);
    if (highUtilization.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'High Credit Utilization Alert',
        description: `${highUtilization.length} companies are using more than 80% of their credit limit`,
        action: 'Review credit limits and payment terms',
        companies: highUtilization.map(u => u.companyName).slice(0, 3)
      });
    }
    
    // Overlimit companies
    const overlimit = utilizationData.filter(u => u.utilizationPercentage > 100);
    if (overlimit.length > 0) {
      recommendations.push({
        type: 'critical',
        title: 'Credit Limit Exceeded',
        description: `${overlimit.length} companies have exceeded their credit limits`,
        action: 'Immediate collection action required',
        companies: overlimit.map(u => u.companyName)
      });
    }
    
    // Low utilization opportunities
    const lowUtilization = utilizationData.filter(u => u.utilizationPercentage < 25 && u.recentBookings > 0);
    if (lowUtilization.length > 0) {
      recommendations.push({
        type: 'opportunity',
        title: 'Credit Expansion Opportunity',
        description: `${lowUtilization.length} active companies have low credit utilization`,
        action: 'Consider offering increased credit limits or special promotions',
        companies: lowUtilization.map(u => u.companyName).slice(0, 3)
      });
    }
    
    return recommendations;
  }

  /**
   * Get corporate booking channel performance
   */
  async getBookingChannelPerformance(hotelId, startDate, endDate) {
    try {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      
      // Get all bookings
      const allBookings = await Booking.find({
        hotelId,
        createdAt: { $gte: start, $lte: end }
      }).populate('corporateCompanyId');
      
      const channelData = {
        direct: { bookings: 0, revenue: 0, nights: 0 },
        corporate: { bookings: 0, revenue: 0, nights: 0 },
        ota: { bookings: 0, revenue: 0, nights: 0 },
        travel_agent: { bookings: 0, revenue: 0, nights: 0 },
        group: { bookings: 0, revenue: 0, nights: 0 },
        walk_in: { bookings: 0, revenue: 0, nights: 0 }
      };
      
      allBookings.forEach(booking => {
        const channel = booking.bookingType || 'direct';
        if (channelData[channel]) {
          channelData[channel].bookings++;
          channelData[channel].revenue += booking.totalAmount || 0;
          channelData[channel].nights += booking.numberOfNights || 1;
        }
      });
      
      // Calculate metrics for each channel
      const channelPerformance = Object.entries(channelData).map(([channel, data]) => ({
        channel,
        bookings: data.bookings,
        revenue: data.revenue,
        nights: data.nights,
        averageRate: data.nights > 0 ? Math.round(data.revenue / data.nights) : 0,
        averageBookingValue: data.bookings > 0 ? Math.round(data.revenue / data.bookings) : 0,
        marketShare: allBookings.length > 0 ? Math.round((data.bookings / allBookings.length) * 100) : 0,
        revenueShare: channelData.direct.revenue + channelData.corporate.revenue + channelData.ota.revenue + channelData.travel_agent.revenue + channelData.group.revenue + channelData.walk_in.revenue > 0
          ? Math.round((data.revenue / (channelData.direct.revenue + channelData.corporate.revenue + channelData.ota.revenue + channelData.travel_agent.revenue + channelData.group.revenue + channelData.walk_in.revenue)) * 100)
          : 0
      })).sort((a, b) => b.revenue - a.revenue);
      
      // Calculate commission costs (estimated)
      const totalRevenue = channelPerformance.reduce((sum, ch) => sum + ch.revenue, 0);
      const estimatedCommissions = {
        ota: channelData.ota.revenue * 0.15, // 15% commission
        travel_agent: channelData.travel_agent.revenue * 0.10, // 10% commission
        corporate: channelData.corporate.revenue * 0.02, // 2% processing fee
        direct: channelData.direct.revenue * 0.03 // 3% payment processing
      };
      
      const totalCommissions = Object.values(estimatedCommissions).reduce((sum, comm) => sum + comm, 0);
      
      return {
        channelPerformance,
        summary: {
          totalBookings: allBookings.length,
          totalRevenue,
          totalCommissions,
          netRevenue: totalRevenue - totalCommissions,
          averageCommissionRate: totalRevenue > 0 ? (totalCommissions / totalRevenue) * 100 : 0,
          directBookingPercentage: channelPerformance.find(ch => ch.channel === 'direct')?.marketShare || 0,
          corporateBookingPercentage: channelPerformance.find(ch => ch.channel === 'corporate')?.marketShare || 0,
          otaBookingPercentage: channelPerformance.find(ch => ch.channel === 'ota')?.marketShare || 0
        },
        commissionAnalysis: Object.entries(estimatedCommissions).map(([channel, commission]) => ({
          channel,
          commission,
          commissionRate: channelData[channel]?.revenue > 0 
            ? (commission / channelData[channel].revenue) * 100 
            : 0
        }))
      };
    } catch (error) {
      console.error('Error getting booking channel performance:', error);
      throw error;
    }
  }
}

module.exports = new CorporateAnalyticsService();