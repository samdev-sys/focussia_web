import { useState, useEffect } from 'react';
import Dashboard from './dashboard';
import AuthPanel from './Auth';
import { authService } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    authService.getCurrentUser()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);

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
    return <AuthPanel onLogin={() => setIsAuthenticated(true)} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default App;
