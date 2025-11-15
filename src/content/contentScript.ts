// Content script for Rekapu extension - Iframe Overlay Approach
/// <reference path="../types/globals.d.ts" />

// Import toast notification system
import { ToastNotification } from './toastNotification';

interface DomainCheckResponse {
  blocked: boolean;
  domain: string;
  timeRemaining?: number;
  settings?: any;
  error?: string;
  caughtUp?: boolean;
  shouldShowToast?: boolean;
  message?: string;
}

interface CardData {
  id: string;
  type: 'basic' | 'cloze';
  front: string;
  back: string;
  options?: string[];
  tags: string[];
}

// State management
let isBlocked = false;
let overlayElement: HTMLElement | null = null;
let domainName = '';

// Page loading state
let isPageFullyLoaded = false;

// Track if we've already initialized to prevent duplicate listeners
let isContentScriptInitialized = false;

/**
 * Wait for page to be fully loaded
 */
function waitForPageFullyLoaded(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      isPageFullyLoaded = true;
      resolve();
      return;
    }
    
    window.addEventListener('load', () => {
      isPageFullyLoaded = true;
      resolve();
    }, { once: true });
  });
}



/**
 * Send message to background script with promise wrapper and context invalidation handling
 */
async function sendMessageToBackground(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // Check if runtime is available (extension context still valid)
      if (!chrome.runtime?.id) {
        reject(new Error('Extension context invalidated'));
        return;
      }

      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError;
          
          // Handle specific case of extension context invalidation
          if (error.message?.includes('Extension context invalidated') ||
              error.message?.includes('receiving end does not exist') ||
              error.message?.includes('Could not establish connection')) {
            reject(new Error('CONTEXT_INVALIDATED'));
          } else {
            reject(error);
          }
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(new Error('Extension context invalidated'));
    }
  });
}

/**
 * Wait for document body to be available
 */
function waitForBody(): Promise<void> {
  return new Promise((resolve) => {
    if (document.body) {
      resolve();
      return;
    }
    
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect();
        resolve();
      }
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  });
}

/**
 * Wait for page content to be ready (handles SPAs)
 */
function waitForPageContent(): Promise<void> {
  return new Promise((resolve) => {
    // Wait for DOM to be ready
    if (document.readyState === 'complete') {
      resolve();
      return;
    }
    
    // For SPAs, also wait a bit longer to ensure content is loaded
    const checkReady = () => {
      if (document.readyState === 'complete') {
        // Extra delay for SPAs like Telegram
        setTimeout(resolve, 500);
      } else {
        setTimeout(checkReady, 100);
      }
    };
    
    checkReady();
  });
}

/**
 * Show celebration toast for caught-up state (with queuing for page load)
 */
async function showCelebrationToast(message: string): Promise<void> {
  try {
    if (isPageFullyLoaded) {
      // Page is ready, show toast immediately
      ToastNotification.showCelebration(message, 7000);
    } else {
      // Page not ready, wait for it to load then show this specific toast
      await waitForPageFullyLoaded();
      ToastNotification.showCelebration(message, 7000);
    }
  } catch (error) {
    console.error('Error showing celebration toast:', error);
  }
}

/**
 * Check if current domain should be blocked
 */
async function checkDomainBlocking(): Promise<void> {
  try {
    domainName = window.location.hostname.replace(/^www\./, '');
    
    const response: DomainCheckResponse = await sendMessageToBackground({
      action: 'checkDomainBlocked',
      data: { domain: domainName }
    });
    
    if (response.caughtUp) {
      // User is caught up - remove overlay if it exists
      if (overlayElement) {
        removeOverlay();
      }
      
      // Show celebration toast for first visit today
      if (response.shouldShowToast && response.message) {
        await showCelebrationToast(response.message);
        
        // Record that toast was shown (with error handling)
        try {
          await sendMessageToBackground({
            action: 'toast_recordShown',
            data: { domain: domainName }
          });
        } catch (toastError) {
          // Silently fail if context is invalidated - toast showing is not critical
          if (!(toastError instanceof Error && toastError.message === 'CONTEXT_INVALIDATED')) {
            console.error('Error recording toast shown:', toastError);
          }
        }
      }
    } else if (response.blocked) {
      // Normal blocking behavior - user has cards due
      if (overlayElement) {
        // Overlay already exists - refresh it with new card
        const iframe = overlayElement.querySelector('iframe');
        if (iframe) {
          iframe.src = chrome.runtime.getURL('blocked.html') + '?blocked=' + encodeURIComponent(domainName) + '&refresh=' + Date.now();
        }
      } else {
        // No overlay - show it
        await showBlockingOverlay();
      }
    } else {
      // Not blocked - remove overlay if it exists
      if (overlayElement) {
        removeOverlay();
      }
    }
  } catch (error) {
    // Handle extension context invalidation gracefully
    if (error instanceof Error && error.message === 'CONTEXT_INVALIDATED') {
      return; // Silently stop execution - this is expected behavior
    }
    
    // Log other unexpected errors
    console.error('Error checking domain blocking:', error);
  }
}

/**
 * Create and show the blocking overlay with iframe
 */
async function showBlockingOverlay(): Promise<void> {
  // Prevent duplicate overlays
  if (overlayElement) {
    return;
  }
  
  isBlocked = true;
  
  // Wait for content to be ready (especially for SPAs)
  await waitForPageContent();
  
  // Create a dark overlay with backdrop-filter for universal blur
  // This approach works on all sites including those with aggressive CSS like Reddit
  const darkOverlay = document.createElement('div');
  darkOverlay.id = 'rekapu-dark-overlay';
  darkOverlay.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0, 0, 0, 0.4) !important;
    backdrop-filter: blur(5px) !important;
    -webkit-backdrop-filter: blur(5px) !important;
    z-index: 2147483646 !important;
    pointer-events: none !important;
  `;
  document.body.appendChild(darkOverlay);
  
  // Block scrolling on the page without affecting scroll position
  // Use html element instead of body to preserve scroll position
  document.documentElement.style.overflow = 'hidden';
  
  // Create overlay container with transparent background
  overlayElement = document.createElement('div');
  overlayElement.id = 'rekapu-overlay';
  
  // Style the overlay container with transparent background
  overlayElement.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 2147483647 !important;
    background: transparent !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  `;
  
  // Create CSS-isolated wrapper for the iframe
  const iframeWrapper = document.createElement('div');
  iframeWrapper.style.cssText = `
    width: 100% !important;
    height: 100% !important;
    position: relative !important;
    background: transparent !important;
    background-color: transparent !important;
    isolation: isolate !important;
    contain: layout style !important;
  `;
  
  // Create iframe element
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    width: 100% !important;
    height: 100% !important;
    border: none !important;
    background: transparent !important;
    background-color: transparent !important;
    color-scheme: auto !important;
    opacity: 1 !important;
  `;
  
  // Set iframe allowTransparency attribute for older browsers
  iframe.setAttribute('allowTransparency', 'true');
  
  // Force transparency with additional attributes and prevent CSS inheritance
  iframe.setAttribute('data-transparency', 'true');
  iframe.style.setProperty('background', 'transparent', 'important');
  iframe.style.setProperty('background-color', 'transparent', 'important');
  iframe.style.setProperty('background-image', 'none', 'important');
  iframe.style.setProperty('background-attachment', 'scroll', 'important');
  iframe.style.setProperty('background-repeat', 'repeat', 'important');
  iframe.style.setProperty('background-position', '0% 0%', 'important');
  
  // Load the blocked.html file
  iframe.src = chrome.runtime.getURL('blocked.html') + '?blocked=' + encodeURIComponent(domainName);
  
  // Listen for messages from the iframe (when domain is unblocked)
  window.addEventListener('message', handleIframeMessage);
  
  // Append iframe to wrapper, then wrapper to overlay
  iframeWrapper.appendChild(iframe);
  overlayElement.appendChild(iframeWrapper);
  document.body.appendChild(overlayElement);
}

/**
 * Handle messages from the iframe
 */
function handleIframeMessage(event: MessageEvent): void {
  // Only accept messages from our extension
  if (event.origin !== `chrome-extension://${chrome.runtime.id}`) {
    return;
  }
  
  if (event.data.type === 'DOMAIN_UNBLOCKED') {
    removeOverlay();
  }
}

/**
 * Remove overlay and reset state
 */
function removeOverlay(): void {
  if (overlayElement) {
    try {
      overlayElement.remove();
    } catch (error) {
      console.warn('Rekapu: Could not remove overlay element:', error);
    }
    overlayElement = null;
  }
  
  // Remove dark overlay (which has the backdrop-filter)
  const darkOverlay = document.getElementById('rekapu-dark-overlay');
  if (darkOverlay) {
    try {
      darkOverlay.remove();
    } catch (error) {
      console.warn('Rekapu: Could not remove dark overlay:', error);
    }
  }
  
  // Restore scrolling
  document.documentElement.style.overflow = '';
  
  window.removeEventListener('message', handleIframeMessage);
  isBlocked = false;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  // Check if extension context is still valid
  if (!chrome.runtime?.id) {
    return;
  }

  switch (message.type) {
    case 'DOMAIN_UNBLOCKED':
      removeOverlay();
      sendResponse({ success: true });
      break;
    case 'RECHECK_DOMAIN_BLOCKING':
      // Re-check domain blocking when cooldown expires
      checkDomainBlocking().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        if (error instanceof Error && error.message === 'CONTEXT_INVALIDATED') {
          sendResponse({ success: false, error: 'Extension context invalidated' });
        } else {
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });
      return true; // Async response
    // Removed FORCE_RELOAD case - no longer refreshing pages to preserve state
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  return true;
});

// Listener references for cleanup
let visibilityChangeHandler: (() => void) | null = null;
let popstateHandler: (() => void) | null = null;
let hashchangeHandler: (() => void) | null = null;
let originalPushState: typeof history.pushState | null = null;
let originalReplaceState: typeof history.replaceState | null = null;

/**
 * Cleanup all event listeners and restore original history methods
 */
function cleanupEventListeners(): void {
  if (visibilityChangeHandler) {
    document.removeEventListener('visibilitychange', visibilityChangeHandler);
    visibilityChangeHandler = null;
  }
  
  if (popstateHandler) {
    window.removeEventListener('popstate', popstateHandler);
    popstateHandler = null;
  }
  
  if (hashchangeHandler) {
    window.removeEventListener('hashchange', hashchangeHandler);
    hashchangeHandler = null;
  }
  
  // Restore original history methods if we modified them
  if (originalPushState) {
    history.pushState = originalPushState;
    originalPushState = null;
  }
  
  if (originalReplaceState) {
    history.replaceState = originalReplaceState;
    originalReplaceState = null;
  }
}

// Initialize domain blocking check after body loads
(async function initializeBlocking() {
  try {
    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      return;
    }
    
    // Prevent duplicate initialization
    if (isContentScriptInitialized) {
      return;
    }
    isContentScriptInitialized = true;

    // Wait for body to be available
    await waitForBody();
    
    // Initial check
    await checkDomainBlocking();
    
    // Listen for visibility changes (tab activation/suspension)
    visibilityChangeHandler = async () => {
      // When tab becomes visible, re-check blocking status
      if (document.visibilityState === 'visible') {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          cleanupEventListeners();
          return;
        }
        
        // Re-check domain blocking to sync with current state
        try {
          await checkDomainBlocking();
        } catch (error) {
          if (!(error instanceof Error && error.message === 'CONTEXT_INVALIDATED')) {
            console.error('Error re-checking domain blocking on visibility change:', error);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', visibilityChangeHandler);
    
    // Listen for SPA navigation (much more efficient than MutationObserver)
    // Handle popstate (back/forward navigation)
    popstateHandler = async () => {
      if (!chrome.runtime?.id) {
        cleanupEventListeners();
        return;
      }
      try {
        await checkDomainBlocking();
      } catch (error) {
        if (!(error instanceof Error && error.message === 'CONTEXT_INVALIDATED')) {
          console.error('Error re-checking on popstate:', error);
        }
      }
    };
    window.addEventListener('popstate', popstateHandler);
    
    // Handle hash changes
    hashchangeHandler = async () => {
      if (!chrome.runtime?.id) {
        cleanupEventListeners();
        return;
      }
      try {
        await checkDomainBlocking();
      } catch (error) {
        if (!(error instanceof Error && error.message === 'CONTEXT_INVALIDATED')) {
          console.error('Error re-checking on hashchange:', error);
        }
      }
    };
    window.addEventListener('hashchange', hashchangeHandler);
    
    // Intercept pushState and replaceState for SPAs that use History API
    // Only wrap if not already wrapped (prevent double-wrapping)
    if (!originalPushState) {
      originalPushState = history.pushState;
      history.pushState = function(...args) {
        originalPushState!.apply(this, args);
        if (chrome.runtime?.id) {
          checkDomainBlocking().catch(error => {
            if (!(error instanceof Error && error.message === 'CONTEXT_INVALIDATED')) {
              console.error('Error re-checking on pushState:', error);
            }
          });
        } else {
          cleanupEventListeners();
        }
      };
    }
    
    if (!originalReplaceState) {
      originalReplaceState = history.replaceState;
      history.replaceState = function(...args) {
        originalReplaceState!.apply(this, args);
        if (chrome.runtime?.id) {
          checkDomainBlocking().catch(error => {
            if (!(error instanceof Error && error.message === 'CONTEXT_INVALIDATED')) {
              console.error('Error re-checking on replaceState:', error);
            }
          });
        } else {
          cleanupEventListeners();
        }
      };
    }
    
    // Clean up when page unloads (just in case)
    window.addEventListener('unload', cleanupEventListeners, { once: true });
    
  } catch (error) {
    if (!(error instanceof Error && error.message === 'CONTEXT_INVALIDATED')) {
      console.error('Error initializing Rekapu blocking:', error);
    }
  }
})(); 