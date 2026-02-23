
import React, { useState, useEffect } from 'react';
import Variant from './components/Variant';
import Parts from './components/Parts';
import Login from './components/Login';
import { getToken, clearToken } from './services/api';

function App() {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [token, setToken] = useState(() => getToken());

  // Listen for 401 auto-logout events dispatched by apiFetch
  useEffect(() => {
    const handleLogout = () => setToken(null);
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const handleLogin = (newToken) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    clearToken();
    setToken(null);
    setSelectedVariant(null);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center relative">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hierarchical Editor</h1>
          <p className="text-gray-600">Manage Variants, Parts, and Captures</p>
          <button
            onClick={handleLogout}
            className="absolute right-0 top-0 text-sm text-gray-500 hover:text-red-600 transition"
          >
            Sign Out
          </button>
        </header>

        <main>
          <Variant onVariantSelect={setSelectedVariant} />

          <div className="transition-all duration-300 ease-in-out">
            <Parts selectedVariant={selectedVariant} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
