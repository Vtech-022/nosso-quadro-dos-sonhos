import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { financeTotals } from '../lib/dreams'
import { money, percent } from '../lib/format'
import { CategoryIcon } from '../lib/icons'
import { useBoard } from '../state/board'
import { EmptyWall } from '../components/Mural'
import { useShell } from '../components/Shell'
import { PageHead } from './quadro'
import { useToast } from '../state/toast'
import { MoneyInput, Spinner } from '../components/ui'
import type { Dream } from '../lib/types'

/** Edição dos valores direto na linha do sonho. */
function ValueEditor({ dream, onDone }: { dream: Dream; onDone: () => void }) {
  const b = useBoard()
  const toast = useToast()
  const [est, setEst] = useState<number | null>(dream.estimated_value)
  const [sav, setSav] = useState<number | null>(dream.saved_value)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try { await b.updateDream(dream.id, { estimated_value: est, saved_value: sav }); toast('Valores atualizados.'); onDone() }
    catch (e) { toast((e as Error).message, { tone: 'erro' }) } finally { setBusy(false) }
  }
  return (
    <form className="mt-4 grid gap-3 rounded-[12px] border border-linho bg-papel p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); void save() }}>
      <div><label className="label" htmlFor={`e-${dream.id}`}>Valor estimado</label><MoneyInput id={`e-${dream.id}`} value={est} onChange={setEst} autoFocus /></div>
      <div><label className="label" htmlFor={`s-${dream.id}`}>Valor acumulado</label><MoneyInput id={`s-${dream.id}`} value={sav} onChange={setSav} /></div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner />} Salvar</button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancelar</button>
      </div>
    </form>
  )
}

export function FinanceiroPage() {
  const [editing, setEditing] = useState<string | null>(null)
  const b = useBoard()
  const { openDetail } = useShell()
  const planning = b.dreams.filter((d) => d.status === 'planning')
  const t = financeTotals(planning)
  const rows = planning.filter((d) => d.estimated_value != null && d.estimated_value > 0)
    .sort((a, c) => (c.estimated_value ?? 0) - (a.estimated_value ?? 0))
  const noValue = planning.filter((d) => !d.estimated_value)
  const doneWithValue = b.dreams.filter((d) => d.status === 'achieved' && d.estimated_value)
  const doneTotal = doneWithValue.reduce((s, d) => s + (d.estimated_value ?? 0), 0)

  const byCat = b.categories.map((c) => {
    const l = rows.filter((d) => d.category_id === c.id)
    return { c, est: l.reduce((s, d) => s + (d.estimated_value ?? 0), 0), sav: l.reduce((s, d) => s + Math.min(d.saved_value ?? 0, d.estimated_value ?? 0), 0) }
  }).filter((x) => x.est > 0).sort((a, c) => c.est - a.est)

  const noValueBlock = noValue.length > 0 && (
    <section aria-label="Sonhos sem valor" className="mt-14">
      <h2 className="text-[20px] leading-none">Sem valor definido</h2>
      <p className="mt-2 text-[14px] text-tinta-2">Defina um valor para incluir o sonho nos totais.</p>
      <ul className="mt-3 divide-y divide-linho border-y border-linho">
        {noValue.map((d) => (
          <li key={d.id} className="py-4">
            <div className="flex items-center justify-between gap-3">
              <button className="truncate text-left text-[16px] font-semibold hover:underline" onClick={() => openDetail(d.id)}>{d.title}</button>
              <button className="btn btn-soft btn-sm shrink-0" onClick={() => setEditing(editing === d.id ? null : d.id)}><Pencil size={14} /> Definir valor</button>
            </div>
            {editing === d.id && <ValueEditor dream={d} onDone={() => setEditing(null)} />}
          </li>
        ))}
      </ul>
    </section>
  )

  if (rows.length === 0) {
    return (
      <>
        <PageHead title="Planos financeiros" sub="Acompanhe quanto falta para cada sonho." />
        {noValue.length === 0 ? (
          <EmptyWall
            title="Nenhum sonho em planejamento."
            text="Adicione um sonho com valor estimado para acompanhar o quanto falta."
            action={<Link to="/quadro" className="btn btn-soft">Voltar ao quadro</Link>}
          />
        ) : noValueBlock}
      </>
    )
  }

  return (
    <>
      <PageHead title="Planos financeiros" sub="Totais dos sonhos em planejamento que têm valor estimado. Para alterar, edite o sonho na lista abaixo." />

      <section aria-label="Resumo" className="border-y border-linho py-8 sm:py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div><p className="text-[13.5px] text-tinta-2">Total estimado</p><p className="mt-2 font-display text-[30px] leading-none tabular-nums sm:text-[36px]">{money(t.estimated)}</p></div>
          <div><p className="text-[13.5px] text-tinta-2">Total acumulado</p><p className="mt-2 font-display text-[30px] leading-none tabular-nums text-pinheiro sm:text-[36px]">{money(t.saved)}</p></div>
          <div><p className="text-[13.5px] text-tinta-2">Valor restante</p><p className="mt-2 font-display text-[30px] leading-none tabular-nums sm:text-[36px]">{money(t.remaining)}</p></div>
        </div>
        <div className="mt-9">
          <div className="flex items-baseline justify-between text-[14px] text-tinta-2"><span>Percentual alcançado</span><span className="font-display text-[32px] leading-none text-tinta">{t.pct.toFixed(t.pct < 10 && t.pct > 0 ? 1 : 0).replace('.', ',')}%</span></div>
          <div className="meter mt-3 !h-2.5"><i style={{ width: `${t.pct}%` }} /></div>
        </div>
      </section>

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section aria-label="Sonhos com valor">
          <h2 className="mb-2 text-[20px] leading-none">Por sonho</h2>
          <ul className="divide-y divide-linho">
            {rows.map((d) => {
              const cv = b.coverOf(d)
              const src = b.url(cv?.thumb_path ?? cv?.path)
              const p = percent(d.saved_value, d.estimated_value) ?? 0
              const cat = b.category(d.category_id)
              return (
                <li key={d.id} className="py-5">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <button className="h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[8px] bg-linho" onClick={() => openDetail(d.id)} aria-label={`Abrir ${d.title}`}>
                      {src ? <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${cv?.focus_x}% ${cv?.focus_y}%` }} /> : <span className={`print-empty tone-${cat?.tone ?? 6} h-full w-full`}><CategoryIcon name={cat?.icon ?? 'star'} size={22} /></span>}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <button className="truncate text-left text-[16px] font-semibold hover:underline" onClick={() => openDetail(d.id)}>{d.title}</button>
                        <span className="shrink-0 text-[14px] font-semibold tabular-nums">{Math.round(p)}%</span>
                      </div>
                      <div className="meter mt-2.5"><i style={{ width: `${p}%` }} /></div>
                      <div className="mt-2 flex flex-wrap justify-between gap-x-4 text-[13px] text-tinta-2 tabular-nums">
                        <span>{money(d.saved_value ?? 0)} de {money(d.estimated_value)}</span>
                        <span>faltam {money(Math.max(0, (d.estimated_value ?? 0) - (d.saved_value ?? 0)))}</span>
                      </div>
                    </div>
                    <button className="btn btn-icon btn-ghost shrink-0" aria-label={`Editar valores de ${d.title}`} onClick={() => setEditing(editing === d.id ? null : d.id)}><Pencil size={17} /></button>
                  </div>
                  {editing === d.id && <ValueEditor dream={d} onDone={() => setEditing(null)} />}
                </li>
              )
            })}
          </ul>
        </section>

        <aside aria-label="Por categoria" className="space-y-10">
          <div>
            <h2 className="text-[20px] leading-none">Por categoria</h2>
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
            <div className="rounded-[12px] bg-latao-soft p-5">
              <p className="text-[13.5px] text-latao-2">Já realizados com valor informado</p>
              <p className="mt-1 font-display text-[34px] leading-none tabular-nums">{money(doneTotal)}</p>
              <p className="mt-2 text-[13px] text-tinta-2">{doneWithValue.length} {doneWithValue.length === 1 ? 'conquista' : 'conquistas'}. Não entram nos totais ao lado.</p>
            </div>
          )}
        </aside>
      </div>
      {noValueBlock}
    </>
  )
}
