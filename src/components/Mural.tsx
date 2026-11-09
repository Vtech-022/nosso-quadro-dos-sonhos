import { memo, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Dream } from '../lib/types'
import { formatMonthYear, hash01, money, percent } from '../lib/format'
import { CategoryIcon } from '../lib/icons'
import { useBoard } from '../state/board'
import { usePrefs } from '../state/prefs'
import { Seal } from './ui'

interface TileProps { dream: Dream; index: number; onOpen: (id: string) => void }

export const DreamTile = memo(function DreamTile({ dream, index, onOpen }: TileProps) {
  const { url, category, coverOf } = useBoard()
  const { prefs } = usePrefs()
  const cover = coverOf(dream)
  const src = url(cover?.thumb_path ?? cover?.path)
  const cat = category(dream.category_id)
  const r = hash01(dream.id)
  const giro = ((r - 0.5) * 3.4).toFixed(2)
  const tape = r < 0.34 ? 'tape-a' : r < 0.67 ? 'tape-b' : 'tape-c'
  const achieved = dream.status === 'achieved'
  const pct = percent(dream.saved_value, dream.estimated_value)
  const showMeter = !achieved && pct !== null && (dream.saved_value ?? 0) > 0
  const year = dream.achieved_at ? new Date(dream.achieved_at).getFullYear() : new Date().getFullYear()

  return (
    <button
      type="button"
      className={`print fmt-${dream.format}`}
      style={{ ['--giro' as string]: `${giro}deg`, ['--i' as string]: Math.min(index, 14) }}
      onClick={() => onOpen(dream.id)}
      aria-label={`${dream.title}. ${achieved ? 'Conquistado' : 'Em planejamento'}. Abrir detalhes.`}
    >
      <span className={`tape ${tape}`} aria-hidden="true" />
      <div className="print-photo">
        {src ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ objectPosition: `${cover?.focus_x ?? 50}% ${cover?.focus_y ?? 50}%` }}
          />
        ) : (
          <div className={`print-empty absolute inset-0 tone-${cat?.tone ?? 6}`}>
            <CategoryIcon name={cat?.icon ?? 'star'} size={56} />
          </div>
        )}
        {achieved && (
          <Seal year={year} size={64} className="absolute right-1.5 top-1.5 sm:right-2.5 sm:top-2.5 -rotate-12 sm:!w-[78px] sm:!h-[78px]" />
        )}
      </div>

      <div className="print-caption">
        <h3>{dream.title}</h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] sm:text-[13px] text-tinta-2 min-w-0">
          {cat && (
            <span className={`inline-flex items-center gap-1 min-w-0 ${'tone-' + cat.tone}`} style={{ background: 'none', color: 'var(--t-fg)' }}>
              <CategoryIcon name={cat.icon} size={14} className="shrink-0" />
              <span className="truncate">{cat.name}</span>
            </span>
          )}
          {prefs.showValues && dream.estimated_value != null && (
            <span className="ml-auto pl-2 font-semibold text-tinta tabular-nums whitespace-nowrap">{money(dream.estimated_value).replace(/ /g, ' ')}</span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[12px]">
          {achieved ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-latao-2">
              <span className="h-1.5 w-1.5 rounded-full bg-latao" /> Conquistado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-tinta-2">
              <span className="h-1.5 w-1.5 rounded-full border border-pinheiro" /> Em planejamento
            </span>
          )}
          {!achieved && dream.target_date && (
            <span className="ml-auto text-tinta-3 hidden sm:inline">{formatMonthYear(dream.target_date)}</span>
          )}
        </div>
        {showMeter && <div className="meter mt-2"><i style={{ width: `${pct}%` }} /></div>}
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
      style={{ ['--giro' as string]: '-1deg' }}
    >
      <span className="flex flex-col items-center gap-2.5 px-3 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full border border-current transition group-hover:rotate-90"><Plus size={20} /></span>
        <span className="font-display text-[20px] leading-tight">Adicionar<br />um sonho</span>
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
          <div key={i} className={`ghost-frame ${f.w} ${f.h} ${f.mt ?? ''}`} style={{ ['--giro' as string]: f.g }} />
        ))}
      </div>
      <h2 className="mt-10 text-[34px] sm:text-[44px] leading-[1.02]">{title}</h2>
      <p className="mt-3 mx-auto max-w-[460px] text-[16px] leading-relaxed text-tinta-2">{text}</p>
      {action && <div className="mt-7 flex justify-center">{action}</div>}
    </div>
  )
}
