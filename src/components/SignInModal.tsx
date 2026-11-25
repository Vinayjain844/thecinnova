import React, { useState } from 'react';
import { Mail, Phone, User, X } from 'lucide-react';
import { UserProfile } from '../types/cinema';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (profile: UserProfile) => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onSignIn,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !email.includes('@')) {
      setError('Please enter your name and a valid email address.');
      return;
    }
    onSignIn({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || '+91 98765 43210',
    });
    onClose();
  };

  const handleDemoUser = () => {
    onSignIn({
      name: 'Aarav Sharma',
      email: 'aarav.sharma@cinnova.app',
      phone: '+91 98201 44510',
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to CinNova"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#16161B]"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-stone-100">
              Sign in to CinNova
            </h2>
            <p className="text-xs text-stone-500 dark:text-zinc-400">
              Save your M-Tickets and speed up checkout
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Full Name
            </label>
            <div className="relative mt-1">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] py-2.5 pl-9 pr-3 text-sm text-zinc-900 focus:border-red-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Email Address
            </label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] py-2.5 pl-9 pr-3 text-sm text-zinc-900 focus:border-red-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Mobile Number (optional)
            </label>
            <div className="relative mt-1">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="font-mono-tabular w-full rounded-xl border border-stone-200 bg-[#FAF8F5] py-2.5 pl-9 pr-3 text-sm text-zinc-900 focus:border-red-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-rose-400">{error}</p>
          )}

          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-700 dark:bg-rose-600 dark:hover:bg-rose-500"
          >
            Continue
          </button>

          <div className="relative py-1 text-center">
            <span className="bg-white px-2 text-xs text-stone-400 dark:bg-[#16161B]">or</span>
          </div>

          <button
            type="button"
            onClick={handleDemoUser}
            className="h-10 w-full rounded-xl border border-stone-200 bg-[#FAF8F5] text-xs font-semibold text-zinc-700 transition-colors hover:bg-stone-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200 dark:hover:bg-zinc-800"
          >
            Quick Demo Sign In (Aarav Sharma)
          </button>
        </form>
      </div>
    </div>
  );
};
