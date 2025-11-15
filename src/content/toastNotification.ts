interface ToastOptions {
  message: string;
  type?: 'success' | 'celebration' | 'info';
  duration?: number;
  position?: 'top-right' | 'top-center' | 'bottom-right';
}

interface ToastInstance {
  element: HTMLElement;
  timeout?: number;
  cleanup: () => void;
}

class ToastNotificationSystem {
  private static instance: ToastNotificationSystem;
  private container: HTMLElement | null = null;
  private activeToasts: Set<ToastInstance> = new Set();
  private readonly maxToasts = 3;

  static getInstance(): ToastNotificationSystem {
    if (!ToastNotificationSystem.instance) {
      ToastNotificationSystem.instance = new ToastNotificationSystem();
    }
    return ToastNotificationSystem.instance;
  }

  private createContainer(): HTMLElement {
    if (this.container && document.contains(this.container)) {
      return this.container;
    }

    const container = document.createElement('div');
    container.id = 'rekapu-toast-container';
    container.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
    `;

    document.body.appendChild(container);
    this.container = container;
    return container;
  }

  private createToastElement(options: ToastOptions): HTMLElement {
    const toast = document.createElement('div');
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    const baseStyles = `
      background: #202124 !important;
      border: 1px solid #3c4043 !important;
      border-radius: 6px !important;
      padding: 12px 16px !important;
      margin-bottom: 8px !important;
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.85) !important;
      color: #e8eaed !important;
      pointer-events: auto !important;
      max-width: 400px !important;
      min-width: 300px !important;
      position: relative !important;
      overflow: hidden !important;
      transform: translateX(100%) !important;
      transition: transform 0.3s ease, opacity 0.3s ease !important;
      opacity: 0 !important;
    `;

    let typeStyles = '';
    let iconHtml = '';

    switch (options.type) {
      case 'celebration':
        typeStyles = `
          border-left: 4px solid #34A853 !important;
          background: linear-gradient(135deg, #0d1117 0%, #0f1419 100%) !important;
        `;
        iconHtml = '<span style="font-size: 18px; margin-right: 8px;">🎉</span>';
        break;
      case 'success':
        typeStyles = `
          border-left: 4px solid #34A853 !important;
        `;
        iconHtml = '<span style="color: #34A853; margin-right: 8px; font-weight: bold;">✓</span>';
        break;
      case 'info':
      default:
        typeStyles = `
          border-left: 4px solid #8AB4F8 !important;
        `;
        iconHtml = '<span style="color: #8AB4F8; margin-right: 8px; font-weight: bold;">ℹ</span>';
        break;
    }

    toast.style.cssText = baseStyles + typeStyles;

    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      height: 2px !important;
      background: #34A853 !important;
      width: 100% !important;
      transform-origin: left !important;
      transition: transform ${options.duration || 5000}ms linear !important;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      display: flex !important;
      align-items: center !important;
      font-weight: 500 !important;
    `;
    
    // Handle multi-line messages 
    const formattedMessage = options.message.replace(/\n/g, '<br>');
    content.innerHTML = `${iconHtml}${formattedMessage}`;

    toast.appendChild(content);
    toast.appendChild(progressBar);

    return toast;
  }

  show(options: ToastOptions): ToastInstance {
    if (this.activeToasts.size >= this.maxToasts) {
      const oldestToast = this.activeToasts.values().next().value;
      if (oldestToast) {
        this.remove(oldestToast);
      }
    }

    const container = this.createContainer();
    const toastElement = this.createToastElement(options);
    
    container.appendChild(toastElement);

    const progressBar = toastElement.querySelector('div:last-child') as HTMLElement;
    
    const cleanup = () => {
      if (toastInstance.timeout) {
        clearTimeout(toastInstance.timeout);
      }
      this.remove(toastInstance);
    };

    const toastInstance: ToastInstance = {
      element: toastElement,
      cleanup
    };

    this.activeToasts.add(toastInstance);

    requestAnimationFrame(() => {
      toastElement.style.transform = 'translateX(0)';
      toastElement.style.opacity = '1';
      
      if (progressBar) {
        requestAnimationFrame(() => {
          progressBar.style.transform = 'scaleX(0)';
        });
      }
    });

    const duration = options.duration || 5000;
    toastInstance.timeout = window.setTimeout(() => {
      cleanup();
    }, duration);

    toastElement.addEventListener('click', cleanup);

    return toastInstance;
  }

  private remove(toastInstance: ToastInstance): void {
    if (!this.activeToasts.has(toastInstance)) {
      return;
    }

    this.activeToasts.delete(toastInstance);
    
    const element = toastInstance.element;
    element.style.transform = 'translateX(100%)';
    element.style.opacity = '0';

    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      
      if (this.activeToasts.size === 0 && this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
        this.container = null;
      }
    }, 300);

    if (toastInstance.timeout) {
      clearTimeout(toastInstance.timeout);
    }
  }

  clear(): void {
    this.activeToasts.forEach(toast => {
      this.remove(toast);
    });
  }

  showCelebration(message: string, duration: number = 7000): ToastInstance {
    return this.show({
      message,
      type: 'celebration',
      duration,
      position: 'top-right'
    });
  }
}

export const ToastNotification = ToastNotificationSystem.getInstance(); 