import { LogoMark } from '../components/ui'

/** Mostrada somente se as variáveis do Supabase não foram configuradas no deploy. */
export function SetupMissing() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="w-full max-w-[560px]">
        <LogoMark size={52} />
        <h1 className="page-title mt-6">Falta conectar o banco de dados.</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-tinta-2">Este site precisa de duas variáveis de ambiente para falar com o Supabase. Cadastre no Netlify (Site configuration, Environment variables) e faça um novo deploy:</p>
        <pre className="mt-5 overflow-x-auto rounded-[3px] bg-tinta p-4 text-[13.5px] leading-relaxed text-papel">{`VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY`}</pre>
        <p className="mt-4 text-[14px] text-tinta-2">Use apenas a chave pública (anon/publishable). Nunca a service_role. O passo a passo completo está no README do projeto.</p>
      </div>
    </div>
  )
}
