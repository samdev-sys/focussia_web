import { useState, useEffect } from 'react';
import { Toaster } from 'sileo';
import Dashboard from './dashboard';
import AuthPanel, { ResetPasswordGate } from './Auth';
import LandingPage from './components/LandingPage';
import OnboardingWizardV2 from './components/OnboardingWizardV2';
import PostOnboardingHub from './components/PostOnboardingHub';
import MobileOrientationPrompt from './components/MobileOrientationPrompt';
import { authService, onboardingV2Service } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
    // Sin marcador de sesión no hay nada que validar: evita un 401 en cada
    // carga cuando el usuario está deslogueado.
    if (!authService.hasSession()) {
      setIsAuthenticated(false);
      setChecking(false);
      return;
    }
    authService.getCurrentUser()
      .then(async (user) => {
        setIsAuthenticated(true);
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
        setIsAuthenticated(false);
      })
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    onboardingV2Service.getStatus().then(s => {
      setOnboardingComplete(s.onboarding_completado);
    }).catch(() => setOnboardingComplete(false));
  };

  const handleRegister = () => {
    setIsAuthenticated(true);
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
    setIsAuthenticated(false);
  };

  return (
    <>
      <Toaster position="top-right" />
      {checking ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#ffffff]">
          <img src="./focusia-logo.png" alt="Focusia Logo" className="w-32 h-32 mb-8 animate-bounce" />
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
          <LandingPage
            onEntrar={() => setAuthMode('login')}
            onCrearCuenta={() => setAuthMode('register')}
          />
        ) : (
          <AuthPanel
            key={authMode}
            initialMode={authMode === 'register' ? 'register' : 'login'}
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
        )
      ) : (
        <MobileOrientationPrompt>
          {!onboardingComplete ? (
            <OnboardingWizardV2
              onComplete={handleOnboardingComplete}
              isAuthenticated={true}
              userName={userName}
              onLogin={() => {}}
              onRegister={() => {}}
            />
          ) : inHub ? (
            <PostOnboardingHub onGoToDashboard={handleGoToDashboard} onComplete={handleGoToDashboard} />
          ) : (
            <Dashboard onLogout={handleLogout} onBackToHub={handleBackToHub} onShowOnboarding={() => setOnboardingComplete(false)} />
          )}
        </MobileOrientationPrompt>
      )}
    </>
  );
}

export default App;
