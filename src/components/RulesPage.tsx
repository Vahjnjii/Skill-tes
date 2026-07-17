/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Sparkles, Zap, AlertTriangle, RefreshCw, Layers, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RulesPageProps {
  onStartTest: () => void;
  userName: string;
}

export default function RulesPage({ onStartTest, userName }: RulesPageProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const rulesList = [
    {
      icon: <Layers className="h-6 w-6 text-amber-400" />,
      title: 'Four Reference Videos',
      description: 'You will receive 4 consecutive test video tasks. Your objective is to recreate them with the help of modern generative AI tools (e.g. Runway, Sora, Luma, Pika, Kling, etc.).'
    },
    {
      icon: <Sparkles className="h-6 w-6 text-orange-400" />,
      title: 'Realism > AI Imperfections',
      description: 'Your output should be more realistic, artistic, and visually stunning than standard pre-generated AI, demonstrating your prompt-engineering and refinement skill.'
    },
    {
      icon: <Zap className="h-6 w-6 text-yellow-400" />,
      title: 'Speed Matters (Persistent Timer)',
      description: 'As soon as you start a video task, a timer begins counting up. Your total time taken is a critical rating factor. Note: refreshing the browser will NOT reset or pause the timer.'
    },
    {
      icon: <AlertTriangle className="h-6 w-6 text-red-400" />,
      title: 'Strict 1-Skip Limit',
      description: 'You may choose to skip a video task if you find it particularly challenging. However, you can only skip at most ONE video across the entire test of 4.'
    },
    {
      icon: <RefreshCw className="h-6 w-6 text-blue-400" />,
      title: 'Document Your Pipeline',
      description: 'Upon finishing, you must submit the exact prompts used to generate the clips, list the specific AI toolstacks utilized, and write a concise technical explanation of your workflow.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        {/* Decorative ambient light */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative">
          <div className="flex items-center gap-3 text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Skill Assessment Portal
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-white mb-4">
            Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">{userName}</span>
          </h1>
          <p className="text-slate-300 text-base leading-relaxed max-w-2xl mb-8">
            Please read the instructions carefully before initiating the assessment. The test is structured to measure both your creative cinematic generation fidelity and your production execution speed.
          </p>

          <h3 className="text-lg font-semibold font-display text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
            Assessment Guidelines & Protocols
          </h3>

          <div className="grid gap-6 md:grid-cols-2 mb-10">
            {rulesList.map((rule, idx) => (
              <div 
                key={idx} 
                className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 flex gap-4 hover:border-slate-700/60 transition-colors"
              >
                <div className="p-3 bg-slate-900 rounded-xl h-fit border border-slate-800/80">
                  {rule.icon}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white tracking-wide mb-1">
                    {rule.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {rule.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3 mb-8">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90 leading-relaxed">
              <strong>Anti-cheating / Session Guard:</strong> Once you trigger "Start Test", your profile progress is locked in the cloud database. Any attempt to refresh, restart, or sign out will not pause the clock. Maintain focus and complete the four clips sequentially.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold text-base rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center gap-3 scale-100 hover:scale-102 active:scale-98 cursor-pointer"
            >
              <Play className="h-5 w-5 fill-slate-950 text-slate-950" />
              Begin Video Assessment
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-amber-400 mb-4">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold font-display text-white">
                  Assessment Confirmation
                </h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                You are about to start your AI video test. This will initiate the tracking sequence in your profile record. 
                <br /><br />
                <span className="text-amber-400 font-semibold">"Your time starts now!"</span> will be registered immediately. Are you fully prepared to begin Clip 1?
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-800 rounded-xl bg-slate-950 hover:bg-slate-900 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    onStartTest();
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
                >
                  Yes, Start Now!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
