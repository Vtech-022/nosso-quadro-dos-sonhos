import type { Dream } from './types'
import type { SortMode } from '../state/prefs'

export function sortDreams(list: Dream[], mode: SortMode): Dream[] {
  const l = [...list]
  if (mode === 'oldest') return l.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
  if (mode === 'target') {
    return l.sort((a, b) => {
      if (a.target_date && b.target_date) return a.target_date.localeCompare(b.target_date)
      if (a.target_date) return -1
      if (b.target_date) return 1
      return +new Date(b.created_at) - +new Date(a.created_at)
    })
  }
  return l.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
}

/** Soma só os sonhos que têm valor estimado — sonhos sem valor ficam fora da conta. */
export function financeTotals(list: Dream[]) {
  const withValue = list.filter((d) => d.estimated_value != null && d.estimated_value > 0)
  const estimated = withValue.reduce((s, d) => s + (d.estimated_value ?? 0), 0)
  const saved = withValue.reduce((s, d) => s + Math.min(d.saved_value ?? 0, d.estimated_value ?? 0), 0)
  const remaining = Math.max(0, estimated - saved)
  const pct = estimated > 0 ? (saved / estimated) * 100 : 0
  return { count: withValue.length, estimated, saved, remaining, pct, withoutValue: list.length - withValue.length }
}
