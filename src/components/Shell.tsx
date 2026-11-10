import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity as ActivityIcon, Bell, Compass, Frame, LayoutGrid, LogOut, MoreHorizontal, Plus, Settings, Sparkles, Wallet,
} from 'lucide-react'
import { describeUpdate, useBoard } from '../state/board'
import { useAuth } from '../state/auth'
import { relativeTime } from '../lib/format'
import { CelebrationDialog } from './Achievement'
import { DreamDetail } from './DreamDetail'
import { DreamForm } from './DreamForm'
import { InviteDialog } from './InviteDialog'
import { Avatar, AvatarPair, CloseButton, Modal } from './ui'
import { IS_DEMO } from '../lib/supabase'
import { demoReset } from '../lib/demo/client'

interface ShellCtx {
  openDetail: (id: string) => void
  openAdd: (categoryId?: string | null) => void
  openInvite: () => void
}
const Ctx = createContext<ShellCtx>({ openDetail: () => {}, openAdd: () => {}, openInvite: () => {} })
export const useShell = () => useContext(Ctx)

const NAV = [
  { to: '/quadro', label: 'Quadro', icon: Frame },
  { to: '/categorias', label: 'Categorias', icon: LayoutGrid },
  { to: '/em-planejamento', label: 'Planejamento', icon: Compass },
  { to: '/conquistas', label: 'Conquistas', icon: Sparkles },
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
                    className="flex w-full items-start gap-3 rounded-[3px] px-2 py-3.5 text-left transition hover:bg-papel/70"
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

  const openDetail = useCallback((id: string) => { void b.ensureUrls(b.dreams.find((d) => d.id === id)?.images.flatMap((i) => [i.path, i.thumb_path]) ?? []); setDetail(id) }, [b])
  const openAdd = useCallback((cat?: string | null) => setAdding({ cat: cat ?? null }), [])
  const openInvite = useCallback(() => setInvite(true), [])
  const ctx = useMemo(() => ({ openDetail, openAdd, openInvite }), [openDetail, openAdd, openInvite])

  const coupleName = b.state?.couple?.name ?? ''

  return (
    <Ctx.Provider value={ctx}>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-papel focus:px-4 focus:py-2">Ir para o conteúdo</a>

      {IS_DEMO && (
        <div className="bg-tinta text-papel">
          <div className="mx-auto flex max-w-[1640px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[13px] sm:px-8 lg:px-12">
            <span className="flex items-center gap-2 font-semibold"><span className="sold-dot" /> Demonstração</span>
            <span className="text-papel/70">Tudo o que você fizer fica só neste navegador. O sistema real usa Supabase.</span>
            <span className="ml-auto flex gap-4 font-semibold">
              <button className="underline-offset-4 hover:underline" onClick={() => demoReset('examples')}>Restaurar exemplos</button>
              <button className="underline-offset-4 hover:underline" onClick={() => demoReset('empty')}>Começar do zero</button>
            </span>
          </div>
        </div>
      )}

      {/* ---------- Cabeçalho (estilo de revista) ---------- */}
      <header className="sticky top-0 z-30 border-b border-linho/70 bg-parede/85 backdrop-blur-md">
        <div className="mx-auto flex h-[60px] max-w-[1640px] items-center gap-3 px-4 sm:px-8 lg:px-12">
          <NavLink to="/quadro" className="flex min-w-0 items-center gap-3" aria-label="Ir para Nosso Quadro">
            <AvatarPair size={34} />
            <span className="max-w-[220px] truncate text-[15px] font-semibold leading-none">{coupleName}</span>
          </NavLink>

          <nav className="ml-8 hidden items-center gap-1 lg:flex" aria-label="Principal">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to}
                className={({ isActive }) => `relative whitespace-nowrap rounded-[8px] px-3 py-2 text-[14.5px] font-medium transition ${isActive ? 'text-tinta after:absolute after:inset-x-3 after:-bottom-[13px] after:h-[2px] after:bg-pinheiro' : 'text-tinta-2 hover:text-tinta'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button className="btn btn-icon btn-ghost relative" onClick={() => setNotif(true)} aria-label={b.unread ? `Notificações, ${b.unread} não lidas` : 'Notificações'}>
              <Bell size={20} strokeWidth={1.7} />
              {b.unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-latao px-1 text-[10.5px] font-bold text-white">{b.unread > 9 ? '9+' : b.unread}</span>}
            </button>
            <NavLink to="/configuracoes" className="btn btn-icon btn-ghost" aria-label="Configurações"><Settings size={20} strokeWidth={1.7} /></NavLink>
            <button className="btn btn-primary ml-1 hidden sm:inline-flex" onClick={() => openAdd()}><Plus size={18} /> Adicionar um sonho</button>
          </div>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-[1640px] px-4 pb-32 pt-8 sm:px-8 sm:pt-10 lg:px-12 lg:pb-24" key={loc.pathname}>
        <Outlet />
      </main>

      {/* ---------- Navegação do celular ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-linho bg-papel/95 backdrop-blur-md lg:hidden safe-bottom" aria-label="Principal">
        <div className="mx-auto grid max-w-[560px] grid-cols-5 items-end px-2 pb-1.5 pt-1.5">
          <MobTab to="/quadro" icon={Frame} label="Quadro" />
          <MobTab to="/em-planejamento" icon={Compass} label="Planejando" />
          <div className="flex justify-center">
            <button className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-pinheiro text-[rgb(var(--on-azul))] shadow-erguido transition active:scale-95" onClick={() => openAdd()} aria-label="Adicionar um sonho">
              <Plus size={26} />
            </button>
          </div>
          <MobTab to="/conquistas" icon={Sparkles} label="Conquistas" />
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

function MobTab({ to, icon: Icon, label }: { to: string; icon: typeof Frame; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-1.5 text-[11.5px] font-medium ${isActive ? 'text-pinheiro' : 'text-tinta-2'}`}>
      <Icon size={22} strokeWidth={1.7} /> {label}
    </NavLink>
  )
}
