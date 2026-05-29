// ─── Eco-Collect Auth & Navbar ────────────────────────────────────────────────
// Provides: getUser, setUser, clearUser, requireAuth, injectNavbar
//           getAdminUser, setAdminUser, clearAdminUser, requireAdminAuth, injectAdminNavbar
// Must be loaded before page-specific scripts.

const AUTH_STORAGE_KEY = 'eco_user';

// ─── Single source of truth for the API base URL ──────────────────────────────
// All pages load auth.js first, so API_BASE is available everywhere.
const API_BASE = 'https://e-waste-pickup-platform-j428.onrender.com';

// ─── Storage helpers ──────────────────────────────────────────────────────────

function getUser() {
    try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)); }
    catch (_) { return null; }
}

function setUser(user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

function clearUser() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
}

// ─── Route guard ─────────────────────────────────────────────────────────────
// Call at the top of any protected page. Returns false (and redirects) if
// the user is not logged in; returns true if they are.

function requireAuth() {
    if (getUser()) return true;
    const currentFile = location.pathname.split('/').pop() || 'index.html';
    location.replace(`login.html?returnTo=${encodeURIComponent(currentFile)}`);
    return false;
}

// ─── Navbar injection ─────────────────────────────────────────────────────────
// activePage: 'home' | 'schedule' | 'track' | 'admin' | ''

function injectNavbar(activePage) {
    const user        = getUser();
    const currentFile = location.pathname.split('/').pop() || 'index.html';
    const loginHref   = `login.html?returnTo=${encodeURIComponent(currentFile)}`;

    const nav = document.createElement('nav');
    nav.className = 'eco-navbar';
    nav.innerHTML = `
        <a href="index.html" class="nav-brand">
            <span>&#9851;&#65039;</span>
            <span>Eco&#8209;Collect</span>
        </a>
        <div class="nav-links">
            <a href="index.html" class="nav-link${activePage === 'home' ? ' active' : ''}">
                ${user ? '&#128202; Dashboard' : '&#127968; Home'}
            </a>
            <a href="schedule.html" class="nav-link${activePage === 'schedule' ? ' active' : ''}">&#128666; Schedule Pickup</a>
            <a href="track.html"  class="nav-link${activePage === 'track'    ? ' active' : ''}">&#128230; Track Requests</a>
            <!-- Admin link intentionally removed from user navbar — access via admin-login.html -->
        </div>
        <div class="nav-right">
            ${user
                ? `<div class="nav-user-chip">
                       <span>&#128100;</span>
                       <span class="nav-user-name">${navEsc(user.full_name)}</span>
                   </div>
                   <button class="nav-btn nav-logout" id="eco-nav-logout">Logout</button>`
                : `<a href="${loginHref}" class="nav-btn nav-login">Login</a>`
            }
        </div>
    `;

    document.body.insertBefore(nav, document.body.firstChild);

    // Offset page content below the fixed 56px navbar
    const homeWrap = document.querySelector('.home-wrap');
    if (homeWrap) {
        const cur = parseInt(getComputedStyle(homeWrap).paddingTop) || 0;
        homeWrap.style.paddingTop = (cur + 56) + 'px';
    } else {
        const cur = parseInt(getComputedStyle(document.body).paddingTop) || 0;
        document.body.style.paddingTop = Math.max(cur + 56, 76) + 'px';
    }

    if (user) {
        document.getElementById('eco-nav-logout').addEventListener('click', () => {
            clearUser();
            window.location.href = 'index.html';
        });
    }
}

function navEsc(str) {
    if (!str) return 'User';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Admin auth (completely separate from user auth) ──────────────────────────
// Admin session lives under a different localStorage key so it never mixes with
// the regular user session. requireAdminAuth() redirects to admin-login.html,
// NOT to login.html, keeping the two flows completely isolated.

const ADMIN_STORAGE_KEY = 'eco_admin';

function getAdminUser() {
    try { return JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEY)); }
    catch (_) { return null; }
}

function setAdminUser(token) {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({
        authenticated: true,
        token: token || '',
        ts: Date.now(),
    }));
}

// Returns the token stored at login so fetch calls can send X-Admin-Token.
function getAdminToken() {
    const admin = getAdminUser();
    return (admin && admin.token) ? admin.token : '';
}

function clearAdminUser() {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
}

function requireAdminAuth() {
    if (getAdminUser()) return true;
    location.replace('admin-login.html');
    return false;
}

// ─── Cold-start UX helpers ────────────────────────────────────────────────────
// Show a non-blocking banner if the backend takes > 4 s to respond.
// Call showColdStartHint() before a fetch, clearColdStartHint() in finally.

function showColdStartHint(delayMs) {
    return setTimeout(() => {
        if (document.getElementById('eco-coldstart-msg')) return;
        const msg = document.createElement('div');
        msg.id = 'eco-coldstart-msg';
        msg.style.cssText = [
            'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
            'background:rgba(15,23,42,0.96)', 'border:1px solid rgba(255,255,255,0.12)',
            'color:#94a3b8', 'padding:14px 22px', 'border-radius:12px',
            'font-size:0.82rem', 'z-index:9999', 'text-align:center',
            'max-width:360px', 'line-height:1.6', "font-family:'Outfit',sans-serif",
            'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
        ].join(';');
        msg.innerHTML = '&#9203; Backend is waking up on Render free tier.<br>First request may take 30&ndash;60 seconds.';
        document.body.appendChild(msg);
    }, delayMs || 4000);
}

function clearColdStartHint(timerId) {
    clearTimeout(timerId);
    const msg = document.getElementById('eco-coldstart-msg');
    if (msg) msg.remove();
}

// ─── Admin-only navbar ────────────────────────────────────────────────────────
// Visually distinct from the user navbar — indigo accent, no user nav links.

function injectAdminNavbar() {
    const nav = document.createElement('nav');
    nav.className = 'eco-navbar eco-navbar-admin';
    nav.innerHTML = `
        <a href="admin.html" class="nav-brand">
            <span>&#9851;&#65039;</span>
            <span>Eco&#8209;Collect</span>
        </a>
        <div class="nav-links">
            <span class="admin-nav-badge">&#128737;&#65039; Admin Dashboard</span>
        </div>
        <div class="nav-right">
            <a href="index.html" class="nav-btn nav-link admin-user-site-link">&#8592; User Site</a>
            <button class="nav-btn nav-logout" id="eco-admin-logout">Logout</button>
        </div>
    `;

    document.body.insertBefore(nav, document.body.firstChild);

    const wrap = document.querySelector('.admin-wrap');
    if (wrap) {
        const cur = parseInt(getComputedStyle(wrap).paddingTop) || 0;
        wrap.style.paddingTop = (cur + 56) + 'px';
    } else {
        const cur = parseInt(getComputedStyle(document.body).paddingTop) || 0;
        document.body.style.paddingTop = Math.max(cur + 56, 76) + 'px';
    }

    document.getElementById('eco-admin-logout').addEventListener('click', () => {
        clearAdminUser();
        location.replace('admin-login.html');
    });
}
