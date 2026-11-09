import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type SortMode = 'recent' | 'oldest' | 'target'
export interface Prefs { showValues: boolean; sort: SortMode }
const KEY = 'nqs:prefs'
const DEFAULTS: Prefs = { showValues: true, sort: 'recent' }

const Ctx = createContext<{ prefs: Prefs; set: (p: Partial<Prefs>) => void }>({ prefs: DEFAULTS, set: () => {} })

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return DEFAULTS }
  })
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* ok */ } }, [prefs])
  const value = useMemo(() => ({ prefs, set: (p: Partial<Prefs>) => setPrefs((c) => ({ ...c, ...p })) }), [prefs])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const usePrefs = () => useContext(Ctx)
