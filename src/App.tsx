import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sileo';
import Dashboard from './dashboard';
import AuthPanel, { ResetPasswordGate } from './Auth';
import LandingPage from './components/LandingPage';
import OnboardingWizardV2 from './components/OnboardingWizardV2';
import PostOnboardingHub from './components/PostOnboardingHub';
import MobileOrientationPrompt from './components/MobileOrientationPrompt';
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
        onNavigate={(key) => {
          if (key === 'inicio') return navigate('/app');
          if (key === 'rueda') return navigate('/app/rueda');
          if (key === 'matriz') return navigate('/app/matriz');
          if (key === 'anual') return navigate('/app/anual');
          if (key === 'mensual') return navigate('/app/mensual');
          if (key === 'delegar') return navigate('/app/delegar');
          if (key === 'fechas') return navigate('/app');
          if (key === 'suplementos') return navigate('/app/suplementos');
          if (key === 'hora-oro') return navigate('/app/hora-oro');
          if (key === 'tribu') return navigate('/app/tribu');
          if (key === 'cuentas') return navigate('/app/cuentas');
          if (key === 'cursos') return navigate('/app/cursos');
          if (key === 'coaching') return navigate('/app/coaching');
          if (key === 'focus') return navigate('/app/focus');
          if (key === 'gratitud') return navigate('/app/gratitud');
          if (key === 'cumpleanos' || key === 'cumple') return navigate('/app/cumpleanos');
          if (key === 'redes' || key === 'rrss') return navigate('/app/redes');
          return navigate(`/app?section=${key}`);
        }}
      />
    </MobileOrientationPrompt>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const { isAuthenticated, setAuth, logout } = useAuthStore();
  const [onboardingComplete, setOnboardingComplete] = useState(false);
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
          setOnboardingComplete(false);
        }
      })
      .catch(() => {
        authService.markSession(false);
        logout();
      })
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = () => {
    setAuth('session');
    onboardingV2Service.getStatus().then((s) => {
      setOnboardingComplete(s.onboarding_completado);
    }).catch(() => setOnboardingComplete(false));
  };

  const handleRegister = () => {
    setAuth('session');
    setOnboardingComplete(false);
  };

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
    setInHub(true);
  };

  const handleGoToDashboard = () => { setInHub(false); };
  const handleBackToHub = () => { setInHub(true); };

  const handleLogout = () => {
    authService.logout().catch(() => {});
    logout();
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
          <Route path="/" element={onboardingComplete ? (inHub ? <Navigate to="/hub" replace /> : <Navigate to="/app" replace />) : <Navigate to="/onboarding" replace />} />
          <Route path="/onboarding" element={<OnboardingWizardV2 onComplete={handleOnboardingComplete} isAuthenticated={true} userName={userName} onLogin={() => {}} onRegister={() => {}} />} />
          <Route path="/hub" element={<PostOnboardingHub onGoToDashboard={handleGoToDashboard} onComplete={handleGoToDashboard} />} />
          <Route path="/app" element={<MobileOrientationPrompt><Dashboard onLogout={handleLogout} onBackToHub={handleBackToHub} onShowOnboarding={() => { setOnboardingComplete(false); navigate('/onboarding'); }} /></MobileOrientationPrompt>} />
          <Route path="/app/kanban" element={<KanbanRoute />} />
          <Route path="/app/redes" element={<MobileOrientationPrompt><RedesSocialesScreen onBack={() => navigate('/app')} links={{}} irAConfig={false} onNavigate={(s) => {
            if (s === 'inicio') return navigate('/app');
            if (s === 'redes') return navigate('/app/redes');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            return navigate(`/app?section=${s}`);
          }} /></MobileOrientationPrompt>} />
          <Route path="/app/cuentas" element={<MobileOrientationPrompt><CuentasScreen onBack={() => navigate('/app')} onNavigate={(s) => {
            if (s === 'inicio' || s === 'cuentas') return navigate('/app');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} /></MobileOrientationPrompt>} />
          <Route path="/app/hora-oro" element={<MobileOrientationPrompt><HoraDeOroScreen onBack={() => navigate('/app')} onNavigate={(s) => {
            if (s === 'inicio' || s === 'hora-oro') return navigate('/app');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} /></MobileOrientationPrompt>} />
          <Route path="/app/suplementos" element={<MobileOrientationPrompt><SuplementosScreen onBack={() => navigate('/app')} userName={userName} onNavigate={(s) => {
            if (s === 'inicio' || s === 'suplementos') return navigate('/app');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} /></MobileOrientationPrompt>} />
          <Route path="/app/coaching" element={<MobileOrientationPrompt><CoachingScreen onBack={() => navigate('/app')} onNavigate={(s) => {
            if (s === 'inicio' || s === 'coaching') return navigate('/app');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} /></MobileOrientationPrompt>} />
          <Route path="/app/tribu" element={<MobileOrientationPrompt><TribuScreen onBack={() => navigate('/app')} onNavigate={(s) => {
            if (s === 'inicio') return navigate('/app');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} /></MobileOrientationPrompt>} />
          <Route path="/app/cursos" element={<MobileOrientationPrompt><CursosScreen onBack={() => navigate('/app')} onNavigate={(s) => {
            if (s === 'inicio') return navigate('/app');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} /></MobileOrientationPrompt>} />
          <Route path="/app/focus" element={<MobileOrientationPrompt><FocusModeScreen onBack={() => navigate('/app')} onNavigate={(s) => {
            if (s === 'inicio') return navigate('/app');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} onIniciar={async (herramienta, config) => { navigate('/app', { state: { iniciarFocus: { herramienta, config } } }); }} /></MobileOrientationPrompt>} />
          <Route path="/app/delegar" element={<MobileOrientationPrompt><DelegarModule onClose={() => navigate('/app')} onNavigate={(s) => {
            if (s === 'inicio') return navigate('/app');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} /></MobileOrientationPrompt>} />
          <Route path="/app/rueda" element={<MobileOrientationPrompt><DiagnosticoRueda onClose={() => navigate('/app')} onNavigate={(s) => {
            if (s === 'inicio') return navigate('/app');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} /></MobileOrientationPrompt>} />
          <Route path="/app/matriz" element={<MobileOrientationPrompt><MatrizEisenhower onClose={() => navigate('/app')} onGoKanban={() => navigate('/app/kanban')} /></MobileOrientationPrompt>} />
          <Route path="/app/anual" element={<MobileOrientationPrompt><AnnualModuleView onClose={() => navigate('/app')} onNavigate={(s) => {
            if (s === 'inicio') return navigate('/app');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} onEdit={() => navigate('/app')} /></MobileOrientationPrompt>} />
          <Route path="/app/mensual" element={<MobileOrientationPrompt><MonthlyWizard onClose={() => navigate('/app')} onApproved={() => navigate('/app')} onNavigate={(s) => {
            if (s === 'inicio') return navigate('/app');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} /></MobileOrientationPrompt>} />
          <Route path="/app/calendario-mensual" element={<MobileOrientationPrompt><MonthlyCalendar onClose={() => navigate('/app')} onNavigate={(s) => {
            if (s === 'inicio') return navigate('/app');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} /></MobileOrientationPrompt>} />
          <Route path="/app/gratitud" element={<MobileOrientationPrompt><GratitudScreen onBack={() => navigate('/app')} onNavigate={(s) => {
            if (s === 'inicio') return navigate('/app');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'cumpleanos' || s === 'cumple') return navigate('/app/cumpleanos');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} /></MobileOrientationPrompt>} />
          <Route path="/app/cumpleanos" element={<MobileOrientationPrompt><CumpleanosScreen onBack={() => navigate('/app')} onNavigate={(s) => {
            if (s === 'inicio') return navigate('/app');
            if (s === 'rueda') return navigate('/app/rueda');
            if (s === 'matriz') return navigate('/app/matriz');
            if (s === 'anual') return navigate('/app/anual');
            if (s === 'mensual') return navigate('/app/mensual');
            if (s === 'semanal') return navigate('/app/kanban?vista=semanal');
            if (s === 'diaria') return navigate('/app/kanban?vista=diaria');
            if (s === 'kanban') return navigate('/app/kanban');
            if (s === 'delegar') return navigate('/app/delegar');
            if (s === 'fechas') return navigate('/app');
            if (s === 'suplementos') return navigate('/app/suplementos');
            if (s === 'hora-oro') return navigate('/app/hora-oro');
            if (s === 'tribu') return navigate('/app/tribu');
            if (s === 'cuentas') return navigate('/app/cuentas');
            if (s === 'cursos') return navigate('/app/cursos');
            if (s === 'coaching') return navigate('/app/coaching');
            if (s === 'focus') return navigate('/app/focus');
            if (s === 'gratitud') return navigate('/app/gratitud');
            if (s === 'redes' || s === 'rrss') return navigate('/app/redes');
            return navigate(`/app?section=${s}`);
          }} /></MobileOrientationPrompt>} />
          <Route path="/app/reportes" element={<MobileOrientationPrompt><ReportsListScreen onBack={() => navigate('/app')} onSelect={() => {}} /></MobileOrientationPrompt>} />
          <Route path="/app/configuracion" element={<MobileOrientationPrompt><ConfiguracionModule onClose={() => navigate('/app')} onLogout={handleLogout} /></MobileOrientationPrompt>} />
          <Route path="*" element={<Navigate to={onboardingComplete ? (inHub ? '/hub' : '/app') : '/onboarding'} replace />} />
        </Routes>
      )}
    </>
  );
}

function App() {
  return <AppContent />;
}

export default App;
