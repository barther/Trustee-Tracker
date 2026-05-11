import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { AppShell } from './components/AppShell';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);

// Service worker: check for updates on every launch and apply
// immediately. Avoids the "delete and reinstall" routine — when the
// user opens the PWA after a deploy, the new build takes over after a
// silent reload.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
});

if ('serviceWorker' in navigator) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then((r) => {
        void r?.update();
      });
    }
  });
}
