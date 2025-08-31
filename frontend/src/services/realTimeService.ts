import React from 'react';

// Browser-compatible EventEmitter implementation
class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function): this {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  off(event: string, listener: Function): this {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this.events[event]) return false;
    this.events[event].forEach(listener => listener(...args));
    return true;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }
}

export interface RealTimeEvent {
  type: string;
  entity: string;
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
  data: any;
  timestamp: string;
  userId?: string;
  hotelId?: string;
}

export interface RealTimeConfig {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

class RealTimeService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<RealTimeConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private isConnected = false;
  private isConnecting = false;
  private shouldReconnect = true;
  private subscriptions = new Set<string>();
  private messageQueue: any[] = [];

  constructor(config: RealTimeConfig = {}) {
    super();
    
    this.config = {
      url: config.url || this.getWebSocketUrl(),
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      debug: config.debug || false,
    };

    // Bind methods to preserve context
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/notifications`;
  }

  private log(message: string, ...args: any[]) {
    if (this.config.debug) {
      console.log(`[RealTimeService] ${message}`, ...args);
    }
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected || this.isConnecting) {
        resolve();
        return;
      }

      const token = this.getAuthToken();
      if (!token) {
        reject(new Error('No authentication token available'));
        return;
      }

      this.isConnecting = true;
      this.shouldReconnect = true;

      try {
        // Add auth token to WebSocket URL
        const url = `${this.config.url}?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.handleOpen();
          resolve();
        };
        this.ws.onmessage = this.handleMessage;
        this.ws.onerror = (error) => {
          this.handleError(error);
          if (this.isConnecting) {
            reject(error);
          }
        };
        this.ws.onclose = this.handleClose;

        // Connection timeout
        setTimeout(() => {
          if (this.isConnecting && !this.isConnected) {
            reject(new Error('WebSocket connection timeout'));
            this.disconnect();
          }
        }, 10000);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    this.isConnecting = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.subscriptions.clear();
    this.messageQueue = [];

    this.emit('disconnected');
    this.log('Disconnected from WebSocket');
  }

  private handleOpen(): void {
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    this.log('Connected to WebSocket');
    this.emit('connected');

    // Start heartbeat
    this.startHeartbeat();

    // Re-subscribe to previous subscriptions
    this.subscriptions.forEach(subscription => {
      this.sendMessage({ type: 'subscribe', subscription });
    });

    // Send queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      this.log('Received message:', message);

      switch (message.type) {
        case 'pong':
          // Heartbeat response
          break;
        case 'event':
          this.handleRealTimeEvent(message.data);
          break;
        case 'error':
          this.log('Server error:', message.error);
          this.emit('error', new Error(message.error));
          break;
        case 'subscribed':
          this.log('Subscribed to:', message.subscription);
          break;
        case 'unsubscribed':
          this.log('Unsubscribed from:', message.subscription);
          break;
        default:
          this.log('Unknown message type:', message.type);
      }
    } catch (error) {
      this.log('Error parsing message:', error);
    }
  }

  private handleRealTimeEvent(eventData: RealTimeEvent): void {
    this.log('Real-time event:', eventData);
    
    // Emit general event
    this.emit('event', eventData);
    
    // Emit specific events
    this.emit(`${eventData.entity}:${eventData.action}`, eventData.data);
    this.emit(`${eventData.entity}:*`, eventData);
    this.emit('*', eventData);
  }

  private handleError(error: Event): void {
    this.log('WebSocket error:', error);
    this.emit('error', error);
  }

  private handleClose(event: CloseEvent): void {
    this.isConnected = false;
    this.isConnecting = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.log('WebSocket closed:', event.code, event.reason);
    this.emit('disconnected', { code: event.code, reason: event.reason });

    // Attempt reconnection if should reconnect and within limits
    if (this.shouldReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    const delay = this.config.reconnectInterval * Math.pow(2, Math.min(this.reconnectAttempts, 5));
    this.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this.emit('reconnecting', this.reconnectAttempts);
      
      this.connect().catch(error => {
        this.log('Reconnection failed:', error);
      });
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  private sendMessage(message: any): void {
    if (!this.isConnected || !this.ws) {
      this.messageQueue.push(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.log('Sent message:', message);
    } catch (error) {
      this.log('Error sending message:', error);
      this.messageQueue.push(message);
    }
  }

  // Public API methods

  public subscribe(subscription: string): void {
    this.subscriptions.add(subscription);
    if (this.isConnected) {
      this.sendMessage({ type: 'subscribe', subscription });
    }
  }

  public unsubscribe(subscription: string): void {
    this.subscriptions.delete(subscription);
    if (this.isConnected) {
      this.sendMessage({ type: 'unsubscribe', subscription });
    }
  }

  public getConnectionState(): 'connected' | 'connecting' | 'disconnected' {
    if (this.isConnected) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }

  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  // Entity-specific subscription helpers

  public subscribeToMaintenance(): void {
    this.subscribe('maintenance:*');
  }

  public subscribeToGuestServices(): void {
    this.subscribe('guest-services:*');
  }

  public subscribeToSupplyRequests(): void {
    this.subscribe('supply-requests:*');
  }

  public subscribeToHousekeeping(): void {
    this.subscribe('housekeeping:*');
  }

  public subscribeToRooms(): void {
    this.subscribe('rooms:*');
  }

  public subscribeToInventory(): void {
    this.subscribe('inventory:*');
  }

  // Entity-specific event handlers

  public onMaintenanceUpdate(callback: (data: any) => void): void {
    this.on('maintenance:updated', callback);
  }

  public onMaintenanceCreate(callback: (data: any) => void): void {
    this.on('maintenance:created', callback);
  }

  public onGuestServiceUpdate(callback: (data: any) => void): void {
    this.on('guest-services:updated', callback);
  }

  public onSupplyRequestUpdate(callback: (data: any) => void): void {
    this.on('supply-requests:updated', callback);
  }

  public onRoomStatusChange(callback: (data: any) => void): void {
    this.on('rooms:status_changed', callback);
  }

  // Utility methods

  public isConnectedToServer(): boolean {
    return this.isConnected;
  }

  public reconnect(): void {
    if (this.isConnected) {
      this.disconnect();
    }
    this.connect().catch(error => {
      this.log('Manual reconnection failed:', error);
    });
  }
}

// Create singleton instance
export const realTimeService = new RealTimeService();

// React hook for using real-time service
export const useRealTime = () => {
  const [connectionState, setConnectionState] = React.useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = React.useState(0);

  React.useEffect(() => {
    const updateConnectionState = () => {
      setConnectionState(realTimeService.getConnectionState());
      setReconnectAttempts(realTimeService.getReconnectAttempts());
    };

    realTimeService.on('connected', updateConnectionState);
    realTimeService.on('disconnected', updateConnectionState);
    realTimeService.on('reconnecting', updateConnectionState);

    updateConnectionState();

    return () => {
      realTimeService.off('connected', updateConnectionState);
      realTimeService.off('disconnected', updateConnectionState);
      realTimeService.off('reconnecting', updateConnectionState);
    };
  }, []);

  return {
    connectionState,
    reconnectAttempts,
    connect: () => realTimeService.connect(),
    disconnect: () => realTimeService.disconnect(),
    subscribe: (subscription: string) => realTimeService.subscribe(subscription),
    unsubscribe: (subscription: string) => realTimeService.unsubscribe(subscription),
    on: (event: string, callback: (...args: any[]) => void) => realTimeService.on(event, callback),
    off: (event: string, callback: (...args: any[]) => void) => realTimeService.off(event, callback),
    isConnected: realTimeService.isConnectedToServer(),
  };
};

export default realTimeService;