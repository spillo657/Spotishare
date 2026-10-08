/**
 * SpotiShare Web Push & Browser Notifications Utility
 */

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (err) {
    console.error('Service Worker registration failed:', err);
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
    }
    return permission;
  } catch (err) {
    console.error('Notification permission request error:', err);
    return 'denied';
  }
};

export const sendLocalNotification = async (
  title: string,
  options: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  }
) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration && registration.showNotification) {
      await registration.showNotification(title, {
        icon: '/icon.svg',
        badge: '/icon.svg',
        ...options
      });
      return true;
    } else {
      new Notification(title, {
        icon: '/icon.svg',
        ...options
      });
      return true;
    }
  } catch (e) {
    console.error('Error triggering local notification:', e);
    return false;
  }
};

/**
 * Checks if the renewal deadline is approaching and sends an automated notification if not yet sent today.
 */
export const checkAndTriggerAutomatedDeadlineReminder = async (
  daysLeft: number,
  deadlineDateString: string,
  userDebtCount: number,
  quotaAmount: string
) => {
  if (typeof window === 'undefined') return;
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const todayKey = `spotishare_notified_${new Date().toISOString().slice(0, 10)}`;
  const alreadyNotifiedToday = localStorage.getItem(todayKey);

  if (alreadyNotifiedToday) return;

  if (daysLeft <= 4 && daysLeft >= 0) {
    let message = `Il rinnovo del piano Spotify Family è il ${deadlineDateString} (tra ${daysLeft} giorni).`;
    if (userDebtCount > 0) {
      message = `Hai ${userDebtCount} quota/e in sospeso (€${(userDebtCount * parseFloat(quotaAmount)).toFixed(2)}). Ricordati di saldare entro il ${deadlineDateString}!`;
    }

    const success = await sendLocalNotification('🔔 Promemoria Spotify Family', {
      body: message,
      tag: 'deadline-reminder',
      data: { url: '/dashboard' }
    });

    if (success) {
      localStorage.setItem(todayKey, 'true');
    }
  }
};
