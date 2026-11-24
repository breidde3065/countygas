import { useEffect, useMemo, useState } from 'react';
import { accessories } from './data';
import type { Size } from './data';
import { useSettings } from './settings';

export type Category = 'cylinder' | 'accessory' | 'other';
export type Product = {
  id: string;
  name: string;
  category: Category;
  brand: string;
  size: string;
  price: number; // new cylinder price, or the item price
  refillPrice: number | null;
  description: string;
  inStock: boolean;
  images: string[];
  createdAt: string;
};

export const categoryLabel: Record<Category, string> = { cylinder: 'Cylinders', accessory: 'Accessories', other: 'Other' };

/** Shown until the first product is added in admin, so the site is never empty. */
export const buildStatic = (sizes: Size[]): Product[] => [
  ...sizes.map((s): Product => ({
    id: `static-${s.kg}`, name: `${s.kg} kg cylinder`, category: 'cylinder', brand: '', size: s.kg,
    price: s.fresh, refillPrice: s.refill, description: s.use, inStock: true, images: [], createdAt: '',
  })),
  ...accessories.map((a, i): Product => ({
    id: `static-acc-${i}`, name: a.name, category: 'accessory', brand: '', size: '',
    price: a.price, refillPrice: null, description: '', inStock: true, images: [], createdAt: '',
  })),
];

export function useCatalog() {
  const { sizes } = useSettings();
  const [live, setLive] = useState<Product[] | null>(null);
  const fallback = useMemo(() => buildStatic(sizes), [sizes]);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/products', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Product[]) => { if (Array.isArray(d) && d.length) setLive(d); })
      .catch(() => { /* keep the standard list */ });
    return () => ctrl.abort();
  }, []);
  return live ?? fallback;
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Something went wrong. Try again.'), { status: res.status });
  return data as T;
}
