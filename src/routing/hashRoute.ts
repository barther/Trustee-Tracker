import { useEffect, useState } from 'react';

export type Route =
  | { view: 'agenda' }
  | { view: 'item'; itemId: string };

function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

function parse(hash: string): Route {
  const trimmed = hash.replace(/^#\/?/, '');
  const match = trimmed.match(/^item\/([^/]+)$/);
  if (match) {
    const itemId = safeDecode(match[1]);
    if (itemId) return { view: 'item', itemId };
  }
  return { view: 'agenda' };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function itemHref(itemId: string): string {
  return `#/item/${encodeURIComponent(itemId)}`;
}

export function navigateToAgenda(): void {
  if (window.location.hash !== '') {
    window.location.hash = '';
  }
}
