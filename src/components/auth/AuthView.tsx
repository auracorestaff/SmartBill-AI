import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Store, AlertCircle } from 'lucide-react';
import { signInWithGoogle, loginWithEmail, registerWithEmail } from '../../services/firebase';

interface AuthViewProps {
  onDemoLogin?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onDemoLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in cancelled by user.');
      } else {
        setErrorMessage(err?.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (isSignUp) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      let msg = err?.message || 'Authentication failed.';
      if (err?.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is not enabled in Firebase console yet. Please use "Sign in with Google" or click "Continue with Demo Workspace" below.';
      } else if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.';
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* App Branding */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3 border border-white/20">
            <Store className="w-8 h-8 text-white" />
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-400/30">
            <span>Smart Indian Business Billing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            SmartBill AI
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Scan Purchase Bills • Instant Stock Sync • GST Billing
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Primary Action: Google Sign In */}
        <button
          type="button"
          disabled={isLoading}
          onClick={handleGoogleLogin}
          className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900/80 px-2 text-slate-400">or use email</span>
          </div>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@yourstore.in"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 font-semibold text-sm text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : isSignUp ? 'Create Business Account' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-3">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMessage(null);
            }}
            className="text-xs text-blue-300 hover:text-blue-200 underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        {/* Demo Mode Button for quick review without login */}
        {onDemoLogin && (
          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={onDemoLogin}
              className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Explore Demo Workspace (No Login Needed)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted Firestore & Multi-Tenant Business Isolation</span>
        </div>
      </div>
    </div>
  );
};
