/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, Test, TestVideo, TestProgress, UserVideoSubmission } from '../types';
import { 
  Play, Pause, FastForward, UploadCloud, CheckCircle2, Award, LogOut, 
  Hourglass, FileVideo, AlertTriangle, ShieldAlert, Sparkles, Send, Check,
  ChevronRight, ArrowLeft, Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserDashboardProps {
  user: User;
  initialProgress: TestProgress;
  onLogout: () => void;
}

export default function UserDashboard({ user, initialProgress, onLogout }: UserDashboardProps) {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [loadingTests, setLoadingTests] = useState(true);
  
  const [activeVideo, setActiveVideo] = useState<TestVideo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Real-time stopwatch ticking state
  const [localSeconds, setLocalSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Final Form State
  const [finalPrompts, setFinalPrompts] = useState('');
  const [finalTools, setFinalTools] = useState('');
  const [finalExplanation, setFinalExplanation] = useState('');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Fetch all available tests on mount
  const fetchTests = async () => {
    setLoadingTests(true);
    try {
      const res = await fetch('/api/tests');
      const data = await res.json();
      if (res.ok) {
        setTests(data.tests || []);
      }
    } catch (err) {
      console.error('Failed to load available tests', err);
    } finally {
      setLoadingTests(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  // Fetch or select a specific test to take
  const handleSelectTest = async (test: Test) => {
    setSelectedTest(test);
    try {
      const res = await fetch(`/api/test/progress?email=${encodeURIComponent(user.email)}&testId=${test.id}`);
      const data = await res.json();
      if (res.ok) {
        setProgress(data.progress);
        // Pre-set video index
        if (data.progress.currentVideoIndex < test.videos.length) {
          setActiveVideo(test.videos[data.progress.currentVideoIndex]);
        } else {
          setActiveVideo(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch test progress', err);
    }
  };

  // Set active video based on current video index when progress or selectedTest changes
  useEffect(() => {
    if (selectedTest && progress) {
      if (progress.currentVideoIndex < selectedTest.videos.length) {
        setActiveVideo(selectedTest.videos[progress.currentVideoIndex]);
      } else {
        setActiveVideo(null);
      }
    } else {
      setActiveVideo(null);
    }
  }, [progress?.currentVideoIndex, selectedTest]);

  // Pre-fill suggested Prompts in form view
  useEffect(() => {
    if (progress && progress.status === 'form_submission' && selectedTest) {
      const textLines = selectedTest.videos.map((v, i) => {
        const sub = progress.submissions[v.id];
        const statusText = sub ? (sub.status === 'skipped' ? 'SKIPPED' : 'COMPLETED') : 'NOT ATTEMPTED';
        return `Clip ${i + 1} (${v.title}) - ${statusText}:\nPrompt: ""`;
      }).join('\n\n');
      setFinalPrompts(textLines);
    }
  }, [progress?.status, selectedTest]);

  // Persistent Timer Engine
  useEffect(() => {
    if (progress && progress.status === 'active' && progress.timerStartUnix) {
      const calculateElapsed = () => {
        const diffMs = Date.now() - (progress.timerStartUnix || Date.now());
        const seconds = Math.max(0, Math.floor(diffMs / 1000) + progress.elapsedBeforePause);
        setLocalSeconds(seconds);
      };

      calculateElapsed();

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        const diffMs = Date.now() - (progress.timerStartUnix || Date.now());
        const seconds = Math.max(0, Math.floor(diffMs / 1000) + progress.elapsedBeforePause);
        setLocalSeconds(seconds);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setLocalSeconds(progress?.elapsedBeforePause || 0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [progress?.status, progress?.timerStartUnix, progress?.elapsedBeforePause]);

  const saveProgressOnServer = async (updatedProgress: TestProgress) => {
    try {
      const res = await fetch('/api/test/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, progress: updatedProgress }),
      });
      const data = await res.json();
      if (res.ok) {
        setProgress(data.progress);
      }
    } catch (err) {
      console.error('Failed to sync progress', err);
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTask = () => {
    if (!progress || !selectedTest) return;
    const updated: TestProgress = {
      ...progress,
      status: 'active',
      isTimerRunning: true,
      timerStartUnix: Date.now(),
    };
    setProgress(updated);
    saveProgressOnServer(updated);
  };

  const handleSkipTask = () => {
    if (!activeVideo || !progress || !selectedTest) return;
    if (progress.skipCount >= 1) {
      alert('Skip limit reached! You can only skip a maximum of 1 video per test.');
      return;
    }

    const currentSub: UserVideoSubmission = {
      videoId: activeVideo.id,
      status: 'skipped',
      elapsedSeconds: 0
    };

    const nextIndex = progress.currentVideoIndex + 1;
    const isCompleted = nextIndex >= selectedTest.videos.length;

    const updated: TestProgress = {
      ...progress,
      currentVideoIndex: nextIndex,
      skipCount: progress.skipCount + 1,
      timerStartUnix: undefined,
      elapsedBeforePause: 0,
      isTimerRunning: false,
      submissions: {
        ...progress.submissions,
        [activeVideo.id]: currentSub
      },
      status: isCompleted ? 'form_submission' : 'not_started'
    };

    setProgress(updated);
    saveProgressOnServer(updated);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('video/')) {
      setUploadError('Only valid video files (MP4, WebM, Quicktime) are accepted.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File exceeds maximum upload limit (50MB).');
      return;
    }
    uploadVideoFile(file);
  };

  const uploadVideoFile = (file: File) => {
    if (!activeVideo || !progress || !selectedTest) return;
    setIsUploading(true);
    setUploadPercent(15);

    const reader = new FileReader();
    reader.onloadstart = () => setUploadPercent(35);
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 45) + 35;
        setUploadPercent(percent);
      }
    };
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      setUploadPercent(85);

      try {
        const res = await fetch('/api/test/upload-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            testId: selectedTest.id,
            videoId: activeVideo.id,
            fileName: file.name,
            base64Data,
            elapsedSeconds: localSeconds
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server rejected file upload.');

        setUploadPercent(100);
        
        setTimeout(() => {
          const nextIndex = progress.currentVideoIndex + 1;
          const isFinished = nextIndex >= selectedTest.videos.length;

          const updated: TestProgress = {
            ...progress,
            currentVideoIndex: nextIndex,
            timerStartUnix: undefined,
            elapsedBeforePause: 0,
            isTimerRunning: false,
            submissions: {
              ...progress.submissions,
              [activeVideo.id]: {
                videoId: activeVideo.id,
                status: 'completed',
                elapsedSeconds: localSeconds,
                uploadedVideoUrl: data.uploadedVideoUrl,
                uploadedFileName: file.name,
                completedAt: new Date().toISOString()
              }
            },
            status: isFinished ? 'form_submission' : 'not_started'
          };

          setProgress(updated);
          saveProgressOnServer(updated);
          setIsUploading(false);
          setUploadPercent(0);
        }, 500);

      } catch (err: any) {
        setUploadError(err.message || 'Network error uploading file.');
        setIsUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progress || !selectedTest) return;
    if (!finalTools.trim() || !finalExplanation.trim()) {
      alert('Please fill out the AI tools used and workflow explanation.');
      return;
    }

    setIsSubmittingForm(true);

    const completedProgress: TestProgress = {
      ...progress,
      status: 'completed',
      finalPrompts,
      finalTools,
      finalExplanation,
      submittedAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/test/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, progress: completedProgress }),
      });
      if (res.ok) {
        setProgress(completedProgress);
      }
    } catch (err) {
      console.error('Final submit failed', err);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleBackToTests = () => {
    setSelectedTest(null);
    setProgress(null);
    setActiveVideo(null);
    fetchTests();
  };

  // Calculate stats
  const totalDuration: number = progress ? (Object.values(progress.submissions) as any[]).reduce((acc: number, sub: any) => acc + (sub.elapsedSeconds || 0), 0) : 0;

  return (
    <div className="h-full flex flex-col min-h-0 text-slate-100 select-none">
      
      {/* 1. SELECT TEST SCENE */}
      {!selectedTest ? (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col justify-center max-w-4xl mx-auto w-full">
          <div className="mb-6 text-center">
            <span className="text-xs text-amber-500 font-mono tracking-wider font-semibold uppercase">Assessment Arena</span>
            <h2 className="text-3xl font-extrabold font-display text-white mt-1">Select an AI Video Assessment</h2>
            <p className="text-xs text-slate-400 mt-2 max-w-lg mx-auto">
              Please choose a challenge test from below. Each test contains multiple 9:16 portrait video requirements and persistent tracking.
            </p>
          </div>

          {loadingTests ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-500 font-mono">Loading dynamic evaluation tests...</span>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {tests.map((test) => (
                <div 
                  key={test.id} 
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/30 transition-all flex flex-col justify-between hover:shadow-xl hover:shadow-amber-500/[0.01]"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg">
                        <Video className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                        {test.videos.length} portrait clips
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white font-display mb-1.5">{test.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6 line-clamp-3">{test.description}</p>
                  </div>

                  <button
                    onClick={() => handleSelectTest(test)}
                    className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-xl text-xs font-semibold text-amber-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Launch Assessment
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-900 flex justify-center">
            <button
              onClick={onLogout}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Exit Platform
            </button>
          </div>
        </div>
      ) : (
        /* 2. ACTIVE TEST WORKSPACE (FIXED/NO SCROLL) */
        <div className="flex-1 min-h-0 flex flex-col">
          
          {/* Header Bar */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-lg">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleBackToTests}
                className="p-2 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Go back to tests list"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="text-[10px] text-amber-500 font-mono tracking-wider font-semibold uppercase">ACTIVE TEST: {selectedTest.title}</div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {user.firstName}
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-slate-400">Candidate</span>
                </h3>
              </div>
            </div>

            {/* Step Indicators */}
            {progress && progress.status !== 'completed' && (
              <div className="flex items-center gap-1 sm:gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                {selectedTest.videos.map((video, idx) => {
                  const sub = progress.submissions[video.id];
                  const isCurrent = idx === progress.currentVideoIndex;
                  const isDone = sub !== undefined;
                  const isSkipped = sub?.status === 'skipped';

                  return (
                    <div key={video.id} className="flex items-center">
                      <div 
                        className={`h-7 w-7 rounded-lg border flex items-center justify-center text-[10px] font-mono transition-all ${
                          isDone 
                            ? isSkipped 
                              ? 'bg-slate-800 border-slate-700 text-slate-500'
                              : 'bg-gradient-to-br from-amber-500 to-orange-500 border-amber-400 text-slate-950 font-bold'
                            : isCurrent 
                              ? 'bg-slate-900 border-amber-500 text-amber-400 font-bold shadow-md shadow-amber-500/5' 
                              : 'bg-slate-950 border-slate-800 text-slate-600'
                        }`}
                        title={video.title}
                      >
                        {isDone ? (
                          isSkipped ? 'SKP' : <Check className="h-3 w-3 stroke-[3px]" />
                        ) : idx + 1}
                      </div>
                      {idx < selectedTest.videos.length - 1 && (
                        <div className={`w-2 sm:w-4 h-0.5 ${idx < progress.currentVideoIndex ? 'bg-amber-500/80' : 'bg-slate-800'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Core Panels workspace */}
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* LEFT COLUMN: Reference / form (7 columns) */}
            <div className="md:col-span-7 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              
              {/* Not Started Active Segment Scene */}
              {progress?.status === 'not_started' && activeVideo && (
                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                  <div className="h-12 w-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-4">
                    <Hourglass className="h-5 w-5 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2 font-display">
                    Clip {progress.currentVideoIndex + 1} of {selectedTest.videos.length}: {activeVideo.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    {activeVideo.description}
                  </p>

                  <div className="w-full bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-left mb-6 space-y-2">
                    <div className="text-[10px] font-semibold text-slate-500 font-mono uppercase">CRITICAL GUIDELINE:</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      This assessment strictly measures speed and cinematic fidelity. Locking or starting this task triggers the segment timer instantly.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    {progress.skipCount < 1 && (
                      <button
                        onClick={handleSkipTask}
                        className="px-4 py-2.5 border border-dashed border-slate-700 bg-slate-950 hover:bg-slate-900 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <FastForward className="h-3.5 w-3.5" />
                        Skip Clip ({progress.skipCount}/1 skip used)
                      </button>
                    )}
                    <button
                      onClick={handleStartTask}
                      className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
                      Start Stopwatch & Load
                    </button>
                  </div>
                </div>
              )}

              {/* Active Stopwatch Ticking Scene with beautiful 9:16 Portrait aspect video player */}
              {progress?.status === 'active' && activeVideo && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center shrink-0">
                    <span className="text-[10px] font-mono font-bold text-red-500 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      STOPWATCH RUNNING (PORTRAIT SPEC)
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Target Clip {progress.currentVideoIndex + 1} of {selectedTest.videos.length}
                    </span>
                  </div>

                  {/* Main Portrait Frame Area */}
                  <div className="flex-1 min-h-0 p-4 flex flex-col items-center justify-center bg-slate-950">
                    
                    {/* Portrait Player Frame: Aspect 9:16 */}
                    <div className="relative aspect-[9/16] h-[340px] sm:h-[380px] bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 group">
                      <video
                        src={activeVideo.referenceVideoUrl}
                        controls
                        autoPlay
                        loop
                        muted
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded border border-slate-800 text-[8px] font-bold tracking-wider uppercase text-amber-500">
                        9:16 REFERENCE
                      </div>
                    </div>

                    {/* Bottom Prompt helper */}
                    <div className="w-full max-w-md mt-4 text-left">
                      <h4 className="text-xs font-bold text-white">{activeVideo.title}</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-1 mt-0.5">{activeVideo.description}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/60 border-t border-slate-800 shrink-0">
                    <div className="text-[10px] font-mono text-slate-500 uppercase mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      Reference prompt suggestion
                    </div>
                    <div className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-850 leading-relaxed select-all">
                      "{activeVideo.promptSuggestion}"
                    </div>
                  </div>
                </div>
              )}

              {/* Form Submission Pipeline View */}
              {progress?.status === 'form_submission' && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold tracking-wider uppercase font-mono border-b border-slate-850 pb-2">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    All clips completed! Ready to submit
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white font-display">Generate prompts & tools pipeline</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Specify the detailed prompts and tech systems used to outline your assessment.
                    </p>
                  </div>

                  <form onSubmit={handleFinalSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        1. Input Prompts Blueprint
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={finalPrompts}
                        onChange={(e) => setFinalPrompts(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-[11px] font-mono transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        2. AI Tools Used
                      </label>
                      <input
                        type="text"
                        required
                        value={finalTools}
                        onChange={(e) => setFinalTools(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-[11px] transition-all"
                        placeholder="e.g. Runway Gen-3 Alpha, Midjourney v6"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        3. Workflow process notes
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={finalExplanation}
                        onChange={(e) => setFinalExplanation(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 text-[11px] transition-all"
                        placeholder="Upscaling, post edits, framing, keyframes used..."
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-855 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingForm}
                        className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {isSubmittingForm ? 'Submitting Portfolio...' : 'Submit Portfolio'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Test Completed Receipt Panel */}
              {progress?.status === 'completed' && (
                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                    <Award className="h-6 w-6 text-amber-500" />
                  </div>
                  <h4 className="text-xl font-bold text-white font-display">Assessment Submitted!</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    Your test response has been locked and securely archived for evaluation.
                  </p>

                  <div className="w-full bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-left my-6 font-mono text-[10px] space-y-2">
                    <div className="flex justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-slate-500">Registered Email:</span>
                      <span className="text-slate-300">{user.email}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-slate-500">Skips Enacted:</span>
                      <span className="text-slate-300">{progress.skipCount} / 1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Stopwatch Effort:</span>
                      <span className="text-amber-400 font-bold">{formatTime(totalDuration)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleBackToTests}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
                  >
                    Select Another Test
                  </button>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: Stopwatch / Uploader (5 columns) */}
            <div className="md:col-span-5 flex flex-col min-h-0 gap-4">
              
              {/* Ticking Timer widget */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg shrink-0 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.03] rounded-full blur-2xl pointer-events-none" />
                <span className="text-[10px] font-mono font-semibold text-slate-500 tracking-wider uppercase block">
                  {progress?.status === 'active' ? 'ACTIVE CLIP DURATION' : 'TOTAL TEST ACCUMULATION'}
                </span>
                <div className="text-4xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 tracking-widest mt-1">
                  {progress?.status === 'active' ? formatTime(localSeconds) : formatTime(totalDuration)}
                </div>
                <p className="text-[9px] text-slate-500 font-mono mt-1 leading-relaxed">
                  Timers run securely. Refreshing or exiting does not stall evaluation metrics.
                </p>
              </div>

              {/* Dynamic Video File Uploader panel */}
              {progress?.status === 'active' && activeVideo && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col min-h-0">
                  <h4 className="text-xs font-semibold text-white tracking-wide uppercase font-display flex items-center gap-1.5 mb-3 shrink-0">
                    <UploadCloud className="h-4.5 w-4.5 text-amber-500" />
                    Submit Recreated Video
                  </h4>

                  {uploadError && (
                    <div className="mb-3 bg-red-950/40 border border-red-800/60 rounded-xl p-2.5 flex items-start gap-2 shrink-0">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="text-[10px] text-red-200 leading-relaxed">{uploadError}</div>
                    </div>
                  )}

                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`flex-1 border-2 border-dashed rounded-xl p-4 flex flex-col justify-center items-center text-center transition-all min-h-0 ${
                      dragActive 
                        ? 'border-amber-500 bg-amber-500/5' 
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700/60'
                    }`}
                  >
                    {isUploading ? (
                      <div className="space-y-3 w-full py-2">
                        <div className="animate-spin h-7 w-7 text-amber-500 mx-auto" />
                        <div className="text-[10px] font-semibold text-slate-300">Uploading 9:16 portrait clip...</div>
                        <div className="w-full bg-slate-900 rounded-full h-1 max-w-[200px] mx-auto overflow-hidden">
                          <div 
                            className="bg-amber-500 h-1 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          id="video-uploader-active"
                          className="hidden"
                          accept="video/*"
                          onChange={handleFileChange}
                        />
                        <label htmlFor="video-uploader-active" className="cursor-pointer group flex flex-col items-center">
                          <div className="h-8 w-8 rounded-lg bg-slate-900 group-hover:bg-slate-850 flex items-center justify-center mb-2 border border-slate-800">
                            <FileVideo className="h-4 w-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-200">
                            Drop portrait video or browse
                          </span>
                          <span className="text-[9px] text-slate-500 mt-1 max-w-[160px]">
                            Upload 9:16 portrait test clip (Max 50MB)
                          </span>
                        </label>
                      </>
                    )}
                  </div>

                  {/* Skip control */}
                  <div className="mt-3 pt-3 border-t border-slate-850 flex justify-between items-center text-[10px] shrink-0">
                    <span className="text-slate-500">Stuck? Use skip option:</span>
                    {progress.skipCount < 1 ? (
                      <button
                        onClick={handleSkipTask}
                        className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950 text-[10px] font-semibold text-amber-500 hover:bg-slate-900 cursor-pointer"
                      >
                        Skip ({progress.skipCount}/1 left)
                      </button>
                    ) : (
                      <span className="text-slate-600 italic">No skips left</span>
                    )}
                  </div>
                </div>
              )}

              {/* Helpful sidebar details when waiting */}
              {progress?.status !== 'active' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-center items-center text-center">
                  <div className="p-3 bg-slate-950 border border-slate-850 text-slate-500 rounded-xl mb-3">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase">Secure Sandbox Session</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-1 max-w-[200px]">
                    Candidate response inputs, reference hashes, and timing metrics are logged inside evaluations sub-folders automatically.
                  </p>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
