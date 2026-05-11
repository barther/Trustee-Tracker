import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PublicClientApplication } from '@azure/msal-browser';
import { initializeMsal, loginRequest } from '../auth/msal';
import { loadEnv, type AppEnv } from '../env';
import { useHashRoute } from '../routing/hashRoute';
import { useStore } from '../store/useStore';
import { AgendaView } from './AgendaView';
import { ItemDetail } from './ItemDetail';

type Phase = 'boot' | 'config-error' | 'signed-out' | 'authenticating' | 'ready';

export function AppShell() {
  const envResult = useMemo(() => loadEnv(), []);
  const [phase, setPhase] = useState<Phase>('boot');
  const [msal, setMsal] = useState<PublicClientApplication | null>(null);
  const [msalError, setMsalError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);

  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const hydrate = useStore((s) => s.hydrate);
  const setConfigError = useStore((s) => s.setConfigError);
  const route = useHashRoute();

  useEffect(() => {
    let cancelled = false;
    if (!envResult.env) {
      setConfigError(envResult.missing);
      setPhase('config-error');
      return;
    }
    (async () => {
      try {
        const instance = await initializeMsal(envResult.env as AppEnv);
        if (cancelled) return;
        setMsal(instance);
        const active = instance.getActiveAccount();
        setAccount(active?.username ?? null);
        setPhase(active ? 'ready' : 'signed-out');
      } catch (err) {
        if (cancelled) return;
        setMsalError(err instanceof Error ? err.message : String(err));
        setPhase('signed-out');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [envResult, setConfigError]);

  useEffect(() => {
    if (phase !== 'ready' || !msal || !envResult.env) return;
    if (status !== 'idle' && status !== 'error') return;
    void hydrate(msal, envResult.env);
  }, [phase, msal, envResult.env, status, hydrate]);

  const signIn = useCallback(async () => {
    if (!msal) return;
    setPhase('authenticating');
    try {
      await msal.loginRedirect(loginRequest);
    } catch (err) {
      setMsalError(err instanceof Error ? err.message : String(err));
      setPhase('signed-out');
    }
  }, [msal]);

  const signOut = useCallback(async () => {
    if (!msal) return;
    await msal.logoutRedirect();
  }, [msal]);

  const retry = useCallback(() => {
    if (!msal || !envResult.env) return;
    void hydrate(msal, envResult.env);
  }, [msal, envResult.env, hydrate]);

  if (phase === 'boot') {
    return <Centered>Starting…</Centered>;
  }

  if (phase === 'config-error') {
    return (
      <Centered>
        <h1>Configuration error</h1>
        <p>The app is missing required environment variables:</p>
        <ul>
          {envResult.missing.map((m) => (
            <li key={m}>
              <code>{m}</code>
            </li>
          ))}
        </ul>
        <p>
          Copy <code>.env.example</code> to <code>.env.local</code> and fill in the values.
        </p>
      </Centered>
    );
  }

  if (phase === 'signed-out' || phase === 'authenticating') {
    return (
      <Centered>
        <h1>Trustees Agenda</h1>
        <p>Sign in with your church Microsoft 365 account to continue.</p>
        {msalError && <p className="error">{msalError}</p>}
        <button onClick={signIn} disabled={phase === 'authenticating' || !msal}>
          {phase === 'authenticating' ? 'Signing in…' : 'Sign in'}
        </button>
      </Centered>
    );
  }

  return (
    <>
      <TopBar account={account} onSignOut={signOut} />
      {status === 'loading' || status === 'idle' ? (
        <Centered>Loading agenda…</Centered>
      ) : status === 'error' && error ? (
        <Centered>
          <h1>{error.kind === 'unprovisioned' ? 'List missing' : 'Could not load'}</h1>
          <p className="error">{error.message}</p>
          <button onClick={retry}>Retry</button>
        </Centered>
      ) : route.view === 'item' ? (
        <ItemDetail itemId={route.itemId} />
      ) : (
        <AgendaView />
      )}
    </>
  );
}

function TopBar({
  account,
  onSignOut,
}: {
  account: string | null;
  onSignOut: () => void;
}) {
  return (
    <div className="topbar">
      <span>{account ?? 'Signed in'}</span>
      <button onClick={onSignOut} className="link">
        Sign out
      </button>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="centered">{children}</div>;
}
