import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Film, Mail, Lock, User, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, signup, loginWithGoogle, resetPassword, isMock } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (forgotPasswordMode) {
        await resetPassword(email);
        setMessage('Password reset email sent! Check your inbox.');
        setForgotPasswordMode(false);
      } else if (isSignUp) {
        if (!name) {
          setError('Please provide your name.');
          setLoading(false);
          return;
        }
        await signup(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
      setError('Google Sign In failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-netflix-black px-4 py-12 overflow-hidden">
      
      {/* Background Graphic Blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-netflix-red/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      {/* Main Terminal Container */}
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl p-8 md:p-10">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-netflix-red to-red-500 shadow-xl shadow-netflix-red/20">
            <Film className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider uppercase font-sans">
            Cine<span className="text-netflix-red text-glow">Mate</span>
          </h1>
          <p className="text-xs text-gray-500">AI-Powered Recommendation Platform</p>
        </div>

        {/* Message Banner */}
        {message && (
          <div className="flex items-start gap-2.5 p-3.5 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <span>{message}</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 mb-6 rounded-xl bg-netflix-red/10 border border-netflix-red/20 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Local Mock Auth Help Banner */}
        {isMock && (
          <div className="p-3 mb-6 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs text-center font-medium">
            💡 Sandbox Mode Active: Any credentials will log in instantly.
          </div>
        )}

        {/* Forms */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {forgotPasswordMode ? (
            // Forgot Password Fields
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-netflix-red/50 transition"
                />
              </div>
            </div>
          ) : (
            // standard Login / Sign Up Fields
            <>
              {isSignUp && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-netflix-red/50 transition"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-netflix-red/50 transition"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setForgotPasswordMode(true)}
                      className="text-xs text-netflix-red hover:underline focus:outline-none"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-netflix-red/50 transition"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl bg-netflix-red hover:bg-red-700 font-bold text-white shadow-lg shadow-netflix-red/20 transition-all active:scale-[0.98] disabled:opacity-50 text-sm flex items-center justify-center"
          >
            {loading ? 'Authenticating...' : forgotPasswordMode ? 'Send Reset Link' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {/* Forgot password cancel */}
        {forgotPasswordMode && (
          <button
            onClick={() => setForgotPasswordMode(false)}
            className="w-full mt-4 text-sm text-gray-400 hover:text-white text-center focus:outline-none"
          >
            Cancel and Return
          </button>
        )}

        {/* Separator */}
        {!forgotPasswordMode && (
          <>
            <div className="flex items-center my-6">
              <div className="flex-grow border-t border-white/10" />
              <span className="px-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">Or</span>
              <div className="flex-grow border-t border-white/10" />
            </div>

            {/* Google Login button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 8 12.5a5.99 5.99 0 0 1 5.99-6.012c1.49 0 2.836.548 3.886 1.454l3.123-3.122C19.146 3.12 16.792 2 13.99 2A10.46 10.46 0 0 0 3.5 12.5a10.46 10.46 0 0 0 10.49 10.5c5.783 0 10.01-4.062 10.01-10.198 0-.616-.062-1.042-.192-1.517H12.24Z"
                />
              </svg>
              Sign In with Google
            </button>

            {/* Account Switcher */}
            <div className="mt-8 text-sm text-center text-gray-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-netflix-red font-bold hover:underline focus:outline-none"
              >
                {isSignUp ? 'Sign In' : 'Sign Up Free'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
