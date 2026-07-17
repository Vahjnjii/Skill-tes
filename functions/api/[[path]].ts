/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface Env {
  DB: KVNamespace;
  UPLOADS?: KVNamespace;
  UPLOADS_BUCKET?: R2Bucket;
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
  progress: Record<string, Record<string, any>>;
  tests: Test[];
}

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

async function getDb(env: Env): Promise<DBStructure> {
  if (!env.DB) {
    return defaultDb;
  }
  const state = await env.DB.get('db_state');
  if (!state) {
    await env.DB.put('db_state', JSON.stringify(defaultDb));
    return defaultDb;
  }
  const parsed = JSON.parse(state);
  if (!parsed.tests) {
    parsed.tests = defaultDb.tests;
  }
  if (!parsed.progress) {
    parsed.progress = {};
  }
  return parsed;
}

async function saveDb(env: Env, db: DBStructure): Promise<void> {
  if (env.DB) {
    await env.DB.put('db_state', JSON.stringify(db));
  }
}

function getUserProgressForTest(db: DBStructure, email: string, testId: string) {
  if (!db.progress[email]) {
    db.progress[email] = {};
  }
  
  const candidateRecord = db.progress[email];
  if (candidateRecord.currentVideoIndex !== undefined) {
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

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*'
    }
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Handle preflight OPTIONS
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*'
      }
    });
  }

  try {
    const db = await getDb(env);

    // 1. Google Auth Callback
    if (path === '/api/auth/google-callback' && method === 'POST') {
      const body: any = await request.json();
      const { email } = body;
      if (!email) {
        return jsonResponse({ error: 'Email parameter is required.' }, 400);
      }
      const normalizedEmail = email.toLowerCase().trim();
      let user = db.users[normalizedEmail];

      if (!user) {
        const role = (normalizedEmail === 'shreevathsa2k21@gmail.com' ? 'admin' : 'creator');
        user = {
          id: 'usr_' + Math.random().toString(36).substring(2, 11),
          firstName: '',
          email: normalizedEmail,
          phone: '',
          createdAt: new Date().toISOString(),
          role,
          passwordHash: 'google_federated_auth'
        };
        db.users[normalizedEmail] = user;
        await saveDb(env, db);
      }

      const progress = getUserProgressForTest(db, normalizedEmail, 'classic-test');
      const { passwordHash, ...userResponse } = user;
      return jsonResponse({ user: userResponse, progress });
    }

    // 2. Profile update onboarding
    if (path === '/api/user/update-profile' && method === 'POST') {
      const body: any = await request.json();
      const { email, firstName, phone } = body;
      if (!email || !firstName || !phone) {
        return jsonResponse({ error: 'Email, firstName, and phone parameters are required.' }, 400);
      }
      const normalizedEmail = email.toLowerCase().trim();
      const user = db.users[normalizedEmail];
      if (!user) {
        return jsonResponse({ error: 'User not found.' }, 404);
      }
      user.firstName = firstName.trim();
      user.phone = phone.trim();
      db.users[normalizedEmail] = user;
      await saveDb(env, db);

      const { passwordHash, ...userResponse } = user;
      return jsonResponse({ user: userResponse });
    }

    // 3. Register (manual fallback)
    if (path === '/api/auth/register' && method === 'POST') {
      const body: any = await request.json();
      const { firstName, email, password, phone } = body;
      if (!firstName || !email || !password || !phone) {
        return jsonResponse({ error: 'All fields are required.' }, 400);
      }
      const normalizedEmail = email.toLowerCase().trim();
      if (db.users[normalizedEmail]) {
        return jsonResponse({ error: 'A user with this email already exists.' }, 400);
      }
      const role = (normalizedEmail === 'shreevathsa2k21@gmail.com' ? 'admin' : 'creator');
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
      await saveDb(env, db);

      const progress = getUserProgressForTest(db, normalizedEmail, 'classic-test');
      const { passwordHash, ...userResponse } = newUser;
      return jsonResponse({ user: userResponse, progress }, 201);
    }

    // 4. Login (manual fallback)
    if (path === '/api/auth/login' && method === 'POST') {
      const body: any = await request.json();
      const { email, password } = body;
      if (!email || !password) {
        return jsonResponse({ error: 'Email and password are required.' }, 400);
      }
      const normalizedEmail = email.toLowerCase().trim();
      let user = db.users[normalizedEmail];

      if (!user && normalizedEmail === 'shreevathsa2k21@gmail.com') {
        const defaultAdmin = defaultDb.users['shreevathsa2k21@gmail.com'];
        db.users[normalizedEmail] = defaultAdmin;
        await saveDb(env, db);
        const progress = getUserProgressForTest(db, normalizedEmail, 'classic-test');
        const { passwordHash, ...userResponse } = defaultAdmin;
        return jsonResponse({ user: userResponse, progress });
      }

      if (!user || user.passwordHash !== password) {
        return jsonResponse({ error: 'Invalid email or password.' }, 401);
      }

      const progress = getUserProgressForTest(db, normalizedEmail, 'classic-test');
      const { passwordHash, ...userResponse } = user;
      return jsonResponse({ user: userResponse, progress });
    }

    // 5. Fetch Tests list
    if (path === '/api/tests' && method === 'GET') {
      return jsonResponse({ tests: db.tests || [] });
    }

    // 6. Fetch progress
    if (path === '/api/test/progress' && method === 'GET') {
      const email = url.searchParams.get('email');
      const testId = url.searchParams.get('testId');
      if (!email || !testId) {
        return jsonResponse({ error: 'Missing email or testId.' }, 400);
      }
      const normalizedEmail = email.toLowerCase().trim();
      const progress = getUserProgressForTest(db, normalizedEmail, testId);
      return jsonResponse({ progress });
    }

    // 7. Save test progress
    if (path === '/api/test/save-progress' && method === 'POST') {
      const body: any = await request.json();
      const { email, progress } = body;
      if (!email || !progress || !progress.testId) {
        return jsonResponse({ error: 'Missing required parameters.' }, 400);
      }
      const normalizedEmail = email.toLowerCase().trim();
      const testId = progress.testId;

      if (!db.users[normalizedEmail]) {
        return jsonResponse({ error: 'User not found.' }, 404);
      }

      if (!db.progress[normalizedEmail]) {
        db.progress[normalizedEmail] = {};
      }

      db.progress[normalizedEmail][testId] = {
        ...db.progress[normalizedEmail][testId],
        ...progress
      };
      await saveDb(env, db);

      return jsonResponse({ success: true, progress: db.progress[normalizedEmail][testId] });
    }

    // 8. Upload assessment video (base64)
    if (path === '/api/test/upload-video' && method === 'POST') {
      const body: any = await request.json();
      const { email, testId, videoId, fileName, base64Data, elapsedSeconds } = body;

      if (!email || !testId || !videoId || !fileName || !base64Data) {
        return jsonResponse({ error: 'Missing required parameters.' }, 400);
      }

      const normalizedEmail = email.toLowerCase().trim();
      if (!db.users[normalizedEmail]) {
        return jsonResponse({ error: 'User not found.' }, 404);
      }

      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      const binaryString = atob(cleanBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const safeEmail = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const finalFileName = `${safeEmail}_${testId}_${videoId}_${safeFileName}`;

      let fileUrl = '';

      // Upload to R2 Bucket if provisioned
      if (env.UPLOADS_BUCKET) {
        await env.UPLOADS_BUCKET.put(finalFileName, bytes, {
          httpMetadata: { contentType: 'video/mp4' }
        });
        fileUrl = `/uploads/${finalFileName}`;
      } else if (env.UPLOADS) {
        // Fallback to KV Namespace
        await env.UPLOADS.put(finalFileName, bytes.buffer);
        fileUrl = `/uploads/${finalFileName}`;
      } else {
        // In-memory base64 placeholder link as direct fallback if zero storage configured
        fileUrl = `data:video/mp4;base64,${cleanBase64}`;
      }

      const userProgress = getUserProgressForTest(db, normalizedEmail, testId);
      userProgress.submissions[videoId] = {
        videoId,
        status: 'completed',
        elapsedSeconds: elapsedSeconds || 0,
        uploadedVideoUrl: fileUrl,
        uploadedFileName: fileName,
        completedAt: new Date().toISOString()
      };

      db.progress[normalizedEmail][testId] = userProgress;
      await saveDb(env, db);

      return jsonResponse({ success: true, uploadedVideoUrl: fileUrl, progress: userProgress });
    }

    // 9. Admin: Create New Test
    if (path === '/api/admin/create-test' && method === 'POST') {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== 'shreevathsa2k21@gmail.com') {
        return jsonResponse({ error: 'Access denied. Administrator privileges required.' }, 403);
      }

      const body: any = await request.json();
      const { title, description, videos } = body;
      if (!title || !description || !videos || !Array.isArray(videos)) {
        return jsonResponse({ error: 'Missing parameters.' }, 400);
      }

      const newTest: Test = {
        id: 'test_' + Math.random().toString(36).substring(2, 11),
        title: title.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString(),
        videos: videos.map((v: any, idx: number) => ({
          id: v.id || `vid_${Date.now()}_${idx}`,
          title: v.title.trim(),
          description: v.description.trim(),
          referenceVideoUrl: v.referenceVideoUrl,
          promptSuggestion: v.promptSuggestion.trim()
        }))
      };

      db.tests.push(newTest);
      await saveDb(env, db);

      return jsonResponse({ success: true, test: newTest }, 201);
    }

    // 10. Admin: Upload Reference Video
    if (path === '/api/admin/upload-reference-video' && method === 'POST') {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== 'shreevathsa2k21@gmail.com') {
        return jsonResponse({ error: 'Access denied. Administrator privileges required.' }, 403);
      }

      const body: any = await request.json();
      const { fileName, base64Data } = body;
      if (!fileName || !base64Data) {
        return jsonResponse({ error: 'Missing parameters.' }, 400);
      }

      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      const binaryString = atob(cleanBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const safeName = `ref_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      let fileUrl = '';

      if (env.UPLOADS_BUCKET) {
        await env.UPLOADS_BUCKET.put(safeName, bytes, {
          httpMetadata: { contentType: 'video/mp4' }
        });
        fileUrl = `/uploads/${safeName}`;
      } else if (env.UPLOADS) {
        await env.UPLOADS.put(safeName, bytes.buffer);
        fileUrl = `/uploads/${safeName}`;
      } else {
        fileUrl = `data:video/mp4;base64,${cleanBase64}`;
      }

      return jsonResponse({ success: true, url: fileUrl });
    }

    // 11. Admin: Get all Creators
    if (path === '/api/admin/users' && method === 'GET') {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== 'shreevathsa2k21@gmail.com') {
        return jsonResponse({ error: 'Access denied. Administrator privileges required.' }, 403);
      }

      const result = Object.keys(db.users)
        .filter(email => email !== 'shreevathsa2k21@gmail.com')
        .map(email => {
          const { passwordHash, ...userSafe } = db.users[email];
          return {
            user: userSafe,
            progressMap: db.progress[email] || {}
          };
        });

      return jsonResponse({ users: result });
    }

    // 12. Admin: Reset user test progress
    if (path === '/api/admin/reset-user' && method === 'POST') {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== 'shreevathsa2k21@gmail.com') {
        return jsonResponse({ error: 'Access denied. Administrator privileges required.' }, 403);
      }

      const body: any = await request.json();
      const { email, testId } = body;
      if (!email || !testId) {
        return jsonResponse({ error: 'Email and testId are required.' }, 400);
      }

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
        await saveDb(env, db);
        return jsonResponse({ success: true, message: 'Test reset successfully.' });
      }
      return jsonResponse({ error: 'Progress record not found.' }, 404);
    }

    // 13. Seed mock creator
    if (path === '/api/admin/seed-mock-creator' && method === 'POST') {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== 'shreevathsa2k21@gmail.com') {
        return jsonResponse({ error: 'Access denied.' }, 403);
      }

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

      await saveDb(env, db);
      return jsonResponse({ success: true, message: 'Mock creator seeded successfully for classic-test.' });
    }

    return jsonResponse({ error: 'Not Found' }, 404);
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Internal Server Error' }, 500);
  }
};
