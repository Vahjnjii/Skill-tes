

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, TestProgress } from './types';
import LoginPage from './components/LoginPage';
import RulesPage from './components/RulesPage';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import { Sparkles, ShieldCheck, Video, HeartHandshake, User as UserIcon, Phone, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [rulesRead, setRulesRead] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile onboarding state
  const [onboardName, setOnboardName] = useState('');
  const [onboardPhone, setOnboardPhone] = useState('');
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);

  // Load session from localStorage on startup
  useEffect(() => {
    const savedUser = localStorage.getItem('skill_test_user');
    const savedProgress = localStorage.getItem('skill_test_progress');
    const savedRules = localStorage.getItem('skill_test_rules_read');

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (savedProgress) {
      setProgress(JSON.parse(savedProgress));
    }
    if (savedRules) {
      setRulesRead(savedRules === 'true');
    }
    setLoading(false);
  }, []);

  // Sync state changes with localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('skill_test_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('skill_test_user');
    }
  }, [user]);

  useEffect(() => {
    if (progress) {
      localStorage.setItem('skill_test_progress', JSON.stringify(progress));
    } else {
      localStorage.removeItem('skill_test_progress');
    }
  }, [progress]);

  useEffect(() => {
    localStorage.setItem('skill_test_rules_read', String(rulesRead));
  }, [rulesRead]);

  const handleLoginSuccess = (loggedInUser: User, activeProgress: TestProgress) => {
    setUser(loggedInUser);
    setProgress(activeProgress);
    
    // If progress status is already completed or form_submission or active, skip rules
    if (activeProgress && (activeProgress.status !== 'not_started' || activeProgress.currentVideoIndex > 0)) {
      setRulesRead(true);
    } else {
      setRulesRead(false);
    }
  };

  const handleStartTest = async () => {
    if (!user || !progress) return;

    // Transition progress to active status & save on server
    const updatedProgress: TestProgress = {
      ...progress,
      status: 'active',
      isTimerRunning: true,
      timerStartUnix: Date.now(),
      elapsedBeforePause: 0
    };

    try {
      const res = await fetch('/api/test/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, progress: updatedProgress }),
      });
      const data = await res.json();
      if (res.ok) {
        setProgress(data.progress);
        setRulesRead(true);
      }
    } catch (err) {
      console.error('Failed to start test on server', err);
      // Local fallback
      setProgress(updatedProgress);
      setRulesRead(true);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!onboardName.trim() || !onboardPhone.trim()) {
      setOnboardError('Please fill out both name and phone number.');
      return;
    }

    setOnboardSubmitting(true);
    setOnboardError(null);

    try {
      const res = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          firstName: onboardName,
          phone: onboardPhone
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
      } else {
        setOnboardError(data.error || 'Failed to update profile details.');
      }
    } catch (err) {
      setOnboardError('Connection error. Please try again.');
    } finally {
      setOnboardSubmitting(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setProgress(null);
    setRulesRead(false);
    setOnboardName('');
    setOnboardPhone('');
    setOnboardError(null);
    localStorage.removeItem('skill_test_user');
    localStorage.removeItem('skill_test_progress');
    localStorage.removeItem('skill_test_rules_read');
  };

  const needsOnboarding = user && user.role !== 'admin' && (!user.firstName || !user.phone);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs text-slate-500 font-mono">Initializing assess loop...</span>
      </div>
    );
  }

  return (
    <div className={user ? "h-screen max-h-screen bg-slate-950 overflow-hidden flex flex-col text-slate-100" : "min-h-screen bg-slate-950 bg-mesh pb-20 text-slate-100"}>
      {/* Navigation Topbar */}
      <header className="border-b border-slate-900/80 bg-slate-950/60 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-amber-500 animate-pulse" />
            <span className="font-display font-bold tracking-tight text-white text-base">
              SKILL <span className="text-amber-500">TEST</span>
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-500 border border-slate-800">
              v1.2.0-automated
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2.5">
                {user.firstName && (
                  <span className="text-xs text-slate-400 font-medium">
                    {user.firstName}
                  </span>
                )}
                {user.role === 'admin' ? (
                  <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> ADMIN_MODE
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                    CREATOR_MODE
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Screen Content Router */}
      <main className={user ? "flex-1 min-h-0 w-full p-4 overflow-hidden" : "container mx-auto mt-4 px-2"}>
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            </motion.div>
          ) : needsOnboarding ? (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="max-w-md mx-auto my-12"
            >
              <div className="bg-slate-900/80 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10 space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 shadow-lg shadow-orange-500/15 mb-3 ring-1 ring-white/10">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-white">Complete Your Profile</h3>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Please provide your name and phone number to initialize your assessment progress.
                  </p>
                </div>

                {onboardError && (
                  <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-3 text-xs text-red-200">
                    {onboardError}
                  </div>
                )}

                <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-1.5">
                      Full Name
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-4 w-4 text-slate-500" />
                      </div>
                      <input
                        type="text"
                        required
                        value={onboardName}
                        onChange={(e) => setOnboardName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-xs transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-slate-500" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={onboardPhone}
                        onChange={(e) => setOnboardPhone(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-xs transition-all"
                        placeholder="+1 (555) 012-3456"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="submit"
                      disabled={onboardSubmitting}
                      className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-lg shadow-amber-500/10 text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      {onboardSubmitting ? 'Registering...' : 'Complete Profile & Continue'}
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-4 border border-slate-800 rounded-xl bg-slate-950 hover:bg-slate-900 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Log Out
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : user.role === 'admin' ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col min-h-0"
            >
              <AdminDashboard adminUser={user} onLogout={handleLogout} />
            </motion.div>
          ) : !rulesRead ? (
            <motion.div
              key="rules"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <RulesPage userName={user.firstName} onStartTest={handleStartTest} />
            </motion.div>
          ) : (
            <motion.div
              key="user_dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col min-h-0"
            >
              <UserDashboard user={user} initialProgress={progress!} onLogout={handleLogout} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Branding - only rendered when logged out */}
      {!user && (
        <footer className="mt-16 text-center text-xs text-slate-600 font-mono py-8 border-t border-slate-900/60 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between px-4 gap-4">
          <div>
            © 2026 Skill Test Inc. All assessment files are securely cached.
          </div>
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <HeartHandshake className="h-3.5 w-3.5" /> High-Fidelity UI Design
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-800" />
            <span>Cloudflare CI-CD Ready</span>
          </div>
        </footer>
      )}
    </div>
  );
}
