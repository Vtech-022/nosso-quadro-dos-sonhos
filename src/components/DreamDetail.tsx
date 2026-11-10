import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ImagePlus, Pencil, RotateCcw, Send, Sparkles, Trash2, Wallet, X } from 'lucide-react'
import { CategoryIcon } from '../lib/icons'
import { formatDate, formatDateOnly, money, percent, relativeTime } from '../lib/format'
import { useBoard } from '../state/board'
import { useToast } from '../state/toast'
import { AchieveDialog } from './Achievement'
import { DreamForm } from './DreamForm'
import { Avatar, CloseButton, ConfirmDialog, Modal, MoneyInput, Seal, Spinner } from './ui'

export function DreamDetail({ dreamId, onClose }: { dreamId: string | null; onClose: () => void }) {
  const b = useBoard()
  const toast = useToast()
  const dream = b.dreams.find((d) => d.id === dreamId)
  const [editing, setEditing] = useState(false)
  const [achieving, setAchieving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [editSaved, setEditSaved] = useState(false)
  const [savedValue, setSavedValue] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const gallery = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setActive(null); setText(''); setEditSaved(false)
    const d = b.dreams.find((x) => x.id === dreamId)
    if (d) void b.ensureUrls(d.images.flatMap((i) => [i.path, i.thumb_path]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dreamId])

  // se o sonho foi removido pelo par enquanto estava aberto
  useEffect(() => {
    if (dreamId && !b.loading && !dream && !deleting) onClose()
  }, [dreamId, dream, b.loading, deleting, onClose])

  const comments = useMemo(
    () => b.activities.filter((a) => a.kind === 'comment' && a.dream_id === dreamId).sort((x, y) => +new Date(x.created_at) - +new Date(y.created_at)),
    [b.activities, dreamId],
  )

  if (!dreamId || !dream) return null
  const cover = b.coverOf(dream)
  const images = [...(cover ? [cover] : []), ...dream.images.filter((i) => i.kind !== 'cover')]
  const current = images.find((i) => i.id === active) ?? images[0]
  const src = b.url(current?.path) ?? b.url(current?.thumb_path)
  const cat = b.category(dream.category_id)
  const achieved = dream.status === 'achieved'
  const pct = percent(dream.saved_value, dream.estimated_value)
  const remaining = dream.estimated_value != null ? Math.max(0, dream.estimated_value - (dream.saved_value ?? 0)) : null
  const adder = b.memberOf(dream.created_by)

  const run = async (key: string, fn: () => Promise<void>, ok?: string) => {
    setBusy(key)
    try { await fn(); if (ok) toast(ok) } catch (e) { toast((e as Error).message, { tone: 'erro' }) } finally { setBusy(null) }
  }

  return (
    <>
      <Modal open={!editing && !achieving} onClose={onClose} label={dream.title} size="xl">
        <div className="grid md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          {/* ---- Foto ---- */}
          <div className="relative bg-linho/70 p-4 sm:p-6 md:flex md:flex-col md:justify-center md:rounded-l-[22px]">
            <div className="relative overflow-hidden rounded-[6px] bg-linho shadow-papel">
              {src ? (
                <img src={src} alt={dream.title} className="mx-auto max-h-[62dvh] w-full object-contain bg-papel" />
              ) : (
                <div className={`print-empty tone-${cat?.tone ?? 6} aspect-[4/3]`}><CategoryIcon name={cat?.icon ?? 'star'} size={72} /></div>
              )}
              {achieved && current?.kind !== 'achievement' && (
                <Seal year={dream.achieved_at ? new Date(dream.achieved_at).getFullYear() : ''} size={92} className="absolute right-3 top-3 -rotate-12" />
              )}
            </div>
            {(
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {images.length > 1 && images.map((i) => (
                  <div key={i.id} className="group relative">
                    <button type="button" onClick={() => setActive(i.id)} aria-label={i.kind === 'achievement' ? 'Foto da conquista' : 'Foto do sonho'}
                      className={`block h-14 w-14 overflow-hidden rounded-[6px] border-2 transition ${current?.id === i.id ? 'border-pinheiro' : 'border-transparent opacity-80 hover:opacity-100'}`}>
                      <img src={b.url(i.thumb_path ?? i.path)} alt="" className="h-full w-full object-cover" />
                    </button>
                    {i.kind !== 'cover' && (
                      <button type="button" aria-label="Excluir esta foto" className="absolute -right-1.5 -top-1.5 hidden h-6 w-6 place-items-center rounded-full bg-tinta text-papel group-hover:grid group-focus-within:grid"
                        onClick={() => run('img' + i.id, () => b.removeImage(i), 'Foto excluída.')}><X size={13} /></button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-soft btn-sm" disabled={busy === 'add'} onClick={() => gallery.current?.click()}>
                  {busy === 'add' ? <Spinner size={15} /> : <ImagePlus size={15} />} Adicionar foto
                </button>
                <input ref={gallery} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => {
                  const f = e.target.files?.[0]; e.target.value = ''
                  if (f) void run('add', () => b.addImage(dream, f, 'gallery'), 'Foto adicionada.')
                }} />
              </div>
            )}
          </div>

          {/* ---- Informações ---- */}
          <div className="flex min-w-0 flex-col p-5 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {cat && <span className={`tone-chip tone-${cat.tone} inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold`}><CategoryIcon name={cat.icon} size={14} /> {cat.name}</span>}
                {achieved
                  ? <span className="inline-flex items-center gap-1.5 rounded-full bg-latao-soft px-3 py-1 text-[13px] font-semibold text-latao-2"><Sparkles size={13} /> Conquistado</span>
                  : <span className="inline-flex items-center gap-1.5 rounded-full border border-linho px-3 py-1 text-[13px] font-semibold text-tinta-2"><span className="h-1.5 w-1.5 rounded-full border border-pinheiro" /> Em planejamento</span>}
              </div>
              <CloseButton onClick={onClose} className="-mr-2 -mt-1" />
            </div>

            <h2 className="mt-4 text-[26px] sm:text-[34px] leading-[1]">{dream.title}</h2>
            {dream.description && <p className="mt-4 whitespace-pre-line text-[16px] leading-relaxed text-tinta-2">{dream.description}</p>}

            {dream.target_date && !achieved && (
              <p className="mt-5 flex items-center gap-2 text-[14.5px] text-tinta-2"><CalendarDays size={17} className="text-pinheiro" /> Queremos viver isso em <strong className="font-semibold text-tinta">{formatDateOnly(dream.target_date)}</strong></p>
            )}

            {/* Valores */}
            {dream.estimated_value != null && (
              <div className="mt-6 rounded-[14px] border border-linho bg-papel/70 p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-tinta-2"><Wallet size={16} className="text-pinheiro" /> Valores</span>
                  {!achieved && !editSaved && <button className="text-[13px] font-semibold text-pinheiro hover:underline" onClick={() => { setSavedValue(dream.saved_value); setEditSaved(true) }}>Atualizar acumulado</button>}
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-3 text-[13px]">
                  <div><dt className="text-tinta-3">Estimado</dt><dd className="mt-0.5 text-[16px] font-semibold tabular-nums">{money(dream.estimated_value)}</dd></div>
                  <div><dt className="text-tinta-3">Acumulado</dt><dd className="mt-0.5 text-[16px] font-semibold tabular-nums">{money(dream.saved_value ?? 0)}</dd></div>
                  <div><dt className="text-tinta-3">Restante</dt><dd className="mt-0.5 text-[16px] font-semibold tabular-nums">{money(remaining)}</dd></div>
                </dl>
                {pct !== null && (
                  <div className="mt-4">
                    <div className={`meter ${achieved ? 'brass' : ''}`}><i style={{ width: `${pct}%` }} /></div>
                    <p className="mt-1.5 text-[12.5px] text-tinta-2">{Math.round(pct)}% alcançado</p>
                  </div>
                )}
                {editSaved && (
                  <div className="mt-4 flex gap-2">
                    <div className="flex-1"><MoneyInput value={savedValue} onChange={setSavedValue} aria-label="Valor acumulado" /></div>
                    <button className="btn btn-primary" disabled={busy === 'saved'} onClick={() => run('saved', async () => { await b.updateDream(dream.id, { saved_value: savedValue }); setEditSaved(false) }, 'Valor atualizado.')}>{busy === 'saved' && <Spinner />} Salvar</button>
                    <button className="btn btn-ghost" onClick={() => setEditSaved(false)}>Cancelar</button>
                  </div>
                )}
              </div>
            )}

            {/* Conquista */}
            {achieved && (
              <div className="mt-6 rounded-[14px] bg-latao-soft/60 p-4 sm:p-5">
                <p className="text-[13px] font-semibold text-latao-2">Conquistado em {dream.achieved_at ? formatDate(dream.achieved_at) : ''}</p>
                <p className="mt-1 text-[14.5px] text-tinta-2">Registrado por {dream.achieved_by === b.meId ? 'você' : b.nameOf(dream.achieved_by)}</p>
                {dream.achievement_note && <p className="mt-3 border-l-2 border-latao pl-3 text-[18px] italic leading-snug">“{dream.achievement_note}”</p>}
              </div>
            )}

            {/* Ações */}
            <div className="mt-6 flex flex-wrap gap-2">
              {!achieved
                ? <button className="btn btn-brass" onClick={() => setAchieving(true)}><Sparkles size={17} /> Marcar como conquistado</button>
                : <button className="btn btn-soft" disabled={busy === 'reopen'} onClick={() => run('reopen', () => b.reopen(dream), 'Sonho voltou para o planejamento.')}>{busy === 'reopen' ? <Spinner /> : <RotateCcw size={16} />} Voltar ao planejamento</button>}
              <button className="btn btn-soft" onClick={() => setEditing(true)}><Pencil size={16} /> Editar</button>
              <button className="btn btn-ghost text-alerta hover:bg-rosa-soft" onClick={() => setDeleting(true)}><Trash2 size={16} /> Excluir</button>
            </div>

            <p className="mt-5 flex flex-wrap items-center gap-2 text-[13px] text-tinta-3">
              <Avatar userId={adder?.user_id} name={adder?.display_name} path={adder?.avatar_path} size={22} />
              Adicionado por {dream.created_by === b.meId ? 'você' : adder?.display_name ?? 'seu par'} em {formatDate(dream.created_at)}
            </p>

            {/* Observações */}
            <section className="mt-7 border-t border-linho pt-6" aria-label="Observações">
              <h3 className="text-[26px] leading-none">Observações</h3>
              {comments.length === 0 && <p className="mt-3 text-[14.5px] text-tinta-2">Ainda não há observações. Anotem ideias, links, dúvidas ou lembranças.</p>}
              <ul className="mt-4 space-y-4">
                {comments.map((c) => {
                  const m = b.memberOf(c.actor_id)
                  return (
                    <li key={c.id} className="flex gap-3">
                      <Avatar userId={c.actor_id} name={m?.display_name} path={m?.avatar_path} size={30} />
                      <div className="min-w-0">
                        <p className="text-[13px] text-tinta-3"><span className="font-semibold text-tinta">{c.actor_id === b.meId ? 'Você' : m?.display_name ?? 'Seu par'}</span> {relativeTime(c.created_at)}</p>
                        <p className="mt-0.5 whitespace-pre-line text-[15px] leading-relaxed text-tinta-2">{c.body}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <form className="mt-4 flex gap-2" onSubmit={async (e) => {
                e.preventDefault()
                if (!text.trim()) return
                setSending(true)
                try { await b.comment(dream.id, text); setText('') } catch (err) { toast((err as Error).message, { tone: 'erro' }) } finally { setSending(false) }
              }}>
                <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escrever uma observação" maxLength={2000} aria-label="Nova observação" />
                <button className="btn btn-primary btn-icon !h-11 !w-11 shrink-0" disabled={sending || !text.trim()} aria-label="Enviar observação">{sending ? <Spinner /> : <Send size={17} />}</button>
              </form>
            </section>
          </div>
        </div>
      </Modal>

      <DreamForm open={editing} dream={dream} onClose={() => setEditing(false)} />
      <AchieveDialog dream={achieving ? dream : null} onClose={() => setAchieving(false)} />
      <ConfirmDialog
        open={deleting}
        title="Excluir este sonho?"
        danger
        confirmLabel="Excluir sonho"
        text={<>“{dream.title}” e as fotos dele saem do quadro dos dois. Essa ação não pode ser desfeita.</>}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          try { await b.deleteDream(dream); toast('Sonho excluído.'); onClose() } catch (e) { toast((e as Error).message, { tone: 'erro' }) }
        }}
      />
    </>
  )
}
