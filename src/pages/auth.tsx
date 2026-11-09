import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, MailCheck } from 'lucide-react'
import { friendlyError } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { getPendingInvite, setPendingInvite } from '../state/invite'
import { ErrorNote, Field, FullScreenLoader, Logo, Spinner } from '../components/ui'

/* ---------- Pequenas "fotografias" ilustradas para o painel de acesso ---------- */
function Scene({ kind }: { kind: 'casa' | 'viagem' | 'aliancas' | 'estrada' }) {
  const common = { viewBox: '0 0 200 240', preserveAspectRatio: 'xMidYMid slice', className: 'h-full w-full', 'aria-hidden': true } as const
  if (kind === 'casa') return (
    <svg {...common}><rect width="200" height="240" fill="#DCE5DF" /><circle cx="150" cy="58" r="24" fill="#F0E6CC" /><rect y="170" width="200" height="70" fill="#A9BDB0" />
      <rect x="52" y="104" width="86" height="68" fill="#FBFAF7" /><path d="M44 106 95 62l51 44z" fill="#2E4A41" /><rect x="86" y="130" width="18" height="42" fill="#B08A3E" /><rect x="60" y="120" width="16" height="16" fill="#E4E0D6" /><rect x="114" y="120" width="16" height="16" fill="#E4E0D6" />
      <circle cx="26" cy="150" r="22" fill="#6F8F7C" /><rect x="24" y="168" width="4" height="10" fill="#4A5257" /></svg>)
  if (kind === 'viagem') return (
    <svg {...common}><rect width="200" height="240" fill="#F0E6CC" /><circle cx="100" cy="112" r="34" fill="#B5766C" opacity=".9" /><rect y="132" width="200" height="108" fill="#4F6B7D" />
      {[142, 158, 176, 196].map((y, i) => <path key={y} d={`M${20 + i * 14} ${y} h${150 - i * 26}`} stroke="#FBFAF7" strokeOpacity=".45" strokeWidth="2" />)}
      <path d="M22 70 C70 30 130 40 176 22" fill="none" stroke="#2E4A41" strokeWidth="1.6" strokeDasharray="4 5" /><path d="m176 22-12 2 5 5z" fill="#2E4A41" /></svg>)
  if (kind === 'aliancas') return (
    <svg {...common}><rect width="200" height="240" fill="#F1DEDA" /><circle cx="84" cy="122" r="38" fill="none" stroke="#B08A3E" strokeWidth="7" /><circle cx="122" cy="122" r="38" fill="none" stroke="#8F6E2B" strokeWidth="7" /><path d="M99 70 108 58l9 12-9 8z" fill="#FBFAF7" stroke="#B08A3E" strokeWidth="2" /></svg>)
  return (
    <svg {...common}><rect width="200" height="240" fill="#E4E9EE" /><path d="M0 150 200 110v130H0z" fill="#5E6770" /><path d="M20 196 188 150" stroke="#FBFAF7" strokeWidth="3" strokeDasharray="14 12" /><circle cx="60" cy="60" r="20" fill="#FBFAF7" opacity=".9" /><path d="M0 120c40-24 80-4 120-20s60-4 80-12v42H0z" fill="#8A9BA8" opacity=".7" /></svg>)
}

function Print({ kind, className, giro, cap }: { kind: Parameters<typeof Scene>[0]['kind']; className: string; giro: string; cap: string }) {
  return (
    <figure className={`absolute bg-papel p-2.5 pb-0 shadow-erguido rounded-[4px] ${className}`} style={{ transform: `rotate(${giro})` }}>
      <span className="tape tape-a" aria-hidden="true" />
      <div className="aspect-[5/6] overflow-hidden rounded-[2px]"><Scene kind={kind} /></div>
      <figcaption className="py-2.5 font-display text-[19px] leading-none text-tinta">{cap}</figcaption>
    </figure>
  )
}

export function AuthLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden border-r border-linho/70 lg:block" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_30%_20%,rgba(255,255,255,.7),transparent_60%)]" />
        <Print kind="casa" className="left-[9%] top-[9%] w-[34%]" giro="-3deg" cap="Nossa casa" />
        <Print kind="viagem" className="left-[47%] top-[14%] w-[30%]" giro="2.4deg" cap="Paris, juntos" />
        <Print kind="aliancas" className="left-[17%] top-[49%] w-[27%]" giro="1.8deg" cap="Para sempre" />
        <Print kind="estrada" className="left-[50%] top-[47%] w-[33%]" giro="-2deg" cap="Sem pressa" />
        <p className="absolute bottom-[7%] left-[9%] max-w-[470px] font-display text-[40px] leading-[1.04] text-tinta">
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
  return <p className="mb-6 rounded-[12px] bg-latao-soft/70 px-4 py-3 text-[14.5px] text-tinta">Você tem um convite para entrar em um quadro. Depois de entrar, é só aceitar.</p>
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
