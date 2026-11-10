import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Category } from '../lib/types'
import { CategoryIcon, ICON_KEYS } from '../lib/icons'
import { moneyCompact } from '../lib/format'
import { useBoard } from '../state/board'
import { useToast } from '../state/toast'
import { Mural, EmptyWall } from '../components/Mural'
import { useShell } from '../components/Shell'
import { CloseButton, ConfirmDialog, ErrorNote, Field, Modal, Spinner } from '../components/ui'
import { PageHead } from './quadro'

function CategoryDialog({ open, cat, onClose }: { open: boolean; cat?: Category; onClose: () => void }) {
  const b = useBoard()
  const [name, setName] = useState(cat?.name ?? '')
  const [icon, setIcon] = useState(cat?.icon ?? 'star')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <Modal open={open} onClose={onClose} label={cat ? 'Editar categoria' : 'Nova categoria'} size="md">
      <form className="p-6 sm:p-8" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setError(null)
        try { await b.saveCategory({ id: cat?.id, name, icon, tone: cat?.tone ?? b.categories.length % 8 }); onClose() }
        catch (er) { setError((er as Error).message) } finally { setBusy(false) }
      }}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[24px] leading-none">{cat ? 'Editar categoria' : 'Nova categoria'}</h2>
          <CloseButton onClick={onClose} />
        </div>
        <div className="mt-6 space-y-5">
          <Field label="Nome" htmlFor="cat-n"><input id="cat-n" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required data-autofocus /></Field>
          <div>
            <span className="label">Ícone</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Ícone">
              {ICON_KEYS.map((k) => (
                <button key={k} type="button" role="radio" aria-checked={icon === k} aria-label={k} onClick={() => setIcon(k)}
                  className={`grid h-10 w-10 place-items-center rounded-[9px] border transition ${icon === k ? 'border-pinheiro bg-pinheiro-soft text-pinheiro' : 'border-linho text-tinta-2 hover:border-tinta-3'}`}>
                  <CategoryIcon name={k} size={18} />
                </button>
              ))}
            </div>
          </div>
          <ErrorNote>{error}</ErrorNote>
        </div>
        <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-soft" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={busy || !name.trim()}>{busy && <Spinner />} {cat ? 'Salvar' : 'Criar categoria'}</button>
        </div>
      </form>
    </Modal>
  )
}

export function CategoriasPage() {
  const b = useBoard()
  const toast = useToast()
  const { openDetail, openAdd } = useShell()
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const rows = useMemo(() => {
    const list = b.categories.map((c) => {
      const ds = b.dreams.filter((d) => d.category_id === c.id)
      return { id: c.id, cat: c as Category | null, name: c.name, icon: c.icon, tone: c.tone, dreams: ds }
    })
    const none = b.dreams.filter((d) => !d.category_id)
    if (none.length) list.push({ id: 'none', cat: null, name: 'Sem categoria', icon: 'star', tone: 6, dreams: none })
    return list
  }, [b.categories, b.dreams])

  return (
    <>
      <PageHead
        title="Categorias"
        sub="Cada sonho pode morar em uma categoria. Escolha uma para ver só aquele pedaço do quadro."
        right={<button className="btn btn-soft self-start" onClick={() => setEditing('new')}><Plus size={18} /> Nova categoria</button>}
      />

      <ul className="divide-y divide-linho border-y border-linho">
        {rows.map((r) => {
          const value = r.dreams.reduce((s, d) => s + (d.estimated_value ?? 0), 0)
          const open = selected === r.id
          return (
            <li key={r.id}>
              <div className={`group flex items-center gap-3 py-4 sm:gap-5 ${open ? 'bg-papel/60' : ''}`}>
                <button className="flex min-w-0 flex-1 items-center gap-4 text-left sm:gap-5" aria-expanded={open} onClick={() => setSelected(open ? null : r.id)}>
                  <span className={`tone-chip tone-${r.tone} grid h-12 w-12 shrink-0 place-items-center rounded-full`}><CategoryIcon name={r.icon} size={22} /></span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[21px] leading-none sm:text-[26px]">{r.name}</span>
                    <span className="mt-1.5 block text-[13.5px] text-tinta-2">
                      {r.dreams.length === 0 ? 'Nenhum sonho ainda' : (() => { const a = r.dreams.filter((d) => d.status === 'achieved').length; return `${r.dreams.length} ${r.dreams.length === 1 ? 'sonho' : 'sonhos'}, ${a} ${a === 1 ? 'conquistado' : 'conquistados'}` })()}
                      {value > 0 && <> · {moneyCompact(value)} em estimativas</>}
                    </span>
                  </span>
                </button>
                <span className="hidden items-center sm:flex" aria-hidden="true">
                  {r.dreams.slice(0, 4).map((d, i) => {
                    const cv = b.coverOf(d)
                    const src = b.url(cv?.thumb_path ?? cv?.path)
                    return <span key={d.id} className="-ml-3 h-14 w-12 overflow-hidden rounded-[3px] border-[3px] border-papel bg-linho shadow-papel first:ml-0" style={{ transform: `rotate(${(i - 1.5) * 3.5}deg)` }}>{src && <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${cv?.focus_x}% ${cv?.focus_y}%` }} />}</span>
                  })}
                </span>
                {r.cat && (
                  <span className="flex shrink-0 gap-1">
                    <button className="btn btn-icon btn-ghost" aria-label={`Editar ${r.name}`} onClick={() => setEditing(r.cat!)}><Pencil size={17} /></button>
                    <button className="btn btn-icon btn-ghost" aria-label={`Excluir ${r.name}`} onClick={() => setDeleting(r.cat!)}><Trash2 size={17} /></button>
                  </span>
                )}
              </div>
              {open && (
                <div className="pb-10 pt-4">
                  {r.dreams.length ? <Mural dreams={r.dreams} onOpen={openDetail} onAdd={() => openAdd(r.cat?.id ?? null)} /> : (
                    <EmptyWall title="Esta categoria está vazia." text="Adicione um sonho e escolha esta categoria." action={<button className="btn btn-primary" onClick={() => openAdd(r.cat?.id ?? null)}><Plus size={18} /> Adicionar um sonho</button>} />
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {editing && <CategoryDialog open cat={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} key={editing === 'new' ? 'new' : editing.id} />}
      <ConfirmDialog
        open={!!deleting}
        title="Excluir categoria?"
        danger
        confirmLabel="Excluir categoria"
        text={<>Os sonhos de “{deleting?.name}” continuam no quadro, só ficam sem categoria.</>}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { try { await b.deleteCategory(deleting!.id); toast('Categoria excluída.'); setSelected(null) } catch (e) { toast((e as Error).message, { tone: 'erro' }) } }}
      />
    </>
  )
}
