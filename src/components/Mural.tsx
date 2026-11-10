import { memo, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Dream } from '../lib/types'
import { formatMonthYear, money, percent } from '../lib/format'
import { CategoryIcon } from '../lib/icons'
import { useBoard } from '../state/board'
import { usePrefs } from '../state/prefs'

interface TileProps { dream: Dream; index: number; onOpen: (id: string) => void }

export const DreamTile = memo(function DreamTile({ dream, index, onOpen }: TileProps) {
  const { url, category, coverOf } = useBoard()
  const { prefs } = usePrefs()
  const cover = coverOf(dream)
  const src = url(cover?.thumb_path ?? cover?.path)
  const cat = category(dream.category_id)
  const achieved = dream.status === 'achieved'
  const pct = percent(dream.saved_value, dream.estimated_value)
  const showMeter = !achieved && pct !== null && (dream.saved_value ?? 0) > 0
  const year = dream.achieved_at ? new Date(dream.achieved_at).getFullYear() : new Date().getFullYear()

  return (
    <button
      type="button"
      className={`print fmt-${dream.format}`}
      style={{ ['--i' as string]: Math.min(index, 14) }}
      onClick={() => onOpen(dream.id)}
      aria-label={`${dream.title}. ${achieved ? 'Conquistado' : 'Em planejamento'}. Abrir detalhes.`}
    >
      <div className="print-photo">
        {src ? (
          <img src={src} alt="" loading="lazy" decoding="async" style={{ objectPosition: `${cover?.focus_x ?? 50}% ${cover?.focus_y ?? 50}%` }} />
        ) : (
          <div className="print-empty absolute inset-0"><CategoryIcon name={cat?.icon ?? 'star'} size={52} /></div>
        )}
      </div>
      <div className="print-shade" />
      <div className="print-top">
        {achieved ? <span className="pill pill-gold">Conquistado</span> : cat && <span className="pill"><CategoryIcon name={cat.icon} size={13} /> {cat.name}</span>}
      </div>

      <div className="print-caption">
        <h3>{dream.title}</h3>
        <div className="mt-1 flex items-baseline gap-2 min-w-0">
          <span className="hand truncate">
            {achieved ? `Realizado em ${year}` : dream.target_date ? `Para ${formatMonthYear(dream.target_date)}` : 'Em planejamento'}
          </span>
          {prefs.showValues && dream.estimated_value != null && (
            <span className="ml-auto pl-2 text-[12.5px] font-semibold text-white tabular-nums whitespace-nowrap">{money(dream.estimated_value)}</span>
          )}
        </div>
        {showMeter && <div className="meter mt-2.5"><i style={{ width: `${pct}%` }} /></div>}
      </div>
    </button>
  )
})

export function AddTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ghost-frame fmt-quadrado group grid place-items-center text-tinta-2 hover:text-pinheiro hover:border-pinheiro transition"
    >
      <span className="flex flex-col items-center gap-2.5 px-3 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full border border-current transition group-hover:rotate-90"><Plus size={20} /></span>
        <span className="text-[15px] font-semibold leading-tight">Adicionar<br />um sonho</span>
      </span>
    </button>
  )
}

export function Mural({ dreams, onOpen, onAdd, className = '' }: {
  dreams: Dream[]; onOpen: (id: string) => void; onAdd?: () => void; className?: string
}) {
  const [arriving, setArriving] = useState(true)
  useEffect(() => {
    const t = window.setTimeout(() => setArriving(false), 1800)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <div className={`mural-wrap ${className}`}>
      <div className={`mural ${arriving ? 'is-arriving' : ''}`}>
        {dreams.map((d, i) => <DreamTile key={d.id} dream={d} index={i} onOpen={onOpen} />)}
        {onAdd && dreams.length > 0 && <AddTile onClick={onAdd} />}
      </div>
    </div>
  )
}

/** Parede vazia: molduras tracejadas esperando as primeiras fotos. */
export function EmptyWall({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  const frames = [
    { w: 'w-[34%]', h: 'aspect-[3/4]', g: '-2deg' },
    { w: 'w-[40%]', h: 'aspect-[4/3]', g: '1.6deg', mt: 'mt-8' },
    { w: 'w-[24%]', h: 'aspect-square', g: '-1deg', mt: 'mt-3' },
  ]
  return (
    <div className="mx-auto max-w-[760px] py-10 sm:py-16 text-center">
      <div className="flex items-start justify-center gap-4 sm:gap-6 px-2" aria-hidden="true">
        {frames.map((f, i) => (
          <div key={i} className={`ghost-frame ${f.w} ${f.h} ${f.mt ?? ''}`} />
        ))}
      </div>
      <h2 className="mt-10 text-[24px] sm:text-[24px] leading-[1.02]">{title}</h2>
      <p className="mt-3 mx-auto max-w-[460px] text-[16px] leading-relaxed text-tinta-2">{text}</p>
      {action && <div className="mt-7 flex justify-center">{action}</div>}
    </div>
  )
}
