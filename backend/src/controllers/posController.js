import POSOutlet from '../models/POSOutlet.js';
import POSMenu from '../models/POSMenu.js';
import POSOrder from '../models/POSOrder.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Outlet Management
export const createOutlet = async (req, res) => {
  try {
    const outletData = {
      ...req.body,
      outletId: uuidv4()
    };
    
    const outlet = new POSOutlet(outletData);
    await outlet.save();
    
    res.status(201).json({
      success: true,
      data: outlet
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getOutlets = async (req, res) => {
  try {
    const outlets = await POSOutlet.find({ isActive: true })
      .populate('manager', 'firstName lastName email')
      .populate('staff', 'firstName lastName email role');
    
    res.json({
      success: true,
      data: outlets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateOutlet = async (req, res) => {
  try {
    const outlet = await POSOutlet.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!outlet) {
      return res.status(404).json({
        success: false,
        message: 'Outlet not found'
      });
    }
    
    res.json({
      success: true,
      data: outlet
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Menu Management
export const createMenu = async (req, res) => {
  try {
    const menuData = {
      ...req.body,
      menuId: uuidv4()
    };
    
    const menu = new POSMenu(menuData);
    await menu.save();
    
    res.status(201).json({
      success: true,
      data: menu
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getMenusByOutlet = async (req, res) => {
  try {
    const menus = await POSMenu.find({
      outlet: req.params.outletId,
      isActive: true
    }).populate('outlet', 'name type');
    
    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const addMenuItem = async (req, res) => {
  try {
    const menu = await POSMenu.findById(req.params.menuId);
    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }
    
    const menuItem = {
      ...req.body,
      itemId: uuidv4()
    };
    
    menu.items.push(menuItem);
    await menu.save();
    
    res.status(201).json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Order Management
export const createOrder = async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      orderId: uuidv4()
    };
    
    // Calculate totals
    let subtotal = 0;
    orderData.items.forEach(item => {
      let itemTotal = item.price * item.quantity;
      if (item.modifiers) {
        item.modifiers.forEach(mod => {
          itemTotal += mod.price * item.quantity;
        });
      }
      subtotal += itemTotal;
    });
    
    orderData.subtotal = subtotal;
    
    // Calculate taxes
    const outlet = await POSOutlet.findById(orderData.outlet);
    const serviceTax = subtotal * (outlet.taxSettings.serviceTaxRate / 100);
    const gst = subtotal * (outlet.taxSettings.gstRate / 100);
    const totalTax = serviceTax + gst;
    
    orderData.taxes = {
      serviceTax,
      gst,
      otherTaxes: 0,
      totalTax
    };
    
    // Apply discounts
    let discountAmount = 0;
    if (orderData.discounts) {
      orderData.discounts.forEach(discount => {
        if (discount.percentage) {
          discountAmount += subtotal * (discount.percentage / 100);
        } else {
          discountAmount += discount.amount;
        }
      });
    }
    
    orderData.totalAmount = subtotal + totalTax - discountAmount;
    
    const order = new POSOrder(orderData);
    await order.save();
    
    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getOrders = async (req, res) => {
  try {
    const { outlet, status, date } = req.query;
    const filter = {};
    
    if (outlet) filter.outlet = outlet;
    if (status) {
      // Handle comma-separated status values for multiple statuses
      if (status.includes(',')) {
        filter.status = { $in: status.split(',') };
      } else {
        filter.status = status;
      }
    }
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.orderTime = { $gte: startDate, $lt: endDate };
    }
    
    const orders = await POSOrder.find(filter)
      .populate('outlet', 'name type')
      .populate('customer.guest', 'firstName lastName email')
      .populate('staff.server', 'firstName lastName')
      .populate('staff.cashier', 'firstName lastName')
      .sort({ orderTime: -1 });
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await POSOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    order.status = status;
    
    // Update timestamps based on status
    switch (status) {
      case 'preparing':
        order.preparedTime = new Date();
        break;
      case 'ready':
        order.readyTime = new Date();
        break;
      case 'served':
        order.servedTime = new Date();
        break;
      case 'completed':
        order.completedTime = new Date();
        break;
    }
    
    await order.save();
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const processPayment = async (req, res) => {
  try {
    const { paymentMethod, amount, paymentDetails } = req.body;
    const order = await POSOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    order.payment = {
      method: paymentMethod,
      status: 'paid',
      paidAmount: amount,
      paymentDetails
    };
    
    if (amount > order.totalAmount) {
      order.payment.changeGiven = amount - order.totalAmount;
    }
    
    order.status = 'completed';
    order.completedTime = new Date();
    
    await order.save();
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Dashboard Stats
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Today's completed orders
    const completedOrders = await POSOrder.find({
      status: 'completed',
      completedTime: { $gte: startOfDay, $lt: endOfDay }
    });

    // Active orders
    const activeOrders = await POSOrder.countDocuments({
      status: { $in: ['preparing', 'ready'] }
    });

    // Calculate stats
    const todaysSales = completedOrders.reduce((total, order) => total + order.totalAmount, 0);
    const todaysOrders = completedOrders.length;
    const averageOrderValue = todaysOrders > 0 ? todaysSales / todaysOrders : 0;

    res.json({
      success: true,
      data: {
        todaysSales,
        todaysOrders,
        activeOrders,
        averageOrderValue
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reporting
export const getSalesReport = async (req, res) => {
  try {
    const { outlet, startDate, endDate } = req.query;
    const matchStage = {
      status: 'completed',
      'payment.status': 'paid'
    };
    
    if (outlet) matchStage.outlet = mongoose.Types.ObjectId(outlet);
    if (startDate && endDate) {
      matchStage.completedTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const salesData = await POSOrder.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            outlet: '$outlet',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$completedTime' } }
          },
          totalSales: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
          totalTax: { $sum: '$taxes.totalTax' }
        }
      },
      {
        $lookup: {
          from: 'posoutlets',
          localField: '_id.outlet',
          foreignField: '_id',
          as: 'outlet'
        }
      }
    ]);
    
    res.json({
      success: true,
      data: salesData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
  createOutlet,
  getOutlets,
  updateOutlet,
  createMenu,
  getMenusByOutlet,
  addMenuItem,
  createOrder,
  getOrders,
  updateOrderStatus,
  processPayment,
  getDashboardStats,
  getSalesReport
};