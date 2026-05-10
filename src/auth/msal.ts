import {
  PublicClientApplication,
  type Configuration,
  type RedirectRequest,
  type AccountInfo,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';
import type { AppEnv } from '../env';

export const GRAPH_SCOPES = ['https://graph.microsoft.com/Sites.ReadWrite.All'];

export function buildMsalConfig(env: AppEnv): Configuration {
  return {
    auth: {
      clientId: env.clientId,
      authority: `https://login.microsoftonline.com/${env.tenantId}`,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
      navigateToLoginRequestUrl: true,
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    },
  };
}

export const loginRequest: RedirectRequest = { scopes: GRAPH_SCOPES };

export async function initializeMsal(env: AppEnv): Promise<PublicClientApplication> {
  const instance = new PublicClientApplication(buildMsalConfig(env));
  await instance.initialize();
  const response = await instance.handleRedirectPromise();
  if (response?.account) {
    instance.setActiveAccount(response.account);
  } else {
    const accounts = instance.getAllAccounts();
    if (accounts.length > 0 && !instance.getActiveAccount()) {
      instance.setActiveAccount(accounts[0]);
    }
  }
  return instance;
}

export async function getAccessToken(
  instance: PublicClientApplication,
): Promise<string> {
  const account = instance.getActiveAccount();
  if (!account) throw new Error('Not signed in');
  try {
    const result = await instance.acquireTokenSilent({ ...loginRequest, account });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      await instance.acquireTokenRedirect(loginRequest);
      throw err;
    }
    throw err;
  }
}

export function getActiveAccount(
  instance: PublicClientApplication,
): AccountInfo | null {
  return instance.getActiveAccount();
}
