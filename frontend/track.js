// ─── Config ───────────────────────────────────────────────────────────────────
// API_BASE is defined globally in auth.js (loaded before this script).

const CATEGORY_ICONS = {
    'Mobile':           '📱',
    'Laptop':           '💻',
    'Accessories':      '🎧',
    'Large Appliances': '🏠',
};

// Status flow: Pending → Accepted → Pickup Scheduled → Completed
const STATUS_STEPS    = ['Pending', 'Accepted', 'Pickup Scheduled', 'Completed'];
const STATUS_POSITION = { 'Pending': 0, 'Accepted': 1, 'Pickup Scheduled': 2, 'Completed': 3 };

// ─── State ────────────────────────────────────────────────────────────────────

let currentMode     = 'phone'; // 'phone' | 'id'
let allRequests     = [];      // full unfiltered list from last successful fetch
let currentUserName = '';      // user's name from last phone-based search

// ─── DOM references ───────────────────────────────────────────────────────────

const phoneInput     = document.getElementById('phone-input');
const searchBtn      = document.getElementById('search-btn');
const searchError    = document.getElementById('search-error');
const resultsSection = document.getElementById('results-section');
const filterTabs     = document.getElementById('filter-tabs');

const stateLoading   = document.getElementById('state-loading');
const stateEmpty     = document.getElementById('state-empty');
const stateError     = document.getElementById('state-error');
const stateResults   = document.getElementById('state-results');
const errorDetail    = document.getElementById('error-detail');

const statTotal      = document.getElementById('stat-total');
const statActive     = document.getElementById('stat-active');
const statPoints     = document.getElementById('stat-points');
const cardsList      = document.getElementById('cards-list');

// Certificate modal elements
const certOverlay    = document.getElementById('cert-overlay');
const certName       = document.getElementById('cert-name');
const certDesc       = document.getElementById('cert-desc');
const certDevices    = document.getElementById('cert-devices');
const certPoints     = document.getElementById('cert-points');
const certReqId      = document.getElementById('cert-req-id');
const certDate       = document.getElementById('cert-date');

// ─── Auth pre-fill ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const user = typeof getUser === 'function' ? getUser() : null;
    if (user && user.phone_number) {
        const strip = document.getElementById('logged-in-strip');
        document.getElementById('strip-phone').textContent = user.phone_number;
        strip.classList.remove('hidden');

        document.getElementById('strip-switch-btn').addEventListener('click', () => {
            strip.classList.add('hidden');
            phoneInput.value = '';
            phoneInput.focus();
            resultsSection.classList.add('hidden');
            filterTabs.classList.add('hidden');
            allRequests = [];
        });

        phoneInput.value = user.phone_number;
        document.getElementById('hero-subtitle').textContent =
            `Welcome back, ${user.full_name || user.phone_number}! Your pickups are loading…`;
        fetchByPhone(user.phone_number);
    }
});

// ─── Mode toggle ──────────────────────────────────────────────────────────────

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.mode === mode)
    );
    phoneInput.value       = '';
    phoneInput.placeholder = mode === 'phone' ? 'e.g. 9876543210' : 'e.g. 42';
    phoneInput.type        = mode === 'phone' ? 'tel' : 'number';
    phoneInput.removeAttribute('maxlength');
    if (mode === 'phone') phoneInput.setAttribute('maxlength', '15');
    searchError.classList.add('hidden');
    resultsSection.classList.add('hidden');
    filterTabs.classList.add('hidden');
    allRequests     = [];
    currentUserName = '';
}

// ─── Event listeners ──────────────────────────────────────────────────────────

searchBtn.addEventListener('click', handleSearch);
phoneInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSearch(); });

filterTabs.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
});

document.getElementById('retry-btn').addEventListener('click', handleSearch);

document.getElementById('cert-close-btn').addEventListener('click', closeCertificate);
document.getElementById('cert-download-btn').addEventListener('click', downloadCertificate);

cardsList.addEventListener('click', e => {
    const certBtn   = e.target.closest('.cert-open-btn');
    const cancelBtn = e.target.closest('.cancel-req-btn');

    if (certBtn) {
        const req = allRequests.find(r => r.id === parseInt(certBtn.dataset.reqId));
        if (req) openCertificate(req);
    } else if (cancelBtn) {
        openCancelModal(parseInt(cancelBtn.dataset.reqId));
    }
});

certOverlay.addEventListener('click', e => {
    if (e.target === certOverlay) closeCertificate();
});

// ─── Cancel modal ─────────────────────────────────────────────────────────────

const cancelOverlay   = document.getElementById('cancel-overlay');
const cancelReason    = document.getElementById('cancel-reason');
const cancelKeepBtn   = document.getElementById('cancel-keep-btn');
const cancelConfirmBtn = document.getElementById('cancel-confirm-btn');
let   pendingCancelId  = null;

function openCancelModal(reqId) {
    pendingCancelId       = reqId;
    cancelReason.value    = '';
    cancelOverlay.classList.remove('hidden');
    cancelReason.focus();
}

function closeCancelModal() {
    cancelOverlay.classList.add('hidden');
    pendingCancelId = null;
}

cancelKeepBtn.addEventListener('click', closeCancelModal);
cancelOverlay.addEventListener('click', e => {
    if (e.target === cancelOverlay) closeCancelModal();
});

cancelConfirmBtn.addEventListener('click', async () => {
    if (pendingCancelId === null) return;

    const id     = pendingCancelId;
    const reason = cancelReason.value.trim();

    cancelConfirmBtn.disabled     = true;
    cancelConfirmBtn.textContent  = 'Cancelling…';

    try {
        const res = await fetch(`${API_BASE}/api/requests/${id}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        if (reason) localStorage.setItem(`eco_cancel_reason_${id}`, reason);

        allRequests = allRequests.map(r => r.id === id ? { ...r, status: 'Cancelled' } : r);
        closeCancelModal();
        updateFilterCounts(allRequests);
        renderResults(allRequests, sumCompletedPoints(allRequests));
    } catch (err) {
        const errEl = document.createElement('p');
        errEl.style.cssText = 'color:#f87171;font-size:0.83rem;margin-top:10px;text-align:center';
        errEl.textContent = 'Could not cancel — please try again.';
        cancelConfirmBtn.parentElement.appendChild(errEl);
        setTimeout(() => errEl.remove(), 3000);
    } finally {
        cancelConfirmBtn.disabled    = false;
        cancelConfirmBtn.textContent = 'Yes, Cancel';
    }
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (!certOverlay.classList.contains('hidden'))   closeCertificate();
        if (!cancelOverlay.classList.contains('hidden')) closeCancelModal();
    }
});

// ─── Main handler ─────────────────────────────────────────────────────────────

function handleSearch() {
    const value = phoneInput.value.trim();
    searchError.classList.add('hidden');

    if (currentMode === 'phone') {
        const digits = value.replace(/\D/g, '');
        if (digits.length < 10) {
            searchError.textContent = 'Please enter a valid phone number (at least 10 digits).';
            searchError.classList.remove('hidden');
            phoneInput.focus();
            return;
        }
        fetchByPhone(value);

    } else {
        const id = parseInt(value, 10);
        if (!value || isNaN(id) || id < 1) {
            searchError.textContent = 'Please enter a valid Request ID (a positive number).';
            searchError.classList.remove('hidden');
            phoneInput.focus();
            return;
        }
        fetchById(id);
    }
}

// ─── API: fetch by phone ──────────────────────────────────────────────────────

async function fetchByPhone(phone) {
    startLoading();
    const coldStart = showColdStartHint();

    try {
        const response = await fetch(
            `${API_BASE}/api/requests/track?phone=${encodeURIComponent(phone)}`
        );
        clearColdStartHint(coldStart);

        if (response.status === 404) { showState('empty'); return; }
        if (!response.ok) throw new Error(`Server returned status ${response.status}.`);

        const data = await response.json();
        let requests, totalPoints;

        if (Array.isArray(data)) {
            requests        = data;
            currentUserName = '';
        } else {
            requests        = data.requests || [];
            currentUserName = data.user ? data.user.full_name : '';
        }

        if (requests.length === 0) { showState('empty'); return; }

        allRequests = requests;
        totalPoints = sumCompletedPoints(allRequests);

        updateFilterCounts(allRequests);
        resetActiveFilter();
        filterTabs.classList.remove('hidden');
        renderResults(allRequests, totalPoints);
        showState('results');

    } catch (err) {
        clearColdStartHint(coldStart);
        showFetchError(err);
    } finally {
        searchBtn.disabled = false;
    }
}

// ─── API: fetch by Request ID ─────────────────────────────────────────────────

async function fetchById(id) {
    startLoading();
    const coldStart = showColdStartHint();

    try {
        const response = await fetch(`${API_BASE}/api/requests/${id}`);
        clearColdStartHint(coldStart);

        if (response.status === 404) { showState('empty'); return; }
        if (!response.ok) throw new Error(`Server returned status ${response.status}.`);

        const found = await response.json();
        allRequests = [found];
        filterTabs.classList.add('hidden');
        const pts = found.status === 'Completed' ? (found.estimated_points || 0) : 0;
        renderResults([found], pts);
        showState('results');

    } catch (err) {
        clearColdStartHint(coldStart);
        showFetchError(err);
    } finally {
        searchBtn.disabled = false;
    }
}

// ─── Filter ───────────────────────────────────────────────────────────────────

function applyFilter(filter) {
    filterTabs.querySelectorAll('.filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === filter)
    );

    const filtered = filter === 'All'
        ? allRequests
        : allRequests.filter(r => r.status === filter);

    if (filtered.length === 0) {
        cardsList.innerHTML = `
            <div class="state-box" style="padding:30px 20px">
                <div class="empty-illustration" style="margin:0 auto 16px">&#128237;</div>
                <p class="state-title">No ${escHtml(filter)} Requests</p>
                <p>Switch to another filter to see more.</p>
            </div>`;
        return;
    }

    cardsList.innerHTML = '';
    filtered.forEach((req, i) => cardsList.appendChild(buildCard(req, i)));
}

function updateFilterCounts(requests) {
    const counts = {
        All: requests.length,
        Pending: 0,
        Accepted: 0,
        'Pickup Scheduled': 0,
        Completed: 0,
        Cancelled: 0,
    };
    requests.forEach(r => { if (r.status in counts) counts[r.status]++; });

    filterTabs.querySelectorAll('.filter-btn').forEach(btn => {
        const f = btn.dataset.filter;
        if (f in counts) btn.textContent = `${f}  ${counts[f]}`;
    });
}

function resetActiveFilter() {
    filterTabs.querySelectorAll('.filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === 'All')
    );
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderResults(requests, totalPoints) {
    statTotal.textContent = requests.length;

    // "Active" = any in-progress status (not yet completed or cancelled)
    const activeCount = requests.filter(r =>
        r.status === 'Pending' || r.status === 'Accepted' || r.status === 'Pickup Scheduled'
    ).length;
    if (statActive) statActive.textContent = activeCount;

    statPoints.textContent = totalPoints.toLocaleString();
    cardsList.innerHTML    = '';
    requests.forEach((req, i) => cardsList.appendChild(buildCard(req, i)));
}

function buildCard(req, index) {
    const card = document.createElement('div');
    card.className = 'request-card';
    card.style.animationDelay = `${index * 0.07}s`;

    const icon       = CATEGORY_ICONS[req.category] || '♻️';
    const quantity   = req.estimated_quantity ? `× ${req.estimated_quantity}` : '';
    const badgeClass = getBadgeClass(req.status);
    const { ptsText, ptsCls } = buildPointsDisplay(req);

    const booking  = getLocalBooking(req.id);
    const prefDate = req.preferred_date || booking.preferred_date || null;
    const timeSlot = req.time_slot      || booking.time_slot      || null;
    const slotLine = (prefDate || timeSlot)
        ? `<div class="card-detail">
               <span class="detail-icon">&#128197;</span>
               <span>${prefDate ? escHtml(prefDate) : ''}${prefDate && timeSlot ? ' &bull; ' : ''}${timeSlot ? escHtml(timeSlot) : ''}</span>
           </div>`
        : '';

    const certBtn = req.status === 'Completed'
        ? `<button class="cert-open-btn" data-req-id="${req.id}">&#127881; Certificate</button>`
        : '';

    const cancelBtn = req.status === 'Pending'
        ? `<button class="cancel-req-btn" data-req-id="${req.id}">Cancel</button>`
        : '';

    card.innerHTML = `
        <div class="card-header">
            <div class="card-category">
                <span class="category-icon">${icon}</span>
                <span>${escHtml(req.category)} ${quantity}</span>
            </div>
            <span class="status-badge ${badgeClass}">${escHtml(req.status)}</span>
        </div>

        <div class="card-detail">
            <span class="detail-icon">📍</span>
            <span>${escHtml(req.address)}</span>
        </div>

        ${slotLine}

        ${buildTimeline(req.status)}

        <div class="card-footer">
            <span class="request-id">Request #${req.id}</span>
            <div style="display:flex;align-items:center;gap:8px">
                <span class="pts-display ${ptsCls}">${ptsText}</span>
                ${certBtn}
                ${cancelBtn}
            </div>
        </div>
    `;

    return card;
}

function buildTimeline(status) {
    if (status === 'Cancelled') {
        return `<div class="tl-cancelled">&#10005; Request Cancelled</div>`;
    }

    const pos = STATUS_POSITION[status] ?? 0;
    let html  = '<div class="timeline">';

    STATUS_STEPS.forEach((step, i) => {
        const isDone    = i < pos;
        const isCurrent = i === pos;
        const cls       = isDone ? 'done' : isCurrent ? 'current' : '';

        html += `<div class="tl-step ${cls}">
            <div class="tl-dot"></div>
            <div class="tl-label">${step}</div>
        </div>`;

        if (i < STATUS_STEPS.length - 1) {
            html += `<div class="tl-line ${isDone ? 'done' : ''}"></div>`;
        }
    });

    return html + '</div>';
}

function buildPointsDisplay(req) {
    const pts = (req.estimated_points || 0).toLocaleString();
    switch (req.status) {
        case 'Completed':        return { ptsText: `✓ ${pts} pts earned`,       ptsCls: 'pts-earned'   };
        case 'Cancelled':        return { ptsText: 'Request cancelled',          ptsCls: 'pts-none'     };
        case 'Pickup Scheduled': return { ptsText: `~${pts} pts — pickup soon`,  ptsCls: 'pts-estimate' };
        case 'Accepted':         return { ptsText: `~${pts} pts — accepted`,     ptsCls: 'pts-estimate' };
        default:                 return { ptsText: `~${pts} pts estimated`,      ptsCls: 'pts-estimate' };
    }
}

function getBadgeClass(status) {
    switch (status) {
        case 'Completed':        return 'badge-completed';
        case 'Cancelled':        return 'badge-cancelled';
        case 'Accepted':         return 'badge-accepted';
        case 'Pickup Scheduled': return 'badge-scheduled';
        default:                 return 'badge-pending';
    }
}

// ─── Skeleton loading ─────────────────────────────────────────────────────────

function renderSkeletons() {
    const wrap = document.createElement('div');
    wrap.className = 'skeleton-wrap';
    wrap.innerHTML = [1, 2, 3].map(() => `
        <div class="skeleton-card">
            <div class="skel-row">
                <div class="skel-line" style="width:45%"></div>
                <div class="skel-badge"></div>
            </div>
            <div class="skel-line" style="width:78%;margin-bottom:8px"></div>
            <div class="skel-tl">
                <div class="skel-dot"></div><div class="skel-dash"></div>
                <div class="skel-dot"></div><div class="skel-dash"></div>
                <div class="skel-dot"></div><div class="skel-dash"></div>
                <div class="skel-dot"></div>
            </div>
            <div class="skel-row" style="margin:0;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06)">
                <div class="skel-line" style="width:28%"></div>
                <div class="skel-line" style="width:32%"></div>
            </div>
        </div>
    `).join('');

    stateLoading.innerHTML = '';
    stateLoading.appendChild(wrap);
}

// ─── Certificate ──────────────────────────────────────────────────────────────

function openCertificate(req) {
    const user    = typeof getUser === 'function' ? getUser() : null;
    const name    = currentUserName || (user && user.full_name) || 'Valued Recycler';
    const pts     = (req.estimated_points || 0).toLocaleString();
    const qty     = req.estimated_quantity || 1;
    const dateStr = req.submitted_at
        ? new Date(req.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    certName.textContent    = name;
    certDesc.textContent    = `has responsibly recycled ${qty} ${req.category.toLowerCase()} device${qty > 1 ? 's' : ''} through our verified pickup program.`;
    certDevices.textContent = qty;
    certPoints.textContent  = pts;
    certReqId.textContent   = req.id;
    certDate.textContent    = dateStr;

    certOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCertificate() {
    certOverlay.classList.add('hidden');
    document.body.style.overflow = '';
}

function downloadCertificate() {
    window.print();
}

// ─── State helpers ─────────────────────────────────────────────────────────────

function startLoading() {
    resultsSection.classList.remove('hidden');
    filterTabs.classList.add('hidden');
    renderSkeletons();
    showState('loading');
    searchBtn.disabled = true;
}

function showFetchError(err) {
    console.error('Track fetch error:', err);
    errorDetail.textContent = err.message === 'Failed to fetch'
        ? 'Cannot connect to the server. Make sure the backend is running and try again.'
        : `Error: ${err.message}`;
    showState('error');
}

function showState(state) {
    stateLoading.classList.add('hidden');
    stateEmpty.classList.add('hidden');
    stateError.classList.add('hidden');
    stateResults.classList.add('hidden');

    switch (state) {
        case 'loading': stateLoading.classList.remove('hidden'); break;
        case 'empty':   stateEmpty.classList.remove('hidden');   break;
        case 'error':   stateError.classList.remove('hidden');   break;
        case 'results': stateResults.classList.remove('hidden'); break;
    }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sumCompletedPoints(requests) {
    return requests
        .filter(r => r.status === 'Completed')
        .reduce((total, r) => total + (r.estimated_points || 0), 0);
}

function getLocalBooking(reqId) {
    try { return JSON.parse(localStorage.getItem(`eco_booking_${reqId}`)) || null; }
    catch (_) { return null; }
}

function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
