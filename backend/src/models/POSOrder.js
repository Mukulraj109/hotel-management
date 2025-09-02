import mongoose from 'mongoose';

const posOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  outlet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POSOutlet',
    required: true
  },
  type: {
    type: String,
    enum: ['dine_in', 'takeaway', 'room_service', 'delivery'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
    default: 'pending'
  },
  customer: {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    roomNumber: String,
    walkIn: {
      name: String,
      phone: String,
      email: String
    }
  },
  items: [{
    itemId: String,
    name: String,
    price: Number,
    quantity: Number,
    modifiers: [{
      name: String,
      option: String,
      price: Number
    }],
    specialInstructions: String,
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'served'],
      default: 'pending'
    }
  }],
  subtotal: {
    type: Number,
    required: true
  },
  discounts: [{
    type: String,
    description: String,
    amount: Number,
    percentage: Number
  }],
  taxes: {
    serviceTax: Number,
    gst: Number,
    otherTaxes: Number,
    totalTax: Number
  },
  totalAmount: {
    type: Number,
    required: true
  },
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'room_charge', 'voucher', 'comp'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'refunded'],
      default: 'pending'
    },
    paidAmount: Number,
    changeGiven: Number,
    paymentDetails: {
      transactionId: String,
      cardLast4: String,
      authCode: String,
      roomChargeReference: String
    }
  },
  staff: {
    server: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  tableNumber: String,
  deliveryDetails: {
    address: String,
    deliveryTime: Date,
    deliveryFee: Number
  },
  specialRequests: String,
  orderTime: {
    type: Date,
    default: Date.now
  },
  preparedTime: Date,
  servedTime: Date,
  completedTime: Date
}, {
  timestamps: true
});

// Generate order number
posOrderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.constructor.countDocuments({
      orderNumber: new RegExp(`^${dateStr}`)
    });
    this.orderNumber = `${dateStr}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

export default mongoose.model('POSOrder', posOrderSchema);