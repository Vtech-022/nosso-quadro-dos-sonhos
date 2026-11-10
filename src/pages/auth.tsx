import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, MailCheck } from 'lucide-react'
import { friendlyError, IS_DEMO } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { getPendingInvite, setPendingInvite } from '../state/invite'
import { ErrorNote, Field, FullScreenLoader, Logo, Spinner } from '../components/ui'

/* ---------- Fotos do painel de acesso ---------- */
const photo = (n: string) => `${import.meta.env.BASE_URL}demo/${n}.jpg`

function Print({ src, className, cap }: { src: string; className: string; cap: string }) {
  return (
    <figure className={`absolute ${className}`}>
      <img src={photo(src)} alt="" className="block w-full rounded-[4px] object-cover shadow-[0_14px_28px_-14px_rgba(20,26,44,.45)]" style={{ aspectRatio: src === 'paris' ? '3/4' : '4/3' }} />
      <figcaption className="hand pt-2">{cap}</figcaption>
    </figure>
  )
}

export function AuthLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden border-r border-tinta/15 lg:block" aria-hidden="true">
        <div className="absolute left-10 top-9"><Logo /></div>
        <Print src="casa" className="left-[10%] top-[16%] w-[40%]" cap="nossa casa, um dia" />
        <Print src="paris" className="left-[56%] top-[10%] w-[27%]" cap="Paris, só nós dois" />
        <Print src="praia" className="left-[48%] top-[50%] w-[38%]" cap="uma semana sem pressa" />
        <Print src="japao" className="left-[10%] top-[56%] w-[26%]" cap="Japão na primavera" />
        <p className="absolute bottom-[5%] left-10 max-w-[520px] text-[22px] font-medium leading-snug text-tinta">
          Dois corações, muitos sonhos e uma vida inteira para conquistar.
        </p>
      </aside>
      <main className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden"><Logo /></div>
        <div className={`m-auto w-full ${wide ? 'max-w-[560px]' : 'max-w-[440px]'} py-8`}>{children}</div>
      </main>
    </div>
  )
}

function PasswordField({ id, value, onChange, label = 'Senha', autoComplete }: { id: string; value: string; onChange: (v: string) => void; label?: string; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} htmlFor={id}>
      <div className="relative">
        <input id={id} className="field pr-12" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required minLength={8} />
        <button type="button" className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full text-tinta-3 hover:text-tinta" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Field>
  )
}

function InviteNote() {
  const [sp] = useSearchParams()
  const code = sp.get('convite') ?? getPendingInvite()
  if (!code) return null
  return <p className="mb-6 rounded-[10px] bg-latao-soft px-4 py-3 text-[14.5px] text-tinta">Você tem um convite para entrar em um quadro. Depois de entrar, é só aceitar.</p>
}

/* ---------------- Entrar ---------------- */
export function LoginPage() {
  const { signIn, user, loading } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [sp] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const code = sp.get('convite')
  useEffect(() => { if (code) setPendingInvite(code) }, [code])

  if (loading) return <FullScreenLoader label="Verificando sua sessão" />
  if (user) return <Navigate to="/quadro" replace />

  return (
    <AuthLayout>
      <h1 className="page-title">Que bom ter vocês de volta.</h1>
      <p className="mt-3 mb-8 text-[16px] text-tinta-2">Entre para ver o quadro de sonhos de vocês.</p>
      <InviteNote />
      {IS_DEMO && (
        <div className="mb-7 rounded-[12px] bg-latao-soft p-4">
          <p className="text-[14px] font-bold"><span className="sold-dot mr-2 align-middle" />Versão de demonstração</p>
          <p className="mt-1 text-[15px] leading-snug text-tinta-2">Não precisa de cadastro. Os dados ficam só no seu navegador.</p>
          <button type="button" className="btn btn-primary mt-3 w-full" onClick={async () => { await signIn('demo@exemplo.com', 'demonstracao'); nav('/quadro', { replace: true }) }}>Entrar na demonstração</button>
        </div>
      )}
      <form className="space-y-5" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setError(null)
        try { await signIn(email, password); nav((loc.state as { from?: string } | null)?.from ?? '/quadro', { replace: true }) }
        catch (err) { setError(friendlyError(err)) } finally { setBusy(false) }
      }}>
        <Field label="E-mail" htmlFor="email"><input id="email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
        <PasswordField id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner />} Entrar</button>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-[14.5px] text-tinta-2 sm:flex-row sm:justify-between">
        <Link className="font-semibold text-pinheiro hover:underline" to="/recuperar-senha">Esqueci minha senha</Link>
        <span>Ainda não tem conta? <Link className="font-semibold text-pinheiro hover:underline" to={code ? `/cadastrar?convite=${code}` : '/cadastrar'}>Criar conta</Link></span>
      </div>
    </AuthLayout>
  )
}

/* ---------------- Criar conta ---------------- */
export function SignupPage() {
  const { signUp, user, loading } = useAuth()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const code = sp.get('convite')
  useEffect(() => { if (code) setPendingInvite(code) }, [code])

  if (loading) return <FullScreenLoader label="Verificando sua sessão" />
  if (user) return <Navigate to="/bem-vindos" replace />

  if (sent) return (
    <AuthLayout>
      <div className="grid h-14 w-14 place-items-center rounded-full bg-pinheiro-soft text-pinheiro"><MailCheck size={26} strokeWidth={1.6} /></div>
      <h1 className="page-title mt-6">Confirme seu e-mail.</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-tinta-2">Enviamos um link para <strong className="font-semibold text-tinta">{sent}</strong>. Abra a mensagem, confirme e volte para entrar. Se não encontrar, olhe também a caixa de spam.</p>
      <Link to="/entrar" className="btn btn-soft mt-8 w-full">Ir para o login</Link>
    </AuthLayout>
  )

  return (
    <AuthLayout>
      <h1 className="page-title">Vamos começar o quadro.</h1>
      <p className="mt-3 mb-8 text-[16px] text-tinta-2">Cada pessoa tem a própria conta. O quadro é compartilhado só entre os dois.</p>
      <InviteNote />
      <form className="space-y-5" onSubmit={async (e) => {
        e.preventDefault(); setError(null)
        if (password.length < 8) { setError('A senha precisa ter pelo menos 8 caracteres.'); return }
        setBusy(true)
        try {
          const r = await signUp(name, email, password)
          if (r.needsConfirmation) setSent(email.trim()); else nav('/bem-vindos', { replace: true })
        } catch (err) { setError(friendlyError(err)) } finally { setBusy(false) }
      }}>
        <Field label="Como você quer ser chamado(a)?" htmlFor="name"><input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={60} required /></Field>
        <Field label="E-mail" htmlFor="email"><input id="email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
        <PasswordField id="password" value={password} onChange={setPassword} autoComplete="new-password" label="Senha (mínimo de 8 caracteres)" />
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner />} Criar conta</button>
      </form>
      <p className="mt-6 text-[14.5px] text-tinta-2">Já tem conta? <Link className="font-semibold text-pinheiro hover:underline" to={code ? `/entrar?convite=${code}` : '/entrar'}>Entrar</Link></p>
    </AuthLayout>
  )
}

/* ---------------- Recuperar senha ---------------- */
export function RecoverPage() {
  const { requestReset } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <AuthLayout>
      <h1 className="page-title">Recuperar a senha.</h1>
      {done ? (
        <>
          <p className="mt-4 text-[16px] leading-relaxed text-tinta-2">Se existir uma conta com <strong className="font-semibold text-tinta">{email}</strong>, o link para criar uma nova senha já está a caminho.</p>
          <Link to="/entrar" className="btn btn-soft mt-8 w-full">Voltar ao login</Link>
        </>
      ) : (
        <>
          <p className="mt-3 mb-8 text-[16px] text-tinta-2">Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>
          <form className="space-y-5" onSubmit={async (e) => {
            e.preventDefault(); setBusy(true); setError(null)
            try { await requestReset(email); setDone(true) } catch (err) { setError(friendlyError(err)) } finally { setBusy(false) }
          }}>
            <Field label="E-mail" htmlFor="email"><input id="email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
            <ErrorNote>{error}</ErrorNote>
            <button className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner />} Enviar link</button>
          </form>
          <p className="mt-6 text-[14.5px]"><Link className="font-semibold text-pinheiro hover:underline" to="/entrar">Voltar ao login</Link></p>
        </>
      )}
    </AuthLayout>
  )
}

/* ---------------- Nova senha ---------------- */
export function ResetPage() {
  const { user, loading, updatePassword, endRecovery } = useAuth()
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (loading) return <FullScreenLoader label="Validando o link" />
  if (!user) return (
    <AuthLayout>
      <h1 className="page-title">Link expirado.</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-tinta-2">Este link de recuperação não é mais válido. Peça um novo para continuar.</p>
      <Link to="/recuperar-senha" className="btn btn-primary mt-8 w-full">Pedir novo link</Link>
    </AuthLayout>
  )
  return (
    <AuthLayout>
      <h1 className="page-title">Crie uma nova senha.</h1>
      <p className="mt-3 mb-8 text-[16px] text-tinta-2">Escolha uma senha com pelo menos 8 caracteres.</p>
      <form className="space-y-5" onSubmit={async (e) => {
        e.preventDefault(); setError(null)
        if (password.length < 8) { setError('A senha precisa ter pelo menos 8 caracteres.'); return }
        if (password !== again) { setError('As duas senhas não são iguais.'); return }
        setBusy(true)
        try { await updatePassword(password); endRecovery(); nav('/quadro', { replace: true }) } catch (err) { setError(friendlyError(err)) } finally { setBusy(false) }
      }}>
        <PasswordField id="np" value={password} onChange={setPassword} autoComplete="new-password" label="Nova senha" />
        <PasswordField id="np2" value={again} onChange={setAgain} autoComplete="new-password" label="Repita a nova senha" />
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner />} Salvar nova senha</button>
      </form>
    </AuthLayout>
  )
}
