import { Injectable, signal } from '@angular/core';

/**
 * Service to track server startup state and show appropriate loading messages
 * when the backend server is taking time to start up (common with free hosting services)
 */
@Injectable({ providedIn: 'root' })
export class ServerStartupService {
  // Signal to track if server startup modal should be shown
  private _showStartupModal = signal(false);
  public showStartupModal = this._showStartupModal.asReadonly();

  // Track pending requests that are taking too long
  private pendingRequests = new Map<string, number>();
  private readonly STARTUP_THRESHOLD = 5000; // Show modal after 5 seconds
  private readonly CONNECTION_ERROR_STATUS = 0; // Status 0 indicates connection error

  /**
   * Called when a request starts - tracks if it takes too long
   */
  onRequestStart(requestId: string): void {
    const startTime = Date.now();
    this.pendingRequests.set(requestId, startTime);

    // Check after threshold time if request is still pending
    setTimeout(() => {
      if (this.pendingRequests.has(requestId)) {
        // Request is still pending after threshold, likely server is starting
        this._showStartupModal.set(true);
      }
    }, this.STARTUP_THRESHOLD);
  }

  /**
   * Called when a request completes or fails
   */
  onRequestEnd(requestId: string, error?: any): void {
    this.pendingRequests.delete(requestId);

    // If this was a connection error (status 0) or timeout, show startup modal
    if (error?.status === this.CONNECTION_ERROR_STATUS || 
        error?.message?.toLowerCase().includes('timeout') ||
        error?.name === 'TimeoutError') {
      this._showStartupModal.set(true);
    } else if (this.pendingRequests.size === 0) {
      // All requests completed successfully, hide modal after a short delay
      setTimeout(() => {
        if (this.pendingRequests.size === 0) {
          this._showStartupModal.set(false);
        }
      }, 500);
    }
  }

  /**
   * Manually hide the startup modal
   */
  hideModal(): void {
    this._showStartupModal.set(false);
  }
}

