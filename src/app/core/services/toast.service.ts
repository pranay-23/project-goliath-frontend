import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})

export class ToastService {
  private lastToast: { type: string; detail: string } | null = null;

  constructor(private readonly messageService: MessageService) {}

  showToast(
    type: 'success' | 'error' | 'info' | 'warn',
    summary: string,
    detail: string,
    position:
      | 'top-left'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-right'
      | 'bottom-center'
      | 'center' = 'top-right'
  ) {
    // Check if the same type and detail are already shown    
    if (
      this.lastToast &&
      this.lastToast.type === type &&
      this.lastToast.detail === detail
    ) {
      // Same toast already shown — skip
      return;
    }

    // Clear existing toasts before showing a new one
    //this.messageService.clear();

    // Show the new toast
    this.messageService.add({
      severity: type,
      summary,
      detail,
      key: position,
    });

    // Update last shown toast info
    this.lastToast = { type, detail };

    // Optional: reset after timeout (e.g., 5s)
    setTimeout(() => {
      this.lastToast = null;
    }, 3000);
  }

  clear() {
    this.messageService.clear();
    this.lastToast = null;
  }
}