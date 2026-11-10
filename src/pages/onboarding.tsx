import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, LogOut } from 'lucide-react'
import { friendlyError, supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { useBoard } from '../state/board'
import { clearPendingInvite, getPendingInvite, setPendingInvite } from '../state/invite'
import { useToast } from '../state/toast'
import { ErrorNote, Field, FullScreenLoader, Spinner } from '../components/ui'
import { AuthLayout } from './auth'

interface Incoming { code: string; couple_name: string; inviter_name: string | null; created_at: string }

/* ---------------- Primeiro acesso: criar quadro ou entrar com código ---------------- */
export function OnboardingPage() {
  const { signOut, user } = useAuth()
  const b = useBoard()
  const nav = useNavigate()
  const toast = useToast()
  const [mode, setMode] = useState<'criar' | 'codigo'>('criar')
  const [coupleName, setCoupleName] = useState('')
  const [partner, setPartner] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [incoming, setIncoming] = useState<Incoming[]>([])

  useEffect(() => {
    const pending = getPendingInvite()
    if (pending) { nav(`/convite/${pending}`, { replace: true }); return }
    supabase.rpc('my_incoming_invitations').then(({ data }) => setIncoming((data as Incoming[]) ?? []))
  }, [nav])

  const myName = b.state?.me.display_name ?? ''

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null)
    try {
      const { error: err } = await supabase.rpc('create_couple', { p_name: coupleName, p_partner_name: partner || null })
      if (err) throw err
      await b.refresh()
      toast('Quadro criado. Agora convide seu par para entrar.')
      nav('/quadro', { replace: true })
    } catch (er) { setError(friendlyError(er)) } finally { setBusy(false) }
  }

  return (
    <AuthLayout wide>
      <p className="text-[14.5px] text-tinta-2">Olá, {myName || user?.email}.</p>
      <h1 className="page-title mt-2">Vamos montar o quadro de vocês.</h1>

      {incoming.length > 0 && (
        <div className="mt-7 space-y-3">
          {incoming.map((i) => (
            <div key={i.code} className="rounded-[3px] border border-latao/40 bg-latao-soft/60 p-4">
              <p className="text-[15px] leading-snug"><strong className="font-semibold">{i.inviter_name ?? 'Alguém'}</strong> convidou você para o quadro <strong className="font-semibold">{i.couple_name}</strong>.</p>
              <Link to={`/convite/${i.code}`} className="btn btn-brass btn-sm mt-3">Ver convite</Link>
            </div>
          ))}
        </div>
      )}

      <div className="seg mt-8 w-full" role="tablist">
        <button role="tab" aria-selected={mode === 'criar'} className="flex-1" onClick={() => setMode('criar')}>Criar um quadro</button>
        <button role="tab" aria-selected={mode === 'codigo'} className="flex-1" onClick={() => setMode('codigo')}>Entrar com um código</button>
      </div>

      {mode === 'criar' ? (
        <form className="mt-7 space-y-5" onSubmit={create}>
          <Field label="Nome do casal" htmlFor="cn" hint="É o nome que aparece no topo do quadro.">
            <input id="cn" className="field" value={coupleName} onChange={(e) => setCoupleName(e.target.value)} placeholder={myName ? `${myName} & …` : 'Ex.: Ana & Bia'} maxLength={80} required />
          </Field>
          <Field label="Nome do seu par" htmlFor="pn" hint="Depois você gera um convite por link ou código para essa pessoa entrar.">
            <input id="pn" className="field" value={partner} onChange={(e) => setPartner(e.target.value)} maxLength={60} />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <button className="btn btn-primary w-full" disabled={busy || !coupleName.trim()}>{busy && <Spinner />} Criar nosso quadro</button>
        </form>
      ) : (
        <form className="mt-7 space-y-5" onSubmit={(e) => { e.preventDefault(); if (code.trim()) { setPendingInvite(code.trim()); nav(`/convite/${code.trim().toUpperCase()}`) } }}>
          <Field label="Código do convite" htmlFor="cc" hint="Peça o código ou o link para quem já criou o quadro.">
            <input id="cc" className="field font-mono text-[18px] tracking-[0.25em] uppercase" value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} autoComplete="off" />
          </Field>
          <button className="btn btn-primary w-full" disabled={!code.trim()}>Continuar</button>
        </form>
      )}

      <button className="btn btn-ghost mt-8" onClick={() => void signOut()}><LogOut size={16} /> Sair da conta</button>
    </AuthLayout>
  )
}

/* ---------------- Página do convite ---------------- */
interface Preview { couple_name: string; inviter_name: string | null; invited_name: string | null; restricted_to_email: boolean }

export function InvitePage() {
  const { code = '' } = useParams()
  const { user, loading } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [preview, setPreview] = useState<Preview | null | undefined>(undefined)
  const [busy, setBusy] = useState<'ok' | 'no' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const upper = code.toUpperCase()

  useEffect(() => {
    setPendingInvite(upper)
    supabase.rpc('invitation_preview', { p_code: upper }).then(({ data, error: err }) => {
      if (err) { setPreview(null); return }
      setPreview(((data as Preview[]) ?? [])[0] ?? null)
    })
  }, [upper])

  if (loading || preview === undefined) return <FullScreenLoader label="Abrindo o convite" />

  if (!preview) return (
    <AuthLayout>
      <h1 className="page-title">Convite indisponível.</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-tinta-2">Este convite não existe, expirou ou já foi respondido. Peça um novo link para a pessoa que convidou você.</p>
      <Link to={user ? '/quadro' : '/entrar'} onClick={clearPendingInvite} className="btn btn-soft mt-8 w-full">{user ? 'Ir para o meu quadro' : 'Ir para o login'}</Link>
    </AuthLayout>
  )

  return (
    <AuthLayout>
      <p className="text-[14.5px] text-tinta-2">{preview.inviter_name ?? 'Alguém'} convidou {preview.invited_name ? preview.invited_name : 'você'} para</p>
      <h1 className="page-title mt-2">{preview.couple_name}</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-tinta-2">Um quadro particular onde vocês dois penduram, acompanham e conquistam os sonhos de vocês. Ninguém além dos dois tem acesso.</p>

      {user ? (
        <div className="mt-8 space-y-3">
          <ErrorNote>{error}</ErrorNote>
          <button className="btn btn-primary w-full" disabled={!!busy} onClick={async () => {
            setBusy('ok'); setError(null)
            const { error: err } = await supabase.rpc('accept_invitation', { p_code: upper })
            if (err) { setError(friendlyError(err)); setBusy(null); return }
            clearPendingInvite(); toast('Convite aceito. Bem-vindo(a) ao quadro.'); nav('/quadro', { replace: true })
          }}>{busy === 'ok' ? <Spinner /> : <Check size={18} />} Aceitar convite</button>
          <button className="btn btn-soft w-full" disabled={!!busy} onClick={async () => {
            setBusy('no')
            const { error: err } = await supabase.rpc('decline_invitation', { p_code: upper })
            if (err) { setError(friendlyError(err)); setBusy(null); return }
            clearPendingInvite(); toast('Convite recusado.', { tone: 'info' }); nav('/bem-vindos', { replace: true })
          }}>{busy === 'no' && <Spinner />} Recusar</button>
          {preview.restricted_to_email && <p className="hint">Este convite foi enviado para um e-mail específico. Entre com essa conta para aceitar.</p>}
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          <Link to={`/cadastrar?convite=${upper}`} className="btn btn-primary w-full">Criar conta e aceitar</Link>
          <Link to={`/entrar?convite=${upper}`} className="btn btn-soft w-full">Já tenho conta</Link>
        </div>
      )}
    </AuthLayout>
  )
}
