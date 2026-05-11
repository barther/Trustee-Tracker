import { useEffect, useState } from 'react';

export type Route =
  | { view: 'agenda' }
  | { view: 'item'; itemId: string };

function parse(hash: string): Route {
  const trimmed = hash.replace(/^#\/?/, '');
  const match = trimmed.match(/^item\/([^/]+)$/);
  if (match) return { view: 'item', itemId: decodeURIComponent(match[1]) };
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
