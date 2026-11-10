import { useMemo } from 'react'
import { CalendarDays, Camera, Check, MessageSquare, Pencil, Plus, RotateCcw, Trash2, UserMinus, UserPlus, Wallet } from 'lucide-react'
import type { ActivityKind } from '../lib/types'
import { dayLabel, formatTime } from '../lib/format'
import { describeUpdate, useBoard } from '../state/board'
import { EmptyWall } from '../components/Mural'
import { useShell } from '../components/Shell'
import { Avatar } from '../components/ui'
import { PageHead } from './quadro'

const ICON: Record<ActivityKind, typeof Plus> = {
  created: Plus, updated: Pencil, value_changed: Wallet, image_added: Camera, achieved: Check, reopened: RotateCcw,
  comment: MessageSquare, deleted: Trash2, member_joined: UserPlus, member_left: UserMinus, board_created: CalendarDays, sync: Pencil,
}

export function AtividadesPage() {
  const b = useBoard()
  const { openDetail } = useShell()
  const groups = useMemo(() => {
    const m = new Map<string, typeof b.activities>()
    b.activities.forEach((a) => { const k = dayLabel(a.created_at); m.set(k, [...(m.get(k) ?? []), a]) })
    return [...m.entries()]
  }, [b.activities])

  if (b.activities.length === 0) return (<><PageHead title="Atividades" /><EmptyWall title="Nada aconteceu ainda." text="Cada sonho adicionado, valor atualizado, foto nova e conquista fica registrado aqui, com quem fez e quando." /></>)

  return (
    <>
      <PageHead title="Atividades" sub="Tudo o que os dois fizeram no quadro, em ordem." />
      <div className="max-w-[760px] space-y-12">
        {groups.map(([day, list]) => (
          <section key={day} aria-label={day}>
            <h2 className="mb-2 border-b border-linho pb-2 text-[22px] leading-none">{day}</h2>
            <ul className="divide-y divide-linho/70">
              {list.map((a) => {
                const m = b.memberOf(a.actor_id)
                const Icon = ICON[a.kind]
                const open = a.dream_id && b.dreams.some((d) => d.id === a.dream_id)
                const inner = (
                  <>
                    <span className="relative shrink-0">
                      <Avatar userId={a.actor_id} name={m?.display_name} path={m?.avatar_path} size={38} />
                      <span className="absolute -bottom-1 -right-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-papel text-pinheiro ring-1 ring-linho"><Icon size={11} strokeWidth={2.2} /></span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15.5px] leading-snug">{describeUpdate(a, a.actor_id === b.meId ? 'Você' : m?.display_name ?? 'Seu par')}</span>
                      {a.body && <span className="mt-1 block text-[14px] italic text-tinta-2 line-clamp-2">“{a.body}”</span>}
                    </span>
                    <span className="shrink-0 pt-0.5 text-[13px] text-tinta-3 tabular-nums">{formatTime(a.created_at)}</span>
                  </>
                )
                return (
                  <li key={a.id}>
                    {open
                      ? <button className="flex w-full items-start gap-3.5 rounded-[14px] py-4 text-left transition hover:bg-papel/60" onClick={() => openDetail(a.dream_id!)}>{inner}</button>
                      : <div className="flex items-start gap-3.5 py-4">{inner}</div>}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
