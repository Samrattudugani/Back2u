// // Auto-detect API base URL — works on localhost AND Railway/GitHub Pages
// const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
//   ? 'http://localhost:3000/api'
//   : 'https://back2u-production.up.railway.app/api';
// const SERVER_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
//   ? 'http://localhost:3000'
//   : 'https://back2u-production.up.railway.app';
// Auto-detect API URL
const API_BASE =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : 'https://back2u-m3uj.onrender.com/api';

const SERVER_BASE =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://back2u-m3uj.onrender.com';
let currentUserId = null;
let currentUsername = null;
let currentPhone = null;
let allPosts = [];
let currentChatPostId = null;
let currentChatReceiverId = null;
let currentChatReceiverName = null;
let lastDeletedPost = null;

// ===== POST.HTML INIT =====
if (window.location.pathname.includes('post.html')) {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    window.location.href = 'index.html';
  } else {
    currentUserId = userId;
    currentUsername = localStorage.getItem('username');
    currentPhone = localStorage.getItem('phone');
    const profileDisplay = document.getElementById('profileDisplay');
    if (profileDisplay) profileDisplay.innerText = `${currentUsername || 'User'}`;
    fetchPosts();
  }
}

// ===== IMAGE UPLOAD PREVIEW =====
if (document.getElementById('postImage')) {
  document.getElementById('postImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = document.getElementById('imagePreview');
        preview.src = event.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });
}

// ===== AUTH (login.html support) =====
function toggleForms() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const toggleText = document.getElementById('toggleText');
  if (registerForm && registerForm.style.display === 'none') {
    if (loginForm) loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    if (toggleText) toggleText.innerHTML = 'Already have an account? <a onclick="toggleForms()">Sign In</a>';
  } else {
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (toggleText) toggleText.innerHTML = 'Don\'t have an account? <a onclick="toggleForms()">Sign Up</a>';
  }
}

// Login Handler (login.html)
if (document.getElementById('loginForm') && !window.location.pathname.includes('index.html')) {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('username', data.username);
        localStorage.setItem('phone', data.phone);
        if (errorDiv) errorDiv.style.display = 'none';
        window.location.href = 'post.html';
      } else {
        if (errorDiv) { errorDiv.innerHTML = data.message || 'Login failed'; errorDiv.style.display = 'block'; }
      }
    } catch (err) {
      if (errorDiv) { errorDiv.innerHTML = 'Cannot connect to server.'; errorDiv.style.display = 'block'; }
    }
  });
}

// Forgot password (login.html)
const forgotLink = document.getElementById('forgotLink');
if (forgotLink) {
  forgotLink.addEventListener('click', () => {
    const lf = document.getElementById('loginForm');
    const rs = document.getElementById('resetSection');
    if (lf) lf.style.display = 'none';
    if (rs) rs.style.display = 'block';
  });
}

const backToLogin = document.getElementById('backToLogin');
if (backToLogin) {
  backToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    const lf = document.getElementById('loginForm');
    const rs = document.getElementById('resetSection');
    if (rs) rs.style.display = 'none';
    if (lf) lf.style.display = 'block';
  });
}

const sendOtpBtn = document.getElementById('sendOtpBtn');
if (sendOtpBtn) {
  sendOtpBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;
    if (!email) { alert('Please enter your email'); return; }
    try {
      const res = await fetch(`${API_BASE}/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (res.ok) alert('OTP sent to your email');
      else alert(data.message || 'Failed to send OTP');
    } catch (err) { alert('Cannot connect to server.'); }
  });
}

const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;
    const otp = document.getElementById('resetOTP').value;
    const newPassword = document.getElementById('resetNewPassword').value;
    if (!email || !otp || !newPassword) { alert('Please fill all fields'); return; }
    try {
      const res = await fetch(`${API_BASE}/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp, newPassword }) });
      const data = await res.json();
      if (res.ok) { alert('Password reset! You may now login.'); if (backToLogin) backToLogin.click(); }
      else alert(data.message || 'Reset failed');
    } catch (err) { alert('Cannot connect to server.'); }
  });
}

// Register Handler (login.html)
if (document.getElementById('registerForm') && !window.location.pathname.includes('index.html')) {
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, phone, password })
      });
      const data = await response.json();
      if (response.ok) {
        if (successDiv) { successDiv.innerHTML = '✅ Registration successful! You can now login.'; successDiv.style.display = 'block'; }
        if (errorDiv) errorDiv.style.display = 'none';
        setTimeout(() => {
          toggleForms();
          document.getElementById('registerForm').reset();
          if (successDiv) successDiv.style.display = 'none';
        }, 2000);
      } else {
        if (errorDiv) { errorDiv.innerHTML = data.message || 'Registration failed'; errorDiv.style.display = 'block'; }
        if (successDiv) successDiv.style.display = 'none';
      }
    } catch (err) {
      if (errorDiv) { errorDiv.innerHTML = 'Cannot connect to server.'; errorDiv.style.display = 'block'; }
    }
  });
}

function logout() {
  localStorage.removeItem('userId');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('username');
  localStorage.removeItem('phone');
  window.location.href = 'index.html';
}

// ===== POSTS =====
async function fetchPosts() {
  try {
    const response = await fetch(`${API_BASE}/posts`);
    const data = await response.json();
    allPosts = data;
    displayPosts(allPosts);
    const lbl = document.getElementById('postCountLabel');
    if (lbl) lbl.textContent = allPosts.length + ' item' + (allPosts.length !== 1 ? 's' : '');
  } catch (err) {
    const grid = document.getElementById('postsGrid');
    if (grid) grid.innerHTML = '<div class="no-posts">Error loading posts. Make sure server is running.</div>';
  }
}


// function displayPosts(posts) {
//   const grid = document.getElementById('postsGrid');
//   if (!grid) return;
//   if (posts.length === 0) { grid.innerHTML = '<div class="no-posts">No posts yet. Be the first to post!</div>'; return; }

//   grid.innerHTML = posts.map(post => {
//     let whatsappLink = '';
//     if (post.userPhone) {
//       const digits = post.userPhone.replace(/[^0-9]/g, '');
//       if (digits.length > 0) whatsappLink = `https://wa.me/${digits}`;
//     }
//     return `
//     <div class="post-card">
//       ${post.image
//         ? `<img src="${SERVER_BASE}${post.image}" class="post-image" onerror="this.outerHTML='<div class=post-no-image>📷</div>'">`
//         : '<div class="post-no-image">📦</div>'}
//       <div class="post-body">
//         <h3>${escapeHtml(post.title)}</h3>
//         <div class="post-info">
//           <p>📝 ${escapeHtml(post.description || 'No description')}</p>
//           <p>📍 ${escapeHtml(post.description ? post.description.split('|')[1]?.trim().replace('Location: ','') || 'Not specified' : 'Not specified')}</p>
//         </div>
//         <div class="post-contact">
//           <strong>👤 Contact Info</strong>
//           <p><b>Name:</b> ${escapeHtml(post.userName || 'Anonymous')}</p>
//           <p><b>Phone:</b> ${escapeHtml(post.userPhone || 'Not provided')}</p>
//           <p><b>Email:</b> ${escapeHtml(post.userEmail || 'Not provided')}</p>
//         </div>
//         <div class="post-actions">
//           <button class="chat-btn" onclick="openChat('${post._id}','${escapeHtml(post.userName)}','${escapeHtml(post.userEmail)}')">💬 Message</button>
//           ${whatsappLink ? `<a href="${whatsappLink}" target="_blank" class="found-btn" style="text-align:center;text-decoration:none;">📱 WhatsApp</a>` : ''}
//           <button class="found-btn" onclick="markFound('${post._id}')">✅ Mark as Found</button>
//         </div>
//         <p class="post-date">📅 ${new Date(post.createdAt).toLocaleDateString()} ${new Date(post.createdAt).toLocaleTimeString()}</p>
//       </div>
//     </div>`;
//   }).join('');
// }

function displayPosts(posts) {
const grid = document.getElementById('postsGrid');
if (!grid) return;

if (posts.length === 0) {
grid.innerHTML = '<div class="no-posts">No posts yet. Be the first to post!</div>';
return;
}

grid.innerHTML = posts.map(post => {
let whatsappLink = '';


if (post.userPhone) {
  const digits = post.userPhone.replace(/[^0-9]/g, '');
  if (digits.length > 0) {
    whatsappLink = `https://wa.me/${digits}`;
  }
}

return `
<div class="post-card">

  ${post.image
    ? `<img src="${SERVER_BASE}${post.image}" class="post-image"
       onerror="this.outerHTML='<div class=post-no-image>📷</div>'">`
    : '<div class="post-no-image">📦</div>'}

  ${post.found ? `
  <div style="
    background:green;
    color:white;
    text-align:center;
    padding:10px;
    font-weight:bold;
  ">
    ✅ ITEM FOUND
  </div>
  ` : ''}

  <div class="post-body">

    <h3>${escapeHtml(post.title)}</h3>

    <div class="post-info">
      <p>📝 ${escapeHtml(post.description || 'No description')}</p>
      <p>📍 ${escapeHtml(
        post.description
          ? post.description.split('|')[1]?.trim().replace('Location: ', '') || 'Not specified'
          : 'Not specified'
      )}</p>
    </div>

    <div class="post-contact">
      <strong>👤 Contact Info</strong>
      <p><b>Name:</b> ${escapeHtml(post.userName || 'Anonymous')}</p>
      <p><b>Phone:</b> ${escapeHtml(post.userPhone || 'Not provided')}</p>
      <p><b>Email:</b> ${escapeHtml(post.userEmail || 'Not provided')}</p>
    </div>

    <div class="post-actions">

      ${!post.found ? `
        <button class="chat-btn"
          onclick="openChat('${post._id}','${escapeHtml(post.userName)}','${escapeHtml(post.userEmail)}')">
          💬 Message
        </button>
      ` : ''}

      ${!post.found && whatsappLink
        ? `<a href="${whatsappLink}" target="_blank"
            class="found-btn"
            style="text-align:center;text-decoration:none;">
            📱 WhatsApp
           </a>`
        : ''}

      ${!post.found
        ? `<button class="found-btn"
            onclick="markFound('${post._id}')">
            ✅ Mark as Found
           </button>`
        : `<div style="
            background:green;
            color:white;
            padding:10px;
            border-radius:8px;
            text-align:center;
            font-weight:bold;">
            FOUND
           </div>`
      }

    </div>

    <p class="post-date">
      📅 ${new Date(post.createdAt).toLocaleDateString()}
      ${new Date(post.createdAt).toLocaleTimeString()}
    </p>

  </div>
</div>`;


}).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function refreshPosts() { fetchPosts(); }

// ===== MARK FOUND =====
async function markFound(postId) {
  const post = allPosts.find(p => p._id === postId);
  if (!post) return;
  try {
    const res = await fetch(`${API_BASE}/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) {
      lastDeletedPost = post;
      allPosts = allPosts.filter(p => p._id !== postId);
      displayPosts(allPosts);
      showUndoPopup();
    } else alert('Failed to mark as found');
  } catch (err) { alert('Error: ' + err.message); }
}

function showUndoPopup() {
  const container = document.getElementById('undoPopup');
  container.innerHTML = `Item marked as found. <button class="restore-btn" onclick="restorePost()">Undo</button><button class="cancel-btn" onclick="hideUndo()">Dismiss</button>`;
  container.style.display = 'flex';
}

function hideUndo() {
  const container = document.getElementById('undoPopup');
  container.style.display = 'none';
  lastDeletedPost = null;
}

async function restorePost() {
  if (!lastDeletedPost) return;
  try {
    const copy = { ...lastDeletedPost };
    delete copy._id;
    const res = await fetch(`${API_BASE}/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(copy) });
    if (res.ok) { hideUndo(); fetchPosts(); }
    else alert('Restore failed');
  } catch (err) { alert('Error: ' + err.message); }
}

// ===== SEARCH =====
if (document.getElementById('searchBar')) {
  document.getElementById('searchBar').addEventListener('keyup', () => {
    const term = document.getElementById('searchBar').value.toLowerCase();
    const filtered = allPosts.filter(p => p.title.toLowerCase().includes(term) || (p.description && p.description.toLowerCase().includes(term)));
    displayPosts(filtered);
  });
}

function resetSearch() {
  if (document.getElementById('searchBar')) document.getElementById('searchBar').value = '';
  displayPosts(allPosts);
}

// ===== POST FORM =====
function togglePostForm() {
  const form = document.getElementById('postFormSection');
  if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

if (document.getElementById('postForm')) {
  document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('username');
    const userPhone = localStorage.getItem('phone');
    const userEmail = localStorage.getItem('userEmail');
    if (!userId) { alert('Please login first!'); window.location.href = 'index.html'; return; }

    const title = document.getElementById('postTitle').value;
    const description = document.getElementById('postDescription').value;
    const location = document.getElementById('postLocation').value;
    const phoneInput = document.getElementById('postPhone').value.trim();
    const imageFile = document.getElementById('postImage').files[0];

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', `${description} | Location: ${location}`);
    formData.append('userId', userId);
    formData.append('userName', userName);
    formData.append('userPhone', phoneInput || userPhone);
    formData.append('userEmail', userEmail);
    if (imageFile) formData.append('image', imageFile);

    try {
      const response = await fetch(`${API_BASE}/posts`, { method: 'POST', body: formData });
      if (response.ok) {
        document.getElementById('postForm').reset();
        document.getElementById('imagePreview').style.display = 'none';
        togglePostForm();
        fetchPosts();
      } else { const data = await response.json().catch(()=>({})); alert('Error: ' + (data.message || response.status)); }
    } catch (err) { alert('Error: ' + err.message); }
  });
}

// ===== CHAT =====
function openChat(postId, userName, userEmail) {
  const userId = localStorage.getItem('userId');
  if (!userId) { alert('Please login first!'); window.location.href = 'index.html'; return; }

  const post = allPosts.find(p => p._id === postId);
  if (post && post.userPhone) {
    const digits = post.userPhone.replace(/[^0-9]/g, '');
    if (digits.length > 0) { window.open(`https://wa.me/${digits}`, '_blank'); return; }
  }

  currentChatPostId = postId;
  currentChatReceiverId = post ? post.userId : null;
  currentChatReceiverName = userName;

  document.getElementById('chatTitle').innerHTML = `💬 Chat with ${escapeHtml(userName)}`;
  document.getElementById('chatModal').style.display = 'block';
  document.getElementById('chatMessages').innerHTML = '';
  document.getElementById('chatInput').value = '';
  loadChatMessages();
}

function closeChat() { document.getElementById('chatModal').style.display = 'none'; }

async function loadChatMessages() {
  const userId = localStorage.getItem('userId');
  try {
    const response = await fetch(`${API_BASE}/messages/${currentChatPostId}/${userId}`);
    const messages = await response.json();
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = messages.map(msg => {
      const isOwn = msg.senderId === userId;
      return `<div class="chat-message ${isOwn ? 'message-sent' : 'message-received'}">
        <div class="message-text">${escapeHtml(msg.message)}</div>
        <div class="message-time">${new Date(msg.createdAt).toLocaleTimeString()}</div>
      </div>`;
    }).join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (err) { console.error('Error loading messages:', err); }
}

async function sendMessage() {
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  const message = document.getElementById('chatInput').value.trim();
  if (!message) return;
  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: userId, senderName: username, receiverId: currentChatReceiverId, receiverName: currentChatReceiverName, postId: currentChatPostId, message })
    });
    if (response.ok) { document.getElementById('chatInput').value = ''; loadChatMessages(); }
  } catch (err) { alert('Error sending message: ' + err.message); }
}

if (document.getElementById('chatInput')) {
  document.getElementById('chatInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
}

// ===== PROFILE =====
function showProfile() {
  const username = localStorage.getItem('username') || '';
  const email = localStorage.getItem('userEmail') || '';
  const phone = localStorage.getItem('phone') || '';
  const userId = localStorage.getItem('userId');

  document.getElementById('editUsername').value = username;
  document.getElementById('editEmail').value = email;
  document.getElementById('editPhone').value = phone;

  fetch(`${API_BASE.replace('/api','')}/api/user/${userId}`)
    .then(r => r.json())
    .then(data => {
      if (data.createdAt) {
        document.getElementById('profileDetails').innerHTML = `<p><b>Member since:</b> ${new Date(data.createdAt).toLocaleDateString()}</p><p><b>User ID:</b> ${userId}</p>`;
      }
    }).catch(() => {});

  document.getElementById('profileModal').style.display = 'flex';
}

function saveProfile() {
  const userId = localStorage.getItem('userId');
  const username = document.getElementById('editUsername').value;
  const phone = document.getElementById('editPhone').value;
  fetch(`${API_BASE}/user/${userId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, phone })
  }).then(r => r.json()).then(data => {
    if (data.message === 'User updated') {
      localStorage.setItem('username', username);
      localStorage.setItem('phone', phone);
      const pd = document.getElementById('profileDisplay');
      if (pd) pd.innerText = username;
      closeProfile();
    } else alert('Error updating profile');
  }).catch(() => alert('Cannot connect to server.'));
}

function closeProfile() { document.getElementById('profileModal').style.display = 'none'; }
function closeProfileOnBackground(event) { if (event.target === document.getElementById('profileModal')) closeProfile(); }

window.onclick = function(event) {
  const modal = document.getElementById('chatModal');
  if (event.target === modal) closeChat();
};