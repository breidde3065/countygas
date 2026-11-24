import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Branch } from './data';
import { useSettings } from './settings';

export const kes = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

export const t12 = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`;
};

export const waLink = (number: string, text: string) =>
  `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

/** Open/closed in Nairobi time, whatever the visitor's device clock says. */
export function status(b: Branch, now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  const key = p.weekday === 'Sun' ? 'sun' : p.weekday === 'Sat' ? 'sat' : 'weekday';
  const mins = (Number(p.hour) % 24) * 60 + Number(p.minute);
  const [open, close] = b.hours[key];
  const toMins = (t: string) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]);
  if (mins >= toMins(open) && mins < toMins(close)) return { open: true, label: `Open until ${t12(close)}` };
  return { open: false, label: mins < toMins(open) ? `Opens at ${t12(open)}` : 'Closed for today' };
}

type Ctx = { branch: Branch | null; setBranch: (id: string) => void };
const BranchContext = createContext<Ctx>({ branch: null, setBranch: () => {} });
export const useBranch = () => useContext(BranchContext);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { branches } = useSettings();
  const [id, setId] = useState<string | null>(() => {
    try { return localStorage.getItem('branch'); } catch { return null; }
  });
  const setBranch = useCallback((next: string) => {
    setId(next);
    try { localStorage.setItem('branch', next); } catch { /* storage blocked */ }
  }, []);
  const value = useMemo(() => ({ branch: branches.find((b) => b.id === id) ?? null, setBranch }), [id, branches, setBranch]);
  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function usePageTitle(title?: string) {
  const { business } = useSettings();
  useEffect(() => {
    document.title = title ? `${title} | ${business.name}` : `${business.name} | ${business.pitch}`;
  }, [title, business.name, business.pitch]);
}
