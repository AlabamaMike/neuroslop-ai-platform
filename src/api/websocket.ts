/**
 * WebSocket Server
 * Real-time signal updates via WebSocket
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { Signal, TrendingSignal, WebSocketMessage } from '../signals/types.js';
import { SignalDetector } from '../signals/detector.js';
import { logger } from './middleware/logger.js';

export class SignalWebSocketServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket>;
  private detector: SignalDetector;

  constructor(server: Server, detector: SignalDetector) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
    });

    this.clients = new Set();
    this.detector = detector;

    this.setupWebSocket();
    this.setupSignalListeners();
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      logger.info('WebSocket client connected', {
        ip: req.socket.remoteAddress,
      });

      this.clients.add(ws);

      // Send welcome message
      this.sendToClient(ws, {
        type: 'signal_detected',
        timestamp: new Date(),
        data: {
          message: 'Connected to signal stream',
          activeSignals: this.detector.getActiveSignals().length,
        } as any,
      });

      // Handle client messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          logger.error('WebSocket message parse error', { error });
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket error', { error });
        this.clients.delete(ws);
      });
    });

    logger.info('WebSocket server initialized');
  }

  private setupSignalListeners(): void {
    // Listen for new signals
    this.detector.onSignalDetected((signal: Signal) => {
      this.broadcastSignal(signal);
    });
  }

  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        // Client subscribes to specific signal types
        logger.info('Client subscribed', {
          types: message.signalTypes,
        });
        break;

      case 'unsubscribe':
        // Client unsubscribes from signal types
        logger.info('Client unsubscribed', {
          types: message.signalTypes,
        });
        break;

      case 'ping':
        // Respond to ping
        this.sendToClient(ws, {
          type: 'signal_detected',
          timestamp: new Date(),
          data: { message: 'pong' } as any,
        });
        break;

      default:
        logger.warn('Unknown message type', { type: message.type });
    }
  }

  /**
   * Broadcast a new signal to all connected clients
   */
  private broadcastSignal(signal: Signal): void {
    const message: WebSocketMessage = {
      type: 'signal_detected',
      timestamp: new Date(),
      data: signal,
    };

    this.broadcast(message);
  }

  /**
   * Broadcast trending signals update
   */
  public broadcastTrendingUpdate(trending: TrendingSignal[]): void {
    const message: WebSocketMessage = {
      type: 'trending_update',
      timestamp: new Date(),
      data: trending,
    };

    this.broadcast(message);
  }

  /**
   * Broadcast signal update
   */
  public broadcastSignalUpdate(signal: Signal): void {
    const message: WebSocketMessage = {
      type: 'signal_updated',
      timestamp: new Date(),
      data: signal,
    };

    this.broadcast(message);
  }

  /**
   * Broadcast signal expiration
   */
  public broadcastSignalExpired(signal: Signal): void {
    const message: WebSocketMessage = {
      type: 'signal_expired',
      timestamp: new Date(),
      data: signal,
    };

    this.broadcast(message);
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Failed to send message to client', { error });
      }
    }
  }

  /**
   * Broadcast message to all clients
   */
  private broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
        } catch (error) {
          logger.error('Failed to broadcast to client', { error });
        }
      }
    });

    logger.info('Broadcasted message', {
      type: message.type,
      clients: this.clients.size,
    });
  }

  /**
   * Get connected clients count
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Close all connections
   */
  public close(): void {
    this.clients.forEach((client) => {
      client.close();
    });

    this.wss.close();
    logger.info('WebSocket server closed');
  }
}
