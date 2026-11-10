import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, CalendarPlus, Flag, Plus, Sparkles, Star, Target, Trophy, UserPlus, Wallet } from 'lucide-react'
import { CategoryIcon } from '../lib/icons'
import { sortDreams } from '../lib/dreams'
import { formatMonthYear, percent } from '../lib/format'
import { useBoard } from '../state/board'
import { usePrefs, type SortMode } from '../state/prefs'
import { EmptyWall, Mural } from '../components/Mural'
import { useShell } from '../components/Shell'
import { EXAMPLES, HERO_PHOTO } from '../lib/photos'
import { describeUpdate } from '../state/board'
import { relativeTime } from '../lib/format'
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
    <div className="panel flex flex-col items-center gap-2 px-3 py-5 text-center">
      <span className={`grid h-10 w-10 place-items-center rounded-[12px] ${tone === 'ouro' ? 'bg-latao/15 text-latao' : 'bg-pinheiro/15 text-pinheiro'}`}><Icon size={20} strokeWidth={1.8} /></span>
      <div className="text-[13px] text-tinta-2">{label}</div>
      <div className="font-display text-[26px] font-semibold leading-none tabular-nums">{n}</div>
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
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = sortDreams(plan.filter((d) => d.target_date && d.target_date >= today), 'target')
  const inProgress = sortDreams(plan, 'target').slice(0, 4)
  const noDate = plan.filter((d) => !d.target_date)
  const noValue = plan.filter((d) => d.estimated_value == null)
  const steps: { key: string; icon: typeof Trophy; title: string; sub: string; go: () => void }[] = [
    ...upcoming.slice(0, 3).map((d) => ({ key: `t${d.id}`, icon: CalendarClock, title: d.title, sub: `Meta para ${formatMonthYear(d.target_date!)}`, go: () => openDetail(d.id) })),
    ...(noDate[0] ? [{ key: 'nd', icon: CalendarPlus, title: `Definir uma data para “${noDate[0].title}”`, sub: noDate.length > 1 ? `E mais ${noDate.length - 1} sem data` : 'Ainda sem data desejada', go: () => openDetail(noDate[0].id) }] : []),
    ...(noValue[0] ? [{ key: 'nv', icon: Wallet, title: `Estimar o valor de “${noValue[0].title}”`, sub: 'Para entrar no planejamento financeiro', go: () => openDetail(noValue[0].id) }] : []),
    ...(alone && !invited ? [{ key: 'inv', icon: UserPlus, title: 'Convidar seu par', sub: 'Para os dois editarem o mesmo espaço', go: openInvite }] : []),
  ].slice(0, 5)
  const recent = b.activities.slice(0, 3)
  const firstName = (b.me?.display_name ?? '').trim().split(/\s+/)[0]
  const usedCats = b.categories.filter((c) => b.dreams.some((d) => d.category_id === c.id))
  const motto = b.state?.couple?.motto || DEFAULT_MOTTO
  const scrollToDreams = () => document.getElementById('meus-sonhos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <>
      {/* A. Boas-vindas */}
      <header className="border-l-[3px] border-pinheiro pl-5">
        <h1 className="text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.1] tracking-[-0.03em]">Olá{firstName ? `, ${firstName}` : ''}! Que bom ter você por aqui.</h1>
        <p className="mt-2.5 max-w-[640px] text-[15.5px] leading-relaxed text-tinta-2">Cada sonho começa com uma ideia. Organize seus objetivos e transforme seus planos em realidade.</p>
      </header>

      {/* B. Destaque */}
      <section className="hero mt-7">
        <img src={HERO_PHOTO} alt="" />
        <div className="flex w-full max-w-[600px] flex-col justify-end p-6 text-white sm:p-9">
          <p className="text-[13px] font-medium text-white/75">{motto}</p>
          <p className="mt-2 font-display text-[clamp(1.9rem,3.6vw,2.9rem)] font-semibold leading-[1.05] tracking-[-0.03em] [text-wrap:balance]">Sonhe. Planeje. Conquiste.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn btn-white" onClick={() => openAdd()}><Plus size={17} /> Novo sonho</button>
            {b.dreams.length > 0 && <button className="btn btn-glass" onClick={scrollToDreams}>Ver nossos sonhos <ArrowRight size={17} /></button>}
          </div>
        </div>
      </section>

      {/* C. Resumo */}
      <section className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumo dos objetivos">
        <Stat icon={Star} n={b.dreams.length} label="Sonhos cadastrados" />
        <Stat icon={Target} n={planning} label="Em andamento" />
        <Stat icon={Trophy} n={achieved} label="Conquistas" tone="ouro" />
        <Stat icon={Flag} n={upcoming.length} label="Próximas metas" />
      </section>

      {/* D + E. Em andamento e próximos passos */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 text-[19px] leading-none"><Sparkles size={18} className="text-pinheiro" /> {inProgress.length ? 'Nossos sonhos em andamento' : 'Ideias para começar'}</h2>
            {b.dreams.length > 0 && <button className="flex items-center gap-1 text-[13.5px] font-semibold text-pinheiro hover:underline" onClick={scrollToDreams}>Ver todos <ArrowRight size={14} /></button>}
          </div>
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
            {inProgress.length > 0 ? inProgress.map((d) => {
              const c = b.coverOf(d); const src = b.url(c?.thumb_path ?? c?.path); const k = b.category(d.category_id)
              const pc = percent(d.saved_value, d.estimated_value)
              return (
                <button key={d.id} className="dream-card" onClick={() => openDetail(d.id)}>
                  <div className="relative aspect-[4/3] bg-linho">
                    {src ? <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${c?.focus_x ?? 50}% ${c?.focus_y ?? 50}%` }} /> : <div className="print-empty absolute inset-0"><CategoryIcon name={k?.icon ?? 'star'} size={34} /></div>}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 text-[13.5px] font-semibold"><CategoryIcon name={k?.icon ?? 'star'} size={14} /><span className="truncate">{d.title}</span></div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="meter flex-1"><i style={{ width: `${pc ?? 0}%` }} /></div>
                      <span className="text-[12px] font-semibold tabular-nums text-tinta-2">{pc === null ? '—' : `${Math.round(pc)}%`}</span>
                    </div>
                  </div>
                </button>
              )
            }) : EXAMPLES.map((x) => (
              <button key={x.title} className="dream-card" onClick={() => openAdd()}>
                <div className="relative aspect-[4/3] bg-linho"><img src={x.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /><span className="pill absolute left-2 top-2">Exemplo</span></div>
                <div className="p-3"><div className="truncate text-[13.5px] font-semibold">{x.title}</div><div className="mt-1 text-[12px] text-tinta-3">{x.tag}</div></div>
              </button>
            ))}
          </div>
          {inProgress.length === 0 && <p className="mt-4 text-[13.5px] text-tinta-3">São só referências visuais. Toque em uma delas para cadastrar o seu próprio sonho.</p>}
        </div>

        <div className="panel p-5 sm:p-6">
          <h2 className="mb-2 flex items-center gap-2.5 text-[19px] leading-none"><Flag size={18} className="text-pinheiro" /> Próximos passos</h2>
          {steps.length === 0 && recent.length === 0 ? (
            <p className="mt-4 text-[14.5px] leading-relaxed text-tinta-2">Quando houver sonhos com data ou valor, os próximos passos aparecem aqui.</p>
          ) : (
            <ul className="divide-y divide-linho/60">
              {steps.map((st) => (
                <li key={st.key}>
                  <button className="flex w-full items-center gap-3 py-3 text-left transition hover:opacity-80" onClick={st.go}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-pinheiro/12 text-pinheiro"><st.icon size={17} strokeWidth={1.8} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{st.title}</span><span className="mt-0.5 block truncate text-[12.5px] text-tinta-3">{st.sub}</span></span>
                  </button>
                </li>
              ))}
              {steps.length < 3 && recent.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-tinta/[.06] text-tinta-2"><Sparkles size={16} strokeWidth={1.8} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px]">{describeUpdate(a, a.actor_id === b.meId ? 'Você' : b.memberOf(a.actor_id)?.display_name ?? 'Seu par')}</span><span className="mt-0.5 block text-[12.5px] text-tinta-3">{relativeTime(a.created_at)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
        <div id="meus-sonhos" className="mt-10 scroll-mt-6 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[22px] leading-none sm:text-[24px]">Nossos sonhos</h2>
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
        ) : b.dreams.length === 0 ? null : visible.length === 0 ? (
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
