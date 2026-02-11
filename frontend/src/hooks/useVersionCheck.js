import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

const CHECK_INTERVAL = 60000; // Check every 60 seconds

export function useVersionCheck() {
  const initialVersion = useRef(null);
  const hasNotified = useRef(false);
  const location = useLocation();

  const isInMeeting = useCallback(() => {
    return location.pathname.includes('/meetings/');
  }, [location.pathname]);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`);
        if (!res.ok) return;

        const data = await res.json();
        const currentVersion = data.version;

        if (!initialVersion.current) {
          // First check - store the version we loaded with
          initialVersion.current = currentVersion;
          return;
        }

        if (currentVersion !== initialVersion.current && !hasNotified.current) {
          hasNotified.current = true;

          if (isInMeeting()) {
            // During a meeting, show a persistent but non-intrusive toast
            toast(
              (t) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>A new version of AXP is available.</span>
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      window.location.reload();
                    }}
                    style={{
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontSize: '13px'
                    }}
                  >
                    Update Now
                  </button>
                </div>
              ),
              { duration: Infinity, id: 'version-update' }
            );
          } else {
            // Not in a meeting - auto-refresh
            toast('Updating to latest version...', { duration: 2000, id: 'version-update' });
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        }
      } catch {
        // Silently ignore fetch errors (offline, etc.)
      }
    };

    // Initial check after a short delay
    const initialTimeout = setTimeout(checkVersion, 5000);

    // Periodic checks
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isInMeeting]);
}

// Component wrapper to use inside Router
export function VersionCheck() {
  useVersionCheck();
  return null;
}
