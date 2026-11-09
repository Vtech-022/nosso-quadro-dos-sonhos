import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Move, Plus, RefreshCw, Trash2, Undo2, Check } from 'lucide-react'
import type { Dream, DreamFormat, DreamStatus } from '../lib/types'
import { suggestFormat } from '../lib/images'
import { CategoryIcon, ICON_KEYS } from '../lib/icons'
import { useBoard } from '../state/board'
import { useToast } from '../state/toast'
import { Avatar, CloseButton, ErrorNote, Field, Modal, MoneyInput, Spinner } from './ui'

const FORMATS: { id: DreamFormat; label: string; ratio: number; box: string }[] = [
  { id: 'quadrado', label: 'Quadrado', ratio: 1, box: 'h-5 w-5' },
  { id: 'retrato', label: 'Retrato', ratio: 0.8, box: 'h-6 w-[18px]' },
  { id: 'paisagem', label: 'Paisagem', ratio: 1.5, box: 'h-4 w-6' },
  { id: 'destaque', label: 'Destaque', ratio: 1.1, box: 'h-6 w-6' },
]
const ratioOf = (f: DreamFormat) => FORMATS.find((x) => x.id === f)!.ratio
const clamp = (n: number) => Math.max(0, Math.min(100, n))

/* ---------- Enquadramento: arraste a foto para escolher o que aparece no mural ---------- */
function FrameEditor({ src, natural, format, focus, onChange }: {
  src: string; natural: { w: number; h: number } | null; format: DreamFormat
  focus: { x: number; y: number }; onChange: (f: { x: number; y: number }) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null)
  const ratio = ratioOf(format)
  const imgRatio = natural ? natural.w / natural.h : ratio

  const move = (clientX: number, clientY: number) => {
    const d = drag.current
    const el = box.current
    if (!d || !el) return
    const w = el.clientWidth
    const h = w / ratio
    let { x, y } = focus
    if (imgRatio > ratio + 0.001) {
      const overflow = w * (imgRatio / ratio - 1)
      x = clamp(d.fx - ((clientX - d.x) / overflow) * 100)
    } else if (imgRatio < ratio - 0.001) {
      const overflow = h * (ratio / imgRatio - 1)
      y = clamp(d.fy - ((clientY - d.y) / overflow) * 100)
    }
    onChange({ x, y })
  }

  const canPan = Math.abs(imgRatio - ratio) > 0.02

  return (
    <div className="relative">
      <div
        ref={box}
        className={`relative mx-auto w-full overflow-hidden rounded-[6px] bg-linho touch-none select-none ${canPan ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ aspectRatio: String(ratio), maxHeight: 420 }}
        tabIndex={0}
        role="group"
        aria-label="Enquadramento da foto. Arraste ou use as setas do teclado para mover."
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          drag.current = { x: e.clientX, y: e.clientY, fx: focus.x, fy: focus.y }
        }}
        onPointerMove={(e) => move(e.clientX, e.clientY)}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 3
          const d: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }
          if (d[e.key]) { e.preventDefault(); onChange({ x: clamp(focus.x + d[e.key][0]), y: clamp(focus.y + d[e.key][1]) }) }
        }}
      >
        <img src={src} alt="Pré-visualização da foto" draggable={false} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${focus.x}% ${focus.y}%` }} />
        {canPan && (
          <span className="pointer-events-none absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-tinta/70 px-2.5 py-1 text-[12px] font-medium text-papel">
            <Move size={13} /> Arraste para enquadrar
          </span>
        )}
      </div>
    </div>
  )
}

export function DreamForm({ open, onClose, dream, defaultCategoryId, onSaved }: {
  open: boolean; onClose: () => void; dream?: Dream; defaultCategoryId?: string | null
  onSaved?: (id: string) => void
}) {
  const b = useBoard()
  const toast = useToast()
  const editing = !!dream
  const cover = dream ? b.coverOf(dream) : undefined

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [estimated, setEstimated] = useState<number | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const [targetDate, setTargetDate] = useState('')
  const [status, setStatus] = useState<DreamStatus>('planning')
  const [format, setFormat] = useState<DreamFormat>('quadrado')
  const [formatTouched, setFormatTouched] = useState(false)
  const [focus, setFocus] = useState({ x: 50, y: 50 })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [removeCover, setRemoveCover] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newCat, setNewCat] = useState<{ name: string; icon: string } | null>(null)
  const [catBusy, setCatBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  // inicializa ao abrir
  useEffect(() => {
    if (!open) return
    setTitle(dream?.title ?? '')
    setDescription(dream?.description ?? '')
    setCategoryId(dream ? dream.category_id : defaultCategoryId ?? null)
    setEstimated(dream?.estimated_value ?? null)
    setSaved(dream?.saved_value ?? null)
    setTargetDate(dream?.target_date ?? '')
    setStatus(dream?.status ?? 'planning')
    setFormat(dream?.format ?? 'quadrado')
    setFormatTouched(!!dream)
    setFocus({ x: cover?.focus_x ?? 50, y: cover?.focus_y ?? 50 })
    setFile(null); setPreview(null); setNatural(cover?.width && cover?.height ? { w: cover.width, h: cover.height } : null)
    setRemoveCover(false); setError(null); setNewCat(null)
    if (cover) void b.ensureUrls([cover.path])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dream?.id])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const shownSrc = preview ?? (!removeCover && cover ? b.url(cover.path) ?? b.url(cover.thumb_path) : undefined)

  // mede a imagem existente quando não há dimensões salvas
  useEffect(() => {
    if (!shownSrc || natural) return
    const i = new Image()
    i.onload = () => setNatural({ w: i.naturalWidth, h: i.naturalHeight })
    i.src = shownSrc
  }, [shownSrc, natural])

  const pickFile = (f: File | undefined | null) => {
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('Escolha um arquivo de imagem (JPG, PNG ou WebP).'); return }
    setError(null)
    if (preview) URL.revokeObjectURL(preview)
    const u = URL.createObjectURL(f)
    setFile(f); setPreview(u); setRemoveCover(false); setFocus({ x: 50, y: 50 })
    const i = new Image()
    i.onload = () => {
      setNatural({ w: i.naturalWidth, h: i.naturalHeight })
      if (!formatTouched) setFormat(suggestFormat(i.naturalWidth, i.naturalHeight))
    }
    i.src = u
  }

  const dirty = useMemo(() => !!title.trim(), [title])

  async function addCategory() {
    if (!newCat) return
    setCatBusy(true)
    try {
      const id = await b.saveCategory({ name: newCat.name, icon: newCat.icon, tone: b.categories.length % 8 })
      setCategoryId(id); setNewCat(null)
    } catch (e) { setError((e as Error).message) } finally { setCatBusy(false) }
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!title.trim()) { setError('Dê um nome ao sonho.'); return }
    setBusy(true); setError(null)
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId,
      status,
      estimated_value: estimated,
      saved_value: saved,
      target_date: targetDate || null,
      format,
    }
    try {
      let id = dream?.id ?? ''
      if (!dream) {
        id = await b.createDream(payload, file, focus)
        toast(status === 'achieved' ? 'Sonho conquistado e guardado no álbum.' : 'Sonho pendurado no quadro.')
      } else {
        const changed = (Object.keys(payload) as (keyof typeof payload)[]).some((k) => payload[k] !== (dream[k] ?? null) && !(k === 'description' && !payload[k] && !dream[k]))
        if (changed) await b.updateDream(dream.id, payload)
        if (file) await b.replaceCover(dream, file, focus)
        else if (removeCover && cover) await b.removeImage(cover)
        else if (cover && (cover.focus_x !== focus.x || cover.focus_y !== focus.y)) await b.setFocus(cover.id, focus)
        if (status === 'achieved' && dream.status !== 'achieved') {
          b.showCelebration({ dreamId: dream.id, title: payload.title, byName: 'Você', at: new Date().toISOString(), note: null })
        } else toast('Alterações salvas.')
      }
      onSaved?.(id)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally { setBusy(false) }
  }

  const adder = dream ? b.memberOf(dream.created_by) : b.me

  return (
    <Modal open={open} onClose={() => !busy && onClose()} label={editing ? 'Editar sonho' : 'Adicionar um sonho'} size="lg" dismissable={!busy}>
      <form onSubmit={submit} noValidate>
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-7">
          <div>
            <h2 className="text-[34px] sm:text-[42px] leading-none">{editing ? 'Editar sonho' : 'Adicionar um sonho'}</h2>
            <p className="mt-2 text-[15px] text-tinta-2">{editing ? 'Ajuste o que mudou. O seu par vê a atualização na hora.' : 'Comece pela foto. Ela é o que vai ficar pendurado no quadro.'}</p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="grid gap-7 px-5 py-6 sm:px-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-9">
          {/* ---- Foto ---- */}
          <div className="space-y-4">
            {shownSrc ? (
              <>
                <FrameEditor src={shownSrc} natural={natural} format={format} focus={focus} onChange={setFocus} />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-soft btn-sm" onClick={() => input.current?.click()}><RefreshCw size={15} /> Trocar foto</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (preview) { URL.revokeObjectURL(preview) } setFile(null); setPreview(null); if (cover) setRemoveCover(true); setNatural(null) }}>
                    <Trash2 size={15} /> Remover foto
                  </button>
                </div>
              </>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]) }}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="group flex w-full flex-col items-center justify-center gap-3 rounded-[10px] border-[1.5px] border-dashed border-[#bdb6a6] bg-white/50 px-6 py-14 text-center transition hover:border-pinheiro hover:bg-white"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-pinheiro-soft text-pinheiro transition group-hover:scale-105"><ImagePlus size={26} strokeWidth={1.5} /></span>
                  <span className="font-display text-[24px] leading-tight">Escolher uma foto</span>
                  <span className="text-[13.5px] text-tinta-2 max-w-[260px]">Da galeria do celular ou do computador. Você também pode arrastar a imagem até aqui.</span>
                </button>
                {removeCover && cover && (
                  <button type="button" className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-pinheiro" onClick={() => setRemoveCover(false)}>
                    <Undo2 size={15} /> Desfazer remoção da foto atual
                  </button>
                )}
              </div>
            )}
            <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />

            <div>
              <span className="label">Tamanho no mural</span>
              <div className="seg w-full" role="group" aria-label="Tamanho no mural">
                {FORMATS.map((f) => (
                  <button key={f.id} type="button" aria-pressed={format === f.id} className="flex-1 flex flex-col items-center gap-1 !h-14 !px-1" onClick={() => { setFormat(f.id); setFormatTouched(true) }}>
                    <span className={`${f.box} rounded-[2px] border-[1.5px] border-current`} />
                    <span className="text-[12px]">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ---- Campos ---- */}
          <div className="space-y-5">
            <Field label="Nome do sonho" htmlFor="d-title">
              <input id="d-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ex.: Nossa casa com varanda" data-autofocus />
            </Field>

            <div>
              <span className="label">Categoria</span>
              <div className="flex flex-wrap gap-2">
                {b.categories.map((c) => (
                  <button key={c.id} type="button" className="chip" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}>
                    <CategoryIcon name={c.icon} size={15} /> {c.name}
                  </button>
                ))}
                {!newCat && <button type="button" className="chip border-dashed" onClick={() => setNewCat({ name: '', icon: 'star' })}><Plus size={15} /> Nova categoria</button>}
              </div>
              {newCat && (
                <div className="mt-3 rounded-[12px] border border-linho bg-white p-3.5 space-y-3">
                  <input className="field" placeholder="Nome da categoria" value={newCat.name} maxLength={40} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} aria-label="Nome da nova categoria" />
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Ícone da categoria">
                    {ICON_KEYS.map((k) => (
                      <button key={k} type="button" role="radio" aria-checked={newCat.icon === k} aria-label={k} onClick={() => setNewCat({ ...newCat, icon: k })}
                        className={`grid h-9 w-9 place-items-center rounded-[8px] border transition ${newCat.icon === k ? 'border-pinheiro bg-pinheiro-soft text-pinheiro' : 'border-linho text-tinta-2 hover:border-tinta-3'}`}>
                        <CategoryIcon name={k} size={17} />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNewCat(null)}>Cancelar</button>
                    <button type="button" className="btn btn-primary btn-sm" disabled={catBusy || !newCat.name.trim()} onClick={addCategory}>{catBusy && <Spinner size={15} />} Criar categoria</button>
                  </div>
                </div>
              )}
            </div>

            <Field label="Descrição ou observações" htmlFor="d-desc">
              <textarea id="d-desc" className="field" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="O que vocês imaginam para esse sonho?" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valor estimado" htmlFor="d-est" hint="Opcional. Sem valor, o sonho fica fora dos cálculos financeiros.">
                <MoneyInput id="d-est" value={estimated} onChange={setEstimated} />
              </Field>
              <Field label="Valor já acumulado" htmlFor="d-sav" hint="Opcional.">
                <MoneyInput id="d-sav" value={saved} onChange={setSaved} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data desejada" htmlFor="d-date">
                <input id="d-date" type="date" className="field" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </Field>
              <div>
                <span className="label">Status</span>
                <div className="seg w-full" role="group" aria-label="Status do sonho">
                  <button type="button" className="flex-1 !px-2" aria-pressed={status === 'planning'} onClick={() => setStatus('planning')}>Em planejamento</button>
                  <button type="button" className="flex-1 !px-2" aria-pressed={status === 'achieved'} onClick={() => setStatus('achieved')}>Conquistado</button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-[13.5px] text-tinta-2">
              <Avatar userId={adder?.user_id} name={adder?.display_name} path={adder?.avatar_path} size={26} />
              <span>Adicionado por <strong className="font-semibold text-tinta">{adder?.user_id === b.meId ? 'você' : adder?.display_name ?? 'seu par'}</strong></span>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-linho bg-papel/95 px-5 py-4 sm:px-8 backdrop-blur safe-bottom">
          <ErrorNote>{error}</ErrorNote>
          <div className={`flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end ${error ? 'mt-3' : ''}`}>
            <button type="button" className="btn btn-soft" onClick={onClose} disabled={busy}>Cancelar</button>
            <button type="submit" className="btn btn-primary min-w-[190px]" disabled={busy || !dirty}>
              {busy ? <Spinner /> : <Check size={18} />} {editing ? 'Salvar alterações' : 'Adicionar ao quadro'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
