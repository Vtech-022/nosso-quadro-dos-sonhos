import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, MailCheck, MapPin } from 'lucide-react'
import { SCENES, sceneUrl } from '../lib/photos'
import { friendlyError, IS_DEMO } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { getPendingInvite, setPendingInvite } from '../state/invite'
import { ErrorNote, Field, FullScreenLoader, Logo, Spinner } from '../components/ui'

/* ---------- Acesso: fotografia em tela cheia + cartão de vidro ---------- */
export function AuthLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const [i, setI] = useState(0)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const r = window.requestAnimationFrame(() => setReady(true))
    const t = window.setInterval(() => setI((n) => (n + 1) % SCENES.length), 8000)
    return () => { window.cancelAnimationFrame(r); window.clearInterval(t) }
  }, [])
  const scene = SCENES[i]
  const w = typeof window !== 'undefined' && window.innerWidth < 800 ? 1100 : 2000
  return (
    <div className="force-dark relative flex min-h-dvh flex-col text-tinta">
      <div className="auth-bg" aria-hidden="true">
        {SCENES.map((s, n) => (n === i || n === (i + SCENES.length - 1) % SCENES.length || n === (i + 1) % SCENES.length) && (
          <img key={s.id} src={sceneUrl(s, w)} alt="" className={n === i && ready ? 'on' : ''} />
        ))}
      </div>

      <header className="flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
        <Logo light />
        <span className="pill hidden sm:inline-flex"><MapPin size={13} /> {scene.place}</span>
      </header>

      <div className="mx-auto grid w-full max-w-[1240px] flex-1 items-center gap-10 px-5 pb-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
        <section className="hidden lg:block" aria-hidden="true">
          <p className="eyebrow !text-white/70">Um espaço só de vocês dois</p>
          <p className="mt-5 max-w-[620px] font-display text-[clamp(2.6rem,4.6vw,4.1rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-white [text-wrap:balance]">
            Os sonhos de vocês, num lugar só.
          </p>
          <p className="mt-6 max-w-[440px] text-[18px] leading-relaxed text-white/80">{scene.line}</p>
          <ul className="mt-10 flex flex-wrap gap-2.5 text-[13.5px] font-medium text-white/90">
            <li className="pill !h-9 !px-4 !text-[13.5px]">Fotos de cada sonho</li>
            <li className="pill !h-9 !px-4 !text-[13.5px]">Metas e valores</li>
            <li className="pill !h-9 !px-4 !text-[13.5px]">Os dois editam ao mesmo tempo</li>
          </ul>
          <div className="mt-12 flex gap-2">
            {SCENES.map((s, n) => (
              <span key={s.id} className={`h-1 rounded-full transition-all duration-700 ${n === i ? 'w-10 bg-white' : 'w-4 bg-white/35'}`} />
            ))}
          </div>
        </section>

        <main className={`auth-card mx-auto w-full p-6 sm:p-9 ${wide ? 'max-w-[580px]' : 'max-w-[440px] lg:w-[440px]'}`}>
          {children}
        </main>
      </div>
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
      <h1 className="page-title">Bem-vindos de volta.</h1>
      <p className="mt-3 mb-8 text-[16px] text-tinta-2">Entre para ver o espaço dos sonhos de vocês.</p>
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
      <div className="mt-6 flex flex-col gap-2 text-[14.5px] text-tinta-2">
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
      <h1 className="page-title">Criem o espaço de vocês.</h1>
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
