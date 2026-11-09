import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, Trash2 } from 'lucide-react'
import type { Dream } from '../lib/types'
import { formatDate } from '../lib/format'
import { useBoard } from '../state/board'
import { useToast } from '../state/toast'
import { CloseButton, ErrorNote, Field, Modal, Seal, Spinner } from './ui'

/** Passo 1: registrar a conquista (comentário e foto opcionais). */
export function AchieveDialog({ dream, onClose }: { dream: Dream | null; onClose: () => void }) {
  const b = useBoard()
  const toast = useToast()
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { if (dream) { setNote(''); setFile(null); setPreview(null); setError(null) } }, [dream?.id])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  if (!dream) return null
  return (
    <Modal open onClose={() => !busy && onClose()} label="Registrar conquista" size="md" dismissable={!busy}>
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[34px] sm:text-[40px] leading-[1.02]">Vocês conseguiram.</h2>
            <p className="mt-2 text-[15px] text-tinta-2">Registre como foi realizar <strong className="font-semibold text-tinta">{dream.title}</strong>. Fica guardado no álbum de conquistas.</p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="mt-6 space-y-5">
          <Field label="Comentário sobre a conquista" htmlFor="a-note" hint="Opcional. Uma lembrança, uma data, um detalhe que vocês não querem esquecer.">
            <textarea id="a-note" className="field" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder="Como foi esse dia?" data-autofocus />
          </Field>

          <div>
            <span className="label">Foto da conquista</span>
            {preview ? (
              <div className="relative overflow-hidden rounded-[10px] border border-linho">
                <img src={preview} alt="Foto da conquista" className="max-h-[260px] w-full object-cover" />
                <button type="button" className="btn btn-icon absolute right-2 top-2 bg-papel/90 hover:bg-papel" aria-label="Remover foto" onClick={() => { setFile(null); setPreview(null) }}><Trash2 size={17} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => input.current?.click()} className="flex w-full items-center gap-3 rounded-[10px] border-[1.5px] border-dashed border-[#bdb6a6] bg-white/50 px-4 py-4 text-left transition hover:border-pinheiro hover:bg-white">
                <ImagePlus className="text-pinheiro" size={22} strokeWidth={1.5} />
                <span className="text-[14.5px] text-tinta-2">Adicionar uma foto do momento <span className="text-tinta-3">(opcional)</span></span>
              </button>
            )}
            <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) { setFile(f); setPreview(URL.createObjectURL(f)) }
              e.target.value = ''
            }} />
          </div>

          <ErrorNote>{error}</ErrorNote>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button className="btn btn-soft" onClick={onClose} disabled={busy}>Ainda não</button>
          <button
            className="btn btn-brass"
            disabled={busy}
            onClick={async () => {
              setBusy(true); setError(null)
              try {
                await b.achieve(dream, note, file)
                toast('Conquista registrada.')
                b.showCelebration({ dreamId: dream.id, title: dream.title, byName: 'Você', at: new Date().toISOString(), note: note.trim() || null })
                onClose()
              } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
            }}
          >
            {busy && <Spinner />} Marcar como conquistado
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Passo 2: o momento. Aparece para quem conquistou e, em tempo real, para o par. */
export function CelebrationDialog() {
  const b = useBoard()
  const nav = useNavigate()
  const c = b.celebration
  if (!c) return null
  const dream = b.dreams.find((d) => d.id === c.dreamId)
  const year = dream?.achieved_at ? new Date(dream.achieved_at).getFullYear() : new Date(c.at).getFullYear()
  const sparks = Array.from({ length: 14 }, (_, i) => i)

  return (
    <Modal open onClose={b.dismissCelebration} label="Um sonho realizado" size="md">
      <div className="relative overflow-hidden px-6 pb-8 pt-10 text-center sm:px-12 sm:pb-10 sm:pt-12">
        <CloseButton onClick={b.dismissCelebration} className="absolute right-3 top-3" />
        <div className="pointer-events-none absolute inset-x-0 top-24" aria-hidden="true">
          {sparks.map((i) => (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rotate-45 bg-latao animate-brilho"
              style={{ left: `${8 + ((i * 53) % 84)}%`, top: `${(i * 17) % 40}px`, animationDelay: `${0.5 + (i % 7) * 0.18}s`, opacity: 0 }}
            />
          ))}
        </div>

        <div className="mx-auto w-[150px] animate-carimbo" style={{ transformOrigin: 'center' }}>
          <Seal year={year} size={150} />
        </div>

        <h2 className="mt-8 text-[38px] sm:text-[46px] uppercase leading-[1] tracking-[0.02em] animate-subir" style={{ animationDelay: '.45s' }}>
          Um sonho realizado!
        </h2>
        <p className="mt-3 text-[17px] text-tinta-2 animate-subir" style={{ animationDelay: '.6s' }}>
          Vocês transformaram esse desejo em realidade.
        </p>

        <div className="mx-auto mt-7 max-w-[400px] border-t border-linho pt-6 animate-subir" style={{ animationDelay: '.75s' }}>
          <p className="font-display text-[30px] leading-tight">{c.title}</p>
          <p className="mt-2 text-[14px] text-tinta-3">{c.byName === 'Você' ? 'Registrado por você' : `Registrado por ${c.byName}`} em {formatDate(c.at)}</p>
          {c.note && <p className="mt-4 rounded-[10px] bg-latao-soft/70 px-4 py-3 text-[15px] italic leading-relaxed text-tinta">“{c.note}”</p>}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center animate-subir" style={{ animationDelay: '.9s' }}>
          <button className="btn btn-soft" onClick={b.dismissCelebration}>Continuar</button>
          <button className="btn btn-primary" onClick={() => { b.dismissCelebration(); nav('/conquistas') }}>Ver nosso álbum</button>
        </div>
      </div>
    </Modal>
  )
}
