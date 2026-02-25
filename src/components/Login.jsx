import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

// RSA public key from the backend (public.pem)
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtdUY4xU9jFxFZGN6EM+h
HxY2LwmmvDtXHXc+hRyLWT9Pv36eNoll3uJPcc1+CmdBBcAAfIJPmKokCUGYKTu3
OMOHjX7FMcsfQGn0igTA3l3Ww66hFFRSTgAHq/PVS486VwFZ2UIRf9QKNoce/cjV
bFA1ZcUSmp2/xOk88sPjkYmDuVMbCSPkkHZ//YwLoliDe2AKkIH3atO/xq4fTumm
zUzVLm+EDaTJ+y/SuwiTLIeaTgDOdPoWLYGGB26ZGT3flVAYkab2QCzWXXmxEDlO
N5BwzdgOpDsoj8XowODD40FEO8rHOOmguSeF7jxlMGd2uchIw5p6dRU0ROhWaJAE
twIDAQAB
-----END PUBLIC KEY-----`;

/**
 * Encrypt password with RSA-OAEP SHA-1 using Web Crypto API.
 * Matches backend: privateDecrypt({ padding: RSA_PKCS1_OAEP_PADDING })
 */
async function encryptPassword(plainPassword) {
  const pemBody = PUBLIC_KEY_PEM
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await window.crypto.subtle.importKey(
    'spki',
    binaryDer.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-1' },
    false,
    ['encrypt']
  );

  const encoded = new TextEncoder().encode(plainPassword);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    cryptoKey,
    encoded
  );

  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const encryptedPassword = await encryptPassword(password);

      const response = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: encryptedPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.data?.message || data.message || data.error || 'Login failed');
        return;
      }

      const token = data.data?.token || data.token;
      if (!token) {
        setError('Unexpected response from server');
        return;
      }

      localStorage.setItem('authToken', token);
      onLogin(token);
    } catch (err) {
      console.error('Signin error:', err);
      setError('Unable to reach server. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white shadow-md rounded-lg p-8 w-full max-w-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Sign In</h2>
        <p className="text-gray-500 text-sm text-center mb-6">Hierarchical Editor</p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded text-sm transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
