import type { PublicClientApplication } from '@azure/msal-browser';
import { create } from 'zustand';
import { createGraphClient } from '../graph/client';
import {
  ListMissingError,
  fetchActionItems,
  fetchItems,
  fetchMeetingEntries,
} from '../graph/api';
import type { AppEnv } from '../env';
import type { ActionItem, Item, MeetingEntry } from '../types';

export type LoadKind = 'config' | 'auth' | 'unprovisioned' | 'graph' | 'unknown';

export interface LoadError {
  kind: LoadKind;
  message: string;
  missingList?: string;
}

export type DataStatus = 'idle' | 'loading' | 'ready' | 'error';

interface StoreState {
  status: DataStatus;
  error?: LoadError;
  items: Item[];
  meetingEntries: MeetingEntry[];
  actionItems: ActionItem[];
  hydrate: (instance: PublicClientApplication, env: AppEnv) => Promise<void>;
  setConfigError: (missing: string[]) => void;
  reset: () => void;
}

function toError(err: unknown): LoadError {
  if (err instanceof ListMissingError) {
    return {
      kind: 'unprovisioned',
      message: `SharePoint list "${err.listName}" is missing. Provision it before continuing.`,
      missingList: err.listName,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  if (/AADSTS|interaction_required|login_required/i.test(message)) {
    return { kind: 'auth', message };
  }
  return { kind: 'graph', message };
}

export const useStore = create<StoreState>((set) => ({
  status: 'idle',
  items: [],
  meetingEntries: [],
  actionItems: [],
  async hydrate(instance, env) {
    set({ status: 'loading', error: undefined });
    const client = createGraphClient(instance);
    try {
      const [items, meetingEntries, actionItems] = await Promise.all([
        fetchItems(client, env.siteId, env.lists.items),
        fetchMeetingEntries(client, env.siteId, env.lists.meetingEntries),
        fetchActionItems(client, env.siteId, env.lists.actionItems),
      ]);
      set({
        status: 'ready',
        items,
        meetingEntries,
        actionItems,
        error: undefined,
      });
    } catch (err) {
      set({ status: 'error', error: toError(err) });
    }
  },
  setConfigError(missing) {
    set({
      status: 'error',
      error: {
        kind: 'config',
        message: `Missing required environment variables: ${missing.join(', ')}`,
      },
    });
  },
  reset() {
    set({
      status: 'idle',
      items: [],
      meetingEntries: [],
      actionItems: [],
      error: undefined,
    });
  },
}));
