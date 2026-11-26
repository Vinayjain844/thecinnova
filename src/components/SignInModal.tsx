import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  User,
  X,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { UserProfile } from '../types/cinema';

interface SignInModalProps {
  isOpen: boolean;
  promptMessage?: string;
  selectedCity: string;
  onClose: () => void;
  onAuthComplete: (profile: UserProfile) => void;
}

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is disabled in Firebase Console right now. Click "Continue with Google" above for instant sign-in, or enable Email/Password under Firebase Console → Authentication → Sign-in method.';
    case 'auth/unauthorized-domain': {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      return `This domain (${host}) is not authorized in Firebase Auth yet. Add it under Firebase Console → Authentication → Settings → Authorized domains.`;
    }
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Switch to Sign In to log in.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in popup was closed before finishing. Please try again.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site and retry.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Try Continue with Google.';
    case 'auth/network-request-failed':
      return 'Network error while connecting to Firebase Auth. Please check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default: {
      const msg = err instanceof Error ? err.message : '';
      if (msg.startsWith('{') && msg.includes('"operationType"')) {
        return 'Signed in, but syncing your Firestore profile encountered a permission issue. Please try refreshing.';
      }
      return msg || 'Authentication failed. Please try again.';
    }
  }
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  promptMessage,
  selectedCity,
  onClose,
  onAuthComplete,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setInfoMsg('');
    setPassword('');
    setShowPassword(false);
    setIsSubmitting(false);

    const current = auth.currentUser;
    if (current && !current.emailVerified) {
      setNeedsVerification(true);
      setInfoMsg(
        `Signed in as ${current.email || 'your account'}. Verify your email link to sync bookings & calendar alerts to Firestore.`
      );
    } else {
      setNeedsVerification(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setInfoMsg('');
    setIsSubmitting(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      const profile: UserProfile = {
        uid: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'CinNova User',
        email: fbUser.email || '',
        phone: fbUser.phoneNumber || '',
        preferredCity: selectedCity,
        provider: 'google',
        emailVerified: fbUser.emailVerified,
      };
      onAuthComplete(profile);
      onClose();
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfoMsg('');
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Enter your email address first, then click Forgot password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setInfoMsg(`Password reset email sent to ${cleanEmail}. Check your inbox or spam folder.`);
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const displayName = name.trim().slice(0, 80);
        await updateProfile(cred.user, { displayName });
        await sendEmailVerification(cred.user).catch(() => {});

        const profile: UserProfile = {
          uid: cred.user.uid,
          name: displayName,
          email: cred.user.email || cleanEmail,
          phone: phone.trim().slice(0, 24),
          preferredCity: selectedCity,
          provider: 'password',
          emailVerified: cred.user.emailVerified,
        };
        onAuthComplete(profile);
        if (!cred.user.emailVerified) {
          setNeedsVerification(true);
          setInfoMsg(
            `Account created! We sent a verification link to ${profile.email}. Verify your email to sync bookings & calendar to Firestore.`
          );
        } else {
          onClose();
        }
      } else {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const fbUser = cred.user;
        const profile: UserProfile = {
          uid: fbUser.uid,
          name: fbUser.displayName || cleanEmail.split('@')[0],
          email: fbUser.email || cleanEmail,
          phone: phone.trim().slice(0, 24),
          preferredCity: selectedCity,
          provider: 'password',
          emailVerified: fbUser.emailVerified,
        };
        onAuthComplete(profile);
        if (fbUser.emailVerified) {
          onClose();
        } else {
          setNeedsVerification(true);
          setInfoMsg(
            `Signed in as ${profile.email}. Please verify your email address so Firestore can store your profile and bookings.`
          );
        }
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    setError('');
    try {
      await auth.currentUser.reload();
      const fbUser = auth.currentUser;
      if (fbUser.emailVerified) {
        const profile: UserProfile = {
          uid: fbUser.uid,
          name: fbUser.displayName || name.trim() || fbUser.email?.split('@')[0] || 'CinNova Member',
          email: fbUser.email || email.trim(),
          phone: phone.trim().slice(0, 24),
          preferredCity: selectedCity,
          provider: 'password',
          emailVerified: true,
        };
        onAuthComplete(profile);
        setNeedsVerification(false);
        onClose();
      } else {
        setInfoMsg('Still waiting for email verification. Click the link in your inbox, then check again.');
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    setError('');
    try {
      await sendEmailVerification(auth.currentUser);
      setInfoMsg('Verification email resent! Please check your inbox and spam folder.');
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in or sign up to CinNova"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#070910]/80 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-blue-500/25 dark:bg-[#0D111C]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-[#070910] dark:text-slate-100">
              {needsVerification
                ? 'Verify your email'
                : mode === 'signin'
                ? 'Sign in to CinNova'
                : 'Create CinNova account'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {promptMessage || 'Connected with Firebase Auth & Firestore'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#070910] dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {needsVerification ? (
          <div className="space-y-4 p-6">
            <div className="flex items-start gap-3 rounded-xl border border-lime-500/40 bg-lime-50 p-3.5 text-xs text-[#070910] dark:border-lime-400/35 dark:bg-lime-400/10 dark:text-lime-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lime-600 dark:text-lime-400" />
              <p className="leading-relaxed">{infoMsg}</p>
            </div>
            {error && (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{error}</p>
            )}
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCheckVerified}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
              >
                <RefreshCw className={`h-4 w-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span>I&apos;ve Verified — Sync Account</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleResendVerification}
                className="h-10 w-full rounded-xl border border-slate-200 bg-[#F4F7FC] text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#131926] dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Resend Verification Email
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-full text-xs font-medium text-slate-500 hover:text-[#070910] dark:text-slate-400 dark:hover:text-white"
              >
                Continue browsing for now
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            {/* Google Sign-In (Primary Firebase Provider) */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-[#070910] shadow-2xs transition-colors hover:border-blue-500/40 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-[#131926] dark:text-slate-100 dark:hover:border-blue-500/50 dark:hover:bg-slate-800"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-2H12z"
                />
                <path
                  fill="#34A853"
                  d="M3.2 7.3l3.2 2.3C7.3 7.4 9.5 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 8.1 2 4.8 4.2 3.2 7.3z"
                />
                <path
                  fill="#FBBC05"
                  d="M12 22c2.5 0 4.7-.8 6.3-2.3l-3-2.5c-.8.5-1.9.9-3.3.9-2.5 0-4.7-1.7-5.5-4l-3.2 2.5C4.9 19.8 8.2 22 12 22z"
                />
                <path
                  fill="#4285F4"
                  d="M21.6 12.2c0-.7-.1-1.2-.2-2H12v3.9h5.4c-.3 1.4-1.1 2.5-2.1 3.1l3 2.5c1.8-1.6 3.3-4.1 3.3-7.5z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative py-0.5 text-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <span className="relative bg-white px-2.5 text-[11px] font-medium text-slate-400 uppercase dark:bg-[#0D111C]">
                or with email
              </span>
            </div>

            {/* Sign In / Sign Up Mode Toggle */}
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#F4F7FC] p-1 dark:bg-[#070910]">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError('');
                  setInfoMsg('');
                }}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'signin'
                    ? 'bg-blue-600 text-white shadow-2xs dark:bg-blue-600 dark:text-white'
                    : 'text-slate-500 hover:text-[#070910] dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                  setInfoMsg('');
                }}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'signup'
                    ? 'bg-blue-600 text-white shadow-2xs dark:bg-blue-600 dark:text-white'
                    : 'text-slate-500 hover:text-[#070910] dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <div className="relative mt-1">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      autoComplete="name"
                      maxLength={80}
                      className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] py-2.5 pl-9 pr-3 text-sm text-[#070910] focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-black dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400 dark:focus:bg-black"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    maxLength={160}
                    className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] py-2.5 pl-9 pr-3 text-sm text-[#070910] focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-black dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400 dark:focus:bg-black"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleForgotPassword}
                      className="text-[11px] font-medium text-blue-600 hover:underline dark:text-lime-400"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    className="w-full rounded-xl border border-slate-200 bg-[#F4F7FC] py-2.5 pl-9 pr-10 text-sm text-[#070910] focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-black dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400 dark:focus:bg-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-lime-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Mobile Number (optional)
                  </label>
                  <div className="relative mt-1">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      autoComplete="tel"
                      maxLength={24}
                      className="font-mono-tabular w-full rounded-xl border border-slate-200 bg-[#F4F7FC] py-2.5 pl-9 pr-3 text-sm text-[#070910] focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-black dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400 dark:focus:bg-black"
                    />
                  </div>
                </div>
              )}

              {infoMsg && (
                <p className="rounded-xl border border-lime-500/40 bg-lime-50 px-3 py-2 text-xs font-medium text-[#070910] dark:border-lime-400/35 dark:bg-lime-400/10 dark:text-lime-200">
                  {infoMsg}
                </p>
              )}

              {error && (
                <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
              >
                {isSubmitting
                  ? 'Connecting...'
                  : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
