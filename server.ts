/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure database and upload folders exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface TestVideo {
  id: string;
  title: string;
  description: string;
  referenceVideoUrl: string;
  promptSuggestion: string;
  thumbnailUrl?: string;
}

interface Test {
  id: string;
  title: string;
  description: string;
  videos: TestVideo[];
  createdAt: string;
}

interface DBStructure {
  users: Record<string, {
    id: string;
    firstName: string;
    email: string;
    phone: string;
    createdAt: string;
    role: 'admin' | 'creator';
    passwordHash: string;
  }>;
  progress: Record<string, Record<string, any>>; // email -> testId -> TestProgress
  tests: Test[];
}

// Initial DB template
const defaultDb: DBStructure = {
  users: {
    'shreevathsa2k21@gmail.com': {
      id: 'admin-id-1',
      firstName: 'Admin Shreevathsa',
      email: 'shreevathsa2k21@gmail.com',
      phone: '+919876543210',
      createdAt: new Date().toISOString(),
      role: 'admin',
      passwordHash: 'admin123'
    }
  },
  progress: {
    'shreevathsa2k21@gmail.com': {
      'classic-test': {
        testId: 'classic-test',
        currentVideoIndex: 0,
        submissions: {},
        skipCount: 0,
        isTimerRunning: false,
        elapsedBeforePause: 0,
        status: 'not_started'
      }
    }
  },
  tests: [
    {
      id: 'classic-test',
      title: 'Default 9:16 Cinematic AI Assessment',
      description: 'Prove your video production mastery across multiple standard styles: neon scapes, nature details, landscape drone flight, and complex liquid physics simulations.',
      createdAt: new Date().toISOString(),
      videos: [
        {
          id: 'vid_1',
          title: 'Neon Cyberpunk Street Scene',
          description: 'A cinematic high-fidelity tracking shot inside a subway car or futuristic station with glowing neon lights, rain reflections, and detailed atmospheric moisture.',
          referenceVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-subway-station-with-neon-lights-43956-large.mp4',
          promptSuggestion: 'Cinematic tracking shot inside a glowing cyberpunk subway station, detailed neon graffiti, heavy wet reflections on concrete floor, photorealistic 8k, volumetric amber and violet fog, Unreal Engine 5 cinematic render.'
        },
        {
          id: 'vid_2',
          title: 'Macro Flight of a Butterfly',
          description: 'A stunning close-up slow-motion reference capturing a butterfly fluttering its wings and resting gently upon glistening wildflower petals.',
          referenceVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-butterfly-on-flowers-in-slow-motion-41865-large.mp4',
          promptSuggestion: 'Macro extreme close up shot of a beautiful mechanical morpho butterfly landing on bioluminescent wildflower petals, heavy wet dew drops, morning golden hour light, highly realistic, cinematic slow motion 8k.'
        },
        {
          id: 'vid_3',
          title: 'Drone Shot of Flying Ruins',
          description: 'An expansive drone flight panning majestically over high mountain peaks piercing through fluffy layers of clouds under warm morning rays.',
          referenceVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-thick-clouds-below-mountain-peaks-41584-large.mp4',
          promptSuggestion: 'Cinematic majestic drone flight over high mountain peak ruins surrounded by endless fluffy cloud layers, dramatic morning golden sun flares, realistic volumetric sky atmosphere, breathtaking photography.'
        },
        {
          id: 'vid_4',
          title: 'Splashing Fluid Liquid Dancer',
          description: 'An abstract, hyper-detailed fluid simulation where vibrant neon paints collide in mid-air slow motion to outline the form of an elegant dancer.',
          referenceVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fluid-colors-mixing-underwater-43105-large.mp4',
          promptSuggestion: 'Vibrant neon colored liquids splashing together in high speed slow motion, forming the kinetic shape of a swirling fluid ribbon dancer, isolated on dark void background, hydrodynamics modeling, 8k.'
        }
      ]
    }
  ]
};

function readDb(): DBStructure {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2));
      return defaultDb;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    
    // Auto-migrate structure if tests list doesn't exist
    if (!parsed.tests) {
      parsed.tests = defaultDb.tests;
    }
    if (!parsed.progress) {
      parsed.progress = {};
    }
    
    return parsed;
  } catch (err) {
    console.error('Error reading database file, returning defaults', err);
    return defaultDb;
  }
}

function writeDb(data: DBStructure) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing to database file', err);
  }
}

// Helper to resolve user progress with backward-compatible migration
function getUserProgressForTest(db: DBStructure, email: string, testId: string) {
  if (!db.progress[email]) {
    db.progress[email] = {};
  }
  
  // Legacy migration check: if progress is stored as a single flat progress object instead of nested testIds
  const candidateRecord = db.progress[email];
  if (candidateRecord.currentVideoIndex !== undefined) {
    // It's a legacy flat progress object. Migrate it to 'classic-test'
    db.progress[email] = {
      'classic-test': {
        testId: 'classic-test',
        currentVideoIndex: candidateRecord.currentVideoIndex ?? 0,
        submissions: candidateRecord.submissions ?? {},
        skipCount: candidateRecord.skipCount ?? 0,
        timerStartUnix: candidateRecord.timerStartUnix,
        elapsedBeforePause: candidateRecord.elapsedBeforePause ?? 0,
        isTimerRunning: candidateRecord.isTimerRunning ?? false,
        finalPrompts: candidateRecord.finalPrompts,
        finalTools: candidateRecord.finalTools,
        finalExplanation: candidateRecord.finalExplanation,
        status: candidateRecord.status ?? 'not_started',
        submittedAt: candidateRecord.submittedAt
      }
    };
  }

  if (!db.progress[email][testId]) {
    db.progress[email][testId] = {
      testId,
      currentVideoIndex: 0,
      submissions: {},
      skipCount: 0,
      isTimerRunning: false,
      elapsedBeforePause: 0,
      status: 'not_started'
    };
  }

  return db.progress[email][testId];
}

async function startServer() {
  const app = express();

  // Support large base64 payloads for video assessment clips
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Static route to serve uploaded user-authored videos for admin inspection
  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- GOOGLE SIGN-IN POPUP ROUTE ---
  app.get('/auth/google-login', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign in - Google Accounts</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Roboto', sans-serif; }
        </style>
      </head>
      <body class="bg-[#f0f4f9] min-h-screen flex items-center justify-center p-4">
        <div class="bg-white p-8 md:p-10 rounded-3xl shadow-md border border-gray-100 w-full max-w-[450px]">
          <div class="flex flex-col">
            <!-- Google Color G Logo -->
            <div class="flex justify-start mb-6">
              <svg class="h-6" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
            </div>
            
            <!-- Step 1: Email Form -->
            <div id="email-step">
              <h1 class="text-2xl font-normal text-[#1f1f1f] tracking-tight mb-2">Sign in</h1>
              <p class="text-sm text-[#444746] mb-8">to continue to Skill Test Arena</p>
              
              <form onsubmit="goToPasswordStep(event)" class="space-y-6">
                <div class="relative">
                  <input type="email" id="email" required placeholder="Email or phone" class="w-full px-3.5 py-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#0b57d0]/40 focus:border-[#0b57d0] transition-colors placeholder-transparent peer" />
                  <label for="email" class="absolute left-3.5 top-3.5 text-gray-500 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-3.5 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[#0b57d0] bg-white px-1 -mt-0.5 pointer-events-none origin-left transform -translate-y-4 scale-75 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-4 peer-focus:scale-75">Email or phone</label>
                </div>
                
                <div class="flex justify-between items-center pt-4">
                  <button type="button" class="text-sm font-medium text-[#0b57d0] hover:text-[#0a51be] hover:underline bg-transparent border-none cursor-pointer">Create account</button>
                  <button type="submit" class="bg-[#0b57d0] hover:bg-[#0a51be] text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all shadow-sm">Next</button>
                </div>
              </form>
            </div>

            <!-- Step 2: Password Form -->
            <div id="password-step" class="hidden">
              <div class="flex items-center gap-2 mb-4 p-1.5 border border-gray-200 rounded-full hover:bg-gray-50 cursor-pointer w-fit max-w-full" onclick="goToEmailStep()">
                <div class="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </div>
                <span id="display-email" class="text-xs font-medium text-gray-600 truncate max-w-[200px]"></span>
              </div>

              <h1 class="text-2xl font-normal text-[#1f1f1f] tracking-tight mb-2">Welcome</h1>
              <p class="text-sm text-[#444746] mb-8">Enter your Google account password to proceed</p>
              
              <form onsubmit="submitAuth(event)" class="space-y-6">
                <div class="relative">
                  <input type="password" id="password" required placeholder="Enter your password" class="w-full px-3.5 py-3.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#0b57d0]/40 focus:border-[#0b57d0] transition-colors placeholder-transparent peer" />
                  <label for="password" class="absolute left-3.5 top-3.5 text-gray-500 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-3.5 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[#0b57d0] bg-white px-1 -mt-0.5 pointer-events-none origin-left transform -translate-y-4 scale-75 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-4 peer-focus:scale-75">Enter your password</label>
                </div>
                
                <div class="flex justify-between items-center pt-4">
                  <button type="button" class="text-sm font-medium text-[#0b57d0] hover:text-[#0a51be] hover:underline bg-transparent border-none cursor-pointer">Forgot password?</button>
                  <button type="submit" id="submit-btn" class="bg-[#0b57d0] hover:bg-[#0a51be] text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all shadow-sm flex items-center gap-2">
                    <span>Next</span>
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>

        <script>
          let userEmail = '';

          function goToPasswordStep(e) {
            e.preventDefault();
            userEmail = document.getElementById('email').value.trim();
            if (!userEmail) return;
            
            document.getElementById('display-email').innerText = userEmail;
            document.getElementById('email-step').classList.add('hidden');
            document.getElementById('password-step').classList.remove('hidden');
            setTimeout(() => document.getElementById('password').focus(), 50);
          }

          function goToEmailStep() {
            document.getElementById('password-step').classList.add('hidden');
            document.getElementById('email-step').classList.remove('hidden');
          }

          function submitAuth(e) {
            e.preventDefault();
            const btn = document.getElementById('submit-btn');
            btn.disabled = true;
            btn.innerHTML = '<span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>';
            
            fetch('/api/auth/google-callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: userEmail })
            })
            .then(res => {
              if (!res.ok) throw new Error('API reported failure');
              return res.json();
            })
            .then(data => {
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GOOGLE_SIGNIN_SUCCESS', 
                  user: data.user, 
                  progress: data.progress 
                }, '*');
                window.close();
              } else {
                alert('Success! You may close this popup window.');
              }
            })
            .catch(err => {
              alert('Authentication failed: ' + err.message);
              btn.disabled = false;
              btn.innerHTML = '<span>Next</span>';
            });
          }
        </script>
      </body>
      </html>
    `);
  });

  // --- API ROUTES ---

  // Auth: Google Login Callback (Handles custom onboarding naming flows)
  app.post('/api/auth/google-callback', (req, res) => {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email parameter is required.' });
      return;
    }

    const db = readDb();
    const normalizedEmail = email.toLowerCase().trim();

    let user = db.users[normalizedEmail];
    
    if (!user) {
      // Auto-register Gmail user with blanks to force onboarding on React frontend
      const role = (normalizedEmail === 'shreevathsa2k21@gmail.com' ? 'admin' : 'creator') as 'admin' | 'creator';
      user = {
        id: 'usr_' + Math.random().toString(36).substring(2, 11),
        firstName: '', // blank: prompts for name
        email: normalizedEmail,
        phone: '', // blank: prompts for phone
        createdAt: new Date().toISOString(),
        role,
        passwordHash: 'google_federated_auth'
      };
      db.users[normalizedEmail] = user;
      writeDb(db);
    }

    const progress = getUserProgressForTest(db, normalizedEmail, 'classic-test');

    const { passwordHash, ...userResponse } = user;
    res.json({ user: userResponse, progress });
  });

  // User Profile Onboarding Naming / Details Update
  app.post('/api/user/update-profile', (req, res) => {
    const { email, firstName, phone } = req.body;

    if (!email || !firstName || !phone) {
      res.status(400).json({ error: 'Email, firstName, and phone parameters are required.' });
      return;
    }

    const db = readDb();
    const normalizedEmail = email.toLowerCase().trim();
    const user = db.users[normalizedEmail];

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    user.firstName = firstName.trim();
    user.phone = phone.trim();
    db.users[normalizedEmail] = user;
    writeDb(db);

    const { passwordHash, ...userResponse } = user;
    res.json({ user: userResponse });
  });

  // Auth: Register (Manual)
  app.post('/api/auth/register', (req, res) => {
    const { firstName, email, password, phone } = req.body;

    if (!firstName || !email || !password || !phone) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }

    const db = readDb();
    const normalizedEmail = email.toLowerCase().trim();

    if (db.users[normalizedEmail]) {
      res.status(400).json({ error: 'A user with this email already exists.' });
      return;
    }

    const role = (normalizedEmail === 'shreevathsa2k21@gmail.com' ? 'admin' : 'creator') as 'admin' | 'creator';

    const newUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 11),
      firstName: firstName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      createdAt: new Date().toISOString(),
      role,
      passwordHash: password
    };

    db.users[normalizedEmail] = newUser;
    writeDb(db);

    const progress = getUserProgressForTest(db, normalizedEmail, 'classic-test');

    const { passwordHash, ...userResponse } = newUser;
    res.status(201).json({ user: userResponse, progress });
  });

  // Auth: Login (Manual)
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const db = readDb();
    const normalizedEmail = email.toLowerCase().trim();
    const user = db.users[normalizedEmail];

    // Auto-create admin account if it's the target user
    if (!user && normalizedEmail === 'shreevathsa2k21@gmail.com') {
      const defaultAdmin = defaultDb.users['shreevathsa2k21@gmail.com'];
      db.users[normalizedEmail] = defaultAdmin;
      writeDb(db);
      
      const progress = getUserProgressForTest(db, normalizedEmail, 'classic-test');
      const { passwordHash, ...userResponse } = defaultAdmin;
      res.json({ user: userResponse, progress });
      return;
    }

    if (!user || user.passwordHash !== password) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const progress = getUserProgressForTest(db, normalizedEmail, 'classic-test');

    const { passwordHash, ...userResponse } = user;
    res.json({ user: userResponse, progress });
  });

  // Dynamic Tests List Fetching
  app.get('/api/tests', (req, res) => {
    const db = readDb();
    res.json({ tests: db.tests || [] });
  });

  // Dynamic Test Fetching per user progress
  app.get('/api/test/progress', (req, res) => {
    const { email, testId } = req.query;
    if (!email || !testId) {
      res.status(400).json({ error: 'Missing email or testId.' });
      return;
    }

    const db = readDb();
    const normalizedEmail = (email as string).toLowerCase().trim();
    const progress = getUserProgressForTest(db, normalizedEmail, testId as string);
    res.json({ progress });
  });

  // Save Progress For Specific Test
  app.post('/api/test/save-progress', (req, res) => {
    const { email, progress } = req.body;

    if (!email || !progress || !progress.testId) {
      res.status(400).json({ error: 'Missing email, progress payload, or testId inside progress.' });
      return;
    }

    const db = readDb();
    const normalizedEmail = email.toLowerCase().trim();
    const testId = progress.testId;

    if (!db.users[normalizedEmail]) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (!db.progress[normalizedEmail]) {
      db.progress[normalizedEmail] = {};
    }

    db.progress[normalizedEmail][testId] = {
      ...db.progress[normalizedEmail][testId],
      ...progress
    };
    writeDb(db);

    res.json({ success: true, progress: db.progress[normalizedEmail][testId] });
  });

  // Upload Video File (base64)
  app.post('/api/test/upload-video', (req, res) => {
    const { email, testId, videoId, fileName, base64Data, elapsedSeconds } = req.body;

    if (!email || !testId || !videoId || !fileName || !base64Data) {
      res.status(400).json({ error: 'Missing required parameters.' });
      return;
    }

    try {
      const db = readDb();
      const normalizedEmail = email.toLowerCase().trim();

      if (!db.users[normalizedEmail]) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      const safeEmail = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const finalFileName = `${safeEmail}_${testId}_${videoId}_${safeFileName}`;
      const finalFilePath = path.join(UPLOADS_DIR, finalFileName);

      fs.writeFileSync(finalFilePath, buffer);

      const userProgress = getUserProgressForTest(db, normalizedEmail, testId);
      const relativeUrl = `/uploads/${finalFileName}`;
      
      userProgress.submissions[videoId] = {
        videoId,
        status: 'completed',
        elapsedSeconds: elapsedSeconds || 0,
        uploadedVideoUrl: relativeUrl,
        uploadedFileName: fileName,
        completedAt: new Date().toISOString()
      };

      db.progress[normalizedEmail][testId] = userProgress;
      writeDb(db);

      res.json({ success: true, uploadedVideoUrl: relativeUrl, progress: userProgress });
    } catch (err: any) {
      console.error('File write error:', err);
      res.status(500).json({ error: 'Failed to write video file to disk: ' + err.message });
    }
  });

  // Admin Route: Create New Test
  app.post('/api/admin/create-test', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'shreevathsa2k21@gmail.com') {
      res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
      return;
    }

    const { title, description, videos } = req.body;
    if (!title || !description || !videos || !Array.isArray(videos)) {
      res.status(400).json({ error: 'Missing title, description, or videos.' });
      return;
    }

    const db = readDb();
    const newTest: Test = {
      id: 'test_' + Math.random().toString(36).substring(2, 11),
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      videos: videos.map((v, idx) => ({
        id: v.id || `vid_${Date.now()}_${idx}`,
        title: v.title.trim(),
        description: v.description.trim(),
        referenceVideoUrl: v.referenceVideoUrl,
        promptSuggestion: v.promptSuggestion.trim()
      }))
    };

    db.tests.push(newTest);
    writeDb(db);

    res.status(201).json({ success: true, test: newTest });
  });

  // Admin Route: Reference video upload (for dynamic tests reference assets)
  app.post('/api/admin/upload-reference-video', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'shreevathsa2k21@gmail.com') {
      res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
      return;
    }

    const { fileName, base64Data } = req.body;
    if (!fileName || !base64Data) {
      res.status(400).json({ error: 'Missing file parameters.' });
      return;
    }

    try {
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      
      const safeName = `ref_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(UPLOADS_DIR, safeName);
      
      fs.writeFileSync(filePath, buffer);
      const relativeUrl = `/uploads/${safeName}`;

      res.json({ success: true, url: relativeUrl });
    } catch (err: any) {
      console.error('Reference upload error:', err);
      res.status(500).json({ error: 'Failed to write reference file: ' + err.message });
    }
  });

  // Admin Route: Get All Creators
  app.get('/api/admin/users', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'shreevathsa2k21@gmail.com') {
      res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
      return;
    }

    const db = readDb();
    const result = Object.keys(db.users)
      .filter(email => email !== 'shreevathsa2k21@gmail.com')
      .map(email => {
        const { passwordHash, ...userSafe } = db.users[email];
        return {
          user: userSafe,
          progressMap: db.progress[email] || {}
        };
      });

    res.json({ users: result });
  });

  // Admin Route: Reset specific test progress
  app.post('/api/admin/reset-user', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'shreevathsa2k21@gmail.com') {
      res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
      return;
    }

    const { email, testId } = req.body;
    if (!email || !testId) {
      res.status(400).json({ error: 'Email and testId parameters are required.' });
      return;
    }

    const db = readDb();
    const normalizedEmail = email.toLowerCase().trim();

    if (db.progress[normalizedEmail] && db.progress[normalizedEmail][testId]) {
      db.progress[normalizedEmail][testId] = {
        testId,
        currentVideoIndex: 0,
        submissions: {},
        skipCount: 0,
        isTimerRunning: false,
        elapsedBeforePause: 0,
        status: 'not_started'
      };
      writeDb(db);
      res.json({ success: true, message: `Test reset successfully.` });
    } else {
      res.status(404).json({ error: 'Progress record not found.' });
    }
  });

  // Admin Route: Seed mock creator
  app.post('/api/admin/seed-mock-creator', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'shreevathsa2k21@gmail.com') {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const db = readDb();
    const mockEmail = 'designer.alex@example.com';
    
    db.users[mockEmail] = {
      id: 'usr_mockalex',
      firstName: 'Alex Rivera',
      email: mockEmail,
      phone: '+14155552671',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      role: 'creator',
      passwordHash: 'alex123'
    };

    if (!db.progress[mockEmail]) {
      db.progress[mockEmail] = {};
    }

    db.progress[mockEmail]['classic-test'] = {
      testId: 'classic-test',
      currentVideoIndex: 4,
      skipCount: 1,
      isTimerRunning: false,
      elapsedBeforePause: 320,
      status: 'completed',
      submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      finalPrompts: 'Clip 1: "neon cityscape, hyperrealistic unreal engine rendering, reflections in rain puddles, 8k"\nClip 2: Skipped\nClip 3: "drone flight through cloud city ruins, vaporwave skies, extremely detailed architectural geometry, cinematic lighting"\nClip 4: "vibrant paint liquids splash in zero gravity forming fluid ribbon dancer, motion design, slow motion studio capture"',
      finalTools: 'Runway Gen-3 Alpha, Midjourney v6, Luma Dream Machine',
      finalExplanation: 'For the cyberpunk scene, I generated the base image using Midjourney v6 and brought it into Runway Gen-3 Alpha using motion brush configurations. For the liquid dancer clip, I leveraged Luma Dream Machine with exact physical prompts to simulate true hydrodynamic particle collision.',
      submissions: {
        'vid_1': {
          videoId: 'vid_1',
          status: 'completed',
          elapsedSeconds: 125,
          uploadedVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-subway-station-with-neon-lights-43956-large.mp4',
          uploadedFileName: 'cyberpunk_streets_runway.mp4',
          completedAt: new Date(Date.now() - 3600000 * 3).toISOString()
        },
        'vid_2': {
          videoId: 'vid_2',
          status: 'skipped',
          elapsedSeconds: 0
        },
        'vid_3': {
          videoId: 'vid_3',
          status: 'completed',
          elapsedSeconds: 195,
          uploadedVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-thick-clouds-below-mountain-peaks-41584-large.mp4',
          uploadedFileName: 'cloud_city_luma.mp4',
          completedAt: new Date(Date.now() - 3600000 * 2.5).toISOString()
        }
      }
    };

    writeDb(db);
    res.json({ success: true, message: 'Mock creator seeded successfully for classic-test.' });
  });

  // --- INTEGRATION OF FRONTEND BUILD OR DEV SERVER ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Skill test] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot failure:', err);
});
