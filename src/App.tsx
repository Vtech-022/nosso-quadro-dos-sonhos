import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { isConfigured, supabase } from './lib/supabase'
import { useAuth } from './state/auth'
import { BoardProvider, useBoard } from './state/board'
import { Shell } from './components/Shell'
import { FullScreenLoader } from './components/ui'
import { LoginPage, RecoverPage, ResetPage, SignupPage } from './pages/auth'
import { InvitePage, OnboardingPage } from './pages/onboarding'
import { PlanejamentoPage, QuadroPage } from './pages/quadro'
import { CategoriasPage } from './pages/categorias'
import { ConquistasPage } from './pages/conquistas'
import { FinanceiroPage } from './pages/financeiro'
import { AtividadesPage } from './pages/atividades'
import { ConfiguracoesPage } from './pages/configuracoes'
import { SetupMissing } from './pages/setup'

function RequireAuth() {
  const { user, loading, recovery } = useAuth()
  const loc = useLocation()
  if (loading) return <FullScreenLoader label="Verificando sua sessão" />
  if (recovery) return <Navigate to="/redefinir-senha" replace />
  if (!user) return <Navigate to="/entrar" replace state={{ from: loc.pathname }} />
  return <BoardProvider><BoardGate /></BoardProvider>
}

function BoardGate() {
  const b = useBoard()
  const loc = useLocation()
  if (b.loading) return <FullScreenLoader />
  if (b.error || !b.state) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="max-w-[460px] text-center">
          <h1 className="page-title">Não foi possível abrir o quadro.</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-tinta-2">{b.error ?? 'Tente novamente em instantes.'}</p>
          <div className="mt-7 flex justify-center gap-2.5">
            <button className="btn btn-primary" onClick={() => void b.refresh()}>Tentar de novo</button>
            <button className="btn btn-soft" onClick={() => void supabase.auth.signOut()}>Sair</button>
          </div>
        </div>
      </div>
    )
  }
  const hasBoard = !!b.state.couple
  if (!hasBoard && loc.pathname !== '/bem-vindos') return <Navigate to="/bem-vindos" replace />
  if (hasBoard && loc.pathname === '/bem-vindos') return <Navigate to="/quadro" replace />
  return <Outlet />
}

export default function App() {
  if (!isConfigured) return <SetupMissing />
  return (
    <Routes>
      <Route path="/entrar" element={<LoginPage />} />
      <Route path="/cadastrar" element={<SignupPage />} />
      <Route path="/recuperar-senha" element={<RecoverPage />} />
      <Route path="/redefinir-senha" element={<ResetPage />} />
      <Route path="/convite/:code" element={<InvitePage />} />

      <Route element={<RequireAuth />}>
        <Route path="/bem-vindos" element={<OnboardingPage />} />
        <Route element={<Shell />}>
          <Route path="/quadro" element={<QuadroPage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/em-planejamento" element={<PlanejamentoPage />} />
          <Route path="/conquistas" element={<ConquistasPage />} />
          <Route path="/financeiro" element={<FinanceiroPage />} />
          <Route path="/atividades" element={<AtividadesPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/quadro" replace />} />
    </Routes>
  )
}
