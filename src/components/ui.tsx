import {
  useEffect, useId, useRef, useState, type ReactNode, type InputHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { hash01, initials } from '../lib/format'
import { useBoard } from '../state/board'

/* ---------------- Marca ---------------- */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="16" fill="#18181B" stroke="rgba(255,255,255,.2)" strokeWidth="2" />
      <path d="M40.5 12.5a20.5 20.5 0 1 0 11 36.2A17 17 0 0 1 40.5 12.5Z" fill="#F4B400"/>
      <path d="M45 22.5c.7 3.7 1.8 4.8 5.5 5.5-3.7.7-4.8 1.8-5.5 5.5-.7-3.7-1.8-4.8-5.5-5.5 3.7-.7 4.8-1.8 5.5-5.5Z" fill="#fff"/>
      <circle cx="52.5" cy="19" r="1.6" fill="#fff"/>
    </svg>
  )
}

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark />
      {!compact && (
        <div className="leading-none">
          <div className={`font-display text-[18.5px] font-bold tracking-[-0.03em] ${light ? 'text-white' : 'text-tinta'}`}>Dreamspace</div>
          <div className={`mt-1 text-[11.5px] font-medium ${light ? 'text-white/65' : 'text-tinta-3'}`}>Espaço dos sonhos</div>
        </div>
      )}
    </div>
  )
}

/* ---------------- Pessoas ---------------- */
const AV_TONES = ['bg-pinheiro-soft text-pinheiro', 'bg-latao-soft text-latao-2', 'bg-rosa-soft text-rosa']

export function Avatar({ userId, name, path, size = 36, ring = false }: {
  userId?: string | null; name?: string | null; path?: string | null; size?: number; ring?: boolean
}) {
  const { url } = useBoard()
  const src = url(path)
  const tone = AV_TONES[Math.floor(hash01(userId ?? name ?? 'x') * AV_TONES.length)]
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold select-none ${src ? 'bg-linho' : tone} ${ring ? 'ring-2 ring-papel' : ''}`}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }}
      title={name ?? undefined}
    >
      {src ? <img src={src} alt={name ?? ''} className="h-full w-full object-cover" /> : initials(name)}
    </span>
  )
}

export function AvatarPair({ size = 44 }: { size?: number }) {
  const { members } = useBoard()
  return (
    <span className="inline-flex items-center">
      {members.map((m, i) => (
        <span key={m.user_id} style={{ marginLeft: i ? -size * 0.28 : 0, zIndex: 2 - i }} className="relative">
          <Avatar userId={m.user_id} name={m.display_name} path={m.avatar_path} size={size} ring />
        </span>
      ))}
    </span>
  )
}

/* ---------------- Carregando ---------------- */
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg className="animate-girar" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".22" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function FullScreenLoader({ label = 'Carregando o quadro' }: { label?: string }) {
  return (
    <div className="min-h-dvh grid place-items-center">
      <div className="flex flex-col items-center gap-4 text-tinta-2">
        <div className="animate-pulse"><LogoMark size={52} /></div>
        <p className="text-sm">{label}</p>
      </div>
    </div>
  )
}

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, children, label, size = 'md', dismissable = true }: {
  open: boolean; onClose: () => void; children: ReactNode; label: string
  size?: 'sm' | 'md' | 'lg' | 'xl'; dismissable?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  // onClose costuma ser uma função nova a cada render; guardar em ref evita reiniciar o foco a cada tecla
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    returnTo.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current
      el?.focus({ preventScroll: true })
    }, 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) { e.stopPropagation(); closeRef.current() }
      if (e.key === 'Tab' && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')]
          .filter((x) => x.offsetParent !== null)
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      returnTo.current?.focus?.({ preventScroll: true })
    }
  }, [open, dismissable])

  if (!open) return null
  const width = { sm: 'sm:max-w-[420px]', md: 'sm:max-w-[560px]', lg: 'sm:max-w-[920px]', xl: 'sm:max-w-[1120px]' }[size]
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={dismissable ? onClose : undefined} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`relative w-full ${width} max-h-[94dvh] overflow-y-auto overscroll-contain bg-papel rounded-t-[10px] sm:rounded-[12px] shadow-erguido animate-entrar focus:outline-none`}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function CloseButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label="Fechar" className={`btn btn-icon btn-ghost bg-papel/80 ${className}`}>
      <X size={20} />
    </button>
  )
}

export function ConfirmDialog({ open, title, text, confirmLabel, danger, onConfirm, onClose }: {
  open: boolean; title: string; text: ReactNode; confirmLabel: string; danger?: boolean
  onConfirm: () => Promise<void> | void; onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onClose={() => !busy && onClose()} label={title} size="sm">
      <div className="p-6 sm:p-7">
        <h2 className="text-[28px] leading-tight">{title}</h2>
        <div className="mt-3 text-[15px] leading-relaxed text-tinta-2">{text}</div>
        <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button className="btn btn-soft" onClick={onClose} disabled={busy}>Cancelar</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            disabled={busy}
            data-autofocus
            onClick={async () => {
              setBusy(true)
              try { await onConfirm(); onClose() } finally { setBusy(false) }
            }}
          >
            {busy && <Spinner />} {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Campos ---------------- */
const brl = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Campo de valor em reais. Enquanto você digita, o texto fica livre (ex.: 450000 ou 1250,50);
 * ao sair do campo ele é formatado como R$ 450.000,00. Ponto é ignorado, vírgula separa os centavos.
 */
export function MoneyInput({ value, onChange, ...rest }: {
  value: number | null; onChange: (v: number | null) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [text, setText] = useState<string | null>(null) // null = não está editando
  const shown = text ?? (value == null ? '' : `R$ ${brl.format(value)}`)

  const parse = (raw: string): number | null => {
    const clean = raw.replace(/[^\d,]/g, '')
    const [int = '', ...dec] = clean.split(',')
    if (!int && !dec.length) return null
    const n = Number(`${int.slice(0, 12) || '0'}.${(dec.join('')).slice(0, 2) || '0'}`)
    return Number.isFinite(n) ? n : null
  }

  return (
    <input
      {...rest}
      className="field tabular-nums"
      inputMode="decimal"
      autoComplete="off"
      placeholder="R$ 0,00"
      value={shown}
      onFocus={(e) => {
        const raw = value == null ? '' : String(value).replace('.', ',')
        setText(raw)
        const el = e.target
        requestAnimationFrame(() => el.select())
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d,.]/g, '').replace(/\./g, '')
        const first = raw.indexOf(',')
        const t = first === -1 ? raw : raw.slice(0, first + 1) + raw.slice(first + 1).replace(/,/g, '').slice(0, 2)
        setText(t)
        onChange(parse(t))
      }}
      onBlur={() => setText(null)}
    />
  )
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

export function ErrorNote({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-[14px] bg-rosa-soft border border-alerta/30 text-alerta text-[14px] px-3.5 py-2.5 leading-snug">
      {children}
    </p>
  )
}

/* ---------------- Selo de conquista ---------------- */
export function Seal({ year, size = 72, className = '', style }: {
  year: number | string; size?: number; className?: string; style?: React.CSSProperties
}) {
  const id = useId().replace(/:/g, '')
  return (
    <svg className={`seal ${className}`} style={style} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Sonho conquistado em ${year}`}>
      <defs><path id={`c${id}`} d="M50,50 m-33,0 a33,33 0 1,1 66,0 a33,33 0 1,1 -66,0" /></defs>
      <circle cx="50" cy="50" r="47" fill="#F4B400" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(20,26,44,.35)" strokeWidth="1" strokeDasharray="1.5 3" />
      <text fill="#141A2C" fontSize="8" fontWeight="700" style={{ fontFamily: '"Albert Sans Variable", sans-serif' }}>
        <textPath href={`#c${id}`} startOffset="0" textLength="196" lengthAdjust="spacing">CONQUISTADO NO DREAMSPACE ·</textPath>
      </text>
      <text x="50" y="58" textAnchor="middle" fill="#141A2C" fontSize="22" fontWeight="800" style={{ fontFamily: '"Albert Sans Variable", sans-serif' }}>{year}</text>
    </svg>
  )
}
