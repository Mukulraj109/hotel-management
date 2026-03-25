import { ApplicationError } from './errorHandler.js';

const AUTHENTICATED_ROLES = ['guest', 'staff', 'admin', 'manager', 'frontdesk', 'housekeeping', 'travel_agent'];

export const RBAC_POLICIES = {
  admin: {
    createUser: ['admin'],
    updateUser: ['admin'],
    deleteUser: ['admin'],
    createHotel: ['admin'],
    updateHotelStatus: ['admin'],
    updateHotelDetails: ['admin'],
    deleteHotel: ['admin']
  },
  adminBypassManagement: {
    baseAccess: ['admin', 'manager', 'frontdesk']
  },
  allotment: {
    adminAccess: ['admin']
  },
  notifications: {
    baseAccess: AUTHENTICATED_ROLES
  },
  settings: {
    baseAccess: AUTHENTICATED_ROLES
  },
  hotelSettings: {
    modifyAccess: ['admin', 'manager']
  },
  dataPrivacy: {
    baseAccess: AUTHENTICATED_ROLES
  },
  dayUse: {
    baseAccess: AUTHENTICATED_ROLES
  },
  mapping: {
    baseAccess: AUTHENTICATED_ROLES
  },
  rolePermissions: {
    baseAccess: AUTHENTICATED_ROLES
  },
  meetUpRequests: {
    baseAccess: AUTHENTICATED_ROLES
  },
  hotelAreas: {
    baseAccess: AUTHENTICATED_ROLES
  },
  seasonalPricing: {
    baseAccess: AUTHENTICATED_ROLES
  },
  systemIntegration: {
    modifyAccess: ['admin', 'manager']
  },
  waitlist: {
    baseAccess: AUTHENTICATED_ROLES
  },
  bookingForm: {
    adminAccess: ['admin']
  },
  channelManagement: {
    baseAccess: AUTHENTICATED_ROLES
  },
  gdpr: {
    baseAccess: AUTHENTICATED_ROLES
  },
  operationalManagement: {
    modifyAccess: ['admin', 'manager', 'staff']
  },
  reorder: {
    baseAccess: AUTHENTICATED_ROLES
  },
  serviceTypes: {
    baseAccess: AUTHENTICATED_ROLES
  },
  webSettings: {
    adminAccess: ['admin']
  },
  digitalKeys: {
    baseAccess: AUTHENTICATED_ROLES,
    adminAccess: ['admin']
  },
  discountPricing: {
    modifyAccess: ['admin', 'manager', 'staff']
  },
  pos: {
    baseAccess: AUTHENTICATED_ROLES,
    manageAccess: ['admin', 'manager']
  },
  adminHotelServices: {
    baseAccess: ['admin', 'manager', 'frontdesk']
  },
  bookingConversations: {
    baseAccess: AUTHENTICATED_ROLES,
    staffAccess: ['staff', 'admin', 'manager']
  },
  documentUpload: {
    baseAccess: AUTHENTICATED_ROLES,
    managerAccess: ['admin', 'manager'],
    staffAccess: ['admin', 'staff']
  },
  inventoryConsumption: {
    baseAccess: AUTHENTICATED_ROLES
  },
  enhancedBookings: {
    baseAccess: AUTHENTICATED_ROLES,
    priceAdjustAccess: ['admin', 'manager', 'staff'],
    priceReverseAccess: ['admin', 'manager']
  },
  personalization: {
    baseAccess: AUTHENTICATED_ROLES,
    managerAccess: ['admin', 'manager']
  },
  userPreferences: {
    baseAccess: AUTHENTICATED_ROLES,
    staffAccess: ['staff'],
    guestAccess: ['guest', 'travel_agent'],
    adminAccess: ['admin']
  },
  meetUpResources: {
    baseAccess: AUTHENTICATED_ROLES,
    adminAccess: ['admin']
  },
  scheduledUpdates: {
    baseAccess: AUTHENTICATED_ROLES
  },
  securityMonitoring: {
    baseAccess: AUTHENTICATED_ROLES
  },
  stockMovements: {
    baseAccess: AUTHENTICATED_ROLES,
    staffAccess: ['admin', 'staff'],
    adminAccess: ['admin']
  },
  measurementUnits: {
    baseAccess: AUTHENTICATED_ROLES,
    manageAccess: ['admin', 'manager']
  },
  bypassFinancialAnalytics: {
    managerAccess: ['admin', 'manager']
  },
  externalBookings: {
    baseAccess: AUTHENTICATED_ROLES
  },
  guestImport: {
    staffAccess: ['admin', 'manager', 'staff']
  },
  guestManagement: {
    managerAccess: ['admin', 'manager']
  },
  staffMeetUp: {
    staffAccess: ['staff', 'admin']
  },
  centralizedRates: {
    baseAccess: AUTHENTICATED_ROLES,
    manageAccess: ['admin', 'rate_manager']
  },
  guestServices: {
    baseAccess: AUTHENTICATED_ROLES,
    staffAccess: ['staff', 'admin', 'frontdesk'],
    guestAccess: ['guest']
  },
  hotelServices: {
    baseAccess: AUTHENTICATED_ROLES
  },
  posTax: {
    baseAccess: AUTHENTICATED_ROLES,
    manageAccess: ['admin', 'manager']
  },
  roomCharges: {
    baseAccess: AUTHENTICATED_ROLES
  },
  staffDashboard: {
    staffAccess: ['staff', 'admin']
  },
  staffServices: {
    staffAccess: ['staff']
  },
  testCheckouts: {
    adminAccess: ['admin']
  },
  upload: {
    baseAccess: AUTHENTICATED_ROLES
  },
  vendorComparison: {
    baseAccess: AUTHENTICATED_ROLES
  },
  auth: {
    baseAccess: AUTHENTICATED_ROLES
  },
  adminTravelDashboard: {
    baseAccess: AUTHENTICATED_ROLES
  },
  analytics: {
    baseAccess: AUTHENTICATED_ROLES
  },
  billMessages: {
    baseAccess: AUTHENTICATED_ROLES
  },
  bookingEngine: {
    baseAccess: AUTHENTICATED_ROLES
  },
  cancellations: {
    baseAccess: AUTHENTICATED_ROLES
  },
  channelLocalization: {
    baseAccess: AUTHENTICATED_ROLES
  },
  communications: {
    baseAccess: AUTHENTICATED_ROLES
  },
  dashboardUpdates: {
    baseAccess: AUTHENTICATED_ROLES
  },
  departmentBudget: {
    baseAccess: AUTHENTICATED_ROLES
  },
  guests: {
    baseAccess: AUTHENTICATED_ROLES
  },
  integrations: {
    baseAccess: AUTHENTICATED_ROLES
  },
  inventoryNotifications: {
    baseAccess: AUTHENTICATED_ROLES
  },
  loyalty: {
    baseAccess: AUTHENTICATED_ROLES
  },
  messageTemplates: {
    baseAccess: AUTHENTICATED_ROLES
  },
  otaAmendments: {
    baseAccess: AUTHENTICATED_ROLES
  },
  posAttributes: {
    baseAccess: AUTHENTICATED_ROLES
  },
  reasons: {
    baseAccess: AUTHENTICATED_ROLES
  },
  requestTemplates: {
    baseAccess: AUTHENTICATED_ROLES
  },
  revenueAccounts: {
    baseAccess: AUTHENTICATED_ROLES
  },
  reviews: {
    baseAccess: AUTHENTICATED_ROLES,
    staffAccess: ['staff', 'admin'],
    adminAccess: ['admin']
  },
  roomTax: {
    baseAccess: AUTHENTICATED_ROLES
  },
  translations: {
    baseAccess: AUTHENTICATED_ROLES
  },
  users: {
    baseAccess: AUTHENTICATED_ROLES
  },
  tapeChart: {
    adminAccess: ['admin'],
    staffAccess: ['admin', 'staff'],
    staffFrontdeskAccess: ['admin', 'staff', 'frontdesk']
  },
  rateManagement: {
    manageAccess: ['admin', 'revenue_manager'],
    readAccess: ['admin', 'revenue_manager', 'manager']
  },
  revenueManagement: {
    manageAccess: ['admin', 'revenue_manager'],
    readAccess: ['admin', 'revenue_manager', 'manager']
  },
  channelManager: {
    manageAccess: ['admin', 'channel_manager', 'frontdesk'],
    readAccess: ['admin', 'channel_manager', 'manager', 'frontdesk']
  },
  departments: {
    manageAccess: ['admin', 'manager'],
    adminAccess: ['admin']
  },
  travelAgents: {
    manageAccess: ['admin', 'manager'],
    opsAccess: ['admin', 'manager', 'staff', 'frontdesk'],
    allAgentAccess: ['admin', 'manager', 'staff', 'frontdesk', 'travel_agent'],
    agentManageAccess: ['admin', 'manager', 'travel_agent'],
    frontdeskAgentAccess: ['admin', 'manager', 'frontdesk', 'travel_agent']
  },
  paymentMethods: {
    managerAccess: ['admin', 'manager'],
    adminAccess: ['admin'],
    supervisorAccess: ['admin', 'manager', 'supervisor']
  },
  billingSessions: {
    staffAccess: ['staff', 'admin']
  },
  credentials: {
    managerAccess: ['admin', 'manager'],
    staffAccess: ['admin', 'manager', 'staff'],
    adminAccess: ['admin']
  },
  waitingList: {
    staffAccess: ['admin', 'manager', 'staff'],
    managerAccess: ['admin', 'manager']
  },
  vendors: {
    managerAccess: ['admin', 'manager'],
    staffAccess: ['admin', 'manager', 'staff']
  },
  phoneExtensions: {
    staffAccess: ['admin', 'manager', 'front_desk', 'maintenance'],
    manageAccess: ['admin', 'manager'],
    usageAccess: ['admin', 'manager', 'system', 'maintenance'],
    maintenanceAccess: ['admin', 'manager', 'maintenance'],
    adminAccess: ['admin']
  },
  settlements: {
    staffAccess: ['admin', 'staff'],
    adminAccess: ['admin']
  },
  financial: {
    chartBulkImport: ['admin', 'manager'],
    journalBulkCreate: ['admin', 'manager'],
    journalLifecycle: ['admin', 'manager'],
    bankTransactionCreate: ['admin', 'staff', 'manager'],
    bankReconcileImport: ['admin', 'manager'],
    budgetSubmitRevise: ['admin', 'manager'],
    budgetApprove: ['admin']
  },
  emailCampaigns: {
    managerAccess: ['admin', 'manager'],
    staffAccess: ['admin', 'manager', 'staff']
  },
  laundry: {
    staffFrontdeskAccess: ['admin', 'manager', 'housekeeping', 'front_desk'],
    housekeepingAccess: ['admin', 'manager', 'housekeeping'],
    managerAccess: ['admin', 'manager']
  },
  roomInventory: {
    staffAccess: ['admin', 'staff']
  },
  roomTypes: {
    readAccess: ['admin', 'manager', 'frontdesk'],
    manageAccess: ['admin', 'manager'],
    channelManageAccess: ['admin', 'channel_manager'],
    adminAccess: ['admin']
  },
  advancedReservations: {
    staffAccess: ['admin', 'staff']
  },
  currency: {
    manageAccess: ['admin', 'revenue_manager'],
    adminAccess: ['admin'],
    batchAccess: ['admin', 'revenue_manager', 'front_desk']
  },
  dailyRoutineCheck: {
    staffFrontdeskAccess: ['staff', 'admin', 'frontdesk'],
    staffOnlyAccess: ['staff', 'frontdesk'],
    managerFrontdeskAccess: ['admin', 'manager', 'frontdesk'],
    fullAccess: ['admin', 'manager', 'staff', 'frontdesk']
  },
  propertyGroups: {
    managerAccess: ['admin', 'manager'],
    adminAccess: ['admin']
  },
  inventoryAnalytics: {
    managerAccess: ['admin', 'manager']
  },
  supplyRequests: {
    staffAccess: ['staff', 'admin', 'frontdesk'],
    managerAccess: ['admin', 'manager', 'frontdesk'],
    purchasingAccess: ['admin', 'manager', 'purchasing', 'frontdesk']
  },
  laundryTemplates: {
    staffAccess: ['admin', 'manager', 'staff'],
    managerAccess: ['admin', 'manager']
  },
  purchaseOrders: {
    staffAccess: ['admin', 'manager', 'staff'],
    managerAccess: ['admin', 'manager']
  },
  staffTasks: {
    staffAccess: ['staff', 'admin'],
    adminAccess: ['admin']
  },
  approvals: {
    frontdeskAccess: ['frontdesk', 'manager', 'admin'],
    managerAccess: ['manager', 'admin']
  },
  assignmentRules: {
    staffAccess: ['admin', 'staff'],
    adminAccess: ['admin']
  },
  adminDashboard: {
    adminFrontdeskAccess: ['admin', 'frontdesk']
  },
  enhancedAnalytics: {
    managerAccess: ['admin', 'manager']
  },
  featureFlags: {
    adminAccess: ['admin']
  },
  offerFavorites: {
    memberAccess: ['guest', 'member', 'vip']
  },
  reports: {
    staffAccess: ['admin', 'staff'],
    adminAccess: ['admin']
  },
  segmentation: {
    manageAccess: ['admin', 'manager']
  },
  dailyInventoryCheck: {
    staffAccess: ['staff', 'admin'],
    guestAccess: ['staff', 'admin', 'guest']
  },
  housekeepingAutomation: {
    staffFrontdeskAccess: ['admin', 'manager', 'staff', 'frontdesk'],
    managerFrontdeskAccess: ['admin', 'manager', 'frontdesk']
  },
  photoUpload: {
    staffAccess: ['staff', 'admin']
  },
  posSettlementIntegration: {
    adminStaffAccess: ['admin', 'staff'],
    adminAccess: ['admin']
  },
  roomBlocks: {
    adminStaffAccess: ['admin', 'staff']
  },
  rooms: {
    createUpdateAccess: ['admin', 'staff'],
    deleteAccess: ['admin'],
    pricingAccess: ['admin', 'manager'],
    priceHistoryAccess: ['admin', 'manager', 'staff'],
    bulkPricingAccess: ['admin', 'manager']
  },
  settlementNotifications: {
    adminStaffAccess: ['admin', 'staff'],
    adminAccess: ['admin']
  },
  adminLoyalty: {
    managerAccess: ['admin', 'manager']
  },
  checkoutAutomation: {
    managerAccess: ['admin', 'manager'],
    staffAccess: ['staff', 'admin']
  },
  checkoutInventory: {
    staffAccess: ['staff', 'admin']
  },
  crm: {
    staffAccess: ['admin', 'manager', 'staff'],
    manageAccess: ['admin', 'manager']
  },
  inventory: {
    readWriteAccess: ['admin', 'staff', 'frontdesk'],
    manageAccess: ['admin', 'frontdesk'],
    requestAccess: ['staff', 'frontdesk']
  },
  incidents: {
    staffAccess: ['staff', 'admin']
  },
  extraPersonPricing: {
    staffAccess: ['admin', 'staff'],
    adminAccess: ['admin']
  },
  inventoryManagement: {
    readAccess: ['admin', 'manager', 'front_desk'],
    manageAccess: ['admin', 'manager']
  },
  staffAlerts: {
    staffAccess: ['staff', 'admin', 'manager'],
    manageAccess: ['admin', 'manager']
  },
  inventoryVendorIntegration: {
    manageAccess: ['admin', 'manager'],
    staffAccess: ['admin', 'manager', 'staff']
  },
  requestCategories: {
    manageAccess: ['admin', 'manager']
  },
  apiManagement: {
    manageAccess: ['admin', 'manager'],
    adminAccess: ['admin']
  },
  attractions: {
    adminAccess: ['admin']
  },
  auditTrail: {
    adminAccess: ['admin'],
    staffAccess: ['admin', 'staff']
  },
  housekeeping: {
    staffAccess: ['admin', 'staff', 'frontdesk'],
    inspectAccess: ['admin', 'frontdesk']
  },
  maintenance: {
    staffAccess: ['staff', 'admin', 'frontdesk']
  },
  ota: {
    adminAccess: ['admin'],
    staffAccess: ['admin', 'staff']
  },
  audit: {
    adminAccess: ['admin'],
    staffAccess: ['admin', 'staff', 'audit', 'compliance'],
    frontdeskAccess: ['admin', 'staff', 'audit', 'front-desk'],
    managementAccess: ['admin', 'staff', 'audit', 'management'],
    complianceAccess: ['admin', 'compliance']
  },
  availability: {
    staffAccess: ['admin', 'manager', 'front_desk'],
    manageAccess: ['admin', 'manager']
  },
  health: {
    staffAccess: ['admin', 'staff'],
    adminAccess: ['admin']
  },
  inventoryAutomation: {
    staffAccess: ['admin', 'manager', 'staff'],
    managerAccess: ['admin', 'manager']
  },
  nightAudit: {
    adminAccess: ['admin']
  },
  noShow: {
    staffAccess: ['admin', 'staff', 'manager'],
    managerAccess: ['admin', 'manager']
  },
  language: {
    baseAccess: AUTHENTICATED_ROLES,
    manageAccess: ['admin', 'content_manager'],
    adminAccess: ['admin'],
    translateAccess: ['admin', 'content_manager', 'translator'],
    reviewAccess: ['admin', 'content_manager', 'reviewer'],
    translationReadAccess: ['admin', 'content_manager', 'reviewer', 'translator'],
    revenueContentAccess: ['admin', 'revenue_manager', 'content_manager']
  },
  revenueOptimization: {
    baseAccess: AUTHENTICATED_ROLES,
    manageAccess: ['admin', 'revenue_manager'],
    revenueContentAccess: ['admin', 'revenue_manager', 'content_manager']
  },
  addOnServices: {
    bookService: AUTHENTICATED_ROLES,
    redeemInclusion: AUTHENTICATED_ROLES,
    createService: ['admin'],
    updateService: ['admin'],
    deleteService: ['admin'],
    bulkCreateServices: ['admin'],
    createInclusion: ['admin'],
    updateInclusion: ['admin']
  },
  bookings: {
    baseAccess: AUTHENTICATED_ROLES,
    getRoomBookings: ['admin', 'staff', 'frontdesk'],
    create: AUTHENTICATED_ROLES,
    update: AUTHENTICATED_ROLES,
    cancel: AUTHENTICATED_ROLES,
    changeRoom: ['admin', 'staff', 'frontdesk'],
    changeRoomByGuest: ['admin', 'staff', 'frontdesk'],
    createModificationRequest: AUTHENTICATED_ROLES,
    reviewModificationRequest: ['admin', 'staff', 'manager', 'frontdesk'],
    checkIn: ['admin', 'staff', 'frontdesk'],
    checkOut: ['admin', 'staff', 'frontdesk'],
    addExtraPerson: ['admin', 'staff', 'frontdesk'],
    removeExtraPerson: ['admin', 'staff', 'frontdesk'],
    updateExtraPersonCharge: ['admin', 'staff', 'frontdesk'],
    calculateExtraPersonCharges: ['admin', 'staff', 'frontdesk'],
    approveExtraPersonCharge: ['admin', 'staff', 'frontdesk'],
    payExtraPersonCharges: ['admin', 'staff', 'frontdesk'],
    getSettlement: ['admin', 'staff', 'frontdesk'],
    addSettlementAdjustment: ['admin', 'staff', 'frontdesk'],
    paySettlement: ['admin', 'staff', 'frontdesk'],
    markNoShow: ['admin', 'staff', 'frontdesk']
  },
  payments: {
    createIntent: AUTHENTICATED_ROLES,
    confirmIntent: AUTHENTICATED_ROLES,
    createExtraPersonIntent: ['staff', 'admin'],
    createSettlementIntent: AUTHENTICATED_ROLES,
    refund: AUTHENTICATED_ROLES,
    roomCharge: AUTHENTICATED_ROLES,
    cashOnDelivery: AUTHENTICATED_ROLES
  },
  invoices: {
    create: ['staff', 'admin'],
    update: ['staff', 'admin'],
    addPayment: ['staff', 'admin'],
    addDiscount: ['staff', 'admin'],
    setupSplitBilling: ['staff', 'admin'],
    paySplit: ['staff', 'admin', 'guest'],
    getStats: ['staff', 'admin'],
    getOverdue: ['staff', 'admin'],
    createSupplementaryExtraPerson: ['staff', 'admin'],
    createSupplementarySettlement: ['staff', 'admin'],
    addExtraCharges: ['staff', 'admin']
  }
};

export const authorizePolicy = (resource, action) => {
  return (req, res, next) => {
    const allowedRoles = RBAC_POLICIES[resource]?.[action];
    if (!allowedRoles) {
      return next(new ApplicationError(`RBAC policy missing for ${resource}.${action}`, 500));
    }

    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return next(new ApplicationError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

export default authorizePolicy;
