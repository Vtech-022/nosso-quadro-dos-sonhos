import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity as ActivityIcon, Bell, CalendarClock, Home, LayoutGrid, LogOut, Menu, Moon, MoreHorizontal, Plus, Search, Settings, Sun, Trophy, Wallet, X,
} from 'lucide-react'
import { describeUpdate, useBoard } from '../state/board'
import { useAuth } from '../state/auth'
import { relativeTime } from '../lib/format'
import { CelebrationDialog } from './Achievement'
import { DreamDetail } from './DreamDetail'
import { DreamForm } from './DreamForm'
import { InviteDialog } from './InviteDialog'
import { Avatar, CloseButton, LogoMark, Modal } from './ui'
import { usePrefs } from '../state/prefs'
import { IS_DEMO } from '../lib/supabase'
import { demoReset } from '../lib/demo/client'

interface ShellCtx {
  query: string
  openDetail: (id: string) => void
  openAdd: (categoryId?: string | null) => void
  openInvite: () => void
}
const Ctx = createContext<ShellCtx>({ query: '', openDetail: () => {}, openAdd: () => {}, openInvite: () => {} })
export const useShell = () => useContext(Ctx)

const NAV = [
  { to: '/quadro', label: 'Início', icon: Home },
  { to: '/categorias', label: 'Categorias', icon: LayoutGrid },
  { to: '/em-planejamento', label: 'Planejamento', icon: CalendarClock },
  { to: '/conquistas', label: 'Conquistas', icon: Trophy },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/atividades', label: 'Atividades', icon: ActivityIcon },
]

function NotificationsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const b = useBoard()
  const nav = useNavigate()
  const { openDetail } = useShell()
  return (
    <Modal open={open} onClose={onClose} label="Notificações" size="md">
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[24px] sm:text-[26px] leading-none">Notificações</h2>
            <p className="mt-2 text-[14.5px] text-tinta-2">O que {b.partner?.display_name ?? 'seu par'} fez no quadro.</p>
          </div>
          <CloseButton onClick={onClose} />
        </div>
        {b.unread > 0 && <button className="mt-4 text-[14px] font-semibold text-pinheiro hover:underline" onClick={() => b.markRead()}>Marcar todas como lidas</button>}
        {b.notifications.length === 0 ? (
          <p className="mt-8 mb-4 text-[15px] text-tinta-2">Nada por aqui ainda. Quando {b.partner?.display_name ?? 'seu par'} adicionar ou atualizar um sonho, você vê neste lugar.</p>
        ) : (
          <ul className="mt-4 -mx-2 divide-y divide-linho/80">
            {b.notifications.map((n) => {
              const m = b.memberOf(n.update.actor_id)
              const exists = n.update.dream_id && b.dreams.some((d) => d.id === n.update.dream_id)
              return (
                <li key={n.id}>
                  <button
                    className="flex w-full items-start gap-3 rounded-[14px] px-2 py-3.5 text-left transition hover:bg-papel/70"
                    onClick={() => {
                      void b.markRead([n.id])
                      onClose()
                      if (exists) openDetail(n.update.dream_id!)
                      else nav('/atividades')
                    }}
                  >
                    <Avatar userId={n.update.actor_id} name={m?.display_name} path={m?.avatar_path} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[15px] leading-snug ${n.read_at ? 'text-tinta-2' : 'font-semibold text-tinta'}`}>{describeUpdate(n.update, m?.display_name ?? 'Seu par')}</span>
                      <span className="mt-1 block text-[13px] text-tinta-3">{relativeTime(n.update.created_at)}</span>
                    </span>
                    {!n.read_at && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-latao" aria-label="Não lida" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}

export function Shell() {
  const b = useBoard()
  const { signOut } = useAuth()
  const loc = useLocation()
  const nav = useNavigate()
  const [detail, setDetail] = useState<string | null>(null)
  const [adding, setAdding] = useState<{ cat: string | null } | null>(null)
  const [invite, setInvite] = useState(false)
  const [notif, setNotif] = useState(false)
  const [more, setMore] = useState(false)
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState(false)
  const { set: setPrefs } = usePrefs()
  const toggleTheme = () => {
    const root = document.documentElement
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
    root.classList.add('theme-anim')
    window.setTimeout(() => root.classList.remove('theme-anim'), 450)
    setPrefs({ theme: next })
  }

  const openDetail = useCallback((id: string) => { void b.ensureUrls(b.dreams.find((d) => d.id === id)?.images.flatMap((i) => [i.path, i.thumb_path]) ?? []); setDetail(id) }, [b])
  const openAdd = useCallback((cat?: string | null) => setAdding({ cat: cat ?? null }), [])
  const openInvite = useCallback(() => setInvite(true), [])
  const ctx = useMemo(() => ({ query, openDetail, openAdd, openInvite }), [query, openDetail, openAdd, openInvite])
  const onBoard = loc.pathname === '/quadro'

  const coupleName = b.state?.couple?.name ?? ''

  const achievedCount = b.dreams.filter((d) => d.status === 'achieved').length
  const sideContent = (mobile: boolean) => (
    <>
      <NavLink to="/quadro" onClick={() => setDrawer(false)} className="flex items-center gap-3 px-1 pb-5 pt-1" aria-label="Dreamspace, início">
        <LogoMark size={44} />
        <span className="side-label leading-none">
          <span className="block font-display text-[18.5px] font-bold tracking-[-0.03em]">Dreamspace</span>
          <span className="mt-1 block text-[11.5px] font-medium text-tinta-3">Espaço dos sonhos</span>
        </span>
        {mobile && <span className="ml-auto"><CloseButton onClick={() => setDrawer(false)} /></span>}
      </NavLink>
      <nav className="flex flex-col gap-1" aria-label="Principal">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} title={n.label} onClick={() => setDrawer(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <n.icon size={20} strokeWidth={1.8} /> <span className="side-label">{n.label}</span>
            {n.to === '/conquistas' && achievedCount > 0 && <span className="side-label ml-auto rounded-full bg-latao px-2 py-0.5 text-[11.5px] font-bold text-[#141a2c]">{achievedCount}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1">
        <NavLink to="/configuracoes" title="Configurações" onClick={() => setDrawer(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Settings size={20} strokeWidth={1.8} /> <span className="side-label">Configurações</span></NavLink>
        <button title="Sair" className="side-link" onClick={() => void signOut()}><LogOut size={20} strokeWidth={1.8} /> <span className="side-label">Sair</span></button>
        <div className="mt-2 flex items-center gap-3 rounded-[16px] border-t border-linho/60 px-1 pt-3">
          <Avatar userId={b.meId} name={b.me?.display_name} path={b.me?.avatar_path} size={40} />
          <div className="side-label min-w-0">
            <div className="max-w-[160px] truncate text-[14px] font-semibold leading-tight">{b.me?.display_name ?? 'Você'}</div>
            <div className="mt-0.5 max-w-[160px] truncate text-[12px] text-tinta-3">{coupleName || (b.members.length < 2 ? 'Aguardando seu par' : 'Nosso espaço')}</div>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <Ctx.Provider value={ctx}>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-papel focus:px-4 focus:py-2">Ir para o conteúdo</a>

      {IS_DEMO && (
        <div className="bg-tinta text-parede">
          <div className="mx-auto flex max-w-[1640px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[13px] sm:px-8 lg:px-12">
            <span className="flex items-center gap-2 font-semibold"><span className="sold-dot" /> Demonstração</span>
            <span className="opacity-70">Tudo o que você fizer fica só neste navegador. O sistema real usa Supabase.</span>
            <span className="ml-auto flex gap-4 font-semibold">
              <button className="underline-offset-4 hover:underline" onClick={() => demoReset('examples')}>Restaurar exemplos</button>
              <button className="underline-offset-4 hover:underline" onClick={() => demoReset('empty')}>Começar do zero</button>
            </span>
          </div>
        </div>
      )}

      <div className="ambient" aria-hidden="true" />

      <div className="flex gap-5 lg:p-5 2xl:gap-7 2xl:p-6">
        {/* ---------- Menu lateral: recolhido mostra ícones, abre ao passar o mouse ---------- */}
        <aside className="side hidden lg:block" aria-label="Menu">
          <div className="side-panel glass">{sideContent(false)}</div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* ---------- Barra superior (rola junto com a página) ---------- */}
          <header className="px-3 pt-3 lg:px-0 lg:pt-0">
            <div className="glass flex h-[60px] items-center gap-2 rounded-[20px] px-3 sm:gap-3 sm:px-4">
              <button className="icon-btn lg:hidden" onClick={() => setDrawer(true)} aria-label="Abrir menu"><Menu size={21} strokeWidth={1.8} /></button>
              <label className={`relative min-w-0 flex-1 lg:max-w-[440px] ${onBoard ? '' : 'invisible'}`}>
                <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-3" />
                <input className="h-10 w-full rounded-[11px] border border-linho/70 bg-tinta/[.04] pl-10 pr-9 text-[14.5px] placeholder:text-tinta-3 focus:border-pinheiro focus:outline-none" placeholder="Buscar um sonho" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar um sonho" />
                {query && <button type="button" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-tinta-3 hover:text-tinta" onClick={() => setQuery('')} aria-label="Limpar busca"><X size={15} /></button>}
              </label>
              <div className="ml-auto flex items-center gap-1">
                <button className="btn btn-primary btn-sm mr-2 hidden md:inline-flex" onClick={() => openAdd()}><Plus size={16} /> Novo sonho</button>
                <button className="icon-btn icon-btn-sm" onClick={toggleTheme} data-tip="Alternar modo claro e escuro" aria-label="Alternar modo claro e escuro">
                  <Sun size={16} strokeWidth={1.8} className="hidden [[data-theme=dark]_&]:block" />
                  <Moon size={16} strokeWidth={1.8} className="[[data-theme=dark]_&]:hidden" />
                </button>
                <button className="icon-btn" onClick={() => setNotif(true)} data-tip="Notificações" aria-label={b.unread ? `Notificações, ${b.unread} não lidas` : 'Notificações'}>
                  <Bell size={20} strokeWidth={1.7} />
                  {b.unread > 0 && <span className="absolute right-0.5 top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-latao px-1 text-[10.5px] font-bold text-[#141a2c]">{b.unread > 9 ? '9+' : b.unread}</span>}
                </button>
                <NavLink to="/configuracoes" className="ml-1.5 flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition hover:bg-tinta/[.06] sm:pr-3" aria-label="Seu perfil e configurações">
                  <Avatar userId={b.meId} name={b.me?.display_name} path={b.me?.avatar_path} size={34} />
                  <span className="hidden max-w-[140px] truncate text-[14px] font-semibold sm:block">{b.me?.display_name ?? 'Você'}</span>
                </NavLink>
              </div>
            </div>
          </header>

          <main id="conteudo" className="px-4 pb-32 pt-6 sm:px-6 md:px-8 lg:px-1 lg:pb-16 lg:pt-7" key={loc.pathname}>
            <Outlet />
          </main>
        </div>
      </div>

      {/* ---------- Menu no celular: abre e fecha por toque ---------- */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setDrawer(false)} aria-label="Fechar menu" />
          <div className="side-panel open glass absolute !inset-y-3 !left-3 animate-entrar">{sideContent(true)}</div>
        </div>
      )}

      {/* ---------- Navegação do celular ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 glass !rounded-none border-x-0 border-b-0 lg:hidden safe-bottom" aria-label="Principal">
        <div className="mx-auto grid max-w-[560px] grid-cols-5 items-end px-2 pb-1.5 pt-1.5">
          <MobTab to="/quadro" icon={Home} label="Início" />
          <MobTab to="/em-planejamento" icon={CalendarClock} label="Planejando" />
          <div className="flex justify-center">
            <button className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-pinheiro text-[rgb(var(--on-azul))] shadow-erguido transition active:scale-95" onClick={() => openAdd()} aria-label="Adicionar um sonho">
              <Plus size={26} />
            </button>
          </div>
          <MobTab to="/conquistas" icon={Trophy} label="Conquistas" />
          <button className="flex flex-col items-center gap-0.5 py-1.5 text-[11.5px] font-medium text-tinta-2" onClick={() => setMore(true)}>
            <MoreHorizontal size={22} strokeWidth={1.7} /> Mais
          </button>
        </div>
      </nav>

      <Modal open={more} onClose={() => setMore(false)} label="Mais opções" size="sm">
        <div className="p-5">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[22px] leading-none">Mais</h2><CloseButton onClick={() => setMore(false)} /></div>
          <ul className="divide-y divide-linho/80">
            {[...NAV.filter((n) => ['/categorias', '/financeiro', '/atividades'].includes(n.to)), { to: '/configuracoes', label: 'Configurações', icon: Settings }].map((n) => (
              <li key={n.to}><button className="flex w-full items-center gap-3 py-3.5 text-left text-[16px]" onClick={() => { setMore(false); nav(n.to) }}><n.icon size={20} strokeWidth={1.6} className="text-pinheiro" /> {n.label}</button></li>
            ))}
            <li><button className="flex w-full items-center gap-3 py-3.5 text-left text-[16px] text-alerta" onClick={() => void signOut()}><LogOut size={20} strokeWidth={1.6} /> Sair da conta</button></li>
          </ul>
        </div>
      </Modal>

      <DreamDetail dreamId={detail} onClose={() => setDetail(null)} />
      <DreamForm open={!!adding} defaultCategoryId={adding?.cat} onClose={() => setAdding(null)} onSaved={(id) => { if (id) void b.ensureUrls([]) }} />
      <InviteDialog open={invite} onClose={() => setInvite(false)} />
      <NotificationsDialog open={notif} onClose={() => setNotif(false)} />
      <CelebrationDialog />
    </Ctx.Provider>
  )
}

function MobTab({ to, icon: Icon, label }: { to: string; icon: typeof Home; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-1.5 text-[11.5px] font-medium ${isActive ? 'text-pinheiro' : 'text-tinta-2'}`}>
      <Icon size={22} strokeWidth={1.7} /> {label}
    </NavLink>
  )
}
