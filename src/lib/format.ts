const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
})

export const money = (v: number | null | undefined) => (v == null ? '' : brl.format(v))
export const moneyCompact = (v: number | null | undefined) => (v == null ? '' : brlCompact.format(v))

export function percent(saved: number | null, total: number | null): number | null {
  if (!total || total <= 0) return null
  return Math.max(0, Math.min(100, ((saved ?? 0) / total) * 100))
}

const dayFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
const dayShort = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Datas "puras" (yyyy-mm-dd) são lidas como locais, sem deslocamento de fuso. */
export function parseDateOnly(d: string): Date {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, day)
}
export const formatDate = (iso: string) => dayFmt.format(new Date(iso))
export const formatDateShort = (iso: string) => dayShort.format(new Date(iso))
export const formatDateOnly = (d: string) => dayFmt.format(parseDateOnly(d))
export const formatMonthYear = (d: string) => monthFmt.format(parseDateOnly(d))
export const formatTime = (iso: string) => timeFmt.format(new Date(iso))

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return 'ontem'
  if (d < 7) return `há ${d} dias`
  return formatDateShort(iso)
}

export function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const y = new Date(); y.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (same(d, today)) return 'Hoje'
  if (same(d, y)) return 'Ontem'
  return dayFmt.format(d)
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** Número estável (0..1) a partir de um texto — usado para a leve inclinação de cada foto. */
export function hash01(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 10000) / 10000
}

export function uuid(): string {
  return crypto.randomUUID()
}

/** Aceita só endereços http(s); completa "https://" quando falta. Devolve null se não servir. */
export function cleanUrl(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (!u.hostname.includes('.')) return null
    return u.toString()
  } catch { return null }
}

export function linkHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

export function isMapLink(url: string): boolean {
  return /(^|\.)(maps\.app\.goo\.gl|goo\.gl|waze\.com|maps\.apple\.com|openstreetmap\.org)$/.test(linkHost(url)) || /google\.[a-z.]+\/maps|maps\.google\./.test(url)
}
