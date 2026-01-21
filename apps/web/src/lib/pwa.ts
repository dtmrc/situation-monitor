/**
 * PWA Service Worker Registration
 *
 * Handles service worker registration for offline support and PWA functionality.
 */

type UpdateCallback = () => void;

let updateCallback: UpdateCallback | null = null;

/**
 * Set a callback to be called when a new version is available
 */
export function onUpdateAvailable(callback: UpdateCallback): void {
  updateCallback = callback;
}

/**
 * Check if the browser supports service workers
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Register the PWA service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.log('Service workers are not supported');
    return null;
  }

  try {
    // In development, Vite handles this differently
    if (import.meta.env.DEV) {
      console.log('PWA disabled in development mode');
      return null;
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service worker registered:', registration.scope);

    // Check for updates periodically
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, notify the user
            console.log('New content available, please refresh');
            updateCallback?.();
          }
        });
      }
    });

    // Check for updates on page load
    await registration.update();

    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister all service workers
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    return registration.unregister();
  }
  return false;
}

/**
 * Skip waiting and activate the new service worker
 */
export function skipWaiting(): void {
  if (!isServiceWorkerSupported()) {
    return;
  }

  navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Check if the app is running as an installed PWA
 */
export function isRunningAsPWA(): boolean {
  // Check display-mode media query
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check iOS specific property
  if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone) {
    return true;
  }

  return false;
}

/**
 * Check if the app can be installed
 */
export function canInstall(): boolean {
  // The beforeinstallprompt event is only available in Chromium browsers
  return 'BeforeInstallPromptEvent' in window;
}

// Store the install prompt event for later use
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Listen for the beforeinstallprompt event
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Store the event for later use
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

/**
 * Prompt the user to install the PWA
 */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  // Show the install prompt
  await deferredPrompt.prompt();

  // Wait for the user to respond
  const { outcome } = await deferredPrompt.userChoice;

  // Clear the deferred prompt
  deferredPrompt = null;

  return outcome === 'accepted';
}

/**
 * Check if there's a pending install prompt
 */
export function hasInstallPrompt(): boolean {
  return deferredPrompt !== null;
}

/**
 * Register for push notifications
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;

  // Check if push is supported
  if (!('pushManager' in registration)) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // In production, you would get this from your server
      applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined,
    });

    console.log('Push subscription:', subscription);
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  return Notification.requestPermission();
}
