import { api } from './api';
import type { Layout } from '../types/layout';
import type { Item } from '../types';

// Fetch recently added or updated layouts
export async function fetchRecentLayouts({ since, limit }: { since?: string; limit?: number } = {}) {
  const params: Record<string, string | number> = {};
  if (since) params.since = since;
  if (limit) params.limit = limit;
  // Assumes backend supports ?since=timestamp&limit=N for /layouts
  const res = await api.get('/layouts', { params });
  let layouts: Layout[] = res.data;
  if (since) {
    layouts = layouts.filter((l: Layout) =>
      (l.updatedAt && l.updatedAt > since) || (l.createdAt && l.createdAt > since)
    );
  }
  if (limit) {
    layouts = layouts.sort((a: Layout, b: Layout) =>
      ((b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''))
    ).slice(0, limit);
  }
  return layouts;
}

// Fetch recently added or updated items
export async function fetchRecentItems({ since, limit }: { since?: string; limit?: number } = {}) {
  const params: Record<string, string | number> = {};
  if (since) params.since = since;
  if (limit) params.limit = limit;
  // Assumes backend supports ?since=timestamp&limit=N for /items
  const res = await api.get('/items', { params });
  let items: Item[] = res.data;
  if (since) {
    items = items.filter((i: Item) =>
      (i.updated_at && i.updated_at > since) || (i.created_at && i.created_at > since)
    );
  }
  if (limit) {
    items = items.sort((a: Item, b: Item) =>
      ((b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))
    ).slice(0, limit);
  }
  return items;
}
