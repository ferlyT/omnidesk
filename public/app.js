// ==========================================
// Omnichannel Multi-Agent Single Page Application
// ==========================================

// ==========================================
// 00. MODERN THEME & COLOR PALETTE ENGINE
// ==========================================
const THEME_KEY = 'omni_theme';
const COLOR_KEY = 'omni_color_theme';

const COLOR_PALETTES = {
  indigo: {
    name: 'Indigo Classic',
    dotHex: '#4F46E5',
    shades: { 50: '238 242 255', 100: '224 231 255', 200: '199 210 254', 300: '165 180 252', 400: '129 140 248', 500: '99 102 241', 600: '79 70 229', 700: '67 56 202', 800: '55 48 163', 900: '49 46 129', 950: '30 27 75' }
  },
  emerald: {
    name: 'Emerald Mint',
    dotHex: '#059669',
    shades: { 50: '236 253 245', 100: '209 250 229', 200: '167 243 208', 300: '110 231 183', 400: '52 211 153', 500: '16 185 129', 600: '5 150 105', 700: '4 120 87', 800: '6 95 70', 900: '6 78 59', 950: '2 44 34' }
  },
  sky: {
    name: 'Ocean Azure',
    dotHex: '#0284C7',
    shades: { 50: '240 249 255', 100: '224 242 254', 200: '186 230 253', 300: '125 211 252', 400: '56 189 248', 500: '14 165 233', 600: '2 132 199', 700: '3 105 161', 800: '7 89 133', 900: '12 74 110', 950: '8 47 73' }
  },
  violet: {
    name: 'Royal Violet',
    dotHex: '#7C3AED',
    shades: { 50: '245 243 255', 100: '237 233 254', 200: '221 214 254', 300: '196 181 253', 400: '167 139 250', 500: '139 92 246', 600: '124 58 237', 700: '109 40 217', 800: '91 33 182', 900: '76 29 149', 950: '46 16 101' }
  },
  amber: {
    name: 'Sunset Amber',
    dotHex: '#D97706',
    shades: { 50: '255 251 235', 100: '254 243 199', 200: '253 230 138', 300: '252 211 77', 400: '251 191 36', 500: '245 158 11', 600: '217 119 6', 700: '180 83 9', 800: '146 64 14', 900: '120 53 15', 950: '69 26 3' }
  },
  slate: {
    name: 'Slate Minimal',
    dotHex: '#475569',
    shades: { 50: '248 250 252', 100: '241 245 249', 200: '226 232 240', 300: '203 213 225', 400: '148 163 184', 500: '100 116 139', 600: '71 85 105', 700: '51 65 85', 800: '30 41 59', 900: '15 23 42', 950: '2 6 23' }
  }
};

let currentTheme = localStorage.getItem(THEME_KEY) || 'system';
let currentColorTheme = localStorage.getItem(COLOR_KEY) || 'indigo';

function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  document.documentElement.classList.toggle('dark', isDark);
  highlightThemeModalOptions();
}

function setThemeMode(mode) {
  applyTheme(mode);
  const labels = { light: 'Mode Terang Aktif', dark: 'Mode Gelap Aktif', system: 'Mode Mengikuti Sistem Operasi' };
  showToast(labels[mode] || 'Mode Tampilan Diperbarui', 'info');
}

function setColorTheme(themeKey, silent = false) {
  if (!COLOR_PALETTES[themeKey]) themeKey = 'indigo';
  currentColorTheme = themeKey;
  localStorage.setItem(COLOR_KEY, themeKey);

  const p = COLOR_PALETTES[themeKey];
  let rootCss = ':root {';
  for (const [k, v] of Object.entries(p.shades)) {
    rootCss += `--color-indigo-${k}: ${v};`;
  }
  rootCss += '}';

  let style = document.getElementById('omniThemeVars');
  if (!style) {
    style = document.createElement('style');
    style.id = 'omniThemeVars';
    document.head.appendChild(style);
  }
  style.textContent = rootCss;

  const dot = document.getElementById('themeDotIndicator');
  if (dot) dot.style.backgroundColor = p.dotHex;

  highlightThemeModalOptions();
  if (!silent) {
    showToast(`Palet warna diubah ke: ${p.name}`, 'info');
  }
}

function openThemeModal() {
  const modal = document.getElementById('themeModal');
  if (modal) modal.classList.remove('hidden');
  highlightThemeModalOptions();
  if (window.lucide) window.lucide.createIcons();
}

function closeThemeModal() {
  const modal = document.getElementById('themeModal');
  if (modal) modal.classList.add('hidden');
}

function highlightThemeModalOptions() {
  // 1. Highlight mode buttons
  ['light', 'dark', 'system'].forEach(m => {
    const btn = document.getElementById(`themeModeBtn_${m}`);
    if (btn) {
      if (m === currentTheme) {
        btn.className = 'flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold transition text-center cursor-pointer shadow-2xs';
      } else {
        btn.className = 'flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 transition text-center cursor-pointer';
      }
    }
  });

  // 2. Highlight palette buttons
  Object.keys(COLOR_PALETTES).forEach(k => {
    const btn = document.getElementById(`colorThemeBtn_${k}`);
    if (btn) {
      if (k === currentColorTheme) {
        btn.className = 'group flex flex-col p-3 rounded-2xl border-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-left transition cursor-pointer relative overflow-hidden ring-2 ring-indigo-500/20 shadow-2xs';
      } else {
        btn.className = 'group flex flex-col p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-left transition cursor-pointer relative overflow-hidden';
      }
    }
  });
}

// Watch system preference change when in 'system' mode
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });
}

let currentUser = null;
let currentToken = null;
let currentSocket = null;
let activeTicketId = null;
let activeTicketData = null;
let currentTicketTab = 'pool'; // 'pool' or 'my'
let currentInputMode = 'CUSTOMER'; // 'CUSTOMER' or 'WHISPER'
let allUsersList = [];

// ==========================================
// 0. MODERN TOAST & IN-APP MODAL SYSTEM
// ==========================================
function showToast(message, type = 'info', title = null) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const typeConfig = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100',
      icon: 'check-circle-2',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      defaultTitle: 'Berhasil'
    },
    error: {
      bg: 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-100',
      icon: 'alert-circle',
      iconColor: 'text-rose-600 dark:text-rose-400',
      defaultTitle: 'Terjadi Kesalahan'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100',
      icon: 'alert-triangle',
      iconColor: 'text-amber-600 dark:text-amber-400',
      defaultTitle: 'Peringatan'
    },
    info: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-100',
      icon: 'info',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      defaultTitle: 'Informasi'
    }
  };

  const cfg = typeConfig[type] || typeConfig.info;
  const toastId = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 6);

  const toastEl = document.createElement('div');
  toastEl.id = toastId;
  toastEl.className = `pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl transition-all duration-300 transform translate-y-2 opacity-0 ${cfg.bg}`;
  toastEl.innerHTML = `
    <div class="flex-shrink-0 mt-0.5 ${cfg.iconColor}">
      <i data-lucide="${cfg.icon}" class="w-5 h-5"></i>
    </div>
    <div class="flex-1 text-xs">
      <h4 class="font-bold mb-0.5">${title || cfg.defaultTitle}</h4>
      <p class="leading-relaxed text-slate-700 dark:text-slate-300">${escapeHtml(message)}</p>
    </div>
    <button onclick="dismissToast('${toastId}')" class="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(toastEl);
  if (window.lucide) window.lucide.createIcons();

  requestAnimationFrame(() => {
    toastEl.classList.remove('translate-y-2', 'opacity-0');
    toastEl.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    dismissToast(toastId);
  }, 3800);
}

function dismissToast(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('opacity-0', '-translate-y-2');
  setTimeout(() => {
    el.remove();
  }, 300);
}

function showModalPrompt({ title, description, placeholder = '', defaultValue = '', inputType = 'text', confirmText = 'Konfirmasi', cancelText = 'Batal' }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('customModalDialog');
    const titleEl = document.getElementById('modalTitle');
    const descEl = document.getElementById('modalDescription');
    const inputContainer = document.getElementById('modalInputContainer');
    const inputField = document.getElementById('modalInputField');
    const btnConfirm = document.getElementById('modalBtnConfirm');
    const btnCancel = document.getElementById('modalBtnCancel');
    const iconHolder = document.getElementById('modalIconHolder');
    const icon = document.getElementById('modalIcon');

    titleEl.textContent = title || 'Input Diperlukan';
    descEl.textContent = description || '';
    inputContainer.classList.remove('hidden');
    inputField.type = inputType;
    inputField.value = defaultValue;
    inputField.placeholder = placeholder;

    iconHolder.className = 'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-indigo-100 text-indigo-700';
    icon.setAttribute('data-lucide', 'edit-3');

    btnConfirm.textContent = confirmText;
    btnConfirm.className = 'px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs';
    btnCancel.textContent = cancelText;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => inputField.focus(), 60);

    const handleConfirm = () => {
      cleanup();
      resolve(inputField.value.trim());
    };

    const handleCancel = () => {
      cleanup();
      resolve(null);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    inputField.addEventListener('keydown', handleKeyDown);
    btnConfirm.onclick = handleConfirm;
    btnCancel.onclick = handleCancel;

    function cleanup() {
      modal.classList.add('hidden');
      inputContainer.classList.add('hidden');
      inputField.removeEventListener('keydown', handleKeyDown);
      btnConfirm.onclick = null;
      btnCancel.onclick = null;
    }
  });
}

function showModalConfirm({ title, description, confirmText = 'Konfirmasi', cancelText = 'Batal', isDanger = false }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('customModalDialog');
    const titleEl = document.getElementById('modalTitle');
    const descEl = document.getElementById('modalDescription');
    const inputContainer = document.getElementById('modalInputContainer');
    const btnConfirm = document.getElementById('modalBtnConfirm');
    const btnCancel = document.getElementById('modalBtnCancel');
    const iconHolder = document.getElementById('modalIconHolder');
    const icon = document.getElementById('modalIcon');

    titleEl.textContent = title || 'Konfirmasi';
    descEl.textContent = description || 'Apakah Anda yakin ingin melanjutkan tindakan ini?';
    inputContainer.classList.add('hidden');

    if (isDanger) {
      iconHolder.className = 'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-rose-100 text-rose-700';
      icon.setAttribute('data-lucide', 'alert-triangle');
      btnConfirm.className = 'px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition shadow-xs';
    } else {
      iconHolder.className = 'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-emerald-100 text-emerald-700';
      icon.setAttribute('data-lucide', 'help-circle');
      btnConfirm.className = 'px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs';
    }

    btnConfirm.textContent = confirmText;
    btnCancel.textContent = cancelText;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    btnConfirm.onclick = handleConfirm;
    btnCancel.onclick = handleCancel;

    function cleanup() {
      modal.classList.add('hidden');
      btnConfirm.onclick = null;
      btnCancel.onclick = null;
    }
  });
}

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentTheme);
  setColorTheme(currentColorTheme, true);
  setColorTheme(currentColorTheme, true);
  if (window.lucide) window.lucide.createIcons();
  checkAuth();
});

// ==========================================
// 1. AUTHENTICATION & LOGIN LOGIC
// ==========================================
function checkAuth() {
  const token = localStorage.getItem('omni_token');
  const user = localStorage.getItem('omni_user');

  if (token && user) {
    currentToken = token;
    currentUser = JSON.parse(user);
    initAuthenticatedSession();
  } else {
    showLoginModal();
  }
}

function showLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
}

function hideLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

async function quickLogin(username, password) {
  document.getElementById('loginUsername').value = username;
  document.getElementById('loginPassword').value = password;
  await performLogin(username, password);
}

async function handleManualLogin(e) {
  e.preventDefault();
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value.trim();
  await performLogin(u, p);
}

async function performLogin(username, password) {
  const errEl = document.getElementById('loginError');
  errEl.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!data.success) {
      errEl.textContent = data.message || 'Login gagal';
      errEl.classList.remove('hidden');
      return;
    }

    currentToken = data.token;
    currentUser = data.user;
    localStorage.setItem('omni_token', currentToken);
    localStorage.setItem('omni_user', JSON.stringify(currentUser));

    initAuthenticatedSession();
  } catch (err) {
    errEl.textContent = 'Gagal terhubung ke server';
    errEl.classList.remove('hidden');
  }
}

function logout() {
  localStorage.removeItem('omni_token');
  localStorage.removeItem('omni_user');
  if (currentSocket) currentSocket.disconnect();
  location.reload();
}

function initAuthenticatedSession() {
  hideLoginModal();

  // Update User Header Display & Avatar
  document.getElementById('userDisplayName').textContent = currentUser.display_alias || currentUser.username;
  document.getElementById('userRoleBadge').textContent = `${currentUser.role} • @${currentUser.username}`;
  
  const userAvatarEl = document.getElementById('userAvatar');
  const userInitials = (currentUser.display_alias || currentUser.username).slice(0, 2).toUpperCase();
  if (currentUser.avatar_url) {
    userAvatarEl.innerHTML = `
      <div class="w-full h-full rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white font-bold text-xs flex items-center justify-center overflow-hidden relative">
        <span>${userInitials}</span>
        <img src="${currentUser.avatar_url}" alt="" class="absolute inset-0 w-full h-full object-cover rounded-xl" onerror="this.remove()">
      </div>
    `;
  } else {
    userAvatarEl.textContent = userInitials;
  }

  // Dynamic Prefix Preview text
  document.getElementById('prefixPreviewText').textContent = `*[${currentUser.display_alias}]*:`;

  // Connect Socket.io
  initSocket();

  // Load accessible workspaces and populate switcher dropdown
  loadWorkspaces();

  // Load initial ticket list
  loadTickets();

  // If SPV or Admin, load SPV overview
  const navSpv = document.getElementById('navSupervisor');
  if (navSpv) {
    if (currentUser.role === 'SUPERVISOR' || currentUser.role === 'ADMIN') {
      navSpv.classList.remove('hidden');
      loadSupervisorData();
      loadUsers();
    } else {
      navSpv.classList.add('hidden');
    }
  }

  // If Admin, show User Management navigation
  const navUsers = document.getElementById('navUsers');
  if (navUsers) {
    if (currentUser.role === 'ADMIN') {
      navUsers.classList.remove('hidden');
      loadAdminRoles();
    } else {
      navUsers.classList.add('hidden');
    }
  }

  // Load channel status
  loadChannelData();

  // Initialize view state
  switchView('agent');
  applyTheme(currentTheme);
  setColorTheme(currentColorTheme, true);

  if (window.lucide) window.lucide.createIcons();
}

// ==========================================
// 2. SOCKET.IO REALTIME ENGINE
// ==========================================
function initSocket() {
  if (currentSocket) currentSocket.disconnect();

  currentSocket = io({
    auth: { token: currentToken }
  });

  currentSocket.on('connect', () => {
    console.log('[Socket] Connected to server hub');
  });

  currentSocket.on('ticket:new', (ticket) => {
    console.log('[Socket] New ticket received:', ticket);
    loadTickets();
    playNotificationSound();
  });

  currentSocket.on('ticket:claimed', (ticket) => {
    console.log('[Socket] Ticket claimed:', ticket);
    loadTickets();
  });

  currentSocket.on('message:new', ({ ticketId, message }) => {
    if (activeTicketId === ticketId) {
      appendMessageToChat(message);
    }
    loadTickets();
  });

  currentSocket.on('ticket:internal_note', ({ ticketId, note }) => {
    if (activeTicketId === ticketId) {
      appendInternalNoteToChat(note);
    }
  });

  currentSocket.on('ticket:updated', (ticket) => {
    loadTickets();
    if (activeTicketId === ticket.id) {
      selectTicket(ticket.id);
    }
  });

  currentSocket.on('audit:new', () => {
    if (currentUser && (currentUser.role === 'SUPERVISOR' || currentUser.role === 'ADMIN')) {
      loadSupervisorData();
    }
  });

  currentSocket.on('channel:status', (data) => {
    console.log('[Socket] Channel status update:', data);
    if (data.channel === 'WHATSAPP') {
      const badge = document.getElementById('waStatusBadge');
      if (badge) badge.textContent = data.status;
      const qrHolder = document.getElementById('waQrImageHolder');
      if (qrHolder) {
        if (data.qrCode) {
          qrHolder.innerHTML = `<img src="${data.qrCode}" class="w-full h-full object-contain">`;
        } else if (data.status === 'CONNECTED') {
          qrHolder.innerHTML = `<div class="p-3 text-emerald-600 font-bold text-xs flex items-center justify-center gap-1.5"><i data-lucide="check-circle" class="w-4 h-4"></i> WhatsApp Terhubung</div>`;
        } else {
          qrHolder.innerHTML = `<span class="text-xs text-slate-400">QR Belum Siap</span>`;
        }
      }
    } else if (data.channel === 'TELEGRAM') {
      const badge = document.getElementById('tgStatusBadge');
      if (badge) {
        badge.textContent = data.status;
        badge.className = data.status === 'CONNECTED'
          ? 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700'
          : 'px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600';
      }
    }
    if (window.lucide) window.lucide.createIcons();
  });
}

function playNotificationSound() {
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (e) {}
}

// ==========================================
// 3. NAVIGATION VIEW SWITCHER & LAYOUT
// ==========================================
function switchView(viewName) {
  const viewsMap = {
    agent: { view: 'viewAgent', nav: 'navAgent', title: 'Tiket & Percakapan' },
    supervisor: { view: 'viewSupervisor', nav: 'navSupervisor', title: 'Panel Supervisor (Monitoring & Eskalasi)' },
    channels: { view: 'viewChannels', nav: 'navChannels', title: 'Koneksi Saluran & Prefix Agen' },
    users: { view: 'viewUsers', nav: 'navUsers', title: 'Pusat Administrasi & Pengaturan' }
  };

  const breadcrumb = document.getElementById('topNavBreadcrumb');
  if (breadcrumb && viewsMap[viewName]) {
    breadcrumb.textContent = viewsMap[viewName].title;
  }

  const wsSwitcher = document.getElementById('workspaceSwitcherContainer');
  if (wsSwitcher) {
    if (viewName === 'agent' || viewName === 'supervisor') {
      wsSwitcher.classList.remove('hidden');
    } else {
      wsSwitcher.classList.add('hidden');
    }
  }

  const btnToggleSide = document.getElementById('btnToggleSide');
  if (btnToggleSide) {
    if (viewName === 'agent') {
      btnToggleSide.classList.remove('hidden');
    } else {
      btnToggleSide.classList.add('hidden');
    }
  }

  Object.keys(viewsMap).forEach(key => {
    const el = document.getElementById(viewsMap[key].view);
    const nav = document.getElementById(viewsMap[key].nav);

    if (key === viewName) {
      if (el) el.classList.remove('hidden');
      if (nav) nav.className = 'relative group w-11 h-11 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center transition shadow-xs';
    } else {
      if (el) el.classList.add('hidden');
      if (nav) nav.className = 'relative group w-11 h-11 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 flex items-center justify-center transition';
    }
  });

  if (viewName === 'supervisor') loadSupervisorData();
  if (viewName === 'channels') loadChannelData();
  if (viewName === 'users') {
    loadAdminUsers();
    loadAdminRoles();
    loadAdminWorkspaces();
    loadAdminChannels();
  }
  if (window.lucide) window.lucide.createIcons();
}

function toggleRightSidebar() {
  const panel = document.getElementById('billingSidebar');
  if (panel) {
    panel.classList.toggle('hidden');
  }
}

function switchTicketTab(tab) {
  currentTicketTab = tab;
  const tabPool = document.getElementById('tabPool');
  const tabMy = document.getElementById('tabMy');

  if (tab === 'pool') {
    tabPool.className = 'py-1.5 rounded-lg bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs font-bold flex items-center justify-center gap-1.5 transition';
    tabMy.className = 'py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5 transition';
  } else {
    tabMy.className = 'py-1.5 rounded-lg bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs font-bold flex items-center justify-center gap-1.5 transition';
    tabPool.className = 'py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5 transition';
  }
  loadTickets();
}

// ==========================================
// 4. TICKETS & CLAIM POOL
// ==========================================
let currentLoadedTickets = [];

function filterTicketList(keyword) {
  const q = (keyword || '').toLowerCase().trim();
  if (!q) {
    renderTicketList(currentLoadedTickets);
    return;
  }
  const filtered = currentLoadedTickets.filter(t => 
    (t.customer_name || '').toLowerCase().includes(q) ||
    (t.ticket_number || '').toLowerCase().includes(q) ||
    (t.customer_sender_id || '').toLowerCase().includes(q) ||
    (t.latest_message || '').toLowerCase().includes(q)
  );
  renderTicketList(filtered);
}

async function loadTickets() {
  try {
    const wsParam = activeWorkspaceId ? `?workspace_id=${activeWorkspaceId}` : '';

    // 1. Fetch Pool
    const poolRes = await fetch(`/api/tickets/pool${wsParam}`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const poolData = await poolRes.json();
    const poolTickets = poolData.data || [];

    // 2. Fetch My Tickets
    const myRes = await fetch(`/api/tickets/my${wsParam}`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const myData = await myRes.json();
    const myTickets = myData.data || [];

    // Update Badges
    const badgePool = document.getElementById('badgePoolCount');
    if (badgePool) badgePool.textContent = poolTickets.length;
    const tabPoolB = document.getElementById('tabPoolBadge');
    if (tabPoolB) tabPoolB.textContent = poolTickets.length;
    const tabMyB = document.getElementById('tabMyBadge');
    if (tabMyB) tabMyB.textContent = myTickets.length;

    currentLoadedTickets = currentTicketTab === 'pool' ? poolTickets : myTickets;
    renderTicketList(currentLoadedTickets);
  } catch (err) {
    console.error('Error loading tickets:', err);
  }
}

function renderTicketList(tickets) {
  const container = document.getElementById('ticketListContainer');
  if (!tickets || tickets.length === 0) {
    container.innerHTML = `
      <div class="h-48 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-center px-4">
        <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mb-2 text-slate-300 dark:text-slate-600">
          <i data-lucide="inbox" class="w-6 h-6 stroke-[1.2]"></i>
        </div>
        <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">Tidak ada tiket di bagian ini</p>
        <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Tiket baru akan otomatis masuk ke sini</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = tickets.map(t => {
    const isSelected = activeTicketId === t.id;
    const isWa = t.channel_type === 'WHATSAPP';
    const channelBadge = isWa 
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300"><i data-lucide="phone" class="w-3 h-3"></i> WA</span>`
      : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300"><i data-lucide="send" class="w-3 h-3"></i> Tele</span>`;

    const timeAgo = formatTimeAgo(t.last_customer_message_at || t.created_at);
    const isInternal = t.contact_type === 'INTERNAL';
    const isVendor = t.contact_type === 'VENDOR';
    let contactTypePill = '';
    if (isInternal) {
      contactTypePill = `<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">INTERNAL${t.division ? ' • ' + escapeHtml(t.division) : ''}</span>`;
    } else if (isVendor) {
      contactTypePill = `<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">VENDOR</span>`;
    }

    const wsBadge = t.workspace_name
      ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold" style="background-color: ${t.workspace_color || '#4F46E5'}18; color: ${t.workspace_color || '#4F46E5'}; border: 1px solid ${t.workspace_color || '#4F46E5'}40;"><span class="w-1.5 h-1.5 rounded-full" style="background-color: ${t.workspace_color || '#4F46E5'}"></span>${escapeHtml(t.workspace_name)}</span>`
      : '';

    return `
      <div onclick="selectTicket(${t.id})" class="p-3.5 rounded-2xl border transition cursor-pointer ${isWa ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-sky-500'} ${
        isSelected 
          ? 'border-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-xs' 
          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 shadow-2xs'
      }">
        <div class="flex items-center justify-between mb-1.5">
          <span class="font-mono text-[11px] ${isSelected ? 'font-bold text-indigo-700 dark:text-indigo-400' : 'font-semibold text-slate-500 dark:text-slate-400'}">${t.ticket_number}</span>
          <div class="flex items-center gap-1.5">
            ${wsBadge}
            ${channelBadge}
          </div>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <h4 class="font-bold text-xs text-slate-900 dark:text-slate-100 leading-tight truncate">${escapeHtml(t.customer_name || 'Pelanggan')}</h4>
          ${contactTypePill}
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">${t.latest_message || 'Belum ada pesan'}</p>
        
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500">
          <span>Masuk: ${timeAgo}</span>
          <span class="font-semibold text-slate-500 dark:text-slate-400">${t.status}</span>
        </div>

        ${currentTicketTab === 'pool' ? `
          <button onclick="handleClaimTicket(event, ${t.id})" class="mt-2.5 w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs">
            <i data-lucide="hand" class="w-3 h-3"></i>
            <span>Klaim / Ambil Tiket</span>
          </button>
        ` : ''}
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

async function handleClaimTicket(e, ticketId) {
  e.stopPropagation();
  try {
    const res = await fetch(`/api/tickets/${ticketId}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.message || 'Gagal mengklaim tiket', 'error');
      return;
    }
    showToast('Tiket berhasil diklaim!', 'success');
    // Switch to My Tickets & select this ticket
    currentTicketTab = 'my';
    switchTicketTab('my');
    selectTicket(ticketId);
  } catch (err) {
    showToast('Gagal mengklaim tiket', 'error');
  }
}

// ==========================================
// 5. CHAT CONVERSATION & SELECTION
// ==========================================
async function selectTicket(ticketId) {
  activeTicketId = ticketId;
  const messagesContainer = document.getElementById('chatMessages');
  messagesContainer.innerHTML = `
    <div class="h-full flex items-center justify-center text-slate-400 text-xs">
      Memuat obrolan...
    </div>
  `;

  try {
    const res = await fetch(`/api/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (!data.success) return;

    activeTicketData = data.data;

    // Render Chat Header
    document.getElementById('chatCustomerName').textContent = activeTicketData.customer_name;
    document.getElementById('chatTicketNumber').textContent = activeTicketData.ticket_number;
    document.getElementById('chatCustomerMeta').textContent = `${activeTicketData.channel_type} • ${activeTicketData.phone_number || activeTicketData.telegram_user_id || '-'}`;
    
    const chatContactTypeBadge = document.getElementById('chatContactTypeBadge');
    if (chatContactTypeBadge) {
      if (activeTicketData.contact_type === 'INTERNAL') {
        chatContactTypeBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-100 text-indigo-800 border border-indigo-200';
        chatContactTypeBadge.textContent = activeTicketData.division ? `INTERNAL • ${activeTicketData.division}` : 'INTERNAL';
        chatContactTypeBadge.classList.remove('hidden');
      } else if (activeTicketData.contact_type === 'VENDOR') {
        chatContactTypeBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-sky-100 text-sky-800 border border-sky-200';
        chatContactTypeBadge.textContent = 'MITRA / VENDOR';
        chatContactTypeBadge.classList.remove('hidden');
      } else {
        chatContactTypeBadge.classList.add('hidden');
      }
    }
    
    const isWa = activeTicketData.channel_type === 'WHATSAPP';
    document.getElementById('chatChannelIcon').className = isWa
      ? 'w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold'
      : 'w-9 h-9 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold';
    document.getElementById('chatChannelIcon').innerHTML = isWa
      ? '<i data-lucide="phone" class="w-4 h-4"></i>'
      : '<i data-lucide="send" class="w-4 h-4"></i>';

    // Show actions if assigned to me or SPV
    const canReply = activeTicketData.assigned_to_user_id === currentUser.id || currentUser.role === 'SUPERVISOR' || currentUser.role === 'ADMIN';
    document.getElementById('chatActions').classList.remove('hidden');
    document.getElementById('chatInputArea').classList.toggle('hidden', !canReply);
    document.getElementById('prefixPreviewBar').classList.toggle('hidden', !canReply);

    // Render Sidebar Profile & Billing
    renderBillingSidebar(activeTicketData);

    // Combine & Sort Messages and Internal Notes
    renderThreadMessages(activeTicketData.messages || [], activeTicketData.internalNotes || []);

    // Join Socket Room for this ticket
    if (currentSocket) {
      currentSocket.emit('ticket:join', ticketId);
    }

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error('Error selecting ticket:', err);
  }
}

function renderThreadMessages(messages, notes) {
  const container = document.getElementById('chatMessages');
  const thread = [
    ...messages.map(m => ({ ...m, item_type: 'MSG', sortTime: new Date(m.timestamp) })),
    ...notes.map(n => ({ ...n, item_type: 'NOTE', sortTime: new Date(n.created_at) }))
  ].sort((a, b) => a.sortTime - b.sortTime);

  if (thread.length === 0) {
    container.innerHTML = `
      <div class="h-full flex items-center justify-center text-slate-400 text-xs">
        Belum ada percakapan pada tiket ini.
      </div>
    `;
    return;
  }

  container.innerHTML = thread.map(item => {
    if (item.item_type === 'NOTE') {
      return `
        <div class="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl max-w-lg mx-auto text-xs text-amber-950 dark:text-amber-100 shadow-2xs">
          <div class="flex items-center justify-between mb-1 font-semibold text-[11px] text-amber-800 dark:text-amber-300">
            <span class="flex items-center gap-1.5">
              <i data-lucide="lock" class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400"></i>
              <span>Catatan Internal (SPV & Agen Saja) • ${escapeHtml(item.author_name)} (${item.author_role})</span>
            </span>
            <span class="text-[10px] text-amber-700 dark:text-amber-400 font-medium">${formatTimeOnly(item.created_at)}</span>
          </div>
          <p class="text-amber-950 dark:text-amber-100 leading-relaxed">${escapeHtml(item.note_text)}</p>
        </div>
      `;
    }

    // Regular Message or Media Message
    return renderMessageBubble(item);
  }).join('');

  container.scrollTop = container.scrollHeight;
  if (window.lucide) window.lucide.createIcons();
}

function renderMessageBubble(item) {
  const isCustomer = item.sender_type === 'CUSTOMER';
  const isImage = item.message_type === 'IMAGE' && item.media_url;
  const isDoc = item.message_type === 'DOCUMENT' && item.media_url;

  let bodyHtml = '';
  if (isImage) {
    bodyHtml = `
      <div class="space-y-1.5">
        <div class="relative group cursor-pointer overflow-hidden rounded-xl border border-black/10 dark:border-white/10 max-w-xs bg-slate-900/5 shadow-xs" onclick="openImageLightbox('${item.media_url}', '${escapeHtml(item.content)}')">
          <img src="${item.media_url}" alt="Gambar Lampiran" class="w-full max-h-56 object-cover rounded-xl transition duration-300 group-hover:scale-105" loading="lazy">
          <div class="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold gap-1.5 backdrop-blur-2xs">
            <i data-lucide="zoom-in" class="w-4 h-4"></i> Klik untuk perbesar
          </div>
        </div>
        ${item.content && item.content !== '[Gambar WhatsApp]' && item.content !== '[Gambar Telegram]' ? `<p class="text-xs leading-relaxed mt-1 ${isCustomer ? 'text-slate-800 dark:text-slate-100' : 'text-white'}">${escapeHtml(item.content)}</p>` : ''}
      </div>
    `;
  } else if (isDoc) {
    bodyHtml = `
      <div class="p-2.5 rounded-xl border flex items-center justify-between gap-3 max-w-xs ${isCustomer ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100' : 'bg-indigo-700/80 border-indigo-500 text-white'}">
        <div class="flex items-center gap-2 overflow-hidden">
          <div class="w-8 h-8 rounded-lg ${isCustomer ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' : 'bg-white/20 text-white'} flex items-center justify-center flex-shrink-0 font-bold">
            <i data-lucide="file-text" class="w-4 h-4"></i>
          </div>
          <div class="overflow-hidden text-left">
            <p class="font-bold text-xs truncate">${escapeHtml(item.content || 'Dokumen')}</p>
            <span class="text-[10px] opacity-75">Dokumen Lampiran</span>
          </div>
        </div>
        <a href="${item.media_url}" target="_blank" download class="p-1.5 rounded-lg ${isCustomer ? 'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600' : 'bg-white/20 hover:bg-white/30 text-white'} transition flex items-center justify-center flex-shrink-0 shadow-2xs" title="Unduh File">
          <i data-lucide="download" class="w-3.5 h-3.5"></i>
        </a>
      </div>
    `;
  } else {
    bodyHtml = escapeHtml(item.content);
  }

  if (isCustomer) {
    return `
      <div class="flex items-start gap-2.5 max-w-md">
        <div class="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center flex-shrink-0">PL</div>
        <div>
          <div class="bg-white dark:bg-slate-800 p-3.5 rounded-2xl rounded-tl-sm border border-slate-200/80 dark:border-slate-700/80 shadow-2xs text-xs text-slate-800 dark:text-slate-100 leading-relaxed">
            ${bodyHtml}
          </div>
          <span class="text-[10px] text-slate-400 dark:text-slate-500 ml-1 mt-0.5 block">${formatTimeOnly(item.timestamp)}</span>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="flex items-end justify-end gap-2.5 max-w-md ml-auto">
        <div class="text-right">
          <div class="flex items-center justify-end gap-1.5 mb-1">
            <span class="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
              ${escapeHtml(item.sender_alias || 'CS Agent')}
            </span>
          </div>
          <div class="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-2xl rounded-tr-sm shadow-xs text-xs text-left leading-relaxed">
            ${bodyHtml}
          </div>
          <div class="flex items-center justify-end gap-1 text-[10px] text-slate-400 dark:text-slate-500 mr-1 mt-0.5">
            <span>${formatTimeOnly(item.timestamp)}</span>
            <i data-lucide="check-check" class="w-3 h-3 text-indigo-500 dark:text-indigo-400"></i>
          </div>
        </div>
      </div>
    `;
  }
}

function appendMessageToChat(msg) {
  const container = document.getElementById('chatMessages');
  const html = renderMessageBubble(msg);

  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
  if (window.lucide) window.lucide.createIcons();
}

function appendInternalNoteToChat(note) {
  const container = document.getElementById('chatMessages');
  const html = `
    <div class="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl max-w-lg mx-auto text-xs text-amber-950 dark:text-amber-100 shadow-2xs">
      <div class="flex items-center justify-between mb-1 font-semibold text-[11px] text-amber-800 dark:text-amber-300">
        <span class="flex items-center gap-1.5">
          <i data-lucide="lock" class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400"></i>
          <span>Catatan Internal • ${escapeHtml(note.author_name)} (${note.author_role})</span>
        </span>
        <span class="text-[10px] text-amber-700 dark:text-amber-400 font-medium">${formatTimeOnly(note.created_at)}</span>
      </div>
      <p class="text-amber-950 dark:text-amber-100 leading-relaxed">${escapeHtml(note.note_text)}</p>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
  if (window.lucide) window.lucide.createIcons();
}

// Mode toggle: Send to Customer vs Whisper Note
function setInputMode(mode) {
  currentInputMode = mode;
  const btnCust = document.getElementById('modeBtnCustomer');
  const btnWhisper = document.getElementById('modeBtnWhisper');
  const desc = document.getElementById('modeDescription');
  const btnSend = document.getElementById('btnSendMsg');

  if (mode === 'CUSTOMER') {
    btnCust.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 flex items-center gap-1.5 transition';
    btnWhisper.className = 'px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 hover:text-amber-800 dark:hover:text-amber-300 flex items-center gap-1.5 transition';
    desc.textContent = 'Pesan akan dikirim langsung ke WhatsApp/Telegram pelanggan';
    btnSend.className = 'px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-indigo-600/20 transition flex-shrink-0';
    btnSend.innerHTML = '<span>Kirim</span><i data-lucide="send" class="w-4 h-4"></i>';
  } else {
    btnWhisper.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5 transition';
    btnCust.className = 'px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center gap-1.5 transition';
    desc.textContent = 'Catatan rahasia HANYA bisa dibaca oleh SPV dan Agen (TIDAK terkirim ke pelanggan)';
    btnSend.className = 'px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-amber-600/20 transition flex-shrink-0';
    btnSend.innerHTML = '<span>Simpan Whisper</span><i data-lucide="lock" class="w-4 h-4"></i>';
  }
  if (window.lucide) window.lucide.createIcons();
}

let selectedMediaFile = null;

function handleMediaSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (file.size > 15 * 1024 * 1024) {
    showToast('Ukuran file melebihi batas maksimal 15 MB', 'warning');
    e.target.value = '';
    return;
  }

  selectedMediaFile = file;
  const bar = document.getElementById('attachmentPreviewBar');
  const nameEl = document.getElementById('attachPreviewName');
  const sizeEl = document.getElementById('attachPreviewSize');
  const iconHolder = document.getElementById('attachPreviewIcon');

  const isImg = file.type.startsWith('image/');
  nameEl.textContent = file.name;
  sizeEl.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

  if (isImg) {
    iconHolder.innerHTML = '<i data-lucide="image" class="w-4 h-4"></i>';
  } else {
    iconHolder.innerHTML = '<i data-lucide="file-text" class="w-4 h-4"></i>';
  }

  bar.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function clearSelectedMedia() {
  selectedMediaFile = null;
  const fileInput = document.getElementById('mediaFileInput');
  if (fileInput) fileInput.value = '';
  const bar = document.getElementById('attachmentPreviewBar');
  if (bar) bar.classList.add('hidden');
}

async function handleSendMessage(e) {
  e.preventDefault();
  const inputEl = document.getElementById('chatInputText');
  const text = inputEl.value.trim();
  if ((!text && !selectedMediaFile) || !activeTicketId) return;

  inputEl.value = '';
  const currentFileToSend = selectedMediaFile;
  clearSelectedMedia();

  try {
    if (currentInputMode === 'CUSTOMER') {
      if (currentFileToSend) {
        // Kirim Pesan Media (Gambar atau Dokumen)
        const formData = new FormData();
        formData.append('file', currentFileToSend);
        if (text) formData.append('caption', text);

        const res = await fetch(`/api/tickets/${activeTicketId}/reply-media`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`
          },
          body: formData
        });
        const data = await res.json();
        if (!data.success) {
          showToast(data.message || 'Gagal mengirim file media', 'error');
        } else {
          showToast('Media berhasil dikirim ke pelanggan!', 'success');
        }
      } else {
        // Kirim Pesan Teks Biasa
        const res = await fetch(`/api/tickets/${activeTicketId}/reply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`
          },
          body: JSON.stringify({ content: text })
        });
        const data = await res.json();
        if (!data.success) showToast(data.message, 'error');
      }
    } else {
      // Whisper note
      const res = await fetch(`/api/tickets/${activeTicketId}/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ note: text })
      });
      const data = await res.json();
      if (!data.success) showToast(data.message, 'error');
      else showToast('Catatan internal (whisper) berhasil disimpan', 'info');
    }
  } catch (err) {
    showToast('Gagal mengirim pesan', 'error');
  }
}

async function handleResolveTicket() {
  if (!activeTicketId) return;
  const confirmed = await showModalConfirm({
    title: 'Selesaikan Tiket',
    description: 'Apakah Anda yakin percakapan pelanggan ini telah selesai ditangani?',
    confirmText: 'Selesaikan Tiket',
    isDanger: false
  });
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/tickets/${activeTicketId}/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('Tiket berhasil diselesaikan!', 'success');
      loadTickets();
      selectTicket(activeTicketId);
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal menyelesaikan tiket', 'error');
  }
}

// ==========================================
// 6. CUSTOMER CRM & MODULAR SIDEBAR
// ==========================================
function toggleContactTypeFields(type) {
  const catWrap = document.getElementById('fieldCustomerCategoryWrapper');
  const divWrap = document.getElementById('fieldDivisionWrapper');
  if (type === 'INTERNAL') {
    if (divWrap) divWrap.classList.remove('hidden');
    if (catWrap) catWrap.classList.add('hidden');
  } else if (type === 'CUSTOMER') {
    if (divWrap) divWrap.classList.add('hidden');
    if (catWrap) catWrap.classList.remove('hidden');
  } else {
    // VENDOR
    if (divWrap) divWrap.classList.add('hidden');
    if (catWrap) catWrap.classList.add('hidden');
  }
}

function enableCustomerEditMode() {
  if (!activeTicketData) return;
  const viewEl = document.getElementById('customerProfileView');
  const editEl = document.getElementById('customerProfileEdit');
  if (viewEl) viewEl.classList.add('hidden');
  if (editEl) {
    editEl.classList.remove('hidden');
    const nameInput = document.getElementById('editCustomerName');
    if (nameInput) nameInput.focus();
    toggleContactTypeFields(document.getElementById('editContactType')?.value || 'CUSTOMER');
  }
  if (window.lucide) window.lucide.createIcons();
}

function cancelCustomerEditMode() {
  const viewEl = document.getElementById('customerProfileView');
  const editEl = document.getElementById('customerProfileEdit');
  if (viewEl) viewEl.classList.remove('hidden');
  if (editEl) editEl.classList.add('hidden');
  if (window.lucide) window.lucide.createIcons();
}

async function handleSaveCustomerProfile(event) {
  if (event) event.preventDefault();
  if (!activeTicketData || !activeTicketData.customer_id) {
    showToast('Data kontak tidak ditemukan', 'error');
    return;
  }

  const btnSave = document.getElementById('btnSaveCustomer');
  const originalBtnHtml = btnSave ? btnSave.innerHTML : '';
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> Menyimpan...`;
  }

  const payload = {
    full_name: document.getElementById('editCustomerName').value.trim(),
    contact_type: document.getElementById('editContactType').value,
    customer_category: document.getElementById('editCustomerCategory').value,
    division: document.getElementById('editCustomerDivision').value.trim(),
    employee_id: document.getElementById('editCustomerEmployeeId').value.trim(),
    company_name: document.getElementById('editCustomerCompany').value.trim(),
    email: document.getElementById('editCustomerEmail').value.trim(),
    address: document.getElementById('editCustomerAddress').value.trim(),
    notes: document.getElementById('editCustomerNotes').value.trim()
  };

  try {
    const res = await fetch(`/api/customers/${activeTicketData.customer_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success && result.data) {
      showToast('Data profil kontak berhasil diperbarui!', 'success');
      
      // Update local state activeTicketData
      const updated = result.data;
      activeTicketData.customer_name = updated.full_name;
      activeTicketData.contact_type = updated.contact_type;
      activeTicketData.division = updated.division;
      activeTicketData.employee_id = updated.employee_id;
      activeTicketData.customer_category = updated.customer_category;
      activeTicketData.company_name = updated.company_name;
      activeTicketData.email = updated.email;
      activeTicketData.address = updated.address;
      activeTicketData.notes = updated.notes;

      // Update Chat Header
      const chatCustNameEl = document.getElementById('chatCustomerName');
      if (chatCustNameEl) chatCustNameEl.textContent = updated.full_name;

      const chatContactTypeBadge = document.getElementById('chatContactTypeBadge');
      if (chatContactTypeBadge) {
        if (updated.contact_type === 'INTERNAL') {
          chatContactTypeBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-100 text-indigo-800 border border-indigo-200';
          chatContactTypeBadge.textContent = updated.division ? `INTERNAL • ${updated.division}` : 'INTERNAL';
          chatContactTypeBadge.classList.remove('hidden');
        } else if (updated.contact_type === 'VENDOR') {
          chatContactTypeBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-sky-100 text-sky-800 border border-sky-200';
          chatContactTypeBadge.textContent = 'MITRA / VENDOR';
          chatContactTypeBadge.classList.remove('hidden');
        } else {
          chatContactTypeBadge.classList.add('hidden');
        }
      }

      // Update in current loaded tickets queue
      const existingInList = currentLoadedTickets.find(t => t.id === activeTicketData.id);
      if (existingInList) {
        existingInList.customer_name = updated.full_name;
        existingInList.contact_type = updated.contact_type;
        existingInList.division = updated.division;
        existingInList.employee_id = updated.employee_id;
        existingInList.customer_category = updated.customer_category;
        existingInList.company_name = updated.company_name;
        existingInList.email = updated.email;
        filterTicketList(document.getElementById('ticketSearchInput')?.value || '');
      }

      // Re-render sidebar view
      renderBillingSidebar(activeTicketData);
    } else {
      showToast(result.message || 'Gagal memperbarui data kontak', 'error');
    }
  } catch (err) {
    console.error('Save customer profile error:', err);
    showToast('Terjadi kesalahan saat menyimpan data kontak', 'error');
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.innerHTML = originalBtnHtml;
    }
  }
}

async function renderBillingSidebar(ticket) {
  cancelCustomerEditMode();

  const name = ticket.customer_name || '-';
  const contactType = ticket.contact_type || 'CUSTOMER';
  const division = ticket.division || '';
  const employeeId = ticket.employee_id || '';
  const category = ticket.customer_category || 'REGULER';
  const company = ticket.company_name || '-';
  const email = ticket.email || '-';
  const address = ticket.address || '-';
  const notes = ticket.notes || '-';
  const channel = ticket.channel_type || '-';
  const contact = ticket.phone_number || ticket.telegram_user_id || '-';

  // Render View Elements
  const sideNameEl = document.getElementById('sideCustomerName');
  if (sideNameEl) sideNameEl.textContent = name;

  const sideChannelEl = document.getElementById('sideChannel');
  if (sideChannelEl) sideChannelEl.textContent = channel;

  const sideContactEl = document.getElementById('sideContact');
  if (sideContactEl) sideContactEl.textContent = contact;

  const sideCompanyEl = document.getElementById('sideCompany');
  if (sideCompanyEl) sideCompanyEl.textContent = company;

  const sideEmailEl = document.getElementById('sideEmail');
  if (sideEmailEl) sideEmailEl.textContent = email;

  const sideAddressEl = document.getElementById('sideAddress');
  if (sideAddressEl) sideAddressEl.textContent = address;

  const sideNotesEl = document.getElementById('sideNotes');
  if (sideNotesEl) sideNotesEl.textContent = notes;

  // Contact Type Badge & Division Rows
  const typeBadge = document.getElementById('sideContactTypeBadge');
  const catBadge = document.getElementById('sideCustomerCategoryBadge');
  const divRow = document.getElementById('sideDivisionRow');
  const divEl = document.getElementById('sideDivision');
  const empRow = document.getElementById('sideEmployeeIdRow');
  const empEl = document.getElementById('sideEmployeeId');

  if (contactType === 'INTERNAL') {
    if (typeBadge) {
      typeBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300';
      typeBadge.textContent = division ? `INTERNAL • ${division.toUpperCase()}` : 'INTERNAL';
      typeBadge.classList.remove('hidden');
    }
    if (catBadge) catBadge.classList.add('hidden');
    if (divRow) {
      divRow.classList.remove('hidden');
      if (divEl) divEl.textContent = division || '-';
    }
    if (empRow) {
      if (employeeId) {
        empRow.classList.remove('hidden');
        if (empEl) empEl.textContent = employeeId;
      } else {
        empRow.classList.add('hidden');
      }
    }
  } else if (contactType === 'VENDOR') {
    if (typeBadge) {
      typeBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300';
      typeBadge.textContent = 'MITRA / VENDOR';
      typeBadge.classList.remove('hidden');
    }
    if (catBadge) catBadge.classList.add('hidden');
    if (divRow) divRow.classList.add('hidden');
    if (empRow) empRow.classList.add('hidden');
  } else {
    // CUSTOMER
    if (typeBadge) {
      typeBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200';
      typeBadge.textContent = 'PELANGGAN';
      typeBadge.classList.remove('hidden');
    }
    if (catBadge) {
      catBadge.classList.remove('hidden');
      catBadge.textContent = category;
      if (category === 'VIP') {
        catBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300';
      } else if (category === 'BISNIS') {
        catBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300';
      } else {
        catBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300';
      }
    }
    if (divRow) divRow.classList.add('hidden');
    if (empRow) empRow.classList.add('hidden');
  }

  // Avatar Initial
  const avatarEl = document.getElementById('sideCustomerAvatar');
  if (avatarEl) {
    const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'CS';
    avatarEl.textContent = initials;
  }

  // Pre-populate Edit Form
  const editName = document.getElementById('editCustomerName');
  if (editName) editName.value = ticket.customer_name || '';

  const editType = document.getElementById('editContactType');
  if (editType) editType.value = contactType;

  const editDiv = document.getElementById('editCustomerDivision');
  if (editDiv) editDiv.value = division;

  const editEmp = document.getElementById('editCustomerEmployeeId');
  if (editEmp) editEmp.value = employeeId;

  const editCat = document.getElementById('editCustomerCategory');
  if (editCat) editCat.value = category;

  const editComp = document.getElementById('editCustomerCompany');
  if (editComp) editComp.value = ticket.company_name || '';

  const editEmail = document.getElementById('editCustomerEmail');
  if (editEmail) editEmail.value = ticket.email || '';

  const editAddr = document.getElementById('editCustomerAddress');
  if (editAddr) editAddr.value = ticket.address || '';

  const editNotes = document.getElementById('editCustomerNotes');
  if (editNotes) editNotes.value = ticket.notes || '';

  toggleContactTypeFields(contactType);

  // Optional Billing lookup (kept safely for future reactivation)
  const lookupQuery = ticket.phone_number || ticket.billing_account_id || ticket.customer_name;
  try {
    const billingCard = document.getElementById('billingInvoiceCard');
    if (billingCard && !billingCard.classList.contains('hidden')) {
      const res = await fetch(`/api/billing/lookup?q=${encodeURIComponent(lookupQuery)}`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        const b = data.data;
        const bBadge = document.getElementById('billingStatusBadge');
        if (bBadge) {
          bBadge.textContent = b.status;
          bBadge.className = b.status === 'PAID'
            ? 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700'
            : 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700';
        }
        const bAmount = document.getElementById('billingAmount');
        if (bAmount) bAmount.textContent = `Rp ${b.current_bill_amount.toLocaleString('id-ID')}`;
        const bDue = document.getElementById('billingDueDate');
        if (bDue) bDue.textContent = `Jatuh Tempo: ${b.due_date}`;
        const bPlan = document.getElementById('billingPlan');
        if (bPlan) bPlan.textContent = b.package_plan;
        const bAccId = document.getElementById('billingAccId');
        if (bAccId) bAccId.textContent = b.account_id;
      }
    }
  } catch (e) {
    // Non-fatal
  }

  if (window.lucide) window.lucide.createIcons();
}

function copyBillingSummaryToChat() {
  const plan = document.getElementById('billingPlan').textContent;
  const accId = document.getElementById('billingAccId').textContent;
  const amount = document.getElementById('billingAmount').textContent;
  const due = document.getElementById('billingDueDate').textContent;
  const status = document.getElementById('billingStatusBadge').textContent;

  const text = `Berikut rincian tagihan Anda:\n- ID Pelanggan: ${accId}\n- Paket: ${plan}\n- Total Tagihan: ${amount} (${status})\n- ${due}\nMohon lakukan pembayaran sebelum tanggal jatuh tempo. Terima kasih!`;
  const inputEl = document.getElementById('chatInputText');
  inputEl.value = text;
  inputEl.focus();
  showToast('Rincian tagihan berhasil disalin ke kolom chat!', 'info');
}

// ==========================================
// 7. SUPERVISOR PANEL DATA & ACTIONS
// ==========================================
async function loadSupervisorData() {
  try {
    // 1. Overview metrics
    const ovRes = await fetch('/api/supervisor/overview', {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const ovData = await ovRes.json();
    if (ovData.success) {
      const m = ovData.data.metrics;
      document.getElementById('spvUnassignedCount').textContent = m.unassigned_count || 0;
      document.getElementById('spvActiveCount').textContent = m.active_count || 0;
      document.getElementById('spvResolvedCount').textContent = m.resolved_today_count || 0;
      document.getElementById('spvSlaCount').textContent = m.sla_breached_count || 0;

      // Render agent workloads
      renderAgentWorkloads(ovData.data.agentWorkloads || []);
    }

    // 2. All active tickets for live eavesdropping
    const tickRes = await fetch('/api/tickets/all', {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const tickData = await tickRes.json();
    if (tickData.success) {
      renderSpvTicketsTable(tickData.data || []);
    }

    // 3. Audit logs
    const auditRes = await fetch('/api/supervisor/audit-logs', {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const auditData = await auditRes.json();
    if (auditData.success) {
      renderSpvAuditLogs(auditData.data || []);
    }
  } catch (err) {
    console.error('Error loading SPV data:', err);
  }
}

function renderAgentWorkloads(agents) {
  const container = document.getElementById('spvAgentWorkloads');
  container.innerHTML = agents.map(a => `
    <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 text-xs">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
          ${(a.display_alias || a.username).slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p class="font-bold text-slate-800 leading-tight">${escapeHtml(a.display_alias || '')} <span class="text-[10px] text-slate-400 font-normal">(@${escapeHtml(a.username || '')})</span></p>
          <p class="text-[10px] text-slate-500">${a.role}</p>
        </div>
      </div>
      <div class="text-right">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
          ${a.active_tickets} Aktif
        </span>
        <span class="text-[10px] text-slate-400 ml-1">(${a.total_resolved} Selesai)</span>
      </div>
    </div>
  `).join('');
}

function renderSpvTicketsTable(tickets) {
  const tbody = document.getElementById('spvTicketsTable');
  if (tickets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400">Tidak ada tiket aktif</td></tr>`;
    return;
  }

  tbody.innerHTML = tickets.map(t => {
    const isBreached = t.is_sla_breached;
    const badge = isBreached 
      ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse">SLA BREACH</span>`
      : `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">${t.status}</span>`;

    return `
      <tr class="hover:bg-slate-50/70 transition">
        <td class="py-2.5 px-3 font-mono font-semibold text-slate-900">${t.ticket_number}</td>
        <td class="py-2.5 px-3">
          <p class="font-semibold text-slate-800">${escapeHtml(t.customer_name || 'Pelanggan')}</p>
          <p class="text-[10px] text-slate-400">${escapeHtml(t.channel_type || '')}</p>
        </td>
        <td class="py-2.5 px-3">
          <span class="font-medium text-slate-700">${t.agent_alias ? escapeHtml(t.agent_alias) : '<i class="text-rose-500">Unassigned</i>'}</span>
        </td>
        <td class="py-2.5 px-3">${badge}</td>
        <td class="py-2.5 px-3 text-right space-x-1">
          <button onclick="spvEavesdrop(${t.id})" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition" title="Intip Obrolan">
            Lihat
          </button>
          <button onclick="spvTakeoverPrompt(${t.id})" class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold transition" title="Ambil Alih">
            Takeover
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderSpvAuditLogs(logs) {
  const container = document.getElementById('spvAuditLogs');
  if (!container) return;

  if (!logs || logs.length === 0) {
    container.innerHTML = `
      <div class="py-8 text-center text-slate-400">
        <i data-lucide="history" class="w-6 h-6 mx-auto mb-1 text-slate-300"></i>
        <p class="text-xs font-medium">Belum ada riwayat aktivitas tiket</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const badgeColorMap = {
    CLAIMED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    NOTE_ADDED: 'bg-amber-100 text-amber-800 border-amber-200',
    TAKEOVER: 'bg-rose-100 text-rose-800 border-rose-200',
    TRANSFERRED: 'bg-purple-100 text-purple-800 border-purple-200',
    RESOLVED: 'bg-sky-100 text-sky-800 border-sky-200',
    CUSTOMER_UPDATED: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  };

  container.innerHTML = logs.map(l => {
    const badgeStyle = badgeColorMap[l.action] || 'bg-slate-100 text-slate-700 border-slate-200';
    return `
      <div class="text-[11px] p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-100/60 transition shadow-2xs">
        <div class="flex items-center justify-between text-slate-400 text-[10px] mb-1">
          <span class="font-bold text-slate-700 font-mono bg-white px-1.5 py-0.5 rounded-md border border-slate-200">${escapeHtml(l.ticket_number)}</span>
          <span class="font-medium">${formatTimeAgo(l.created_at)}</span>
        </div>
        <div class="flex items-start gap-1.5 mt-0.5">
          <span class="px-1.5 py-0.2 rounded text-[9px] font-bold border tracking-wider flex-shrink-0 ${badgeStyle}">
            ${escapeHtml(l.action)}
          </span>
          <p class="text-slate-700 leading-snug flex-1">${escapeHtml(l.details)}</p>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

function spvEavesdrop(ticketId) {
  switchView('agent');
  selectTicket(ticketId);
}

async function spvTakeoverPrompt(ticketId) {
  const reason = await showModalPrompt({
    title: 'Takeover Tiket Supervisor',
    description: 'Masukkan alasan pengalihan/intervensi tiket ini:',
    placeholder: 'e.g. Eskalasi penanganan pelanggan VIP',
    confirmText: 'Ambil Alih'
  });
  if (reason === null) return;

  try {
    const res = await fetch(`/api/tickets/${ticketId}/takeover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`
      },
      body: JSON.stringify({ reason: reason || 'Intervensi Supervisor' })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Tiket berhasil diambil alih oleh Supervisor!', 'success');
      loadSupervisorData();
      spvEavesdrop(ticketId);
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal mengambil alih tiket', 'error');
  }
}

async function loadUsers() {
  try {
    const res = await fetch('/api/auth/users', {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (data.success) allUsersList = data.data;
  } catch (e) {}
}

// ==========================================
// 8. CHANNELS & PREFIX CONFIG
// ==========================================
async function loadChannelData() {
  try {
    // 1. Channel status & prefix config
    const res = await fetch('/api/channels', {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (data.success && data.data) {
      data.data.forEach(ch => {
        if (ch.channel_type === 'WHATSAPP') {
          const badge = document.getElementById('waStatusBadge');
          if (badge) badge.textContent = ch.status;
          const tpl = document.getElementById('waPrefixTemplate');
          if (tpl) tpl.value = ch.prefix_template || '*[{display_alias}]*:';
          const mode = document.getElementById('waPrefixMode');
          if (mode) mode.value = ch.prefix_mode || 'ALWAYS';
        } else if (ch.channel_type === 'TELEGRAM') {
          const badge = document.getElementById('tgStatusBadge');
          if (badge) badge.textContent = ch.status;
          const tpl = document.getElementById('tgPrefixTemplate');
          if (tpl) tpl.value = ch.prefix_template || '`[{display_alias}]`:';
          const mode = document.getElementById('tgPrefixMode');
          if (mode) mode.value = ch.prefix_mode || 'ALWAYS';
        }
      });
    }

    // 2. WA Status & QR
    const waRes = await fetch('/api/channels/whatsapp/status', {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const waData = await waRes.json();
    const qrHolder = document.getElementById('waQrImageHolder');
    if (qrHolder) {
      if (waData.success && waData.data && waData.data.qrCode) {
        qrHolder.innerHTML = `<img src="${waData.data.qrCode}" class="w-full h-full object-contain">`;
      } else if (waData.data && waData.data.status === 'CONNECTED') {
        qrHolder.innerHTML = `<div class="p-3 text-emerald-600 font-bold text-xs flex items-center justify-center gap-1.5"><i data-lucide="check-circle" class="w-4 h-4"></i> WhatsApp Terhubung</div>`;
      }
    }
  } catch (err) {
    console.error('Error loading channels:', err);
  }
}

async function reconnectWhatsApp() {
  await fetch('/api/channels/whatsapp/reconnect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${currentToken}` }
  });
  showToast('Inisialisasi ulang koneksi WhatsApp telah dijalankan. Tunggu beberapa detik...', 'info');
  setTimeout(loadChannelData, 3000);
}

async function sendTelegramCode() {
  const phone = document.getElementById('tgPhoneInput').value.trim();
  if (!phone) return showToast('Nomor telepon Telegram wajib diisi', 'warning');

  try {
    const res = await fetch('/api/channels/telegram/send-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`
      },
      body: JSON.stringify({ phoneNumber: phone })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
    } else {
      showToast(data.message || 'Gagal mengirim kode', 'error');
    }
  } catch (err) {
    showToast('Gagal mengirim kode OTP Telegram', 'error');
  }
}

async function verifyTelegramCode() {
  const code = document.getElementById('tgOtpInput').value.trim();
  let password = document.getElementById('tg2faInput')?.value.trim();
  if (!code && !password) return showToast('Masukkan kode OTP atau Password 2FA', 'warning');

  try {
    const res = await fetch('/api/channels/telegram/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`
      },
      body: JSON.stringify({ code: code || undefined, password: password || undefined })
    });
    const data = await res.json();

    if (data.requires2FA && !password) {
      const promptPass = await showModalPrompt({
        title: 'Two-Step Verification (2FA)',
        description: 'Akun Telegram Anda mengaktifkan Two-Step Verification (2FA). Silakan masukkan Password Cloud 2FA Telegram Anda:',
        placeholder: 'Password 2FA Akun Telegram',
        inputType: 'password',
        confirmText: 'Verifikasi 2FA'
      });
      if (promptPass) {
        if (document.getElementById('tg2faInput')) {
          document.getElementById('tg2faInput').value = promptPass;
        }
        const res2 = await fetch('/api/channels/telegram/verify-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`
          },
          body: JSON.stringify({ password: promptPass })
        });
        const data2 = await res2.json();
        if (data2.success) {
          showToast(data2.message, 'success');
        } else {
          showToast(data2.message, 'error');
        }
        loadChannelData();
        return;
      }
    }

    if (data.success) {
      showToast(data.message, 'success');
    } else {
      showToast(data.message, 'error');
    }
    loadChannelData();
  } catch (err) {
    showToast('Terjadi kesalahan saat memverifikasi kode Telegram', 'error');
  }
}

async function savePrefixConfig(channelId, type) {
  const template = document.getElementById(`${type}PrefixTemplate`).value;
  const mode = document.getElementById(`${type}PrefixMode`).value;

  const res = await fetch(`/api/channels/${channelId}/prefix-config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentToken}`
    },
    body: JSON.stringify({
      enable_agent_prefix: true,
      prefix_template: template,
      prefix_mode: mode
    })
  });
  const data = await res.json();
  showToast(data.message || 'Konfigurasi prefix berhasil disimpan', 'success');
}

// ==========================================
// 9. SIMULATOR MODAL & LIGHTBOX
// ==========================================
function openSimulatorModal() {
  document.getElementById('simModal').classList.remove('hidden');
}

function closeSimulatorModal() {
  document.getElementById('simModal').classList.add('hidden');
}

function toggleSimMediaOptions(val) {
  const grp = document.getElementById('simMediaUrlGroup');
  if (!grp) return;
  if (val === 'TEXT') {
    grp.classList.add('hidden');
  } else {
    grp.classList.remove('hidden');
    const input = document.getElementById('simMediaUrl');
    if (val === 'IMAGE' && !input.value) {
      input.value = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';
    } else if (val === 'DOCUMENT' && !input.value) {
      input.value = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    }
  }
}

async function handleSendSimulation(e) {
  e.preventDefault();
  const channelType = document.getElementById('simChannel').value;
  const senderName = document.getElementById('simCustomerName').value;
  const senderId = document.getElementById('simSenderId').value;
  const content = document.getElementById('simContent').value;
  const messageType = document.getElementById('simMessageType')?.value || 'TEXT';
  const mediaUrl = document.getElementById('simMediaUrl')?.value?.trim() || undefined;

  try {
    const res = await fetch('/api/simulator/inbound', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`
      },
      body: JSON.stringify({ channelType, senderId, senderName, content, messageType, mediaUrl })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Chat simulasi berhasil dikirim dan masuk ke antrean!', 'success');
      closeSimulatorModal();
      document.getElementById('simContent').value = '';
      loadTickets();
    } else {
      showToast(data.message || 'Akses ditolak: Hanya Admin/Supervisor yang dapat mengirim simulasi', 'error');
    }
  } catch (err) {
    showToast('Gagal mengirim simulasi chat', 'error');
  }
}

function openImageLightbox(src, caption = '') {
  const modal = document.getElementById('imageLightboxModal');
  const img = document.getElementById('lightboxImage');
  const cap = document.getElementById('lightboxCaption');
  const dlBtn = document.getElementById('lightboxDownloadBtn');

  if (!modal || !img) return;
  img.src = src;
  cap.textContent = caption || '';
  if (dlBtn) dlBtn.href = src;

  modal.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function closeImageLightbox() {
  const modal = document.getElementById('imageLightboxModal');
  if (modal) modal.classList.add('hidden');
}

// ==========================================
// 10. UTILITY HELPERS
// ==========================================
function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}d lalu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}j lalu`;
}

function formatTimeOnly(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}

// ==========================================
// 11. ADMIN USER & AVATAR MANAGEMENT
// ==========================================
let adminUsersList = [];
let targetAvatarUserId = null;
let selectedModalAvatarFile = null;

async function loadAdminUsers() {
  if (!currentToken) return;
  try {
    const res = await fetch('/api/auth/users', {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    const userList = data.data || data.users;
    if (data.success && Array.isArray(userList)) {
      adminUsersList = userList;
      updateAdminUserMetrics();
      renderAdminUsersTable();
    } else {
      showToast(data.message || 'Gagal memuat daftar pengguna', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan saat memuat pengguna', 'error');
  }
}

function updateAdminUserMetrics() {
  const total = adminUsersList.length;
  const active = adminUsersList.filter(u => u.is_active).length;
  const inactive = total - active;
  const admin = adminUsersList.filter(u => u.role === 'ADMIN').length;

  const elTotal = document.getElementById('metricTotalUsers');
  const elActive = document.getElementById('metricActiveUsers');
  const elInactive = document.getElementById('metricInactiveUsers');
  const elAdmin = document.getElementById('metricAdminUsers');

  if (elTotal) elTotal.textContent = total;
  if (elActive) elActive.textContent = active;
  if (elInactive) elInactive.textContent = inactive;
  if (elAdmin) elAdmin.textContent = admin;
}

function renderAdminUsersTable() {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;

  const searchQuery = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
  const roleFilter = document.getElementById('userRoleFilter')?.value || 'ALL';
  const statusFilter = document.getElementById('userStatusFilter')?.value || 'ALL';

  const filtered = adminUsersList.filter(u => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (statusFilter === 'ACTIVE' && !u.is_active) return false;
    if (statusFilter === 'INACTIVE' && u.is_active) return false;

    if (searchQuery) {
      const matchAlias = (u.display_alias || '').toLowerCase().includes(searchQuery);
      const matchUser = (u.username || '').toLowerCase().includes(searchQuery);
      const matchEmail = (u.email || '').toLowerCase().includes(searchQuery);
      return matchAlias || matchUser || matchEmail;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-12 text-center text-slate-400">
          <div class="flex flex-col items-center justify-center gap-2">
            <i data-lucide="user-x" class="w-8 h-8 text-slate-300"></i>
            <p class="text-xs font-medium">Tidak ada data pengguna yang sesuai pencarian/filter</p>
          </div>
        </td>
      </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    // Avatar rendering with automatic fallback
    const initials = (u.display_alias || u.username).slice(0, 2).toUpperCase();
    const bgGrad = u.role === 'ADMIN' ? 'from-purple-600 to-indigo-600' : (u.role === 'SUPERVISOR' ? 'from-blue-600 to-sky-500' : 'from-emerald-500 to-teal-500');
    let avatarEl = '';
    if (u.avatar_url) {
      avatarEl = `
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr ${bgGrad} text-white font-bold text-xs flex items-center justify-center shadow-2xs overflow-hidden relative">
          <span>${initials}</span>
          <img src="${u.avatar_url}" alt="" class="absolute inset-0 w-full h-full object-cover rounded-xl" onerror="this.remove()">
        </div>
      `;
    } else {
      avatarEl = `<div class="w-10 h-10 rounded-xl bg-gradient-to-tr ${bgGrad} text-white font-bold text-xs flex items-center justify-center shadow-2xs">${initials}</div>`;
    }

    // Role badge
    let roleBadge = '';
    if (u.role === 'ADMIN') {
      roleBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">ADMINISTRATOR</span>';
    } else if (u.role === 'SUPERVISOR') {
      roleBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">SUPERVISOR</span>';
    } else {
      roleBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">CS AGENT</span>';
    }

    // Status button
    const statusBtn = u.is_active
      ? `<button onclick="toggleUserActivation(${u.id}, false, '${escapeHtml(u.display_alias)}')" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition shadow-2xs cursor-pointer" title="Klik untuk menonaktifkan pengguna ini">
           <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
           <span>Aktif</span>
         </button>`
      : `<button onclick="toggleUserActivation(${u.id}, true, '${escapeHtml(u.display_alias)}')" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/60 transition shadow-2xs cursor-pointer" title="Klik untuk mengaktifkan kembali akun">
           <span class="w-2 h-2 rounded-full bg-rose-500"></span>
           <span>Nonaktif</span>
         </button>`;

    return `
      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition group border-b border-slate-100 dark:border-slate-800">
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-3">
            <div class="relative group cursor-pointer" onclick="triggerTableAvatarUpload(${u.id})" title="Klik untuk unggah avatar">
              ${avatarEl}
              <div class="absolute inset-0 bg-black/40 text-white rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <i data-lucide="camera" class="w-4 h-4"></i>
              </div>
            </div>
            <div>
              <div class="font-bold text-slate-900 dark:text-slate-100 text-xs">${escapeHtml(u.display_alias)}</div>
              <div class="text-[11px] text-slate-400 dark:text-slate-500">@${escapeHtml(u.username)}</div>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          ${escapeHtml(u.email)}
        </td>
        <td class="py-3.5 px-4">
          ${roleBadge}
        </td>
        <td class="py-3.5 px-4">
          ${statusBtn}
        </td>
        <td class="py-3.5 px-4 text-center">
          <div class="inline-flex items-center gap-1">
            <button onclick="openEditUserModal(${u.id})" class="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition" title="Edit Pengguna & Ubah Password">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="triggerTableAvatarUpload(${u.id})" class="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition" title="Unggah / Ganti Avatar">
              <i data-lucide="camera" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

function openAddUserModal() {
  document.getElementById('userFormId').value = '';
  document.getElementById('userModalTitle').innerHTML = `
    <i data-lucide="user-plus" class="w-5 h-5 text-emerald-600"></i>
    <span>Tambah Pengguna Baru</span>
  `;
  document.getElementById('userFormAlias').value = '';
  document.getElementById('userFormUsername').value = '';
  document.getElementById('userFormUsername').removeAttribute('readonly');
  document.getElementById('userFormEmail').value = '';
  document.getElementById('userFormRole').value = 'AGENT';
  document.getElementById('userFormPassword').value = '';
  document.getElementById('userFormPassword').setAttribute('required', 'true');
  document.getElementById('userFormPasswordRequired').classList.remove('hidden');
  document.getElementById('userFormPasswordHelp').textContent = 'Password wajib diisi minimal 6 karakter.';
  document.getElementById('userFormIsActive').checked = true;
  document.getElementById('userFormAvatarUrl').value = '';
  
  selectedModalAvatarFile = null;
  resetModalAvatarPreview('CS');

  document.getElementById('userModal').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function openEditUserModal(userId) {
  const user = adminUsersList.find(u => u.id === userId);
  if (!user) return;

  document.getElementById('userFormId').value = user.id;
  document.getElementById('userModalTitle').innerHTML = `
    <i data-lucide="edit-3" class="w-5 h-5 text-indigo-600"></i>
    <span>Edit Pengguna: ${escapeHtml(user.display_alias)}</span>
  `;
  document.getElementById('userFormAlias').value = user.display_alias || '';
  document.getElementById('userFormUsername').value = user.username || '';
  document.getElementById('userFormUsername').setAttribute('readonly', 'true');
  document.getElementById('userFormEmail').value = user.email || '';
  document.getElementById('userFormRole').value = user.role || 'AGENT';
  
  // In edit mode, password is optional
  const pwdInput = document.getElementById('userFormPassword');
  pwdInput.value = '';
  pwdInput.removeAttribute('required');
  document.getElementById('userFormPasswordRequired').classList.add('hidden');
  document.getElementById('userFormPasswordHelp').textContent = 'Biarkan kosong jika tidak ingin mengubah password akun ini.';

  document.getElementById('userFormIsActive').checked = Boolean(user.is_active);
  document.getElementById('userFormAvatarUrl').value = user.avatar_url || '';

  selectedModalAvatarFile = null;
  const userInitials = (user.display_alias || user.username).slice(0, 2).toUpperCase();
  if (user.avatar_url) {
    document.getElementById('userModalAvatarPreview').innerHTML = `
      <div class="w-full h-full rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white font-bold text-xs flex items-center justify-center overflow-hidden relative">
        <span>${userInitials}</span>
        <img src="${user.avatar_url}" alt="" class="absolute inset-0 w-full h-full object-cover" onerror="this.remove()">
      </div>
    `;
  } else {
    resetModalAvatarPreview(userInitials);
  }

  document.getElementById('userModal').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function closeUserModal() {
  document.getElementById('userModal').classList.add('hidden');
  selectedModalAvatarFile = null;
}

function resetModalAvatarPreview(initials) {
  document.getElementById('userModalAvatarPreview').innerHTML = escapeHtml(initials || 'CS');
}

function previewAvatarUrl(url) {
  const preview = document.getElementById('userModalAvatarPreview');
  if (url && (url.startsWith('http') || url.startsWith('/'))) {
    preview.innerHTML = `
      <div class="w-full h-full rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white font-bold text-xs flex items-center justify-center overflow-hidden relative">
        <span>CS</span>
        <img src="${url}" alt="" class="absolute inset-0 w-full h-full object-cover" onerror="this.remove()">
      </div>
    `;
  } else if (!selectedModalAvatarFile) {
    resetModalAvatarPreview('CS');
  }
}

function handleModalAvatarFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 15 * 1024 * 1024) {
    showToast('Ukuran berkas gambar maksimal 15MB', 'warning');
    return;
  }

  selectedModalAvatarFile = file;
  const objectUrl = URL.createObjectURL(file);
  document.getElementById('userModalAvatarPreview').innerHTML = `<img src="${objectUrl}" class="w-full h-full object-cover">`;
  showToast(`Foto "${file.name}" terpilih untuk diunggah`, 'info');
}

function clearModalAvatar() {
  selectedModalAvatarFile = null;
  const fileInput = document.getElementById('userModalFileInput');
  if (fileInput) fileInput.value = '';
  document.getElementById('userFormAvatarUrl').value = '';
  resetModalAvatarPreview('CS');
}

async function handleSaveUser(e) {
  e.preventDefault();
  const userId = document.getElementById('userFormId').value;
  const display_alias = document.getElementById('userFormAlias').value.trim();
  const username = document.getElementById('userFormUsername').value.trim();
  const email = document.getElementById('userFormEmail').value.trim();
  const role = document.getElementById('userFormRole').value;
  const password = document.getElementById('userFormPassword').value;
  const is_active = document.getElementById('userFormIsActive').checked;
  let avatar_url = document.getElementById('userFormAvatarUrl').value.trim();

  const isEdit = Boolean(userId);

  if (!isEdit && !password) {
    showToast('Password wajib diisi untuk pengguna baru', 'warning');
    return;
  }

  const submitBtn = document.getElementById('btnSaveUserSubmit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Menyimpan...</span>';

  try {
    let savedUserId = userId;
    if (isEdit) {
      // PUT /api/admin/users/:id
      const bodyPayload = {
        display_alias,
        email,
        role,
        is_active,
        avatar_url: avatar_url || null
      };
      if (password) bodyPayload.password = password;

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Gagal memperbarui pengguna');
      }
    } else {
      // POST /api/admin/users
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          username,
          display_alias,
          email,
          role,
          password,
          is_active,
          avatar_url: avatar_url || null
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Gagal menambahkan pengguna baru');
      }
      savedUserId = data.data.id;
    }

    // If an avatar file was picked in the modal, upload it now
    if (selectedModalAvatarFile && savedUserId) {
      const formData = new FormData();
      formData.append('avatar', selectedModalAvatarFile);
      const avRes = await fetch(`/api/admin/users/${savedUserId}/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
        body: formData
      });
      const avData = await avRes.json();
      if (avData.success && avData.data?.avatar_url) {
        avatar_url = avData.data.avatar_url;
      }
    }

    showToast(`Pengguna "${display_alias}" berhasil disimpan!`, 'success');
    closeUserModal();
    await loadAdminUsers();

    // If edited user is the currently logged in user, refresh local storage & header profile
    if (currentUser && currentUser.id === parseInt(savedUserId, 10)) {
      currentUser.display_alias = display_alias;
      currentUser.email = email;
      currentUser.role = role;
      if (avatar_url) currentUser.avatar_url = avatar_url;
      localStorage.setItem('omni_user', JSON.stringify(currentUser));
      initAuthenticatedSession();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i><span>Simpan Pengguna</span>';
    if (window.lucide) window.lucide.createIcons();
  }
}

async function toggleUserActivation(userId, newStatus, userAlias) {
  const actionText = newStatus ? 'mengaktifkan' : 'menonaktifkan';
  const confirmed = await showCustomConfirm({
    title: `Konfirmasi ${newStatus ? 'Aktivasi' : 'Nonaktivasi'} Akun`,
    description: `Apakah Anda yakin ingin ${actionText} akun staf CS "${userAlias}"? ${newStatus ? 'Pengguna akan dapat login kembali.' : 'Pengguna tidak akan dapat login ke sistem.'}`,
    confirmText: newStatus ? 'Aktifkan Akun' : 'Nonaktifkan Akun',
    cancelText: 'Batal',
    type: newStatus ? 'info' : 'danger'
  });

  if (!confirmed) return;

  try {
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`
      },
      body: JSON.stringify({ is_active: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Akun "${userAlias}" berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      await loadAdminUsers();
    } else {
      showToast(data.message || 'Gagal mengubah status aktivasi', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan saat mengubah status akun', 'error');
  }
}

function triggerTableAvatarUpload(userId) {
  targetAvatarUserId = userId;
  const fileInput = document.getElementById('userTableAvatarFileInput');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}

async function handleTableAvatarPicked(e) {
  const file = e.target.files[0];
  if (!file || !targetAvatarUserId) return;

  if (file.size > 15 * 1024 * 1024) {
    showToast('Ukuran berkas gambar maksimal 15MB', 'warning');
    return;
  }

  try {
    showToast(`Mengunggah avatar untuk pengguna ID #${targetAvatarUserId}...`, 'info');
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await fetch(`/api/admin/users/${targetAvatarUserId}/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${currentToken}` },
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      showToast('Avatar pengguna berhasil diperbarui!', 'success');
      await loadAdminUsers();

      // If current user, update session
      if (currentUser && currentUser.id === targetAvatarUserId) {
        currentUser.avatar_url = data.data.avatar_url;
        localStorage.setItem('omni_user', JSON.stringify(currentUser));
        initAuthenticatedSession();
      }
    } else {
      showToast(data.message || 'Gagal mengunggah avatar', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan saat mengunggah avatar', 'error');
  } finally {
    targetAvatarUserId = null;
  }
}

// ==========================================
// 12. DYNAMIC WORKSPACE SWITCHER
// ==========================================
let allWorkspaces = [];
let activeWorkspaceId = null;

async function loadWorkspaces() {
  if (!currentToken) return;
  try {
    const res = await fetch('/api/workspaces/my', {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      allWorkspaces = data.data;
      renderWorkspaceDropdown();
    }
  } catch (err) {
    console.warn('[Workspace] Error loading workspaces:', err);
  }
}

function renderWorkspaceDropdown() {
  const list = document.getElementById('workspaceDropdownList');
  if (!list) return;

  let html = `
    <button type="button" onclick="selectWorkspace(null, 'Semua Workspace', '#4F46E5')" class="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
      activeWorkspaceId === null ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }">
      <span class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-indigo-600"></span>
        <span>Semua Workspace</span>
      </span>
      ${activeWorkspaceId === null ? '<i data-lucide="check" class="w-3.5 h-3.5 text-indigo-600"></i>' : ''}
    </button>
  `;

  allWorkspaces.forEach(ws => {
    const isCur = activeWorkspaceId === ws.id;
    html += `
      <button type="button" onclick="selectWorkspace(${ws.id}, '${escapeHtml(ws.name)}', '${ws.color}')" class="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
        isCur ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
      }">
        <span class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full" style="background-color: ${ws.color}"></span>
          <span class="truncate">${escapeHtml(ws.name)}</span>
        </span>
        ${isCur ? '<i data-lucide="check" class="w-3.5 h-3.5 text-indigo-600"></i>' : ''}
      </button>
    `;
  });

  list.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

function toggleWorkspaceDropdown() {
  const menu = document.getElementById('workspaceDropdownMenu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

function selectWorkspace(wsId, wsName, wsColor) {
  activeWorkspaceId = wsId;
  const label = document.getElementById('activeWorkspaceLabel');
  const dot = document.getElementById('activeWorkspaceDot');
  if (label) label.textContent = wsName;
  if (dot) dot.style.backgroundColor = wsColor || '#4F46E5';

  const menu = document.getElementById('workspaceDropdownMenu');
  if (menu) menu.classList.add('hidden');

  renderWorkspaceDropdown();
  loadTickets();
  showToast(`Filter Workspace dialihkan ke: ${wsName}`, 'info');
}

// Close workspace dropdown when clicking outside
document.addEventListener('click', (e) => {
  const container = document.getElementById('workspaceSwitcherContainer');
  const menu = document.getElementById('workspaceDropdownMenu');
  if (container && menu && !container.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

// ==========================================
// 13. UNIFIED ADMIN CENTER SUB-TABS
// ==========================================
let currentAdminTab = 'users';

function switchAdminTab(tab) {
  currentAdminTab = tab;
  const tabs = ['users', 'roles', 'workspaces', 'channels'];
  
  tabs.forEach(t => {
    const btn = document.getElementById(`btnTabAdmin${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const sec = document.getElementById(`sectionAdmin${t.charAt(0).toUpperCase() + t.slice(1)}`);
    
    if (t === tab) {
      if (btn) {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-indigo-600 text-white shadow-xs cursor-pointer';
      }
      if (sec) sec.classList.remove('hidden');
    } else {
      if (btn) {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer';
      }
      if (sec) sec.classList.add('hidden');
    }
  });

  if (tab === 'users') loadAdminUsers();
  if (tab === 'roles') loadAdminRoles();
  if (tab === 'workspaces') loadAdminWorkspaces();
  if (tab === 'channels') loadAdminChannels();
  if (window.lucide) window.lucide.createIcons();
}

// ==========================================
// 14. DYNAMIC ROLES & GRANULAR PERMISSIONS
// ==========================================
let adminRolesList = [];
let allPermissionsList = [];

async function loadAdminRoles() {
  if (!currentToken) return;
  try {
    // 1. Fetch permissions catalog if empty
    if (allPermissionsList.length === 0) {
      const permRes = await fetch('/api/admin/roles/permissions-list', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const permData = await permRes.json();
      if (permData.success && Array.isArray(permData.data)) {
        allPermissionsList = permData.data;
      }
    }

    // 2. Fetch all roles
    const res = await fetch('/api/admin/roles', {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      adminRolesList = data.data;
      renderAdminRoles();
      updateUserRoleDropdowns();
    }
  } catch (err) {
    console.warn('[Roles] Error loading roles:', err);
  }
}

function updateUserRoleDropdowns() {
  const formRole = document.getElementById('userFormRole');
  if (formRole && adminRolesList.length > 0) {
    const currentVal = formRole.value;
    formRole.innerHTML = adminRolesList.map(r => `
      <option value="${r.role_code}">${escapeHtml(r.role_name)} (${r.role_code})</option>
    `).join('');
    if (currentVal) formRole.value = currentVal;
  }

  const filterRole = document.getElementById('userRoleFilter');
  if (filterRole && adminRolesList.length > 0) {
    const curVal = filterRole.value;
    filterRole.innerHTML = `
      <option value="ALL">Semua Peran (Role)</option>
      ${adminRolesList.map(r => `
        <option value="${r.role_code}">${escapeHtml(r.role_name)}</option>
      `).join('')}
    `;
    if (curVal) filterRole.value = curVal;
  }
}

function renderAdminRoles() {
  const container = document.getElementById('rolesListContainer');
  if (!container) return;

  if (adminRolesList.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <i data-lucide="shield-off" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
        <p class="text-xs font-semibold">Belum ada role kustom yang terdaftar</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = adminRolesList.map(r => {
    const isSystem = Boolean(r.is_system);
    const perms = r.permissions || [];
    
    const permBadges = perms.map(p => {
      const match = allPermissionsList.find(x => x.code === p);
      const label = match ? match.name : p;
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">${escapeHtml(label)}</span>`;
    }).join(' ');

    return `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <span class="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                ${escapeHtml(r.role_code)}
              </span>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white mt-2">${escapeHtml(r.role_name)}</h3>
            </div>
            ${isSystem 
              ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300"><i data-lucide="lock" class="w-3 h-3"></i> Sistem</span>'
              : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300"><i data-lucide="sliders" class="w-3 h-3"></i> Kustom</span>'
            }
          </div>

          <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">${escapeHtml(r.description || 'Tidak ada deskripsi tambahan')}</p>

          <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div class="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mb-2">
              <span class="font-semibold text-slate-600 dark:text-slate-300">${perms.length} Hak Akses Terpasang</span>
              <span>${r.user_count || 0} Pengguna</span>
            </div>
            <div class="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              ${permBadges || '<span class="text-[10px] text-slate-400">Tidak ada izin aktif</span>'}
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button onclick="openEditRoleModal(${r.id})" class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer">
            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            <span>Edit Izin</span>
          </button>
          ${!isSystem ? `
            <button onclick="deleteRole(${r.id}, '${escapeHtml(r.role_code)}')" class="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer" title="Hapus Role">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

function renderRolePermissionCheckboxes(selectedPermissions = []) {
  const container = document.getElementById('rolePermissionsContainer');
  if (!container) return;

  const categories = {};
  allPermissionsList.forEach(p => {
    if (!categories[p.category]) categories[p.category] = [];
    categories[p.category].push(p);
  });

  let html = '';
  Object.keys(categories).forEach(cat => {
    html += `
      <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
        <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">${cat}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${categories[cat].map(p => `
            <label class="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition cursor-pointer">
              <input type="checkbox" name="role_permission_cb" value="${p.code}" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" ${selectedPermissions.includes(p.code) ? 'checked' : ''}>
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200 leading-tight">${p.name}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function openAddRoleModal() {
  document.getElementById('roleFormId').value = '';
  document.getElementById('roleModalTitle').innerHTML = `
    <i data-lucide="shield-plus" class="w-5 h-5 text-indigo-600 dark:text-indigo-400"></i>
    <span>Tambah Role & Hak Akses Baru</span>
  `;
  document.getElementById('roleFormCode').value = '';
  document.getElementById('roleFormCode').removeAttribute('readonly');
  document.getElementById('roleFormName').value = '';
  document.getElementById('roleFormDesc').value = '';
  
  renderRolePermissionCheckboxes(['ticket_view', 'ticket_claim', 'ticket_reply', 'media_dispatch', 'ticket_resolve']);
  
  document.getElementById('roleModal').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function openEditRoleModal(roleId) {
  const role = adminRolesList.find(r => r.id === roleId);
  if (!role) return;

  document.getElementById('roleFormId').value = role.id;
  document.getElementById('roleModalTitle').innerHTML = `
    <i data-lucide="edit-3" class="w-5 h-5 text-indigo-600 dark:text-indigo-400"></i>
    <span>Edit Role: ${escapeHtml(role.role_name)}</span>
  `;
  document.getElementById('roleFormCode').value = role.role_code;
  document.getElementById('roleFormCode').setAttribute('readonly', 'true');
  document.getElementById('roleFormName').value = role.role_name || '';
  document.getElementById('roleFormDesc').value = role.description || '';

  renderRolePermissionCheckboxes(role.permissions || []);

  document.getElementById('roleModal').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function closeRoleModal() {
  document.getElementById('roleModal').classList.add('hidden');
}

function toggleAllRolePermissions(checked) {
  const checkboxes = document.querySelectorAll('input[name="role_permission_cb"]');
  checkboxes.forEach(cb => { cb.checked = checked; });
}

async function handleSaveRole(e) {
  e.preventDefault();
  const roleId = document.getElementById('roleFormId').value;
  const role_code = document.getElementById('roleFormCode').value.trim();
  const role_name = document.getElementById('roleFormName').value.trim();
  const description = document.getElementById('roleFormDesc').value.trim();

  const checkboxes = document.querySelectorAll('input[name="role_permission_cb"]:checked');
  const permissions = Array.from(checkboxes).map(cb => cb.value);

  const isEdit = Boolean(roleId);
  const btn = document.getElementById('btnSaveRoleSubmit');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Menyimpan...</span>';

  try {
    if (isEdit) {
      const res = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ role_name, description, permissions })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Gagal memperbarui role');
    } else {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ role_code, role_name, description, permissions })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Gagal menambahkan role');
    }

    showToast(`Role "${role_name}" berhasil disimpan!`, 'success');
    closeRoleModal();
    await loadAdminRoles();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i><span>Simpan Role</span>';
    if (window.lucide) window.lucide.createIcons();
  }
}

async function deleteRole(roleId, roleCode) {
  const confirmed = await showCustomConfirm({
    title: 'Hapus Role Kustom',
    description: `Apakah Anda yakin ingin menghapus role "${roleCode}"? Tindakan ini tidak dapat dibatalkan.`,
    confirmText: 'Hapus Role',
    cancelText: 'Batal',
    type: 'danger'
  });

  if (!confirmed) return;

  try {
    const res = await fetch(`/api/admin/roles/${roleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Role "${roleCode}" berhasil dihapus`, 'success');
      await loadAdminRoles();
    } else {
      showToast(data.message || 'Gagal menghapus role', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan saat menghapus role', 'error');
  }
}

// ==========================================
// 15. DYNAMIC WORKSPACE MANAGEMENT
// ==========================================
let adminWorkspacesList = [];

async function loadAdminWorkspaces() {
  if (!currentToken) return;
  try {
    const res = await fetch('/api/admin/workspaces', {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      adminWorkspacesList = data.data;
      renderAdminWorkspaces();
      loadWorkspaces();
    }
  } catch (err) {
    console.warn('[Workspace] Error loading admin workspaces:', err);
  }
}

function renderAdminWorkspaces() {
  const container = document.getElementById('workspacesListContainer');
  if (!container) return;

  if (adminWorkspacesList.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <i data-lucide="briefcase" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
        <p class="text-xs font-semibold">Belum ada workspace yang dikonfigurasi</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = adminWorkspacesList.map(ws => {
    const isDefault = ws.id === 1;
    return `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition flex flex-col justify-between">
        <div>
          <div class="h-2.5 w-full" style="background-color: ${ws.color};"></div>
          <div class="p-5">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs" style="background-color: ${ws.color};">
                  <i data-lucide="${ws.icon || 'briefcase'}" class="w-5 h-5"></i>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-900 dark:text-white leading-tight">${escapeHtml(ws.name)}</h3>
                  <span class="font-mono text-[10px] text-slate-400 font-bold">${escapeHtml(ws.code)}</span>
                </div>
              </div>
              ${isDefault ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">Default Utama</span>' : ''}
            </div>

            <p class="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">${escapeHtml(ws.description || 'Tidak ada deskripsi tambahan')}</p>

            <div class="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <p class="text-[10px] font-bold text-slate-400 uppercase">Staf CS</p>
                <p class="text-base font-black text-slate-900 dark:text-white mt-0.5">${ws.member_count || 0}</p>
              </div>
              <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <p class="text-[10px] font-bold text-slate-400 uppercase">Saluran</p>
                <p class="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">${ws.channel_count || 0}</p>
              </div>
              <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <p class="text-[10px] font-bold text-slate-400 uppercase">Tiket Aktif</p>
                <p class="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">${ws.ticket_count || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span class="text-[11px] font-bold ${ws.is_active ? 'text-emerald-600' : 'text-rose-500'} flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${ws.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}"></span>
            ${ws.is_active ? 'Aktif' : 'Nonaktif'}
          </span>
          <div class="flex items-center gap-1.5">
            <button onclick="openEditWorkspaceModal(${ws.id})" class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 transition cursor-pointer">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              <span>Kelola</span>
            </button>
            ${!isDefault ? `
              <button onclick="deleteWorkspace(${ws.id}, '${escapeHtml(ws.name)}')" class="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer" title="Hapus Workspace">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

function setWsColor(hex) {
  const input = document.getElementById('wsFormColor');
  if (input) input.value = hex;
}

async function openAddWorkspaceModal() {
  document.getElementById('wsFormId').value = '';
  document.getElementById('workspaceModalTitle').innerHTML = `
    <i data-lucide="briefcase" class="w-5 h-5 text-indigo-600 dark:text-indigo-400"></i>
    <span>Tambah Workspace Baru</span>
  `;
  document.getElementById('wsFormCode').value = '';
  document.getElementById('wsFormCode').removeAttribute('readonly');
  document.getElementById('wsFormName').value = '';
  document.getElementById('wsFormDesc').value = '';
  document.getElementById('wsFormColor').value = '#4F46E5';
  document.getElementById('wsFormIcon').value = 'briefcase';

  await renderWorkspaceChecklists([], []);

  document.getElementById('workspaceModal').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

async function openEditWorkspaceModal(wsId) {
  const ws = adminWorkspacesList.find(w => w.id === wsId);
  if (!ws) return;

  document.getElementById('wsFormId').value = ws.id;
  document.getElementById('workspaceModalTitle').innerHTML = `
    <i data-lucide="edit-3" class="w-5 h-5 text-indigo-600 dark:text-indigo-400"></i>
    <span>Kelola Workspace: ${escapeHtml(ws.name)}</span>
  `;
  document.getElementById('wsFormCode').value = ws.code;
  if (ws.id === 1) {
    document.getElementById('wsFormCode').setAttribute('readonly', 'true');
  } else {
    document.getElementById('wsFormCode').removeAttribute('readonly');
  }
  document.getElementById('wsFormName').value = ws.name || '';
  document.getElementById('wsFormDesc').value = ws.description || '';
  document.getElementById('wsFormColor').value = ws.color || '#4F46E5';
  document.getElementById('wsFormIcon').value = ws.icon || 'briefcase';

  try {
    const memRes = await fetch(`/api/admin/workspaces/${wsId}/members`, { headers: { Authorization: `Bearer ${currentToken}` } });
    const memData = await memRes.json();
    const currentMemberIds = (memData.data || []).map(m => m.id);

    const chanRes = await fetch(`/api/admin/workspaces/${wsId}/channels`, { headers: { Authorization: `Bearer ${currentToken}` } });
    const chanData = await chanRes.json();
    const currentChanIds = (chanData.data || []).map(c => c.id);

    await renderWorkspaceChecklists(currentMemberIds, currentChanIds);
  } catch (e) {
    await renderWorkspaceChecklists([], []);
  }

  document.getElementById('workspaceModal').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

async function renderWorkspaceChecklists(selectedMemberIds = [], selectedChannelIds = []) {
  const memContainer = document.getElementById('wsMembersCheckboxes');
  if (memContainer) {
    if (adminUsersList.length === 0) await loadAdminUsers();
    memContainer.innerHTML = adminUsersList.map(u => `
      <label class="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition cursor-pointer">
        <input type="checkbox" name="ws_member_cb" value="${u.id}" class="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" ${selectedMemberIds.includes(u.id) ? 'checked' : ''}>
        <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">${escapeHtml(u.display_alias)} <span class="text-[10px] text-slate-400 font-normal">(@${escapeHtml(u.username)})</span></span>
      </label>
    `).join('') || '<p class="text-xs text-slate-400 col-span-2">Belum ada pengguna CS</p>';
  }

  const chanContainer = document.getElementById('wsChannelsCheckboxes');
  if (chanContainer) {
    try {
      const chRes = await fetch('/api/channels', { headers: { Authorization: `Bearer ${currentToken}` } });
      const chData = await chRes.json();
      const channels = chData.data || [];
      chanContainer.innerHTML = channels.map(c => `
        <label class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition cursor-pointer">
          <div class="flex items-center gap-2">
            <input type="checkbox" name="ws_channel_cb" value="${c.id}" class="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" ${selectedChannelIds.includes(c.id) ? 'checked' : ''}>
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200">${c.channel_type === 'WHATSAPP' ? '📱 WhatsApp' : '✈️ Telegram'} - ${escapeHtml(c.account_identifier || 'Saluran CS')}</span>
          </div>
          <span class="text-[10px] font-bold ${c.status === 'CONNECTED' ? 'text-emerald-600' : 'text-slate-400'}">${c.status}</span>
        </label>
      `).join('') || '<p class="text-xs text-slate-400">Belum ada saluran terdaftar</p>';
    } catch (e) {}
  }
}

function closeWorkspaceModal() {
  document.getElementById('workspaceModal').classList.add('hidden');
}

async function handleSaveWorkspace(e) {
  e.preventDefault();
  const wsId = document.getElementById('wsFormId').value;
  const code = document.getElementById('wsFormCode').value.trim();
  const name = document.getElementById('wsFormName').value.trim();
  const description = document.getElementById('wsFormDesc').value.trim();
  const color = document.getElementById('wsFormColor').value;
  const icon = document.getElementById('wsFormIcon').value;

  const memChecks = document.querySelectorAll('input[name="ws_member_cb"]:checked');
  const member_user_ids = Array.from(memChecks).map(cb => parseInt(cb.value, 10));

  const chanChecks = document.querySelectorAll('input[name="ws_channel_cb"]:checked');
  const channel_ids = Array.from(chanChecks).map(cb => parseInt(cb.value, 10));

  const isEdit = Boolean(wsId);
  const btn = document.getElementById('btnSaveWsSubmit');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Menyimpan...</span>';

  try {
    if (isEdit) {
      const res = await fetch(`/api/admin/workspaces/${wsId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ name, description, color, icon, member_user_ids, channel_ids })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Gagal memperbarui workspace');
    } else {
      const res = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ code, name, description, color, icon, member_user_ids, channel_ids })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Gagal membuat workspace');
    }

    showToast(`Workspace "${name}" berhasil disimpan!`, 'success');
    closeWorkspaceModal();
    await loadAdminWorkspaces();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i><span>Simpan Workspace</span>';
    if (window.lucide) window.lucide.createIcons();
  }
}

async function deleteWorkspace(wsId, wsName) {
  const confirmed = await showCustomConfirm({
    title: 'Hapus Workspace',
    description: `Apakah Anda yakin ingin menghapus workspace "${wsName}"? Tiket yang masih terbuka akan otomatis dialihkan ke Workspace Utama.`,
    confirmText: 'Hapus Workspace',
    cancelText: 'Batal',
    type: 'danger'
  });

  if (!confirmed) return;

  try {
    const res = await fetch(`/api/admin/workspaces/${wsId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Workspace "${wsName}" berhasil dihapus`, 'success');
      if (activeWorkspaceId === wsId) activeWorkspaceId = null;
      await loadAdminWorkspaces();
    } else {
      showToast(data.message || 'Gagal menghapus workspace', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan saat menghapus workspace', 'error');
  }
}

// ==========================================
// 16. MULTI-CHANNELS & WHATSAPP MANAGEMENT
// ==========================================
async function loadAdminChannels() {
  if (!currentToken) return;
  try {
    const chRes = await fetch('/api/channels', { headers: { Authorization: `Bearer ${currentToken}` } });
    const chData = await chRes.json();
    const channels = chData.data || [];

    const wsRes = await fetch('/api/admin/workspaces', { headers: { Authorization: `Bearer ${currentToken}` } });
    const wsData = await wsRes.json();
    const workspaces = wsData.data || [];

    renderAdminChannels(channels, workspaces);
  } catch (err) {
    console.warn('[Channels] Error loading channels:', err);
  }
}

function renderAdminChannels(channels = [], workspaces = []) {
  const container = document.getElementById('adminChannelsListContainer');
  if (!container) return;

  if (channels.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <p class="text-xs font-semibold">Belum ada saluran yang terhubung</p>
      </div>
    `;
    return;
  }

  container.innerHTML = channels.map(c => {
    const isWa = c.channel_type === 'WHATSAPP';
    const isConnected = c.status === 'CONNECTED';

    return `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs ${isWa ? 'bg-emerald-500' : 'bg-sky-500'}">
              <i data-lucide="${isWa ? 'phone' : 'send'}" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-slate-900 dark:text-white text-sm">${escapeHtml(c.account_identifier || (isWa ? 'WhatsApp CS' : 'Telegram Bot'))}</h3>
                <span class="font-mono text-[10px] text-slate-400 font-bold">#CH-${c.id}</span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${isWa ? 'Koneksi Saluran WhatsApp Resmi' : 'Koneksi Saluran Telegram Resmi'}</p>
            </div>
          </div>

          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            isConnected ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }">
            <span class="w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}"></span>
            <span>${c.status}</span>
          </span>
        </div>

        <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Inbound Routing Workspace:</span>
          <span class="font-bold text-indigo-600 dark:text-indigo-400">Otomatis Terhubung</span>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button onclick="switchView('channels')" class="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
            <span>Konfigurasi Prefix & QR</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

function openNewWaModal() {
  const select = document.getElementById('newWaWorkspaceSelect');
  if (select) {
    select.innerHTML = adminWorkspacesList.map(ws => `
      <option value="${ws.id}">${escapeHtml(ws.name)} (${escapeHtml(ws.code)})</option>
    `).join('');
  }
  document.getElementById('newWaIdentifier').value = '';
  document.getElementById('newWaModal').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function closeNewWaModal() {
  document.getElementById('newWaModal').classList.add('hidden');
}

async function handleCreateNewWaChannel(e) {
  e.preventDefault();
  const account_identifier = document.getElementById('newWaIdentifier').value.trim();
  const workspace_id = document.getElementById('newWaWorkspaceSelect').value;

  const btn = document.getElementById('btnCreateWaSubmit');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Mendaftarkan...</span>';

  try {
    const res = await fetch('/api/admin/channels/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`
      },
      body: JSON.stringify({ account_identifier, workspace_id })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Gagal membuat saluran');

    showToast(`Saluran WhatsApp "${account_identifier}" berhasil dibuat!`, 'success');
    closeNewWaModal();
    await loadAdminChannels();
    switchView('channels');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="qr-code" class="w-4 h-4"></i><span>Daftarkan Saluran WhatsApp</span>';
    if (window.lucide) window.lucide.createIcons();
  }
}
