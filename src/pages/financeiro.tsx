import { Link } from 'react-router-dom'
import { financeTotals } from '../lib/dreams'
import { money, percent } from '../lib/format'
import { CategoryIcon } from '../lib/icons'
import { useBoard } from '../state/board'
import { EmptyWall } from '../components/Mural'
import { useShell } from '../components/Shell'
import { PageHead } from './quadro'

export function FinanceiroPage() {
  const b = useBoard()
  const { openDetail } = useShell()
  const planning = b.dreams.filter((d) => d.status === 'planning')
  const t = financeTotals(planning)
  const rows = planning.filter((d) => d.estimated_value != null && d.estimated_value > 0)
    .sort((a, c) => (c.estimated_value ?? 0) - (a.estimated_value ?? 0))
  const doneWithValue = b.dreams.filter((d) => d.status === 'achieved' && d.estimated_value)
  const doneTotal = doneWithValue.reduce((s, d) => s + (d.estimated_value ?? 0), 0)

  const byCat = b.categories.map((c) => {
    const l = rows.filter((d) => d.category_id === c.id)
    return { c, est: l.reduce((s, d) => s + (d.estimated_value ?? 0), 0), sav: l.reduce((s, d) => s + Math.min(d.saved_value ?? 0, d.estimated_value ?? 0), 0) }
  }).filter((x) => x.est > 0).sort((a, c) => c.est - a.est)

  if (rows.length === 0) {
    return (
      <>
        <PageHead title="Nossos planos financeiros" />
        <EmptyWall
          title="Nenhum sonho com valor ainda."
          text="Informe o valor estimado em um sonho e acompanhe aqui o quanto falta para chegar lá. Sonhos sem valor continuam no quadro e não entram nessa conta."
          action={<Link to="/quadro" className="btn btn-soft">Voltar ao quadro</Link>}
        />
      </>
    )
  }

  return (
    <>
      <PageHead title="Nossos planos financeiros" sub={`Soma apenas dos sonhos em planejamento que têm valor estimado${t.withoutValue ? `. ${t.withoutValue} ${t.withoutValue === 1 ? 'sonho sem valor fica' : 'sonhos sem valor ficam'} de fora da conta` : ''}.`} />

      <section aria-label="Resumo" className="border-y border-linho py-8 sm:py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div><p className="text-[13.5px] text-tinta-2">Total estimado</p><p className="mt-2 font-display text-[44px] leading-none tabular-nums sm:text-[56px]">{money(t.estimated)}</p></div>
          <div><p className="text-[13.5px] text-tinta-2">Total acumulado</p><p className="mt-2 font-display text-[44px] leading-none tabular-nums text-pinheiro sm:text-[56px]">{money(t.saved)}</p></div>
          <div><p className="text-[13.5px] text-tinta-2">Valor restante</p><p className="mt-2 font-display text-[44px] leading-none tabular-nums sm:text-[56px]">{money(t.remaining)}</p></div>
        </div>
        <div className="mt-9">
          <div className="flex items-baseline justify-between text-[14px] text-tinta-2"><span>Percentual alcançado</span><span className="font-display text-[32px] leading-none text-tinta">{t.pct.toFixed(t.pct < 10 && t.pct > 0 ? 1 : 0).replace('.', ',')}%</span></div>
          <div className="meter mt-3 !h-2.5"><i style={{ width: `${t.pct}%` }} /></div>
        </div>
      </section>

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section aria-label="Sonhos com valor">
          <h2 className="mb-2 text-[34px] leading-none">Sonho por sonho</h2>
          <ul className="divide-y divide-linho">
            {rows.map((d) => {
              const cv = b.coverOf(d)
              const src = b.url(cv?.thumb_path ?? cv?.path)
              const p = percent(d.saved_value, d.estimated_value) ?? 0
              const cat = b.category(d.category_id)
              return (
                <li key={d.id}>
                  <button className="flex w-full items-center gap-4 py-5 text-left transition hover:bg-papel/60 sm:gap-5" onClick={() => openDetail(d.id)}>
                    <span className="h-[72px] w-[60px] shrink-0 overflow-hidden rounded-[3px] border-[3px] border-papel bg-linho shadow-papel">
                      {src ? <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${cv?.focus_x}% ${cv?.focus_y}%` }} /> : <span className={`print-empty tone-${cat?.tone ?? 6} h-full w-full`}><CategoryIcon name={cat?.icon ?? 'star'} size={22} /></span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-display text-[25px] leading-none sm:text-[28px]">{d.title}</span>
                        <span className="shrink-0 text-[14px] font-semibold tabular-nums">{Math.round(p)}%</span>
                      </span>
                      <span className="meter mt-3 block"><i style={{ width: `${p}%` }} /></span>
                      <span className="mt-2 flex flex-wrap justify-between gap-x-4 text-[13px] text-tinta-2 tabular-nums">
                        <span>{money(d.saved_value ?? 0)} de {money(d.estimated_value)}</span>
                        <span>faltam {money(Math.max(0, (d.estimated_value ?? 0) - (d.saved_value ?? 0)))}</span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <aside aria-label="Por categoria" className="space-y-10">
          <div>
            <h2 className="text-[34px] leading-none">Por categoria</h2>
            <ul className="mt-5 space-y-5">
              {byCat.map(({ c, est, sav }) => (
                <li key={c.id}>
                  <div className="flex items-center justify-between gap-3 text-[14.5px]">
                    <span className="flex items-center gap-2 font-medium"><CategoryIcon name={c.icon} size={16} className="text-pinheiro" /> {c.name}</span>
                    <span className="tabular-nums text-tinta-2">{money(est)}</span>
                  </div>
                  <div className="meter mt-2"><i style={{ width: `${est ? (sav / est) * 100 : 0}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
          {doneTotal > 0 && (
            <div className="rounded-[14px] bg-latao-soft/60 p-5">
              <p className="text-[13.5px] text-latao-2">Já realizados com valor informado</p>
              <p className="mt-1 font-display text-[34px] leading-none tabular-nums">{money(doneTotal)}</p>
              <p className="mt-2 text-[13px] text-tinta-2">{doneWithValue.length} {doneWithValue.length === 1 ? 'conquista' : 'conquistas'}. Não entram nos totais ao lado.</p>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
