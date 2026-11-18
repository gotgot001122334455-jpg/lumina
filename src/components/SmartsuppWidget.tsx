import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

declare global {
  interface Window {
    _smartsupp?: {
      key?: string;
      [key: string]: any;
    };
    smartsupp?: any;
    openSmartsuppChat?: () => void;
  }
}

export function openSmartsuppChat() {
  if (typeof window !== 'undefined' && window.smartsupp) {
    try {
      window.smartsupp('chat:open');
    } catch (e) {
      console.warn('Smartsupp open error:', e);
    }
  }
}

export function SmartsuppWidget() {
  const { user } = useAuth();

  useEffect(() => {
    // Expose open helper globally
    window.openSmartsuppChat = openSmartsuppChat;

    let isMounted = true;

    const loadWidget = async () => {
      try {
        const res = await api.get('/settings/public');
        if (!isMounted) return;

        const { SMARTSUPP_KEY, SMARTSUPP_ENABLED } = res.data || {};
        const key = SMARTSUPP_KEY ? String(SMARTSUPP_KEY).trim() : '';
        const isEnabled = SMARTSUPP_ENABLED !== 'false';

        if (!isEnabled || !key) {
          // If disabled or empty key, close and hide widget if previously loaded
          if (window.smartsupp) {
            try {
              window.smartsupp('chat:close');
              window.smartsupp('theme:hide');
            } catch (e) {
              // Ignore
            }
          }
          return;
        }

        // Configure Smartsupp key
        window._smartsupp = window._smartsupp || {};
        const previousKey = window._smartsupp.key;
        window._smartsupp.key = key;

        // If key changed and script was already loaded, reload script
        const existingScript = document.getElementById('smartsupp-script');
        if (existingScript && previousKey && previousKey !== key) {
          existingScript.remove();
          // Remove existing widget DOM elements created by Smartsupp loader if present
          const existingWidget = document.getElementById('smartsupp-widget') || document.querySelector('iframe[src*="smartsupp"]');
          if (existingWidget) {
            existingWidget.remove();
          }
          window.smartsupp = undefined;
        }

        if (!window.smartsupp && !document.getElementById('smartsupp-script')) {
          const fn: any = function () {
            (fn._ = fn._ || []).push(arguments);
          };
          fn._ = [];
          window.smartsupp = fn;

          const script = document.createElement('script');
          script.id = 'smartsupp-script';
          script.type = 'text/javascript';
          script.charset = 'utf-8';
          script.async = true;
          script.src = 'https://www.smartsuppchat.com/loader.js?';
          document.head.appendChild(script);
        } else if (window.smartsupp) {
          try {
            window.smartsupp('theme:show');
          } catch (e) {
            // Ignore
          }
        }

        // Attach logged-in user profile details for support
        if (user && window.smartsupp) {
          try {
            if (user.email) window.smartsupp('email', user.email);
            if (user.fullName) window.smartsupp('name', user.fullName);
            if (user.accountNumber) window.smartsupp('variables', { accountNumber: user.accountNumber });
          } catch (e) {
            // Ignore
          }
        }
      } catch (err) {
        console.error('Failed to initialize Smartsupp widget:', err);
      }
    };

    loadWidget();

    // Listen to reload events when admin updates settings
    const handleReload = () => {
      loadWidget();
    };

    window.addEventListener('smartsupp:reload', handleReload);

    return () => {
      isMounted = false;
      window.removeEventListener('smartsupp:reload', handleReload);
    };
  }, [user]);

  return null;
}
