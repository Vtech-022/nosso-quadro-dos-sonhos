import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, UserPlus } from 'lucide-react'
import { CategoryIcon } from '../lib/icons'
import { sortDreams } from '../lib/dreams'
import { formatMonthYear } from '../lib/format'
import { useBoard } from '../state/board'
import { usePrefs, type SortMode } from '../state/prefs'
import { EmptyWall, Mural } from '../components/Mural'
import { useShell } from '../components/Shell'
import { Spinner } from '../components/ui'

export const DEFAULT_MOTTO = 'Grandes conquistas começam com pequenos sonhos.'

export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="mt-3 max-w-[620px] text-[16px] leading-relaxed text-tinta-2">{sub}</p>}
      </div>
      {right}
    </header>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="font-display text-[56px] leading-[.85] tabular-nums sm:text-[72px]">{n}</div>
      <div className="mt-2 text-[13.5px] text-tinta-2">{label}</div>
    </div>
  )
}

export function QuadroPage() {
  const b = useBoard()
  const { openDetail, openAdd, openInvite } = useShell()
  const { prefs, set } = usePrefs()
  const [status, setStatus] = useState<'all' | 'planning' | 'achieved'>('all')
  const [cat, setCat] = useState<string | null>(null)

  const planning = b.dreams.filter((d) => d.status === 'planning').length
  const achieved = b.dreams.length - planning
  const alone = b.members.length < 2
  const invited = !!b.state?.invitation

  const visible = useMemo(() => {
    const l = b.dreams.filter((d) => (status === 'all' || d.status === status) && (!cat || d.category_id === cat))
    return sortDreams(l, prefs.sort)
  }, [b.dreams, status, cat, prefs.sort])

  const usedCats = b.categories.filter((c) => b.dreams.some((d) => d.category_id === c.id))
  const motto = b.state?.couple?.motto || DEFAULT_MOTTO

  return (
    <>
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <h1 className="font-display text-[clamp(3.3rem,9.4vw,8.6rem)] leading-[.86] tracking-[-0.028em]">
            Nosso Quadro<br />dos Sonhos
          </h1>
          <p className="mt-6 max-w-[620px] font-display text-[clamp(1.35rem,2.3vw,1.95rem)] italic leading-[1.15] text-tinta-2">{motto}</p>
        </div>
        <div className="flex items-end gap-10 pb-1">
          <Stat n={planning} label="em planejamento" />
          <Stat n={achieved} label={achieved === 1 ? 'conquistado' : 'conquistados'} />
        </div>
      </section>

      {alone && (
        <div className="mt-9 flex flex-col gap-3 rounded-[14px] border-[1.5px] border-dashed border-[#bdb6a6] bg-papel/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] leading-snug text-tinta-2">
            {invited ? <>O convite está enviado. Assim que sua parceria aceitar, o quadro passa a ser dos dois.</> : <>Este quadro ainda é só seu. Convide seu par para pendurar e conquistar os sonhos juntos.</>}
          </p>
          <button className="btn btn-soft btn-sm self-start sm:self-auto" onClick={openInvite}><UserPlus size={16} /> {invited ? 'Ver convite' : 'Convidar'}</button>
        </div>
      )}

      {b.dreams.length > 0 && (
        <div className="mt-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="seg max-w-full overflow-x-auto no-scrollbar" role="group" aria-label="Filtrar por status">
              <button aria-pressed={status === 'all'} onClick={() => setStatus('all')}>Todos <span className="text-tinta-3">{b.dreams.length}</span></button>
              <button aria-pressed={status === 'planning'} onClick={() => setStatus('planning')}>Em planejamento <span className="text-tinta-3">{planning}</span></button>
              <button aria-pressed={status === 'achieved'} onClick={() => setStatus('achieved')}>Conquistados <span className="text-tinta-3">{achieved}</span></button>
            </div>
            <label className="flex items-center gap-2 text-[13.5px] text-tinta-2">
              <span>Ordem</span>
              <select className="field !h-10 !w-auto !py-0 text-[14px]" value={prefs.sort} onChange={(e) => set({ sort: e.target.value as SortMode })} aria-label="Ordem dos sonhos">
                <option value="recent">Mais recentes</option>
                <option value="oldest">Mais antigos</option>
                <option value="target">Data desejada</option>
              </select>
            </label>
          </div>
          {usedCats.length > 1 && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar por categoria">
              <button className="chip" aria-pressed={cat === null} onClick={() => setCat(null)}>Todas as categorias</button>
              {usedCats.map((c) => (
                <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
                  <CategoryIcon name={c.icon} size={15} /> {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 sm:mt-10">
        {b.loading ? (
          <div className="grid place-items-center py-24 text-tinta-2"><Spinner size={28} /></div>
        ) : b.dreams.length === 0 ? (
          <EmptyWall
            title="A parede está vazia, por enquanto."
            text="Comece com uma foto de um sonho: a casa, a viagem, o carro, a data do casamento. Cada imagem que vocês pendurarem vira parte do quadro."
            action={<button className="btn btn-primary" onClick={() => openAdd()}><Plus size={18} /> Adicionar o primeiro sonho</button>}
          />
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-[34px] leading-none">Nenhum sonho com esses filtros.</h2>
            <button className="btn btn-soft mt-6" onClick={() => { setStatus('all'); setCat(null) }}>Limpar filtros</button>
          </div>
        ) : (
          <Mural dreams={visible} onOpen={openDetail} onAdd={() => openAdd(cat)} key={`${status}-${cat}-${prefs.sort}`} />
        )}
      </div>
    </>
  )
}

/* ---------------- O que ainda vamos viver ---------------- */
export function PlanejamentoPage() {
  const b = useBoard()
  const { openDetail, openAdd } = useShell()
  const planning = b.dreams.filter((d) => d.status === 'planning')

  const groups = useMemo(() => {
    const m = new Map<string, typeof planning>()
    sortDreams(planning, 'target').forEach((d) => {
      const k = d.target_date ? d.target_date.slice(0, 4) : 'sem-data'
      m.set(k, [...(m.get(k) ?? []), d])
    })
    return [...m.entries()]
  }, [planning])

  const next = sortDreams(planning, 'target').find((d) => d.target_date)

  return (
    <>
      <PageHead
        title="O que ainda vamos viver"
        sub={planning.length ? `${planning.length} ${planning.length === 1 ? 'sonho espera' : 'sonhos esperam'} por vocês${next ? `. O próximo na linha do tempo é “${next.title}”, em ${formatMonthYear(next.target_date!)}.` : '.'}` : undefined}
        right={<button className="btn btn-primary self-start" onClick={() => openAdd()}><Plus size={18} /> Adicionar um sonho</button>}
      />
      {planning.length === 0 ? (
        <EmptyWall
          title="Nada esperando por enquanto."
          text={b.dreams.length ? 'Todos os sonhos do quadro já foram conquistados. Que tal pendurar o próximo?' : 'Quando vocês adicionarem sonhos em planejamento, eles aparecem aqui, organizados pela data desejada.'}
          action={<button className="btn btn-primary" onClick={() => openAdd()}><Plus size={18} /> Adicionar um sonho</button>}
        />
      ) : (
        <div className="space-y-14">
          {groups.map(([year, list]) => (
            <section key={year} aria-label={year === 'sem-data' ? 'Sem data definida' : year}>
              <div className="mb-5 flex items-baseline gap-4 border-b border-linho pb-3">
                <h2 className="font-display text-[44px] leading-none sm:text-[56px]">{year === 'sem-data' ? 'Sem data definida' : year}</h2>
                <span className="text-[14px] text-tinta-2">{list.length} {list.length === 1 ? 'sonho' : 'sonhos'}</span>
              </div>
              <Mural dreams={list} onOpen={openDetail} />
            </section>
          ))}
        </div>
      )}
      {planning.length > 0 && <p className="mt-12 text-[14px] text-tinta-3">Quer definir uma data? Abra o sonho e toque em <Link className="font-semibold text-pinheiro" to="/quadro">Editar</Link>.</p>}
    </>
  )
}
