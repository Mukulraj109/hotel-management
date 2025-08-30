import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.adminClients = new Map(); // hotelId -> Set of admin WebSocket connections
  }

  initialize(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/notifications'
    });

    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    console.log('WebSocket server initialized for real-time notifications');
  }

  async handleConnection(ws, request) {
    try {
      // Extract token from query parameters or headers
      const url = new URL(request.url, `http://${request.headers.host}`);
      const token = url.searchParams.get('token') || 
                   request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        ws.close(1008, 'Invalid user');
        return;
      }

      // Store client connection
      const userId = user._id.toString();
      const hotelId = user.hotelId?.toString();

      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);

      // Store admin clients separately for efficient broadcast
      if (user.role === 'admin' && hotelId) {
        if (!this.adminClients.has(hotelId)) {
          this.adminClients.set(hotelId, new Set());
        }
        this.adminClients.get(hotelId).add(ws);
      }

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connected successfully',
        userId: userId,
        role: user.role,
        timestamp: new Date().toISOString()
      }));

      // Handle client messages
      ws.on('message', (data) => {
        this.handleMessage(ws, user, data);
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleDisconnect(ws, user);
      });

      // Handle connection errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnect(ws, user);
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1008, 'Authentication failed');
    }
  }

  handleMessage(ws, user, data) {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;

        case 'subscribe':
          // Handle subscription to specific notification types
          this.handleSubscription(ws, user, message);
          break;

        case 'mark_read':
          // Handle marking notifications as read
          this.handleMarkRead(ws, user, message);
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type'
          }));
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }

  handleSubscription(ws, user, message) {
    const { channels } = message;
    
    // Store subscription preferences on the WebSocket connection
    ws.subscriptions = ws.subscriptions || new Set();
    
    if (Array.isArray(channels)) {
      channels.forEach(channel => {
        ws.subscriptions.add(channel);
      });
    }

    ws.send(JSON.stringify({
      type: 'subscribed',
      channels: Array.from(ws.subscriptions),
      message: 'Successfully subscribed to notification channels'
    }));
  }

  async handleMarkRead(ws, user, message) {
    const { notificationIds } = message;
    
    try {
      // Update notifications in database
      const { default: Notification } = await import('../models/Notification.js');
      
      await Notification.updateMany(
        {
          _id: { $in: notificationIds },
          userId: user._id
        },
        {
          status: 'read',
          readAt: new Date()
        }
      );

      ws.send(JSON.stringify({
        type: 'notifications_marked_read',
        notificationIds: notificationIds,
        timestamp: new Date().toISOString()
      }));

      // Broadcast to other user connections
      this.broadcastToUser(user._id.toString(), {
        type: 'notifications_updated',
        action: 'marked_read',
        notificationIds: notificationIds
      });

    } catch (error) {
      console.error('Error marking notifications as read:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to mark notifications as read'
      }));
    }
  }

  handleDisconnect(ws, user) {
    if (user) {
      const userId = user._id.toString();
      const hotelId = user.hotelId?.toString();

      // Remove from user clients
      if (this.clients.has(userId)) {
        this.clients.get(userId).delete(ws);
        if (this.clients.get(userId).size === 0) {
          this.clients.delete(userId);
        }
      }

      // Remove from admin clients
      if (user.role === 'admin' && hotelId && this.adminClients.has(hotelId)) {
        this.adminClients.get(hotelId).delete(ws);
        if (this.adminClients.get(hotelId).size === 0) {
          this.adminClients.delete(hotelId);
        }
      }
    }
  }

  // Send notification to specific user
  broadcastToUser(userId, notification) {
    if (this.clients.has(userId)) {
      const userConnections = this.clients.get(userId);
      const message = JSON.stringify({
        type: 'notification',
        data: notification,
        timestamp: new Date().toISOString()
      });

      userConnections.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
          try {
            ws.send(message);
          } catch (error) {
            console.error('Error sending notification to user:', error);
            userConnections.delete(ws);
          }
        } else {
          userConnections.delete(ws);
        }
      });
    }
  }

  // Send notification to all admins in a hotel
  broadcastToAdmins(hotelId, notification) {
    if (this.adminClients.has(hotelId)) {
      const adminConnections = this.adminClients.get(hotelId);
      const message = JSON.stringify({
        type: 'admin_notification',
        data: notification,
        timestamp: new Date().toISOString()
      });

      adminConnections.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
          try {
            // Check if admin is subscribed to this notification type
            if (!ws.subscriptions || ws.subscriptions.has('inventory') || ws.subscriptions.has('all')) {
              ws.send(message);
            }
          } catch (error) {
            console.error('Error sending notification to admin:', error);
            adminConnections.delete(ws);
          }
        } else {
          adminConnections.delete(ws);
        }
      });
    }
  }

  // Send inventory notification to admins
  broadcastInventoryNotification(hotelId, notification) {
    this.broadcastToAdmins(hotelId, {
      ...notification,
      category: 'inventory',
      realtime: true
    });
  }

  // Send system-wide notification
  broadcastToAll(notification) {
    const message = JSON.stringify({
      type: 'system_notification',
      data: notification,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach((connections) => {
      connections.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
          try {
            ws.send(message);
          } catch (error) {
            console.error('Error broadcasting to all clients:', error);
          }
        }
      });
    });
  }

  // Get connection statistics
  getStats() {
    const totalConnections = Array.from(this.clients.values())
      .reduce((total, connections) => total + connections.size, 0);
    
    const totalAdminConnections = Array.from(this.adminClients.values())
      .reduce((total, connections) => total + connections.size, 0);

    return {
      totalConnections,
      totalUsers: this.clients.size,
      totalAdminConnections,
      totalHotelsWithAdmins: this.adminClients.size,
      connectionsByHotel: Object.fromEntries(
        Array.from(this.adminClients.entries()).map(([hotelId, connections]) => [
          hotelId, 
          connections.size
        ])
      )
    };
  }

  // Health check
  isHealthy() {
    return this.wss && this.wss.readyState === this.wss.OPEN;
  }
}

// Export singleton instance
export default new WebSocketService();