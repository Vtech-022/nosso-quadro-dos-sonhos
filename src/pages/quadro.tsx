import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, PiggyBank, Plus, Trophy, UserPlus } from 'lucide-react'
import { CategoryIcon } from '../lib/icons'
import { sortDreams } from '../lib/dreams'
import { formatMonthYear, money, percent } from '../lib/format'
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

function Stat({ icon: Icon, n, label, tone = 'azul' }: { icon: typeof Trophy; n: string | number; label: string; tone?: 'azul' | 'ouro' }) {
  return (
    <div className="panel flex items-center gap-4 p-4 sm:p-5">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-[14px] ${tone === 'ouro' ? 'bg-latao/15 text-latao' : 'bg-tinta/[.07] text-tinta'}`}><Icon size={22} strokeWidth={1.8} /></span>
      <div className="min-w-0">
        <div className="truncate font-display text-[24px] leading-none tabular-nums sm:text-[27px]">{n}</div>
        <div className="mt-1.5 truncate text-[13px] text-tinta-2">{label}</div>
      </div>
    </div>
  )
}

export function QuadroPage() {
  const b = useBoard()
  const { openDetail, openAdd, openInvite, query } = useShell()
  const { prefs, set } = usePrefs()
  const [status, setStatus] = useState<'all' | 'planning' | 'achieved'>('all')
  const [cat, setCat] = useState<string | null>(null)

  const planning = b.dreams.filter((d) => d.status === 'planning').length
  const achieved = b.dreams.length - planning
  const alone = b.members.length < 2
  const invited = !!b.state?.invitation

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pt-BR')
    const l = b.dreams.filter((d) => (status === 'all' || d.status === status) && (!cat || d.category_id === cat) && (!q || d.title.toLocaleLowerCase('pt-BR').includes(q)))
    return sortDreams(l, prefs.sort)
  }, [b.dreams, status, cat, prefs.sort, query])

  const plan = b.dreams.filter((d) => d.status === 'planning')
  const feat = sortDreams(plan.filter((d) => b.coverOf(d)), 'target')[0] ?? b.dreams.find((d) => b.coverOf(d)) ?? plan[0] ?? b.dreams[0]
  const featCover = feat ? b.coverOf(feat) : undefined
  const featSrc = b.url(featCover?.path ?? featCover?.thumb_path) ?? b.url(featCover?.thumb_path)
  const featPct = feat ? percent(feat.saved_value, feat.estimated_value) : null
  const featCat = feat ? b.category(feat.category_id) : undefined
  const savedTotal = plan.reduce((t, d) => t + (d.saved_value ?? 0), 0)
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const usedCats = b.categories.filter((c) => b.dreams.some((d) => d.category_id === c.id))
  const motto = b.state?.couple?.motto || DEFAULT_MOTTO

  return (
    <>
      <section className="hero">
        {featSrc && <img src={featSrc} alt="" style={{ objectPosition: `${featCover?.focus_x ?? 50}% ${featCover?.focus_y ?? 50}%` }} />}
        <div className="flex w-full max-w-[640px] flex-col justify-end p-6 text-white sm:p-9 lg:p-11">
          <p className="text-[14px] font-medium text-white/75">{hello}{b.me?.display_name ? `, ${b.me.display_name}` : ''}</p>
          {feat ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="pill pill-gold">{feat.status === 'achieved' ? 'Conquistado' : 'Próximo sonho'}</span>
                {featCat && <span className="pill"><CategoryIcon name={featCat.icon} size={13} /> {featCat.name}</span>}
                {feat.target_date && feat.status !== 'achieved' && <span className="pill"><CalendarClock size={13} /> {formatMonthYear(feat.target_date)}</span>}
              </div>
              <h1 className="mt-4 text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.03] tracking-[-0.03em]">{feat.title}</h1>
              <p className="mt-3 line-clamp-2 max-w-[520px] text-[16px] leading-relaxed text-white/80">{feat.description || motto}</p>
              {prefs.showValues && featPct !== null && feat.status !== 'achieved' && (
                <div className="mt-5 max-w-[420px]">
                  <div className="flex justify-between text-[13px] font-medium text-white/85"><span>{money(feat.saved_value ?? 0)} de {money(feat.estimated_value ?? 0)}</span><span>{Math.round(featPct)}%</span></div>
                  <div className="meter mt-2 !h-1.5 !bg-white/20"><i className="!bg-latao" style={{ width: `${featPct}%` }} /></div>
                </div>
              )}
              <div className="mt-7 flex flex-wrap gap-3">
                <button className="btn btn-white" onClick={() => openDetail(feat.id)}>Abrir sonho <ArrowRight size={17} /></button>
                <button className="btn btn-glass" onClick={() => openAdd()}><Plus size={17} /> Novo sonho</button>
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.03] tracking-[-0.03em]">O espaço de vocês começa aqui.</h1>
              <p className="mt-3 max-w-[520px] text-[16px] leading-relaxed text-white/80">{motto}</p>
              <div className="mt-7"><button className="btn btn-white" onClick={() => openAdd()}><Plus size={17} /> Adicionar o primeiro sonho</button></div>
            </>
          )}
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-3" aria-label="Resumo">
        <Stat icon={CalendarClock} n={planning} label="em planejamento" />
        <Stat icon={Trophy} n={achieved} label={achieved === 1 ? 'conquistado' : 'conquistados'} tone="ouro" />
        <Stat icon={PiggyBank} n={prefs.showValues ? money(savedTotal) : '•••'} label="já guardado para os sonhos" />
      </section>

      {alone && (
        <div className="panel mt-5 flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] leading-snug text-tinta-2">
            {invited ? <>O convite está enviado. Assim que sua parceria aceitar, o espaço passa a ser dos dois.</> : <>Este espaço ainda é só seu. Convide seu par para planejar e conquistar os sonhos juntos.</>}
          </p>
          <button className="btn btn-soft btn-sm self-start sm:self-auto" onClick={openInvite}><UserPlus size={16} /> {invited ? 'Ver convite' : 'Convidar'}</button>
        </div>
      )}

      {b.dreams.length > 0 && (
        <div className="mt-10 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[22px] leading-none sm:text-[24px]">Todos os sonhos</h2>
            <span className="text-[13.5px] text-tinta-3">{visible.length} de {b.dreams.length}</span>
          </div>
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
            title="Nenhum sonho por aqui ainda."
            text="Comece com uma foto de um sonho: a casa, a viagem, o carro, a data do casamento. Cada imagem que vocês adicionarem vira parte do espaço."
            action={<button className="btn btn-primary" onClick={() => openAdd()}><Plus size={18} /> Adicionar o primeiro sonho</button>}
          />
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-[24px] leading-none">Nenhum sonho com esses filtros.</h2>
            <button className="btn btn-soft mt-6" onClick={() => { setStatus('all'); setCat(null) }}>Limpar filtros</button>{query && <p className="mt-3 text-[14px] text-tinta-3">A busca por “{query}” também está ativa.</p>}
          </div>
        ) : (
          <Mural dreams={visible} onOpen={openDetail} onAdd={() => openAdd(cat)} key={`${status}-${cat}-${prefs.sort}-${query}`} />
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
                <h2 className="font-display text-[22px] leading-none">{year === 'sem-data' ? 'Sem data definida' : year}</h2>
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
