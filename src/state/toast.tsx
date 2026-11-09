import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'

type Tone = 'ok' | 'erro' | 'info'
interface Toast { id: number; msg: string; tone: Tone; action?: { label: string; run: () => void } }
interface Ctx { toast: (msg: string, opts?: { tone?: Tone; action?: Toast['action']; ms?: number }) => void }

const ToastCtx = createContext<Ctx>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), [])
  const toast = useCallback<Ctx['toast']>((msg, opts) => {
    const id = ++seq.current
    setItems((l) => [...l.slice(-3), { id, msg, tone: opts?.tone ?? 'ok', action: opts?.action }])
    window.setTimeout(() => dismiss(id), opts?.ms ?? (opts?.tone === 'erro' ? 7000 : 4500))
  }, [dismiss])

  const value = useMemo(() => ({ toast }), [toast])
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed z-[100] left-0 right-0 bottom-[88px] lg:bottom-6 lg:left-auto lg:right-6 flex flex-col items-center lg:items-end gap-2 px-4 pointer-events-none" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto animate-entrar flex items-start gap-3 max-w-[420px] w-full lg:w-auto rounded-[14px] bg-tinta text-papel pl-4 pr-2 py-3 shadow-erguido">
            {t.tone === 'ok' && <CheckCircle2 className="mt-0.5 shrink-0 text-[#c9d9cf]" size={18} />}
            {t.tone === 'erro' && <CircleAlert className="mt-0.5 shrink-0 text-[#f0b8aa]" size={18} />}
            {t.tone === 'info' && <Info className="mt-0.5 shrink-0 text-[#e6d3a0]" size={18} />}
            <p className="text-[14.5px] leading-snug flex-1">{t.msg}</p>
            {t.action && (
              <button className="text-[14px] font-semibold text-[#e6d3a0] px-2 py-0.5 rounded hover:bg-white/10" onClick={() => { t.action!.run(); dismiss(t.id) }}>
                {t.action.label}
              </button>
            )}
            <button aria-label="Fechar aviso" className="p-1 rounded hover:bg-white/10 text-papel/70" onClick={() => dismiss(t.id)}><X size={16} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx).toast
