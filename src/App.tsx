import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sileo';
import Dashboard from './dashboard';
import AuthPanel, { ResetPasswordGate } from './Auth';
import LandingPage from './components/LandingPage';
import OnboardingWizardV2 from './components/OnboardingWizardV2';
import PostOnboardingHub from './components/PostOnboardingHub';
import MobileOrientationPrompt from './components/MobileOrientationPrompt';
import FitGeneral from './components/FitGeneral';
import { authService, onboardingV2Service } from './services/api';
import { useAuthStore } from './stores/authStore';
import KanbanModule from './components/kanban/KanbanModule';
import RedesSocialesScreen from './components/RedesSocialesScreen';
import ConfiguracionModule from './components/ConfiguracionModule';
import CuentasScreen from './components/CuentasScreen';
import HoraDeOroScreen from './components/HoraDeOroScreen';
import SuplementosScreen from './components/SuplementosScreen';
import CoachingScreen from './components/CoachingScreen';
import TribuScreen from './components/TribuScreen';
import CursosScreen from './components/CursosScreen';
import CentroInspiracionScreen from './components/CentroInspiracionScreen';
import FocusModeScreen from './components/FocusModeScreen';
import { ReportsListScreen } from './components/ReportsListScreen';
import DelegarModule from './components/DelegarModule';
import DiagnosticoRueda from './components/DiagnosticoRueda';
import { MatrizEisenhower } from './components/MatrizEisenhower';
import AnnualModuleView from './components/AnnualModuleView';
import MonthlyWizard from './components/MonthlyWizard';
import MonthlyCalendar from './components/MonthlyCalendar';
import GratitudScreen from './components/GratitudScreen';
import CumpleanosScreen from './components/CumpleanosScreen';

function navigateToSection(navigate: ReturnType<typeof useNavigate>, section: string) {
  switch (section) {
    case 'inicio':
      return navigate('/app');
    case 'rueda':
      return navigate('/app/rueda');
    case 'matriz':
      return navigate('/app/matriz');
    case 'anual':
      return navigate('/app/anual');
    case 'mensual':
      return navigate('/app/mensual');
    case 'kanban':
      return navigate('/app/kanban');
    case 'semanal':
      return navigate('/app/kanban?vista=semanal');
    case 'diaria':
      return navigate('/app/kanban?vista=diaria');
    case 'delegar':
    case 'acciones-delegar':
      return navigate('/app/delegar');
    case 'suplementos':
      return navigate('/app/suplementos');
    case 'hora-oro':
    case 'hora_de_oro':
      return navigate('/app/hora-oro');
    case 'tribu':
      return navigate('/app/tribu');
    case 'cuentas':
      return navigate('/app/cuentas');
    case 'cursos':
      return navigate('/app/cursos');
    case 'coaching':
      return navigate('/app/coaching');
    case 'focus':
      return navigate('/app/focus');
    case 'gratitud':
      return navigate('/app/gratitud');
    case 'inspiracion':
      return navigate('/app/inspiracion');
    case 'cumpleanos':
    case 'cumple':
      return navigate('/app/cumpleanos');
    case 'redes':
    case 'rrss':
      return navigate('/app/redes');
    case 'calendario-mensual':
      return navigate('/app/calendario-mensual');
    case 'reportes':
      return navigate('/app/reportes');
    case 'configuracion':
      return navigate('/app/configuracion');
    case 'mision':
    case 'fechas':
    case 'mas':
      return navigate(`/app?section=${section}`);
    default:
      return navigate(`/app?section=${section}`);
  }
}

function KanbanRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const vistaFromQuery = search.get('vista') as 'kanban' | 'diaria' | 'semanal' | 'mensual' | 'anual' | null;
  const vistaFromState = (location.state as { vistaInicial?: 'kanban' | 'diaria' | 'semanal' | 'mensual' | 'anual' } | null)?.vistaInicial;
  const vistaInicial = vistaFromQuery || vistaFromState || undefined;

  return (
    <MobileOrientationPrompt>
      <KanbanModule
        key={vistaInicial || 'kanban'}
        vistaInicial={vistaInicial}
        onClose={() => navigate('/app')}
        onNavigate={(key: string) => navigateToSection(navigate, key)}
      />
    </MobileOrientationPrompt>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const { isAuthenticated, setAuth, logout } = useAuthStore();
  // Tri-estado: null = aún sin confirmar (evita redirigir a /onboarding por
  // defecto antes de que responda onboarding_status; el fallo se veía como
  // "iniciar sesión cae en el onboarding estando completo").
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [inHub, setInHub] = useState(false);
  const [checking, setChecking] = useState(true);
  const [userName, setUserName] = useState('');
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'register'>('landing');
  const [resetToken, setResetToken] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('token');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!authService.hasSession()) {
      logout();
      setChecking(false);
      setOnboardingComplete(null);
      return;
    }
    authService.getCurrentUser()
      .then(async (user) => {
        setAuth('session');
        setUserName(user.username || '');
        try {
          const status = await onboardingV2Service.getStatus();
          setOnboardingComplete(status.onboarding_completado);
        } catch {
          // Si no se puede determinar el estado, asumir completado para usuarios existentes
          setOnboardingComplete(true);
        }
      })
      .catch(() => {
        authService.markSession(false);
        logout();
        setOnboardingComplete(null);
      })
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = () => {
    setAuth('session');
    // Para cualquier inicio de sesión (manual u OAuth), ir directamente al dashboard
    // Solo ir a onboarding si es un registro nuevo (manejado por handleRegister)
    onboardingV2Service.getStatus().catch(() => {});
    setOnboardingComplete(true);
  };

  const handleRegister = () => {
    setAuth('session');
    setOnboardingComplete(false);
  };

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
    setInHub(true);
    navigate('/hub', { replace: true });
  };

  const handleGoToDashboard = () => {
    setInHub(false);
    // Cambiar solo el estado no basta: la URL es /hub y el element de esa ruta
    // sigue montando el Hub (el <Navigate> condicional vive en la ruta "/").
    navigate('/app');
  };
  const handleBackToHub = () => {
    setInHub(true);
    navigate('/hub');
  };

  const handleLogout = () => {
    authService.logout().catch(() => {});
    logout();
    setOnboardingComplete(null);
  };

  return (
    <>
      <Toaster position="top-right" />
      {checking ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#ffffff]">
          <img src="/focusia-logo.png" alt="Focusia Logo" className="w-32 h-32 mb-8 animate-bounce" />
          <p className="text-lg text-gray-600 font-medium">Tus metas de hoy construyen tu éxito de mañana.</p>
        </div>
      ) : resetToken ? (
        <ResetPasswordGate token={resetToken} onDone={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setResetToken(null);
          setAuthMode('login');
        }} />
      ) : !isAuthenticated ? (
        authMode === 'landing' ? (
          <LandingPage onEntrar={() => setAuthMode('login')} onCrearCuenta={() => setAuthMode('register')} />
        ) : (
          <AuthPanel key={authMode} initialMode={authMode === 'register' ? 'register' : 'login'} onLogin={handleLogin} onRegister={handleRegister} />
        )
      ) : (
        <Routes>
          <Route path="/" element={
            onboardingComplete === null
              ? (
                <div className="min-h-screen flex flex-col items-center justify-center bg-[#ffffff]">
                  <img src="/focusia-logo.png" alt="Focusia Logo" className="w-32 h-32 mb-8 animate-bounce" />
                  <p className="text-lg text-gray-600 font-medium">Tus metas de hoy construyen tu éxito de mañana.</p>
                </div>
              )
              : onboardingComplete
                ? (inHub ? <Navigate to="/hub" replace /> : <Navigate to="/app" replace />)
                : <Navigate to="/onboarding" replace />
          } />
          <Route path="/onboarding" element={<OnboardingWizardV2 onComplete={handleOnboardingComplete} isAuthenticated={true} userName={userName} onLogin={() => {}} onRegister={() => {}} />} />
          <Route path="/hub" element={<FitGeneral permitirScroll><PostOnboardingHub onGoToDashboard={handleGoToDashboard} onComplete={handleGoToDashboard} /></FitGeneral>} />
          <Route path="/app" element={<MobileOrientationPrompt><Dashboard onLogout={handleLogout} onBackToHub={handleBackToHub} onShowOnboarding={() => { setOnboardingComplete(false); navigate('/onboarding'); }} /></MobileOrientationPrompt>} />
          <Route path="/app/kanban" element={<KanbanRoute />} />
          <Route path="/app/redes" element={<MobileOrientationPrompt><FitGeneral><RedesSocialesScreen onBack={() => navigate('/app')} links={{}} irAConfig={false} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/cuentas" element={<MobileOrientationPrompt><FitGeneral><CuentasScreen onBack={() => navigate('/app')} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/hora-oro" element={<MobileOrientationPrompt><FitGeneral><HoraDeOroScreen onBack={() => navigate('/app')} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/suplementos" element={<MobileOrientationPrompt><FitGeneral><SuplementosScreen onBack={() => navigate('/app')} userName={userName} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/coaching" element={<MobileOrientationPrompt><FitGeneral><CoachingScreen onBack={() => navigate('/app')} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/tribu" element={<MobileOrientationPrompt><FitGeneral><TribuScreen onBack={() => navigate('/app')} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/cursos" element={<MobileOrientationPrompt><FitGeneral><CursosScreen onBack={() => navigate('/app')} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/inspiracion" element={<MobileOrientationPrompt><FitGeneral><CentroInspiracionScreen onBack={() => navigate('/app')} userName={userName} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/focus" element={<MobileOrientationPrompt><FitGeneral><FocusModeScreen onBack={() => navigate('/app')} onNavigate={(s) => navigateToSection(navigate, s)} onIniciar={async (herramienta, config) => { navigate('/app', { state: { iniciarFocus: { herramienta, config } } }); }} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/delegar" element={<MobileOrientationPrompt><FitGeneral><DelegarModule onClose={() => navigate('/app')} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/rueda" element={<MobileOrientationPrompt><FitGeneral><DiagnosticoRueda onClose={() => navigate('/app')} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/matriz" element={<MobileOrientationPrompt><FitGeneral><MatrizEisenhower onClose={() => navigate('/app')} onGoKanban={() => navigate('/app/kanban')} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/anual" element={<MobileOrientationPrompt><FitGeneral><AnnualModuleView onClose={() => navigate('/app')} onNavigate={(s) => navigateToSection(navigate, s)} onEdit={() => navigate('/app', { state: { ajustarGranMetaAnual: true } })} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/mensual" element={<MobileOrientationPrompt><FitGeneral><MonthlyWizard onClose={() => navigate('/app')} onApproved={() => navigate('/app')} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/calendario-mensual" element={<MobileOrientationPrompt><FitGeneral><MonthlyCalendar onClose={() => navigate('/app')} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/gratitud" element={<MobileOrientationPrompt><FitGeneral><GratitudScreen onBack={() => navigate('/app')} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/cumpleanos" element={<MobileOrientationPrompt><FitGeneral><CumpleanosScreen onBack={() => navigate('/app')} onNavigate={(s) => navigateToSection(navigate, s)} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/reportes" element={<MobileOrientationPrompt><FitGeneral permitirScroll><ReportsListScreen onBack={() => navigate('/app')} onSelect={() => {}} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="/app/configuracion" element={<MobileOrientationPrompt><FitGeneral><ConfiguracionModule onClose={() => navigate('/app')} onLogout={handleLogout} /></FitGeneral></MobileOrientationPrompt>} />
          <Route path="*" element={
            onboardingComplete === null
              ? (
                <div className="min-h-screen flex flex-col items-center justify-center bg-[#ffffff]">
                  <img src="/focusia-logo.png" alt="Focusia Logo" className="w-32 h-32 mb-8 animate-bounce" />
                  <p className="text-lg text-gray-600 font-medium">Tus metas de hoy construyen tu éxito de mañana.</p>
                </div>
              )
              : <Navigate to={onboardingComplete ? (inHub ? '/hub' : '/app') : '/onboarding'} replace />
          } />
        </Routes>
      )}
    </>
  );
}

function App() {
  return <AppContent />;
}

export default App;
