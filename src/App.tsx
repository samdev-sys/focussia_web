import { useState, useEffect } from 'react';
import Dashboard from './dashboard';
import AuthPanel from './Auth';
import OnboardingWizard from './components/OnboardingWizard';
import PostOnboardingHub from './components/PostOnboardingHub';
import { authService, configuracionService } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [inHub, setInHub] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    authService.getCurrentUser()
      .then(async () => {
        setIsAuthenticated(true);
        try {
          const config = await configuracionService.getMiConfig();
          setOnboardingComplete(config.onboarding_completado ?? false);
        } catch {
          setOnboardingComplete(false);
        }
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    configuracionService.getMiConfig().then(c => {
      setOnboardingComplete(c.onboarding_completado ?? false);
    }).catch(() => setOnboardingComplete(false));
  };

  const handleRegister = () => {
    setIsAuthenticated(true);
    setOnboardingComplete(false);
  };

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
  };

  const handleGoToDashboard = () => { setInHub(false); };
  const handleBackToHub = () => { setInHub(true); };

  const handleLogout = () => {
    authService.logout().catch(() => {});
    setIsAuthenticated(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8eef2]">
        <div className="w-8 h-8 border-2 border-[#0d9488] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPanel onLogin={handleLogin} onRegister={handleRegister} />;
  }

  if (!onboardingComplete) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  if (inHub) {
    return <PostOnboardingHub onGoToDashboard={handleGoToDashboard} onComplete={handleGoToDashboard} />;
  }

  return <Dashboard onLogout={handleLogout} onBackToHub={handleBackToHub} />;
}

export default App;
