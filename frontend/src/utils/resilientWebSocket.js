/**
 * ResilientWebSocket - Auto-reconnecting WebSocket wrapper for meeting transcription
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection state management
 * - Toast notifications for connection status
 * - Session recovery support
 * - Graceful error handling
 */

export class ResilientWebSocket {
  constructor(url, onMessage, options = {}) {
    this.url = url;
    this.onMessage = onMessage;
    this.options = {
      maxReconnectAttempts: 5,
      initialDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      showToasts: true,
      ...options
    };
    
    this.ws = null;
    this.reconnectAttempts = 0;
    this.isIntentionallyClosed = false;
    this.reconnectTimer = null;
    
    // Bind methods to preserve context
    this.connect = this.connect.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleClose = this.handleClose.bind(this);
    
    // Start initial connection
    this.connect();
  }
  
  connect() {
    if (this.isIntentionallyClosed) {
      console.log('[ResilientWS] Not connecting - intentionally closed');
      return;
    }
    
    try {
      console.log(`[ResilientWS] Connecting to ${this.url}`);
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onerror = this.handleError;
      this.ws.onclose = this.handleClose;
      
    } catch (error) {
      console.error('[ResilientWS] Connection error:', error);
      this.attemptReconnect();
    }
  }
  
  handleOpen(event) {
    console.log('[ResilientWS] Connected successfully');
    this.reconnectAttempts = 0;
    
    // Show success notification if this was a reconnection
    if (this.reconnectAttempts > 0 && this.options.showToasts) {
      this.showToast('Reconnected! Transcription resumed.', 'success');
    }
    
    // Try to recover session if reconnecting
    if (this.reconnectAttempts > 0 && this.options.onReconnect) {
      this.options.onReconnect(event);
    }
    
    // Call custom onOpen handler if provided
    if (this.options.onOpen) {
      this.options.onOpen(event);
    }
  }
  
  handleMessage(event) {
    try {
      // Forward message to the provided handler
      this.onMessage(event);
    } catch (error) {
      console.error('[ResilientWS] Error in message handler:', error);
    }
  }
  
  handleError(error) {
    console.error('[ResilientWS] WebSocket error:', error);
    
    // Call custom onError handler if provided
    if (this.options.onError) {
      this.options.onError(error);
    }
  }
  
  handleClose(event) {
    if (this.isIntentionallyClosed) {
      console.log('[ResilientWS] Closed intentionally');
      return;
    }
    
    console.warn(`[ResilientWS] Connection closed unexpectedly (code: ${event.code}, reason: ${event.reason})`);
    
    // Call custom onClose handler if provided
    if (this.options.onClose) {
      this.options.onClose(event);
    }
    
    this.attemptReconnect();
  }
  
  attemptReconnect() {
    if (this.isIntentionallyClosed) {
      return;
    }
    
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('[ResilientWS] Max reconnection attempts reached');
      if (this.options.showToasts) {
        this.showToast('Connection lost. Please refresh the page.', 'error');
      }
      return;
    }
    
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.options.initialDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.options.maxDelay
    );
    
    console.log(`[ResilientWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`);
    
    if (this.options.showToasts) {
      this.showToast(
        `Connection lost. Reconnecting (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})...`,
        'warning'
      );
    }
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
      return true;
    } else {
      console.warn('[ResilientWS] Cannot send - WebSocket not connected');
      return false;
    }
  }
  
  close() {
    console.log('[ResilientWS] Closing connection intentionally');
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client closing connection');
    }
  }
  
  // Save session state for recovery
  saveSessionState(transcriptId, partialTranscript) {
    if (this.options.onSaveSession) {
      this.options.onSaveSession(transcriptId, partialTranscript);
    }
  }
  
  // Recover session state after reconnection
  recoverSessionState(transcriptId) {
    if (this.options.onRecoverSession) {
      return this.options.onRecoverSession(transcriptId);
    }
    return null;
  }
  
  // Get current connection state
  getReadyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
  
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
  
  // Toast notification helper
  showToast(message, type = 'info') {
    // Try to use existing toast system if available
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }
    
    // Fallback to console if no toast system
    const logLevel = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'info';
    console[logLevel](`[Toast] ${message}`);
    
    // Simple visual feedback - create temporary notification
    if (this.options.showToasts) {
      this.createSimpleToast(message, type);
    }
  }
  
  createSimpleToast(message, type) {
    // Create a simple toast element for visual feedback
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: opacity 0.3s ease;
      background-color: ${
        type === 'error' ? '#ef4444' : 
        type === 'warning' ? '#f59e0b' : 
        type === 'success' ? '#10b981' : '#3b82f6'
      };
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }
}

export default ResilientWebSocket;