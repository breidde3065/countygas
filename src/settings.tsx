import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { defaults } from './data';
import type { Settings } from './data';

type Ctx = { settings: Settings; reload: () => void };
const SettingsContext = createContext<Ctx>({ settings: defaults, reload: () => {} });

/** Site-wide business details, branches, brands and prices. Falls back to data.ts until the admin saves. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults);

  const reload = useCallback(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Settings | null) => { if (d?.business && d.branches?.length) setSettings(d); })
      .catch(() => { /* keep current values */ });
  }, []);
  useEffect(reload, [reload]);

  const value = useMemo(() => ({ settings, reload }), [settings, reload]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext).settings;
export const useReloadSettings = () => useContext(SettingsContext).reload;
