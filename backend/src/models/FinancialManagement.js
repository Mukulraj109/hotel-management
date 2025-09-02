import mongoose from 'mongoose';

const chartOfAccountsSchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
    unique: true
  },
  accountCode: {
    type: String,
    required: true,
    unique: true
  },
  accountName: {
    type: String,
    required: true
  },
  accountType: {
    type: String,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense', 'cost_of_goods_sold'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'current_assets', 'fixed_assets', 'other_assets',
      'current_liabilities', 'long_term_liabilities',
      'owner_equity', 'retained_earnings',
      'room_revenue', 'food_beverage_revenue', 'other_revenue',
      'operating_expenses', 'administrative_expenses', 'marketing_expenses',
      'cost_of_sales'
    ],
    required: true
  },
  subCategory: String,
  parentAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  balance: {
    type: Number,
    default: 0
  },
  normalBalance: {
    type: String,
    enum: ['debit', 'credit'],
    required: true
  },
  taxReportingCategory: String,
  description: String
}, {
  timestamps: true
});

const generalLedgerSchema = new mongoose.Schema({
  entryId: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true
  },
  reference: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  sourceDocument: {
    type: String, // booking, invoice, payment, adjustment
    sourceId: String
  },
  journal: {
    type: String,
    enum: ['general', 'sales', 'purchase', 'cash_receipts', 'cash_disbursements', 'payroll'],
    default: 'general'
  },
  entries: [{
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
      required: true
    },
    debit: {
      type: Number,
      default: 0
    },
    credit: {
      type: Number,
      default: 0
    },
    description: String
  }],
  totalDebit: {
    type: Number,
    required: true
  },
  totalCredit: {
    type: Number,
    required: true
  },
  isBalanced: {
    type: Boolean,
    default: false
  },
  period: {
    month: Number,
    year: Number
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['draft', 'posted', 'reversed'],
    default: 'draft'
  },
  reversalEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GeneralLedger'
  }
}, {
  timestamps: true
});

const invoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    required: true,
    unique: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['guest_folio', 'corporate_billing', 'group_billing', 'vendor_invoice', 'pro_forma'],
    required: true
  },
  customer: {
    type: {
      type: String,
      enum: ['guest', 'corporate', 'vendor'],
      required: true
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CorporateCompany'
    },
    details: {
      name: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
      },
      taxId: String,
      email: String,
      phone: String
    }
  },
  bookingReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  lineItems: [{
    description: {
      type: String,
      required: true
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts'
    },
    quantity: {
      type: Number,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    taxCode: String,
    taxRate: Number,
    taxAmount: Number,
    date: Date
  }],
  subtotal: {
    type: Number,
    required: true
  },
  taxDetails: [{
    taxName: String,
    taxRate: Number,
    taxableAmount: Number,
    taxAmount: Number
  }],
  totalTax: {
    type: Number,
    default: 0
  },
  discounts: [{
    description: String,
    amount: Number,
    percentage: Number
  }],
  totalDiscount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  balanceAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft'
  },
  paymentTerms: {
    type: String,
    default: 'Net 30'
  },
  notes: String,
  internalNotes: String,
  attachments: [String]
}, {
  timestamps: true
});

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['receipt', 'payment', 'refund', 'adjustment'],
    required: true
  },
  method: {
    type: String,
    enum: ['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'online', 'mobile_payment'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  customer: {
    type: String,
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CorporateCompany'
    },
    name: String
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  reference: String,
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  },
  paymentDetails: {
    cardLast4: String,
    authCode: String,
    transactionId: String,
    checkNumber: String,
    bankReference: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  reconciled: {
    type: Boolean,
    default: false
  },
  reconciledDate: Date,
  notes: String
}, {
  timestamps: true
});

const bankAccountSchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
    unique: true
  },
  bankName: {
    type: String,
    required: true
  },
  accountName: {
    type: String,
    required: true
  },
  accountNumber: {
    type: String,
    required: true
  },
  accountType: {
    type: String,
    enum: ['checking', 'savings', 'business', 'credit'],
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  availableBalance: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  bankDetails: {
    routingNumber: String,
    swiftCode: String,
    branchCode: String,
    ifscCode: String
  },
  reconciliation: {
    lastReconciledDate: Date,
    lastReconciledBalance: Number,
    pendingTransactions: Number
  }
}, {
  timestamps: true
});

const taxConfigurationSchema = new mongoose.Schema({
  taxId: {
    type: String,
    required: true,
    unique: true
  },
  taxName: {
    type: String,
    required: true
  },
  taxCode: {
    type: String,
    required: true,
    unique: true
  },
  taxType: {
    type: String,
    enum: ['sales_tax', 'vat', 'gst', 'service_tax', 'city_tax', 'resort_fee'],
    required: true
  },
  rate: {
    type: Number,
    required: true
  },
  jurisdiction: {
    country: String,
    state: String,
    city: String
  },
  applicableServices: [{
    service: String,
    rate: Number,
    exempt: Boolean
  }],
  effectiveDate: {
    type: Date,
    required: true
  },
  expiryDate: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  reportingAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts'
  },
  payableAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts'
  }
}, {
  timestamps: true
});

const budgetSchema = new mongoose.Schema({
  budgetId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  fiscalYear: {
    type: Number,
    required: true
  },
  period: {
    startDate: Date,
    endDate: Date
  },
  department: String,
  currency: {
    type: String,
    default: 'INR'
  },
  budgetItems: [{
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
      required: true
    },
    category: String,
    monthlyBudgets: [{
      month: Number,
      amount: Number
    }],
    totalBudget: Number,
    actualSpent: { type: Number, default: 0 },
    variance: { type: Number, default: 0 },
    variancePercentage: { type: Number, default: 0 }
  }],
  totalBudget: {
    type: Number,
    required: true
  },
  actualTotal: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'approved', 'active', 'closed'],
    default: 'draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: Date
}, {
  timestamps: true
});

const financialReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true
  },
  reportType: {
    type: String,
    enum: [
      'profit_loss', 'balance_sheet', 'cash_flow', 'trial_balance', 
      'aged_receivables', 'aged_payables', 'budget_variance',
      'revenue_by_source', 'expense_analysis', 'tax_summary'
    ],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  period: {
    startDate: Date,
    endDate: Date,
    month: Number,
    year: Number,
    quarter: Number
  },
  parameters: {
    accounts: [String],
    departments: [String],
    currency: String,
    consolidate: Boolean
  },
  data: {},
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  generatedDate: {
    type: Date,
    default: Date.now
  },
  format: {
    type: String,
    enum: ['pdf', 'excel', 'json'],
    default: 'json'
  },
  filePath: String,
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduleConfig: {
    frequency: String,
    nextRun: Date,
    recipients: [String]
  }
}, {
  timestamps: true
});

const costCenterSchema = new mongoose.Schema({
  costCenterId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['department', 'location', 'project', 'product_line'],
    required: true
  },
  parentCostCenter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CostCenter'
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  budget: {
    annual: Number,
    monthly: [Number] // 12 months
  },
  actualSpend: {
    annual: { type: Number, default: 0 },
    monthly: [{ type: Number, default: 0 }] // 12 months
  },
  accounts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts'
  }]
}, {
  timestamps: true
});

const currencyExchangeSchema = new mongoose.Schema({
  baseCurrency: {
    type: String,
    required: true
  },
  targetCurrency: {
    type: String,
    required: true
  },
  rate: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    enum: ['manual', 'api', 'bank'],
    default: 'manual'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate invoice numbers
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    
    const count = await this.constructor.countDocuments({
      invoiceNumber: new RegExp(`^INV-${year}${month}`)
    });
    
    this.invoiceNumber = `INV-${year}${month}${(count + 1).toString().padStart(4, '0')}`;
  }
  
  // Calculate balance amount
  this.balanceAmount = this.totalAmount - this.paidAmount;
  
  next();
});

// Pre-save middleware to ensure journal entries are balanced
generalLedgerSchema.pre('save', function(next) {
  this.totalDebit = this.entries.reduce((sum, entry) => sum + entry.debit, 0);
  this.totalCredit = this.entries.reduce((sum, entry) => sum + entry.credit, 0);
  this.isBalanced = Math.abs(this.totalDebit - this.totalCredit) < 0.01;
  
  if (!this.isBalanced) {
    return next(new Error('Journal entry is not balanced'));
  }
  
  next();
});

const ChartOfAccounts = mongoose.model('ChartOfAccounts', chartOfAccountsSchema);
const GeneralLedger = mongoose.model('GeneralLedger', generalLedgerSchema);
const FinancialInvoice = mongoose.model('FinancialInvoice', invoiceSchema);
const FinancialPayment = mongoose.model('FinancialPayment', paymentSchema);
const BankAccount = mongoose.model('BankAccount', bankAccountSchema);
const TaxConfiguration = mongoose.model('TaxConfiguration', taxConfigurationSchema);
const Budget = mongoose.model('Budget', budgetSchema);
const FinancialReport = mongoose.model('FinancialReport', financialReportSchema);
const CostCenter = mongoose.model('CostCenter', costCenterSchema);
const CurrencyExchange = mongoose.model('CurrencyExchange', currencyExchangeSchema);

export {
  ChartOfAccounts,
  GeneralLedger,
  FinancialInvoice,
  FinancialPayment,
  BankAccount,
  TaxConfiguration,
  Budget,
  FinancialReport,
  CostCenter,
  CurrencyExchange
};