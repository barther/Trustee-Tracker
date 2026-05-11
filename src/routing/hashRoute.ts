import { useEffect, useState } from 'react';

export type Route =
  | { view: 'agenda' }
  | { view: 'item'; itemId: string }
  | { view: 'newItem' }
  | { view: 'editItem'; itemId: string }
  | { view: 'meetings' }
  | { view: 'meeting'; meetingId: string }
  | { view: 'actions' }
  | { view: 'items' }
  | { view: 'decisions' };

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
  if (trimmed === 'meetings') {
    return { view: 'meetings' };
  }
  if (trimmed === 'actions') {
    return { view: 'actions' };
  }
  if (trimmed === 'items') {
    return { view: 'items' };
  }
  if (trimmed === 'decisions') {
    return { view: 'decisions' };
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
  const meetingMatch = trimmed.match(/^meeting\/([^/]+)$/);
  if (meetingMatch) {
    const meetingId = safeDecode(meetingMatch[1]);
    if (meetingId) return { view: 'meeting', meetingId };
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

export const meetingsHref = '#/meetings';

export const actionsHref = '#/actions';

export const itemsHref = '#/items';

export const decisionsHref = '#/decisions';

export function meetingHref(meetingId: string): string {
  return `#/meeting/${encodeURIComponent(meetingId)}`;
}

export function navigateToAgenda(): void {
  if (window.location.hash !== '') {
    window.location.hash = '';
  }
}

export function navigateTo(href: string): void {
  window.location.hash = href.startsWith('#') ? href.slice(1) : href;
}
