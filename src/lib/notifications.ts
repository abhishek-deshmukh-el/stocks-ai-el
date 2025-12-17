/**
 * Send browser notification
 */
export async function sendBrowserNotification(
  title: string,
  body: string,
  icon?: string
): Promise<void> {
  // Check if the browser supports notifications
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return;
  }

  // Request permission if not granted
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return;
    }
  }

  // Send notification if permission granted
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'stock-volatility',
      requireInteraction: false,
    });
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}
