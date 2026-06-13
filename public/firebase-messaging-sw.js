/* Astikan Firebase Cloud Messaging service worker.
 * Replace /firebase-config.json with real Firebase web app config during deployment.
 */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

function isPlaceholder(value) {
  return !value || String(value).startsWith('REPLACE_') || String(value).includes('your-');
}

async function initFirebaseMessaging() {
  try {
    const res = await fetch('/firebase-config.json', { cache: 'no-store' });
    const config = await res.json();
    if (!config || isPlaceholder(config.apiKey) || isPlaceholder(config.projectId) || isPlaceholder(config.messagingSenderId) || isPlaceholder(config.appId)) {
      console.warn('[Astikan Push] Firebase config is not configured yet.');
      return;
    }
    firebase.initializeApp(config);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const notification = payload.notification || {};
      const data = payload.data || {};
      const title = notification.title || data.title || 'Astikan Healthcare';
      const options = {
        body: notification.body || data.body || 'You have a new Astikan update.',
        icon: notification.icon || '/icons/icon-192.png',
        badge: notification.badge || '/icons/icon-192.png',
        data: { url: data.click_action || data.link || '/' },
      };
      self.registration.showNotification(title, options);
    });
  } catch (error) {
    console.warn('[Astikan Push] Firebase messaging worker init failed.', error);
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(clients.openWindow(targetUrl));
});

initFirebaseMessaging();
