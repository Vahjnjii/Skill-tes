/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  firstName: string;
  email: string;
  phone: string;
  createdAt: string;
  role: 'admin' | 'creator';
}

export interface TestVideo {
  id: string;
  title: string;
  description: string;
  referenceVideoUrl: string;
  promptSuggestion: string;
  thumbnailUrl?: string;
}

export interface Test {
  id: string;
  title: string;
  description: string;
  videos: TestVideo[];
  createdAt: string;
}

export interface UserVideoSubmission {
  videoId: string;
  status: 'pending' | 'completed' | 'skipped';
  elapsedSeconds: number;
  uploadedVideoUrl?: string; // base64 / static file path
  uploadedFileName?: string;
  completedAt?: string;
}

export interface TestProgress {
  testId: string; // The ID of the test this progress belongs to
  currentVideoIndex: number; // index of the active video
  submissions: Record<string, UserVideoSubmission>;
  skipCount: number; // Max 1 skip allowed
  timerStartUnix?: number; // Unix timestamp in ms when active video started
  elapsedBeforePause: number; // Accumulated seconds from previous segments/pauses
  isTimerRunning: boolean;
  finalPrompts?: string;
  finalTools?: string;
  finalExplanation?: string;
  status: 'not_started' | 'active' | 'form_submission' | 'completed';
  submittedAt?: string;
}

export interface UserFolder {
  user: User;
  progress: TestProgress;
}
