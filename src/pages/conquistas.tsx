import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Dream } from '../lib/types'
import { formatDate, hash01, moneyCompact } from '../lib/format'
import { useBoard } from '../state/board'
import { EmptyWall } from '../components/Mural'
import { useShell } from '../components/Shell'
import { Avatar, Seal } from '../components/ui'
import { PageHead } from './quadro'

function Entry({ d, flip }: { d: Dream; flip: boolean }) {
  const b = useBoard()
  const { openDetail } = useShell()
  const ach = d.images.find((i) => i.kind === 'achievement')
  const img = ach ?? b.coverOf(d)
  const src = b.url(img?.thumb_path ?? img?.path)
  const giro = ((hash01(d.id) - 0.5) * 4).toFixed(2)
  const who = b.memberOf(d.achieved_by)
  return (
    <article className={`grid items-center gap-6 md:grid-cols-12 md:gap-10 ${flip ? '' : ''}`}>
      <button
        onClick={() => openDetail(d.id)}
        className={`print group relative md:col-span-5 ${flip ? 'md:order-2 md:col-start-8' : 'md:col-start-1'}`}
        style={{ ['--giro' as string]: `${giro}deg`, aspectRatio: '4 / 4.6' }}
        aria-label={`Abrir ${d.title}`}
      >
        <span className="tape tape-a" aria-hidden="true" />
        <div className="print-photo">
          {src ? <img src={src} alt="" loading="lazy" style={{ objectPosition: `${img?.focus_x ?? 50}% ${img?.focus_y ?? 50}%` }} /> : <div className="print-empty absolute inset-0 tone-1" />}
          <Seal year={d.achieved_at ? new Date(d.achieved_at).getFullYear() : ''} size={74} className="absolute right-2 top-2 -rotate-12" />
        </div>
        <div className="print-caption"><p className="font-display text-[20px] leading-none">{d.title}</p></div>
      </button>
      <div className={`md:col-span-6 ${flip ? 'md:order-1 md:col-start-1' : 'md:col-start-7'}`}>
        <p className="text-[13.5px] font-semibold text-latao-2">{d.achieved_at ? formatDate(d.achieved_at) : ''}</p>
        <h3 className="mt-2 text-[40px] leading-[.98] sm:text-[52px]">{d.title}</h3>
        {d.achievement_note
          ? <p className="mt-5 border-l-2 border-latao pl-4 text-[20px] italic leading-snug sm:text-[24px]">“{d.achievement_note}”</p>
          : d.description && <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-tinta-2">{d.description}</p>}
        <p className="mt-5 flex items-center gap-2.5 text-[14px] text-tinta-2">
          <Avatar userId={who?.user_id} name={who?.display_name} path={who?.avatar_path} size={26} />
          Registrado por {d.achieved_by === b.meId ? 'você' : who?.display_name ?? 'seu par'}
          {d.estimated_value ? <> · {moneyCompact(d.estimated_value)}</> : null}
        </p>
      </div>
    </article>
  )
}

export function ConquistasPage() {
  const b = useBoard()
  const done = useMemo(
    () => b.dreams.filter((d) => d.status === 'achieved').sort((a, c) => +new Date(c.achieved_at ?? 0) - +new Date(a.achieved_at ?? 0)),
    [b.dreams],
  )
  const years = useMemo(() => {
    const m = new Map<number, Dream[]>()
    done.forEach((d) => { const y = new Date(d.achieved_at ?? d.updated_at).getFullYear(); m.set(y, [...(m.get(y) ?? []), d]) })
    return [...m.entries()].sort((a, c) => c[0] - a[0])
  }, [done])

  const thisYear = done.filter((d) => d.achieved_at && new Date(d.achieved_at).getFullYear() === new Date().getFullYear()).length
  const realized = done.reduce((s, d) => s + (d.estimated_value ?? 0), 0)
  const first = done.at(-1)

  if (done.length === 0) {
    return (
      <>
        <PageHead title="Nossas conquistas" />
        <EmptyWall
          title="O álbum ainda está em branco."
          text="Quando vocês marcarem um sonho como conquistado, ele ganha um selo e uma página aqui, com a data, quem registrou e uma lembrança do momento."
          action={<Link to="/em-planejamento" className="btn btn-soft">Ver o que ainda vamos viver</Link>}
        />
      </>
    )
  }

  return (
    <>
      <PageHead title="Nossas conquistas" sub="O álbum dos sonhos que viraram realidade. Do mais recente ao primeiro." />

      <section aria-label="Retrospectiva" className="mb-14 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-linho py-8 sm:grid-cols-4">
        <div><div className="font-display text-[44px] leading-[.85]">{done.length}</div><p className="mt-2 text-[13.5px] text-tinta-2">{done.length === 1 ? 'sonho realizado' : 'sonhos realizados'}</p></div>
        <div><div className="font-display text-[44px] leading-[.85]">{thisYear}</div><p className="mt-2 text-[13.5px] text-tinta-2">em {new Date().getFullYear()}</p></div>
        <div><div className="font-display text-[44px] leading-[.85]">{realized > 0 ? moneyCompact(realized) : '—'}</div><p className="mt-2 text-[13.5px] text-tinta-2">{realized > 0 ? 'em sonhos com valor' : 'nenhum com valor informado'}</p></div>
        <div><div className="font-display text-[22px] leading-[1.05] sm:text-[26px]">{first?.title}</div><p className="mt-2 text-[13.5px] text-tinta-2">a primeira conquista, em {first?.achieved_at ? formatDate(first.achieved_at) : ''}</p></div>
      </section>

      <div className="space-y-20 sm:space-y-28">
        {years.map(([year, list]) => (
          <section key={year} aria-label={String(year)}>
            <h2 className="mb-10 font-display text-[56px] leading-none text-tinta sm:text-[96px]">{year}</h2>
            <div className="space-y-16 sm:space-y-24">
              {list.map((d, i) => <Entry key={d.id} d={d} flip={i % 2 === 1} />)}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
