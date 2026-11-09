import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key && !url.includes('SEU-PROJETO'))

// A chave "anon" é pública por definição: a proteção dos dados é feita por RLS no banco.
export const supabase = createClient(
  isConfigured ? (url as string) : 'http://localhost:54321',
  isConfigured ? (key as string) : 'sem-configuracao',
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 10 } },
  },
)

export const BUCKET = 'dream-images'

/** Traduz erros técnicos em mensagens claras, em português. */
export function friendlyError(err: unknown): string {
  const raw = (err as { message?: string })?.message ?? String(err ?? '')
  const map: [RegExp, string][] = [
    [/Invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/Email not confirmed/i, 'Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada.'],
    [/User already registered/i, 'Já existe uma conta com este e-mail. Entre ou recupere a senha.'],
    [/Password should be at least/i, 'A senha precisa ter pelo menos 8 caracteres.'],
    [/rate limit|too many/i, 'Muitas tentativas seguidas. Aguarde um instante e tente de novo.'],
    [/Failed to fetch|NetworkError|Load failed/i, 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'],
    [/JWT expired/i, 'Sua sessão expirou. Entre novamente.'],
    [/row-level security|permission denied/i, 'Você não tem permissão para fazer isso neste quadro.'],
    [/payload too large|exceeded the maximum/i, 'A imagem é grande demais. Escolha uma foto menor.'],
  ]
  for (const [re, msg] of map) if (re.test(raw)) return msg
  return raw || 'Algo deu errado. Tente novamente.'
}
