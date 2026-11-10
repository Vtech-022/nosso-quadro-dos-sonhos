import { useEffect, useState } from 'react'
import { Copy, Link2, Mail, MessageCircle, Share2, Check } from 'lucide-react'
import { useBoard } from '../state/board'
import { useToast } from '../state/toast'
import { CloseButton, ConfirmDialog, ErrorNote, Field, Modal, Spinner } from './ui'

export const inviteLink = (code: string) => `${window.location.origin}${import.meta.env.VITE_DEMO === '1' ? window.location.pathname : ''}${import.meta.env.VITE_DEMO === '1' ? '#' : ''}/convite/${code}`

export function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const b = useBoard()
  const toast = useToast()
  const inv = b.state?.invitation ?? null
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [fresh, setFresh] = useState(false)

  useEffect(() => { if (open) { setError(null); setFresh(false); setName(''); setEmail('') } }, [open])

  const coupleName = b.state?.couple?.name ?? 'nosso quadro'
  const myName = b.me?.display_name ?? ''
  const msg = (link: string) => `${myName} convidou você para o Nosso Quadro dos Sonhos (${coupleName}). Entre pelo link e comece a pendurar os sonhos de vocês: ${link}`

  const copy = async (what: 'link' | 'code', value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(what); window.setTimeout(() => setCopied(null), 1800) }
    catch { toast('Não foi possível copiar. Selecione o texto e copie manualmente.', { tone: 'erro' }) }
  }

  async function create() {
    setBusy(true); setError(null)
    try { await b.invite(name.trim() || null, email.trim() || null); setFresh(true) }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const link = inv ? inviteLink(inv.code) : ''
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <Modal open={open} onClose={onClose} label="Convidar parceiro" size="md">
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[24px] sm:text-[22px] leading-[1.02]">{inv ? 'Convite pronto' : 'Convidar seu par'}</h2>
            <p className="mt-2 text-[15px] text-tinta-2">
              {inv ? 'Envie o link ou o código. Quando a outra pessoa aceitar, vocês passam a ver e editar o mesmo quadro.' : 'A outra pessoa cria a própria conta e entra neste mesmo quadro. Mais ninguém tem acesso.'}
            </p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {inv ? (
          <div className="mt-6 space-y-5">
            {inv.invited_name && <p className="text-[14.5px] text-tinta-2">Convite para <strong className="font-semibold text-tinta">{inv.invited_name}</strong>{inv.invited_email ? <> ({inv.invited_email})</> : null}</p>}
            <div>
              <span className="label">Link exclusivo</span>
              <div className="flex gap-2">
                <input readOnly className="field text-[14px]" value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Link do convite" />
                <button className="btn btn-primary shrink-0" onClick={() => copy('link', link)}>{copied === 'link' ? <Check size={17} /> : <Link2 size={17} />} {copied === 'link' ? 'Copiado' : 'Copiar'}</button>
              </div>
            </div>
            <div>
              <span className="label">Código do convite</span>
              <div className="flex gap-2">
                <div className="field flex items-center font-mono text-[20px] tracking-[0.28em]" aria-label="Código do convite">{inv.code}</div>
                <button className="btn btn-soft shrink-0" onClick={() => copy('code', inv.code)}>{copied === 'code' ? <Check size={17} /> : <Copy size={17} />} {copied === 'code' ? 'Copiado' : 'Copiar'}</button>
              </div>
              <p className="hint">Quem já tem conta pode digitar o código em “Entrar com um código”. Vale por 14 dias.</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <a className="btn btn-soft" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(msg(link))}`}><MessageCircle size={17} /> WhatsApp</a>
              <a className="btn btn-soft" href={`mailto:${inv.invited_email ?? ''}?subject=${encodeURIComponent('Convite para o Nosso Quadro dos Sonhos')}&body=${encodeURIComponent(msg(link))}`}><Mail size={17} /> E-mail</a>
              {canShare && <button className="btn btn-soft" onClick={() => navigator.share({ title: 'Nosso Quadro dos Sonhos', text: msg(link), url: link }).catch(() => {})}><Share2 size={17} /> Compartilhar</button>}
            </div>
            {fresh && <p className="rounded-[3px] bg-pinheiro-soft px-3.5 py-2.5 text-[14px] text-pinheiro">Convite criado. O envio é feito por você, pelo aplicativo que preferir.</p>}
            <div className="flex flex-wrap justify-between gap-2 border-t border-linho pt-5">
              <button className="btn btn-ghost text-alerta hover:bg-rosa-soft" onClick={() => setCancelling(true)}>Cancelar este convite</button>
              <button className="btn btn-ghost" onClick={create} disabled={busy}>{busy && <Spinner />} Gerar novo código</button>
            </div>
            <ErrorNote>{error}</ErrorNote>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={(e) => { e.preventDefault(); void create() }}>
            <Field label="Nome da pessoa" htmlFor="i-name">
              <input id="i-name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Como você a chama" data-autofocus />
            </Field>
            <Field label="E-mail (opcional)" htmlFor="i-mail" hint="Se informar, só a conta com este e-mail consegue aceitar o convite. Deixe em branco para convidar só pelo link.">
              <input id="i-mail" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@exemplo.com" autoComplete="off" />
            </Field>
            <ErrorNote>{error}</ErrorNote>
            <button className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner />} Criar convite</button>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={cancelling}
        title="Cancelar convite?"
        confirmLabel="Cancelar convite"
        danger
        text="O link e o código deixam de funcionar. Você pode criar um novo convite quando quiser."
        onClose={() => setCancelling(false)}
        onConfirm={async () => { if (inv) { await b.cancelInvite(inv.id); toast('Convite cancelado.') } }}
      />
    </Modal>
  )
}
