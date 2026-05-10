interface AppEnv {
  tenantId: string;
  clientId: string;
  siteId: string;
  lists: {
    items: string;
    meetings: string;
    meetingEntries: string;
    decisions: string;
    actionItems: string;
    vendors: string;
  };
}

export interface EnvLoadResult {
  env?: AppEnv;
  missing: string[];
}

const KEYS: Array<[keyof Omit<AppEnv, 'lists'> | `lists.${keyof AppEnv['lists']}`, string]> = [
  ['tenantId', 'VITE_AZURE_TENANT_ID'],
  ['clientId', 'VITE_AZURE_CLIENT_ID'],
  ['siteId', 'VITE_SHAREPOINT_SITE_ID'],
  ['lists.items', 'VITE_SHAREPOINT_LIST_ITEMS'],
  ['lists.meetings', 'VITE_SHAREPOINT_LIST_MEETINGS'],
  ['lists.meetingEntries', 'VITE_SHAREPOINT_LIST_MEETINGENTRIES'],
  ['lists.decisions', 'VITE_SHAREPOINT_LIST_DECISIONS'],
  ['lists.actionItems', 'VITE_SHAREPOINT_LIST_ACTIONITEMS'],
  ['lists.vendors', 'VITE_SHAREPOINT_LIST_VENDORS'],
];

export function loadEnv(): EnvLoadResult {
  const missing: string[] = [];
  const raw: Record<string, string> = {};
  for (const [, key] of KEYS) {
    const value = (import.meta.env as Record<string, string | undefined>)[key];
    if (!value) {
      missing.push(key);
    } else {
      raw[key] = value;
    }
  }
  if (missing.length > 0) return { missing };

  return {
    missing: [],
    env: {
      tenantId: raw.VITE_AZURE_TENANT_ID,
      clientId: raw.VITE_AZURE_CLIENT_ID,
      siteId: raw.VITE_SHAREPOINT_SITE_ID,
      lists: {
        items: raw.VITE_SHAREPOINT_LIST_ITEMS,
        meetings: raw.VITE_SHAREPOINT_LIST_MEETINGS,
        meetingEntries: raw.VITE_SHAREPOINT_LIST_MEETINGENTRIES,
        decisions: raw.VITE_SHAREPOINT_LIST_DECISIONS,
        actionItems: raw.VITE_SHAREPOINT_LIST_ACTIONITEMS,
        vendors: raw.VITE_SHAREPOINT_LIST_VENDORS,
      },
    },
  };
}

export type { AppEnv };
