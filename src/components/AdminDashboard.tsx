/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, Test, TestVideo, TestProgress, UserFolder } from '../types';
import { 
  Users, Folder, File, FileVideo, Clock, ClipboardList, RefreshCw, 
  Search, ShieldAlert, Sparkles, LogOut, CheckCircle2, ChevronRight, 
  HelpCircle, UserCheck, AlertCircle, PlayCircle, Plus, Trash2, Layers,
  UploadCloud, ArrowLeft, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDashboardProps {
  adminUser: User;
  onLogout: () => void;
}

interface AdminCandidateFolder {
  user: User;
  progressMap: Record<string, TestProgress>;
}

export default function AdminDashboard({ adminUser, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'evaluations' | 'designer'>('evaluations');
  const [candidates, setCandidates] = useState<AdminCandidateFolder[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<AdminCandidateFolder | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string>('classic-test');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Video previewer state
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const [playingVideoTitle, setPlayingVideoTitle] = useState<string | null>(null);

  // Test Designer Form States
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestDescription, setNewTestDescription] = useState('');
  const [newTestVideos, setNewTestVideos] = useState<{
    id: string;
    title: string;
    description: string;
    referenceVideoUrl: string;
    promptSuggestion: string;
    isUploading?: boolean;
    uploadPercent?: number;
  }[]>([]);

  const fetchAllData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch Candidates Folder Directory
      const resCandidates = await fetch('/api/admin/users', {
        headers: { 'Authorization': adminUser.email }
      });
      const dataCandidates = await resCandidates.json();
      if (!resCandidates.ok) throw new Error(dataCandidates.error || 'Failed to fetch candidate folders.');
      setCandidates(dataCandidates.users || []);

      // Refresh selected candidate reference if active
      if (selectedCandidate) {
        const fresh = dataCandidates.users.find((u: AdminCandidateFolder) => u.user.email === selectedCandidate.user.email);
        if (fresh) setSelectedCandidate(fresh);
      }

      // 2. Fetch Available Tests
      const resTests = await fetch('/api/tests');
      const dataTests = await resTests.json();
      if (resTests.ok) {
        setTests(dataTests.tests || []);
        // Pick first test as inspection target if none set
        if (dataTests.tests?.length > 0 && selectedTestId === 'classic-test' && !dataTests.tests.find((t: Test) => t.id === 'classic-test')) {
          setSelectedTestId(dataTests.tests[0].id);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleResetUser = async (email: string, testId: string) => {
    if (!window.confirm(`Are you sure you want to completely RESET the progress for test "${testId}" for candidate ${email}? This erases all their uploaded video clips.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/reset-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': adminUser.email
        },
        body: JSON.stringify({ email, testId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed.');

      setInfoMessage(`Test reset completed successfully.`);
      setTimeout(() => setInfoMessage(null), 3000);
      fetchAllData();
    } catch (err: any) {
      alert(`Error resetting: ${err.message}`);
    }
  };

  const handleSeedMockUser = async () => {
    try {
      const res = await fetch('/api/admin/seed-mock-creator', {
        method: 'POST',
        headers: { 'Authorization': adminUser.email }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seeding failed.');

      setInfoMessage('Seeded mock creator "Alex Rivera" with high-fidelity submissions on classic-test!');
      setTimeout(() => setInfoMessage(null), 4000);
      fetchAllData();
    } catch (err: any) {
      alert(`Seeding error: ${err.message}`);
    }
  };

  // --- Dynamic test video upload handlers ---
  const handleAddVideoSlot = () => {
    setNewTestVideos([
      ...newTestVideos,
      {
        id: `vid_${Date.now()}_${newTestVideos.length}`,
        title: '',
        description: '',
        referenceVideoUrl: '',
        promptSuggestion: ''
      }
    ]);
  };

  const handleRemoveVideoSlot = (index: number) => {
    setNewTestVideos(newTestVideos.filter((_, idx) => idx !== index));
  };

  const handleVideoSlotChange = (index: number, key: string, value: any) => {
    const updated = [...newTestVideos];
    updated[index] = { ...updated[index], [key]: value };
    setNewTestVideos(updated);
  };

  const handleUploadReferenceVideo = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        alert('Reference video must be under 50MB.');
        return;
      }

      // Update upload state for slot
      const updatedSlots = [...newTestVideos];
      updatedSlots[index].isUploading = true;
      updatedSlots[index].uploadPercent = 20;
      setNewTestVideos(updatedSlots);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await fetch('/api/admin/upload-reference-video', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': adminUser.email 
            },
            body: JSON.stringify({ fileName: file.name, base64Data })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Upload failed.');

          const finishedSlots = [...newTestVideos];
          finishedSlots[index].isUploading = false;
          finishedSlots[index].uploadPercent = 100;
          finishedSlots[index].referenceVideoUrl = data.url;
          setNewTestVideos(finishedSlots);
        } catch (err: any) {
          alert('Upload failed: ' + err.message);
          const failedSlots = [...newTestVideos];
          failedSlots[index].isUploading = false;
          setNewTestVideos(failedSlots);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestTitle.trim() || !newTestDescription.trim()) {
      alert('Please fill out test title and description.');
      return;
    }
    if (newTestVideos.length === 0) {
      alert('Please add at least 1 video assessment segment to this test.');
      return;
    }

    // Verify all reference videos uploaded
    const missingUrls = newTestVideos.some(v => !v.referenceVideoUrl);
    if (missingUrls) {
      alert('Please make sure you upload a 9:16 reference video clip for all added segments.');
      return;
    }

    try {
      const res = await fetch('/api/admin/create-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': adminUser.email
        },
        body: JSON.stringify({
          title: newTestTitle,
          description: newTestDescription,
          videos: newTestVideos
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish new test.');

      setInfoMessage(`Test "${newTestTitle}" published successfully with ${newTestVideos.length} evaluation videos!`);
      setTimeout(() => setInfoMessage(null), 4000);

      // Clear Form
      setNewTestTitle('');
      setNewTestDescription('');
      setNewTestVideos([]);
      
      // Refresh Lists
      fetchAllData();
    } catch (err: any) {
      alert('Error creating test: ' + err.message);
    }
  };

  // Filters candidates list based on search bar
  const filteredCandidates = candidates.filter(cand => {
    const query = searchQuery.toLowerCase();
    return (
      cand.user.firstName.toLowerCase().includes(query) ||
      cand.user.email.toLowerCase().includes(query) ||
      cand.user.phone.includes(query)
    );
  });

  // Pick inspection test details
  const activeInspectionTest = tests.find(t => t.id === selectedTestId) || tests[0];

  // Resolve user progress safe
  const getCandidateProgress = (cand: AdminCandidateFolder): TestProgress => {
    return cand.progressMap[selectedTestId] || {
      testId: selectedTestId,
      status: 'pending' as any,
      currentVideoIndex: 0,
      submissions: {},
      skipCount: 0,
      elapsedBeforePause: 0,
      isTimerRunning: false
    };
  };

  // Directory Stats
  const activeCandidatesCount = candidates.filter(c => {
    const p = getCandidateProgress(c);
    return p.status === 'active' || p.status === 'form_submission';
  }).length;

  const completedCandidatesCount = candidates.filter(c => {
    const p = getCandidateProgress(c);
    return p.status === 'completed';
  }).length;

  return (
    <div className="h-full flex flex-col min-h-0 bg-slate-950 text-slate-100 select-none">
      
      {/* 1. TOP STATS HEADER (Shrink-0, Fixed) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-display font-bold text-slate-950 text-base shadow-lg shadow-amber-500/10">
            SC
          </div>
          <div>
            <div className="text-[10px] text-amber-500 font-mono tracking-wider font-semibold uppercase flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              Supervisor Central • Admin Portal
            </div>
            <h2 className="text-lg font-bold font-display text-white">
              Skill Test Portal Evaluation & Studio
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedMockUser}
            className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-[11px] font-semibold text-amber-400 transition-all flex items-center gap-1 cursor-pointer"
            title="Seed dummy candidate Alex Rivera inside Classic-Test"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Seed Candidate
          </button>
          
          <button
            onClick={onLogout}
            className="px-3.5 py-1.5 border border-slate-800 bg-slate-950 hover:bg-slate-900 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit Admin
          </button>
        </div>
      </div>

      {/* Tabs Menu Navigation Bar (Fixed, Shrink-0) */}
      <div className="flex border-b border-slate-900 shrink-0 gap-4 mb-4">
        <button
          onClick={() => { setActiveTab('evaluations'); setPlayingVideoUrl(null); }}
          className={`pb-2.5 px-2 text-xs font-semibold tracking-wide uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === 'evaluations' 
              ? 'border-amber-500 text-amber-500 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Creator evaluations Folder
        </button>
        <button
          onClick={() => { setActiveTab('designer'); setPlayingVideoUrl(null); }}
          className={`pb-2.5 px-2 text-xs font-semibold tracking-wide uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === 'designer' 
              ? 'border-amber-500 text-amber-500 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Test Designer & Studio ({tests.length})
        </button>
      </div>

      {/* Notifications messages */}
      {infoMessage && (
        <div className="mb-4 bg-amber-500/5 border border-amber-500/25 rounded-xl p-3 shrink-0 flex items-center gap-2 text-xs text-amber-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* TAB VIEWS WORKSPACE (Perfect layout fit, NO PAGE SCROLLBAR) */}
      <div className="flex-1 min-h-0 flex flex-col">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: CREATOR EVALUATIONS PANEL */}
          {activeTab === 'evaluations' && (
            <motion.div 
              key="evals"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4"
            >
              
              {/* Left Candidate Selector column (4 cols) */}
              <div className="md:col-span-4 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="shrink-0 mb-3">
                  <h3 className="text-xs font-bold text-white tracking-wide uppercase font-display flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-amber-500" />
                    Candidate folders
                  </h3>
                  
                  {/* Test selector filter for admin */}
                  <div className="mt-3">
                    <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase mb-1">Evaluating test challenge:</label>
                    <select
                      value={selectedTestId}
                      onChange={(e) => {
                        setSelectedTestId(e.target.value);
                        setPlayingVideoUrl(null);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    >
                      {tests.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Search Bar */}
                  <div className="relative mt-3">
                    <Search className="absolute inset-y-0 left-2.5 h-3.5 w-3.5 text-slate-500 my-auto" />
                    <input
                      type="text"
                      placeholder="Search folder directory..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Scroller directory list */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
                  {filteredCandidates.length === 0 ? (
                    <div className="py-12 text-center text-[11px] text-slate-600 font-mono italic">
                      No matching folder pathways found.
                    </div>
                  ) : (
                    filteredCandidates.map((cand) => {
                      const isSelected = selectedCandidate?.user.email === cand.user.email;
                      const progressInfo = getCandidateProgress(cand);
                      const isFinished = progressInfo.status === 'completed';
                      const isActive = progressInfo.status === 'active' || progressInfo.status === 'form_submission';

                      return (
                        <button
                          key={cand.user.id}
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setPlayingVideoUrl(null);
                          }}
                          className={`w-full p-2.5 text-left rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-amber-500/5 border-amber-500/30' 
                              : 'bg-slate-950/60 border-slate-850 hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex items-center gap-2 max-w-[70%] truncate">
                            <div className="h-7 w-7 rounded-lg bg-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center shrink-0 uppercase">
                              {cand.user.firstName.substring(0, 2)}
                            </div>
                            <div className="truncate">
                              <div className="text-[11px] font-bold text-white truncate">{cand.user.firstName}</div>
                              <div className="text-[9px] font-mono text-slate-500 truncate">{cand.user.email}</div>
                            </div>
                          </div>

                          <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full font-bold ${
                            isFinished 
                              ? 'bg-green-500/10 text-green-400' 
                              : isActive 
                                ? 'bg-amber-500/10 text-amber-400' 
                                : 'bg-slate-900 text-slate-600'
                          }`}>
                            {isFinished ? 'SUBMITTED' : isActive ? 'IN TEST' : 'PENDING'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Explorer Inspector (8 cols) */}
              <div className="md:col-span-8 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl overflow-y-auto">
                {selectedCandidate ? (
                  <div className="space-y-5">
                    
                    {/* Header */}
                    <div className="border-b border-slate-800 pb-3 flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-1.5 font-display">
                          <Folder className="h-4.5 w-4.5 text-amber-500" />
                          candidate_folder/{selectedCandidate.user.firstName.replace(/[^a-zA-Z]/g, '')}
                        </h3>
                        <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                          UUID: {selectedCandidate.user.id} • Target Challenge: {activeInspectionTest?.title || 'Unknown Test'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleResetUser(selectedCandidate.user.email, selectedTestId)}
                        className="px-2.5 py-1 bg-red-950/15 hover:bg-red-950/30 border border-red-900/30 rounded-lg text-[9px] font-bold text-red-400 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reset Folder Progress
                      </button>
                    </div>

                    {/* Candidate Identity card */}
                    <div className="bg-slate-950/50 rounded-xl border border-slate-800/80 p-3 grid grid-cols-3 gap-2 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-500 block uppercase text-[8px]">Candidate Email</span>
                        <span className="text-slate-300 font-semibold truncate block">{selectedCandidate.user.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block uppercase text-[8px]">Contact Line</span>
                        <span className="text-slate-300 block">{selectedCandidate.user.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block uppercase text-[8px]">Completion State</span>
                        <span className={`font-bold ${getCandidateProgress(selectedCandidate).status === 'completed' ? 'text-green-400' : 'text-amber-500'}`}>
                          {getCandidateProgress(selectedCandidate).status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Reference Video Assessments Cards */}
                    <div>
                      <h4 className="text-[10px] font-bold font-mono tracking-wider uppercase text-slate-500 mb-2.5 flex items-center gap-1">
                        <FileVideo className="h-4 w-4 text-amber-500" />
                        SEGMENT ASSETS & EFFORT TIMINGS
                      </h4>

                      {activeInspectionTest && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {activeInspectionTest.videos.map((video, index) => {
                            const submission = getCandidateProgress(selectedCandidate).submissions[video.id];
                            const isSkipped = submission?.status === 'skipped';
                            const isDone = submission !== undefined;

                            return (
                              <div key={video.id} className="bg-slate-950/30 border border-slate-850 p-3 rounded-xl flex flex-col justify-between">
                                <div>
                                  <div className="flex justify-between items-start mb-1">
                                    <h5 className="text-xs font-bold text-white truncate max-w-[70%]">{index + 1}. {video.title}</h5>
                                    <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                                      isDone 
                                        ? isSkipped 
                                          ? 'bg-slate-850 text-slate-500' 
                                          : 'bg-green-500/10 text-green-400'
                                        : 'bg-slate-900 text-slate-700'
                                    }`}>
                                      {isDone ? isSkipped ? 'SKIPPED' : 'COMPLETED' : 'NOT ATTEMPTED'}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-500 leading-relaxed line-clamp-1 mb-2">{video.description}</p>
                                </div>

                                {isDone ? (
                                  isSkipped ? (
                                    <div className="p-1.5 bg-slate-900/60 rounded text-[9px] font-mono text-slate-500 italic">
                                      Candidate utilized the 1-skip rule allowance.
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      <div className="bg-slate-900/60 p-1.5 rounded text-[9px] font-mono text-slate-400 flex justify-between items-center">
                                        <span>Stopwatch:</span>
                                        <span className="text-amber-400 font-bold">
                                          {Math.floor(submission.elapsedSeconds / 60)}m {submission.elapsedSeconds % 60}s
                                        </span>
                                      </div>
                                      {submission.uploadedVideoUrl ? (
                                        <button
                                          onClick={() => {
                                            setPlayingVideoUrl(submission.uploadedVideoUrl || null);
                                            setPlayingVideoTitle(`Recreated By ${selectedCandidate.user.firstName} • Clip ${index + 1}`);
                                          }}
                                          className="w-full py-1 bg-amber-500 text-slate-950 font-bold rounded text-[9px] hover:bg-amber-400 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                          <PlayCircle className="h-3 w-3" />
                                          Play Video Submission (9:16)
                                        </button>
                                      ) : (
                                        <div className="text-[8px] text-slate-500 italic text-center p-1 bg-slate-900/30 rounded">
                                          Stored secure cloud asset folder path
                                        </div>
                                      )}
                                    </div>
                                  )
                                ) : (
                                  <div className="bg-slate-900/40 py-2.5 text-center rounded text-[9px] text-slate-600 font-mono italic">
                                    Segment pending completion
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Embedded 9:16 / 16:9 Player overlay */}
                    {playingVideoUrl && (
                      <div className="bg-black border border-slate-800 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-semibold text-amber-400 flex items-center gap-1">
                            <FileVideo className="h-3.5 w-3.5" />
                            {playingVideoTitle}
                          </span>
                          <button onClick={() => { setPlayingVideoUrl(null); setPlayingVideoTitle(null); }} className="text-slate-500 hover:text-slate-300 font-bold font-mono">
                            [CLOSE PLAYER]
                          </button>
                        </div>
                        {/* Perfect aspect-[9/16] portrait fit within the container */}
                        <div className="aspect-[9/16] max-h-[420px] bg-slate-950 rounded-lg overflow-hidden relative flex items-center justify-center mx-auto border border-slate-900">
                          <video src={playingVideoUrl} controls autoPlay className="w-full h-full object-contain" />
                        </div>
                      </div>
                    )}

                    {/* Portfolio pipeline details */}
                    {getCandidateProgress(selectedCandidate).status === 'completed' ? (
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                        <h5 className="text-[10px] font-bold font-mono tracking-wider uppercase text-slate-400 flex items-center gap-1 border-b border-slate-900 pb-1.5">
                          <ClipboardList className="h-3.5 w-3.5 text-amber-500" />
                          PROMPTS & WORKFLOW PORTFOLIO REPORT
                        </h5>
                        <div className="space-y-2">
                          <div>
                            <div className="text-[9px] font-mono text-slate-500 uppercase font-bold">1. Video Prompts Utilized:</div>
                            <p className="text-[10px] text-slate-300 font-mono bg-slate-900/50 p-2 rounded border border-slate-850 whitespace-pre-wrap leading-relaxed mt-1">
                              {getCandidateProgress(selectedCandidate).finalPrompts || 'None listed.'}
                            </p>
                          </div>
                          <div>
                            <div className="text-[9px] font-mono text-slate-500 uppercase font-bold">2. Systems & Toolsets:</div>
                            <p className="text-[10px] text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-850 leading-relaxed mt-1">
                              {getCandidateProgress(selectedCandidate).finalTools || 'None listed.'}
                            </p>
                          </div>
                          <div>
                            <div className="text-[9px] font-mono text-slate-500 uppercase font-bold">3. Production workflow notes:</div>
                            <p className="text-[10px] text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-850 leading-relaxed mt-1">
                              {getCandidateProgress(selectedCandidate).finalExplanation || 'None listed.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-950/20 border border-dashed border-slate-850 rounded-xl p-4 text-center text-[10px] text-slate-500 font-mono italic">
                        Portfolio summary will compile automatically upon test submit.
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-center items-center text-center py-20 text-slate-500">
                    <Folder className="h-10 w-10 text-slate-600 mb-2" />
                    <p className="text-xs font-semibold">No candidate folder selected</p>
                    <p className="text-[10px] text-slate-600 mt-1 max-w-[240px]">Select a creator file from the left directory to inspect video assessments and stopwatch times.</p>
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* TAB 2: TEST DESIGNER & STUDIO */}
          {activeTab === 'designer' && (
            <motion.div 
              key="designer"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4"
            >
              
              {/* Left published tests listing (4 cols) */}
              <div className="md:col-span-4 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <h3 className="text-xs font-bold text-white tracking-wide uppercase font-display flex items-center gap-1.5 shrink-0 mb-3">
                  <Layers className="h-4 w-4 text-amber-500" />
                  Published test packages
                </h3>

                <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                  {tests.map((test) => (
                    <div 
                      key={test.id} 
                      className="p-3 bg-slate-950/60 rounded-xl border border-slate-850 text-left space-y-2"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white font-display truncate">{test.title}</h4>
                        <span className="text-[8px] font-mono text-amber-500 px-1.5 py-0.5 rounded bg-amber-500/5 border border-amber-500/10 inline-block mt-1">
                          ID: {test.id}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{test.description}</p>
                      
                      <div className="pt-2 border-t border-slate-900 flex justify-between text-[8px] font-mono text-slate-500">
                        <span>Created: {new Date(test.createdAt).toLocaleDateString()}</span>
                        <span>{test.videos.length} videos</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Publish New Test panel (8 cols) */}
              <div className="md:col-span-8 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl overflow-y-auto">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase font-display flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Plus className="h-4 w-4 text-amber-500" />
                  Publish dynamic test packages (9:16 Portrait spec)
                </h3>

                <form onSubmit={handleCreateTestSubmit} className="mt-4 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Test Package Title
                      </label>
                      <input
                        type="text"
                        required
                        value={newTestTitle}
                        onChange={(e) => setNewTestTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="e.g. Cinematic Vertical AI Video Challenge"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Test Brief Description
                      </label>
                      <input
                        type="text"
                        required
                        value={newTestDescription}
                        onChange={(e) => setNewTestDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="Define the theme, target creators, and scope..."
                      />
                    </div>
                  </div>

                  {/* Added dynamic video segments list */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-855 pb-1">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Test Video clips ({newTestVideos.length})</span>
                      <button
                        type="button"
                        onClick={handleAddVideoSlot}
                        className="px-2 py-1 bg-amber-500 text-slate-950 rounded-lg text-[9px] font-bold hover:bg-amber-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Segment Clip
                      </button>
                    </div>

                    {newTestVideos.length === 0 ? (
                      <div className="py-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-[10px] text-slate-600 font-mono italic">
                        No segments added. Click "Add Segment Clip" to load 9:16 reference video properties.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {newTestVideos.map((vid, idx) => (
                          <div 
                            key={vid.id} 
                            className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3 relative"
                          >
                            <button
                              type="button"
                              onClick={() => handleRemoveVideoSlot(idx)}
                              className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 transition-colors"
                              title="Delete segment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                            <div className="text-[9px] font-bold font-mono text-amber-500">SEGMENT SLOT {idx + 1}</div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="block text-[8px] font-mono text-slate-400 uppercase mb-1">Clip Name</label>
                                <input
                                  type="text"
                                  required
                                  value={vid.title}
                                  onChange={(e) => handleVideoSlotChange(idx, 'title', e.target.value)}
                                  className="w-full px-2.5 py-1.5 border border-slate-850 rounded-lg bg-slate-950 text-[10px] text-white"
                                  placeholder="e.g. Neon Cyberpunk Street"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-mono text-slate-400 uppercase mb-1">Visual Target prompts</label>
                                <input
                                  type="text"
                                  required
                                  value={vid.promptSuggestion}
                                  onChange={(e) => handleVideoSlotChange(idx, 'promptSuggestion', e.target.value)}
                                  className="w-full px-2.5 py-1.5 border border-slate-850 rounded-lg bg-slate-950 text-[10px] text-white"
                                  placeholder="e.g. Futuristic dark street rendering..."
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[8px] font-mono text-slate-400 uppercase mb-1">Segment evaluation brief</label>
                              <input
                                type="text"
                                required
                                value={vid.description}
                                onChange={(e) => handleVideoSlotChange(idx, 'description', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-850 rounded-lg bg-slate-950 text-[10px] text-white"
                                placeholder="Details tracking shots, atmospheric dew, etc..."
                              />
                            </div>

                            {/* Reference Video Uploader block */}
                            <div className="pt-2 border-t border-slate-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div className="text-[9px] text-slate-500 font-mono">
                                {vid.referenceVideoUrl ? (
                                  <span className="text-green-400 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Portrait video uploaded successfully!
                                  </span>
                                ) : (
                                  <span className="text-amber-500 font-semibold">Please upload reference asset (Portrait 9:16 MP4 format)</span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  id={`file_ref_${vid.id}`}
                                  className="hidden"
                                  accept="video/*"
                                  onChange={(e) => handleUploadReferenceVideo(idx, e)}
                                />
                                <label 
                                  htmlFor={`file_ref_${vid.id}`}
                                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-bold text-slate-300 cursor-pointer flex items-center gap-1"
                                >
                                  {vid.isUploading ? (
                                    <>
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <UploadCloud className="h-3.5 w-3.5 text-amber-500" />
                                      {vid.referenceVideoUrl ? 'Replace 9:16 Video' : 'Upload 9:16 Portrait'}
                                    </>
                                  )}
                                </label>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-850 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Save & Publish Test Package
                    </button>
                  </div>
                </form>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
