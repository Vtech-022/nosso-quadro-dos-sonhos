import { useRef, useState, type ReactNode } from 'react'
import { Camera, LogOut } from 'lucide-react'
import { friendlyError } from '../lib/supabase'
import { formatDate } from '../lib/format'
import { useAuth } from '../state/auth'
import { useBoard } from '../state/board'
import { usePrefs, type ThemeMode } from '../state/prefs'
import { useToast } from '../state/toast'
import { useShell } from '../components/Shell'
import { Avatar, ConfirmDialog, ErrorNote, Field, Spinner } from '../components/ui'
import { DEFAULT_MOTTO, PageHead } from './quadro'

function Section({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-linho py-9 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-12">
      <div>
        <h2 className="text-[22px] leading-none">{title}</h2>
        {text && <p className="mt-3 text-[14.5px] leading-relaxed text-tinta-2">{text}</p>}
      </div>
      <div className="max-w-[560px]">{children}</div>
    </section>
  )
}

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div><p className="text-[15.5px] font-semibold">{label}</p>{hint && <p className="hint !mt-1">{hint}</p>}</div>
      <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-pinheiro' : 'bg-tinta-3/40'}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-papel shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

export function ConfiguracoesPage() {
  const b = useBoard()
  const { user, signOut, updatePassword } = useAuth()
  const { prefs, set } = usePrefs()
  const { openInvite } = useShell()
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(b.state?.me.display_name ?? '')
  const [coupleName, setCoupleName] = useState(b.state?.couple?.name ?? '')
  const [motto, setMotto] = useState(b.state?.couple?.motto ?? '')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [pwError, setPwError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key)
    try { await fn(); toast(ok) } catch (e) { toast((e as Error).message || friendlyError(e), { tone: 'erro' }) } finally { setBusy(null) }
  }

  const alone = b.members.length < 2
  const inv = b.state?.invitation

  return (
    <>
      <PageHead title="Configurações" />

      <Section title="Perfil">
        <div className="flex items-center gap-5">
          <Avatar userId={b.meId} name={b.state?.me.display_name} path={b.state?.me.avatar_path} size={76} />
          <div>
            <button className="btn btn-soft btn-sm" disabled={busy === 'avatar'} onClick={() => file.current?.click()}>{busy === 'avatar' ? <Spinner size={15} /> : <Camera size={16} />} {b.state?.me.avatar_path ? 'Trocar foto' : 'Adicionar foto'}</button>
                        <input ref={file} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => {
              const f = e.target.files?.[0]; e.target.value = ''
              if (f) void run('avatar', () => b.uploadAvatar(f), 'Foto atualizada.')
            }} />
          </div>
        </div>
        <form className="mt-6 space-y-5" onSubmit={(e) => { e.preventDefault(); void run('name', () => b.saveProfile({ display_name: name.trim() }), 'Nome atualizado.') }}>
          <Field label="Nome" htmlFor="s-name"><input id="s-name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required /></Field>
          <Field label="E-mail"><input className="field bg-linho/40" value={user?.email ?? ''} readOnly aria-readonly="true" /></Field>
          <button className="btn btn-primary" disabled={busy === 'name' || !name.trim() || name.trim() === b.state?.me.display_name}>{busy === 'name' && <Spinner />} Salvar perfil</button>
        </form>
        <form className="mt-8 space-y-4 border-t border-linho pt-6" onSubmit={async (e) => {
          e.preventDefault(); setPwError(null)
          if (pw.length < 8) { setPwError('A senha precisa ter pelo menos 8 caracteres.'); return }
          await run('pw', async () => { await updatePassword(pw); setPw('') }, 'Senha alterada.')
        }}>
          <Field label="Nova senha" htmlFor="s-pw" hint="Mínimo de 8 caracteres."><input id="s-pw" type="password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
          <ErrorNote>{pwError}</ErrorNote>
          <button className="btn btn-soft" disabled={busy === 'pw' || !pw}>{busy === 'pw' && <Spinner />} Alterar senha</button>
        </form>
      </Section>

      <Section title="Quadro">
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void run('couple', () => b.saveCouple({ name: coupleName.trim(), motto: motto.trim() || null }), 'Quadro atualizado.') }}>
          <Field label="Nome do casal" htmlFor="s-cn"><input id="s-cn" className="field" value={coupleName} onChange={(e) => setCoupleName(e.target.value)} maxLength={80} required /></Field>
          <Field label="Frase do quadro" htmlFor="s-mo" hint="Em branco, usa a frase padrão."><input id="s-mo" className="field" value={motto} onChange={(e) => setMotto(e.target.value)} maxLength={160} placeholder={DEFAULT_MOTTO} /></Field>
          <button className="btn btn-primary" disabled={busy === 'couple' || !coupleName.trim()}>{busy === 'couple' && <Spinner />} Salvar quadro</button>
        </form>
      </Section>

      <Section title="Seu par">
        {b.partner ? (
          <div>
            <div className="flex items-center gap-4">
              <Avatar userId={b.partner.user_id} name={b.partner.display_name} path={b.partner.avatar_path} size={56} />
              <div className="min-w-0">
                <p className="text-[18px] font-semibold leading-none">{b.partner.display_name}</p>
                <p className="mt-1.5 truncate text-[14px] text-tinta-2">{b.partner.email}</p>
                <p className="mt-0.5 text-[13px] text-tinta-3">No quadro desde {formatDate(b.partner.joined_at)}</p>
              </div>
            </div>
            <button className="btn btn-danger mt-6" onClick={() => setLeaving(true)}>Desvincular do quadro</button>
            <p className="hint">Você deixa de ter acesso ao quadro. {b.partner.display_name} continua com tudo. Você pode criar um novo quadro depois.</p>
          </div>
        ) : (
          <div>
            <p className="text-[15.5px] leading-relaxed text-tinta-2">{inv ? <>Convite pendente{inv.invited_name ? <> para <strong className="font-semibold text-tinta">{inv.invited_name}</strong></> : null}. Expira em {formatDate(inv.expires_at)}.</> : 'Ainda não há ninguém neste quadro além de você.'}</p>
            <button className="btn btn-primary mt-5" onClick={openInvite}>{inv ? 'Ver convite' : 'Convidar meu par'}</button>
          </div>
        )}
      </Section>

      <Section title="Aparência" text="Vale só para este aparelho.">
        <div className="space-y-6">
          <div>
            <p className="label">Tema</p>
            <div className="seg" role="group" aria-label="Tema do sistema">
              {([['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']] as [ThemeMode, string][]).map(([v, l]) => (
                <button key={v} aria-pressed={prefs.theme === v} onClick={() => set({ theme: v })}>{l}</button>
              ))}
            </div>
            <p className="hint">Automático segue o tema do seu aparelho.</p>
          </div>
          <Switch checked={prefs.showValues} onChange={(v) => set({ showValues: v })} label="Mostrar valores no mural" />
        </div>
      </Section>

      <Section title="Conta">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-soft" onClick={() => void signOut()}><LogOut size={17} /> Sair da conta</button>
        </div>
        {alone && (
          <div className="mt-8 border-t border-linho pt-6">
            <p className="text-[14.5px] leading-relaxed text-tinta-2">Apaga o quadro por completo, com todas as fotos. Só é possível enquanto você é a única pessoa nele.</p>
            <button className="btn btn-danger mt-4" onClick={() => setDeleting(true)}>Excluir o quadro</button>
          </div>
        )}
      </Section>

      <ConfirmDialog open={leaving} danger title="Desvincular do quadro?" confirmLabel="Desvincular"
        text={<>Você deixa de ver e editar o quadro de {b.state?.couple?.name}. {b.partner?.display_name} continua com todos os sonhos e fotos.</>}
        onClose={() => setLeaving(false)}
        onConfirm={async () => { try { await b.leave(); toast('Você saiu do quadro.', { tone: 'info' }) } catch (e) { toast((e as Error).message, { tone: 'erro' }) } }} />
      <ConfirmDialog open={deleting} danger title="Excluir o quadro inteiro?" confirmLabel="Excluir tudo"
        text="Todos os sonhos, fotos, observações e o histórico são apagados para sempre. Essa ação não pode ser desfeita."
        onClose={() => setDeleting(false)}
        onConfirm={async () => { try { await b.deleteBoard(); toast('Quadro excluído.', { tone: 'info' }) } catch (e) { toast((e as Error).message, { tone: 'erro' }) } }} />
    </>
  )
}
