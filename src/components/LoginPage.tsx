/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginPageProps {
  onLoginSuccess: (user: User, progress: any) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [error, setError] = useState<string | null>(null);

  // Listen for Google Sign-In success messages from the popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Allow messages from standard origins of dev preview or localhost
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      
      if (event.data?.type === 'GOOGLE_SIGNIN_SUCCESS') {
        onLoginSuccess(event.data.user, event.data.progress);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLoginSuccess]);

  const handleGoogleSignInPopup = () => {
    const width = 500;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      '/auth/google-login',
      'google_signin_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto w-full max-w-md text-center">
        {/* Elegant Tech Logo */}
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 shadow-lg shadow-orange-500/20 mb-4 ring-1 ring-white/10">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        
        <h2 className="text-4xl font-bold font-display tracking-tight text-white">
          SKILL TEST
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          AI Video Generation Assessment & Evaluation Arena
        </p>
      </div>

      <div className="mt-8 sm:mx-auto w-full max-w-md">
        <motion.div 
          layout
          className="bg-slate-900/80 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10 space-y-6 text-center"
        >
          {error && (
            <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-200">{error}</div>
            </div>
          )}

          <div className="py-4">
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Welcome to the Skill Test evaluation arena. Please sign in with your Google Account to begin or resume your cinematic assessment.
            </p>

            {/* Authentic Google Sign-In Option */}
            <button
              type="button"
              onClick={handleGoogleSignInPopup}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-700 rounded-xl bg-slate-950 hover:bg-slate-900 text-sm font-semibold text-white transition-all shadow-md cursor-pointer hover:border-slate-600 ring-1 ring-white/5 hover:scale-[1.01] active:scale-[0.99]"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Sign In with Google
            </button>
          </div>
        </motion.div>

        {/* Informative Disclaimer Footer */}
        <p className="mt-6 text-center text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          Secure enterprise evaluation framework. All credentials and progression details are cached securely.
        </p>
      </div>
    </div>
  );
}
