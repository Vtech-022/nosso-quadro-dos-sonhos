import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type SortMode = 'recent' | 'oldest' | 'target'
export type ThemeMode = 'auto' | 'light' | 'dark'
export interface Prefs { showValues: boolean; sort: SortMode; theme: ThemeMode }
const KEY = 'nqs:prefs'
const DEFAULTS: Prefs = { showValues: true, sort: 'recent', theme: 'auto' }

const Ctx = createContext<{ prefs: Prefs; set: (p: Partial<Prefs>) => void }>({ prefs: DEFAULTS, set: () => {} })

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return DEFAULTS }
  })
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && mq.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e121e' : '#fbfaf8')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [prefs.theme])
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* ok */ } }, [prefs])
  const value = useMemo(() => ({ prefs, set: (p: Partial<Prefs>) => setPrefs((c) => ({ ...c, ...p })) }), [prefs])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const usePrefs = () => useContext(Ctx)
