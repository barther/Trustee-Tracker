import { useEffect, useState } from 'react';

export type Route =
  | { view: 'agenda' }
  | { view: 'item'; itemId: string }
  | { view: 'newItem' }
  | { view: 'editItem'; itemId: string };

function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

function parse(hash: string): Route {
  const trimmed = hash.replace(/^#\/?/, '');
  if (trimmed === 'item/new') {
    return { view: 'newItem' };
  }
  const editMatch = trimmed.match(/^item\/([^/]+)\/edit$/);
  if (editMatch) {
    const itemId = safeDecode(editMatch[1]);
    if (itemId) return { view: 'editItem', itemId };
  }
  const detailMatch = trimmed.match(/^item\/([^/]+)$/);
  if (detailMatch) {
    const itemId = safeDecode(detailMatch[1]);
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

export function itemEditHref(itemId: string): string {
  return `#/item/${encodeURIComponent(itemId)}/edit`;
}

export const newItemHref = '#/item/new';

export function navigateToAgenda(): void {
  if (window.location.hash !== '') {
    window.location.hash = '';
  }
}

export function navigateTo(href: string): void {
  window.location.hash = href.startsWith('#') ? href.slice(1) : href;
}
