// Route guard — requireAdminAuth(), injectAdminNavbar(), getAdminToken() come from auth.js
if (!requireAdminAuth()) { /* redirect in flight */ } else {
    injectAdminNavbar();
    initAdmin();
}

// ─── Config ───────────────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
    'Mobile': '📱', 'Laptop': '💻',
    'Accessories': '🎧', 'Large Appliances': '🏠',
};

// ─── State ────────────────────────────────────────────────────────────────────
let allRequests       = [];
let activeFilter      = 'All';
let searchTerm        = '';
let phoneFilterIds    = null;
let phoneFilterNum    = '';
let activeModalReq    = null;
let pendingConfirmCb  = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
function initAdmin() {
    // Filter tabs
    document.querySelectorAll('.admin-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeFilter = btn.dataset.filter;
            document.querySelectorAll('.admin-filter-btn').forEach(b =>
                b.classList.toggle('active', b.dataset.filter === activeFilter)
            );
            renderList();
        });
    });

    // General search (debounced)
    let searchDebounce;
    document.getElementById('admin-search').addEventListener('input', e => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            searchTerm = e.target.value.trim().toLowerCase();
            renderList();
        }, 150);
    });

    // Phone filter (debounced)
    let phoneDebounce;
    document.getElementById('admin-phone-search').addEventListener('input', e => {
        clearTimeout(phoneDebounce);
        const val = e.target.value.trim();
        if (!val) { clearPhoneFilter(); return; }
        phoneDebounce = setTimeout(() => applyPhoneFilter(val), 400);
    });

    // Phone filter clear
    document.getElementById('phone-filter-clear').addEventListener('click', () => {
        document.getElementById('admin-phone-search').value = '';
        clearPhoneFilter();
    });

    // Refresh
    document.getElementById('admin-refresh-btn').addEventListener('click', loadRequests);

    // Export CSV
    document.getElementById('admin-export-btn').addEventListener('click', exportCSV);

    // ── Modal events ──
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('req-modal-overlay').addEventListener('click', e => {
        if (e.target === document.getElementById('req-modal-overlay')) closeModal();
    });

    document.getElementById('modal-btn-accept').addEventListener('click', () => {
        if (!activeModalReq) return;
        const id = activeModalReq.id;
        showConfirm({
            icon: '✅',
            title: 'Accept this Request?',
            message: `Request #${id} will be marked as Accepted. The customer will see their status update.`,
            okLabel: 'Accept',
            okClass: 'ok-indigo',
            callback: () => commitStatus(id, 'Accepted'),
        });
    });

    document.getElementById('modal-btn-schedule').addEventListener('click', () => {
        if (!activeModalReq) return;
        const id = activeModalReq.id;
        showConfirm({
            icon: '📅',
            title: 'Mark as Pickup Scheduled?',
            message: `Request #${id} will be marked as Pickup Scheduled, indicating a confirmed pickup date.`,
            okLabel: 'Confirm Schedule',
            okClass: 'ok-purple',
            callback: () => commitStatus(id, 'Pickup Scheduled'),
        });
    });

    document.getElementById('modal-btn-complete').addEventListener('click', () => {
        if (!activeModalReq) return;
        const id = activeModalReq.id;
        showConfirm({
            icon: '✅',
            title: 'Mark as Completed?',
            message: `Request #${id} will be marked as Completed and points will be credited to the customer.`,
            okLabel: 'Mark Complete',
            okClass: 'ok-green',
            callback: () => commitStatus(id, 'Completed'),
        });
    });

    document.getElementById('modal-btn-cancel').addEventListener('click', () => {
        if (!activeModalReq) return;
        const id = activeModalReq.id;
        showConfirm({
            icon: '❌',
            title: 'Mark as Cancelled?',
            message: `Request #${id} will be marked as Cancelled.`,
            okLabel: 'Mark Cancelled',
            okClass: 'ok-red',
            callback: () => commitStatus(id, 'Cancelled'),
        });
    });

    document.getElementById('modal-btn-pending').addEventListener('click', () => {
        if (!activeModalReq) return;
        const id = activeModalReq.id;
        showConfirm({
            icon: '🕐',
            title: 'Reset to Pending?',
            message: `Request #${id} will be moved back to Pending status.`,
            okLabel: 'Reset Pending',
            okClass: 'ok-amber',
            callback: () => commitStatus(id, 'Pending'),
        });
    });

    // ── Confirm dialog events ──
    document.getElementById('confirm-ok').addEventListener('click', async () => {
        closeConfirm();
        if (pendingConfirmCb) await pendingConfirmCb();
    });
    document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);

    // ── Keyboard shortcuts ──
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (document.getElementById('confirm-overlay').classList.contains('cf-visible')) {
                closeConfirm();
            } else if (document.getElementById('req-modal-overlay').classList.contains('mo-visible')) {
                closeModal();
            }
        }
    });

    loadRequests();
}

// ─── Data fetch ───────────────────────────────────────────────────────────────
async function loadRequests() {
    const btn       = document.getElementById('admin-refresh-btn');
    const exportBtn = document.getElementById('admin-export-btn');
    btn.classList.add('spinning');
    btn.disabled       = true;
    exportBtn.disabled = true;
    renderState('loading');

    const coldStart = showColdStartHint();

    try {
        const res = await fetch(`${API_BASE}/admin/requests`, {
            headers: { 'X-Admin-Token': getAdminToken() },
        });
        clearColdStartHint(coldStart);

        if (!res.ok) throw new Error(`Server returned HTTP ${res.status}.`);

        allRequests = await res.json();

        updateStats();
        renderList();
        exportBtn.disabled = allRequests.length === 0;

        const count = allRequests.length;
        document.getElementById('admin-subtitle').textContent =
            `Showing ${count.toLocaleString()} platform request${count !== 1 ? 's' : ''} in real time`;
        document.getElementById('admin-last-updated').textContent =
            `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    } catch (err) {
        clearColdStartHint(coldStart);
        renderState('error', err.message === 'Failed to fetch'
            ? 'Cannot connect to the server. Make sure the backend is running.'
            : err.message
        );
        document.getElementById('admin-subtitle').textContent = 'Failed to load data.';
    } finally {
        btn.classList.remove('spinning');
        btn.disabled = false;
    }
}

// ─── Phone filter ─────────────────────────────────────────────────────────────
async function applyPhoneFilter(phone) {
    const loading = document.getElementById('admin-phone-loading');
    loading.classList.add('visible');

    try {
        const res = await fetch(
            `${API_BASE}/api/requests/track?phone=${encodeURIComponent(phone)}`
        );

        if (res.status === 404) {
            phoneFilterIds = new Set();
        } else if (res.ok) {
            const data = await res.json();
            const reqs = Array.isArray(data) ? data : (data.requests || []);
            phoneFilterIds = new Set(reqs.map(r => r.id));
        } else {
            phoneFilterIds = new Set();
        }

        phoneFilterNum = phone;
        document.getElementById('phone-filter-label').textContent = phone;
        document.getElementById('phone-filter-banner').classList.remove('hidden');
        renderList();

    } catch (_) {
        clearPhoneFilter();
    } finally {
        loading.classList.remove('visible');
    }
}

function clearPhoneFilter() {
    phoneFilterIds = null;
    phoneFilterNum = '';
    document.getElementById('phone-filter-banner').classList.add('hidden');
    renderList();
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats() {
    const counts = { Pending: 0, Accepted: 0, 'Pickup Scheduled': 0, Completed: 0, Cancelled: 0 };
    allRequests.forEach(r => { if (r.status in counts) counts[r.status]++; });

    const active = counts.Pending + counts.Accepted + counts['Pickup Scheduled'];

    document.getElementById('astat-total').textContent     = allRequests.length.toLocaleString();
    document.getElementById('astat-active').textContent    = active.toLocaleString();
    document.getElementById('astat-completed').textContent = counts.Completed.toLocaleString();
    document.getElementById('astat-cancelled').textContent = counts.Cancelled.toLocaleString();

    document.querySelectorAll('.admin-filter-btn').forEach(btn => {
        const f = btn.dataset.filter;
        const n = f === 'All' ? allRequests.length : (counts[f] ?? 0);
        btn.textContent = `${f}  ${n}`;
    });
}

// ─── List render ──────────────────────────────────────────────────────────────
function renderList() {
    const list = document.getElementById('admin-list');
    let visible = allRequests;

    if (phoneFilterIds !== null) {
        visible = visible.filter(r => phoneFilterIds.has(r.id));
    }
    if (activeFilter !== 'All') {
        visible = visible.filter(r => r.status === activeFilter);
    }
    if (searchTerm) {
        visible = visible.filter(r =>
            String(r.id).includes(searchTerm) ||
            (r.category || '').toLowerCase().includes(searchTerm) ||
            (r.address  || '').toLowerCase().includes(searchTerm)
        );
    }

    document.getElementById('admin-count-label').textContent =
        visible.length === allRequests.length
            ? `${visible.length.toLocaleString()} request${visible.length !== 1 ? 's' : ''}`
            : `${visible.length.toLocaleString()} of ${allRequests.length.toLocaleString()} requests`;

    if (visible.length === 0) {
        const msg = phoneFilterIds !== null && phoneFilterIds.size === 0
            ? 'No requests found for this phone number.'
            : 'No requests match your current filter or search.';
        list.innerHTML = `
            <div class="admin-state">
                <span class="admin-state-icon">&#128237;</span>
                <p class="admin-state-title">No Results</p>
                <p>${escHtml(msg)}</p>
            </div>`;
        return;
    }

    list.innerHTML = '';
    visible.forEach((req, i) => list.appendChild(buildCard(req, i)));
}

// ─── Card builder ─────────────────────────────────────────────────────────────
function buildCard(req, index) {
    const card = document.createElement('div');
    card.className = 'admin-card';
    card.style.animationDelay = `${Math.min(index * 0.035, 0.28)}s`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Request #${req.id} — ${req.category}, ${req.status}`);

    const icon       = CATEGORY_ICONS[req.category] || '♻️';
    const badgeClass = getBadgeClass(req.status);
    const pts        = (req.estimated_points || 0).toLocaleString();
    const booking    = getLocalBooking(req.id);

    // API data first, localStorage fallback for pre-migration requests
    const prefDate = req.preferred_date || booking.preferred_date || null;
    const slotTime = req.time_slot      || booking.time_slot      || null;
    const slotHtml = (prefDate || slotTime)
        ? `<div class="admin-card-slot">
               ${prefDate ? `<span class="admin-card-slot-item">&#128197; ${escHtml(formatDate(prefDate))}</span>` : ''}
               ${slotTime ? `<span class="admin-card-slot-item">&#128336; ${escHtml(slotTime)}</span>` : ''}
           </div>`
        : '';

    card.innerHTML = `
        <div class="admin-card-main">
            <span class="admin-card-id">#${req.id}</span>
            <div class="admin-card-cat">
                <span class="admin-cat-icon">${icon}</span>
                <span>${escHtml(req.category)}</span>
            </div>
            <span class="admin-card-address">&#128205; ${escHtml(req.address)}</span>
            <span class="admin-card-pts">${pts}&nbsp;pts</span>
            <span class="status-badge ${badgeClass}">${escHtml(req.status)}</span>
            <span class="admin-card-chevron">&#8250;</span>
        </div>
        ${slotHtml}
    `;

    card.addEventListener('click', () => openModal(req));
    card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(req); }
    });

    return card;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(req) {
    activeModalReq = req;
    const booking  = getLocalBooking(req.id);

    // Header
    document.getElementById('modal-req-id').textContent = '#' + req.id;
    const badge = document.getElementById('modal-status-badge');
    badge.textContent = req.status;
    badge.className   = 'status-badge ' + getBadgeClass(req.status);

    // Request details
    document.getElementById('modal-category').textContent =
        (CATEGORY_ICONS[req.category] || '♻️') + ' ' + escHtml(req.category);
    document.getElementById('modal-points').textContent =
        (req.estimated_points || 0).toLocaleString() + ' pts';
    document.getElementById('modal-id-val').textContent = '#' + req.id;
    document.getElementById('modal-address').textContent = req.address || '—';

    // Quantity always comes from the API response
    const qty = req.estimated_quantity;
    setModalField('modal-quantity', qty != null
        ? qty + (qty === 1 ? ' item' : ' items')
        : null);

    // Date/time: API first, localStorage fallback for pre-migration requests
    const prefDate = req.preferred_date || booking.preferred_date || null;
    const timeSlot = req.time_slot      || booking.time_slot      || null;
    setModalField('modal-date', prefDate ? formatDate(prefDate) : null);
    setModalField('modal-time', timeSlot || null);

    // Customer info: API first (joined from users table), localStorage fallback
    setModalField('modal-name',  req.full_name    || booking.full_name    || null);
    setModalField('modal-phone', req.phone_number || booking.phone_number || null);

    // Action button states
    syncModalButtons(req.status);

    // Show
    const overlay = document.getElementById('req-modal-overlay');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => overlay.classList.add('mo-visible'));
    });
    document.body.style.overflow = 'hidden';
}

function setModalField(id, value) {
    const el = document.getElementById(id);
    if (value) {
        el.textContent = value;
        el.classList.remove('muted');
    } else {
        el.textContent = 'Not recorded';
        el.classList.add('muted');
    }
}

function syncModalButtons(status) {
    const show = id => { document.getElementById(id).style.display = ''; };
    const hide = id => { document.getElementById(id).style.display = 'none'; };

    hide('modal-btn-accept');
    hide('modal-btn-schedule');
    hide('modal-btn-complete');
    hide('modal-btn-cancel');
    hide('modal-btn-pending');
    hide('modal-completed-msg');

    if (status === 'Pending') {
        show('modal-btn-accept');
        show('modal-btn-cancel');
    } else if (status === 'Accepted') {
        show('modal-btn-schedule');
        show('modal-btn-cancel');
    } else if (status === 'Pickup Scheduled') {
        show('modal-btn-complete');
        show('modal-btn-cancel');
    } else if (status === 'Completed') {
        show('modal-completed-msg');
    } else if (status === 'Cancelled') {
        show('modal-btn-pending');
    }
}

function closeModal() {
    const overlay = document.getElementById('req-modal-overlay');
    overlay.classList.remove('mo-visible');
    setTimeout(() => {
        overlay.style.display = 'none';
        activeModalReq = null;
    }, 260);
    document.body.style.overflow = '';
}

// ─── Status change ────────────────────────────────────────────────────────────
async function commitStatus(reqId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/api/requests/${reqId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': getAdminToken(),
            },
            body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
    } catch (err) {
        showToast(`Failed to update status: ${err.message}`, 'error');
        return;
    }

    // Update in-memory list
    const req = allRequests.find(r => r.id === reqId);
    if (req) req.status = newStatus;

    // Refresh modal if still open on same request
    if (activeModalReq && activeModalReq.id === reqId) {
        activeModalReq.status = newStatus;
        const badge = document.getElementById('modal-status-badge');
        badge.textContent = newStatus;
        badge.className   = 'status-badge ' + getBadgeClass(newStatus);
        syncModalButtons(newStatus);
    }

    updateStats();
    renderList();

    const icons = {
        Completed: '✅', Cancelled: '🚫', Pending: '🕐',
        Accepted: '✓', 'Pickup Scheduled': '📅',
    };
    showToast(`${icons[newStatus] || ''} Request #${reqId} → ${newStatus}`, 'success');
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function showConfirm({ icon, title, message, okLabel, okClass, callback }) {
    pendingConfirmCb = callback;
    document.getElementById('confirm-icon').textContent    = icon    || '⚠️';
    document.getElementById('confirm-title').textContent   = title   || 'Are you sure?';
    document.getElementById('confirm-message').textContent = message || '';

    const okBtn = document.getElementById('confirm-ok');
    okBtn.textContent = okLabel || 'Confirm';
    okBtn.className   = 'confirm-ok-btn ' + (okClass || '');

    const overlay = document.getElementById('confirm-overlay');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => overlay.classList.add('cf-visible'));
    });
}

function closeConfirm() {
    const overlay = document.getElementById('confirm-overlay');
    overlay.classList.remove('cf-visible');
    setTimeout(() => {
        overlay.style.display = 'none';
        pendingConfirmCb = null;
    }, 220);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('toast-in'));
    });

    setTimeout(() => {
        toast.classList.remove('toast-in');
        setTimeout(() => toast.remove(), 320);
    }, 3200);
}

// ─── State rendering ──────────────────────────────────────────────────────────
function renderState(type, msg) {
    const list = document.getElementById('admin-list');
    document.getElementById('admin-count-label').textContent  = '';
    document.getElementById('admin-last-updated').textContent = '';

    if (type === 'loading') {
        list.innerHTML = Array(5).fill(0).map(() => `
            <div class="admin-skeleton-card">
                <div class="admin-skel-block" style="width:34px"></div>
                <div class="admin-skel-block" style="width:120px"></div>
                <div class="admin-skel-block" style="flex:1; margin:0 10px"></div>
                <div class="admin-skel-block" style="width:54px"></div>
                <div class="admin-skel-badge"></div>
            </div>`).join('');

    } else if (type === 'error') {
        list.innerHTML = `
            <div class="admin-state">
                <span class="admin-state-icon">&#9888;&#65039;</span>
                <p class="admin-state-title">Failed to Load Requests</p>
                <p>${escHtml(msg || 'An unexpected error occurred.')}</p>
                <button class="admin-retry-btn" id="admin-retry-btn">&#8635; Try Again</button>
            </div>`;
        document.getElementById('admin-retry-btn').addEventListener('click', loadRequests);
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getBadgeClass(status) {
    switch (status) {
        case 'Completed':        return 'badge-completed';
        case 'Cancelled':        return 'badge-cancelled';
        case 'Accepted':         return 'badge-accepted';
        case 'Pickup Scheduled': return 'badge-scheduled';
        default:                 return 'badge-pending';
    }
}

function getLocalBooking(reqId) {
    try { return JSON.parse(localStorage.getItem(`eco_booking_${reqId}`)) || {}; }
    catch (_) { return {}; }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const [y, m, d] = dateStr.split('-');
        return new Date(Number(y), Number(m) - 1, Number(d))
            .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) { return dateStr; }
}

function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function csvCell(val) {
    const str = val == null ? '' : String(val);
    return '"' + str.replace(/"/g, '""') + '"';
}

function exportCSV() {
    const exportBtn = document.getElementById('admin-export-btn');
    exportBtn.classList.add('exporting');
    exportBtn.disabled = true;

    try {
        const headers = [
            'Request ID', 'Customer Name', 'Phone Number', 'Address',
            'Category', 'Quantity', 'Reward Points',
            'Pickup Date', 'Time Slot', 'Status', 'Submitted At',
        ];

        const rows = allRequests.map(req => {
            const b = getLocalBooking(req.id);
            return [
                req.id,
                req.full_name          || b.full_name          || '',
                req.phone_number       || b.phone_number       || '',
                req.address            || '',
                req.category           || '',
                req.estimated_quantity != null ? req.estimated_quantity : (b.estimated_quantity != null ? b.estimated_quantity : ''),
                req.estimated_points   != null ? req.estimated_points   : '',
                req.preferred_date     || b.preferred_date     || '',
                req.time_slot          || b.time_slot          || '',
                req.status             || '',
                req.submitted_at       || '',
            ].map(csvCell);
        });

        // UTF-8 BOM makes Excel detect encoding automatically
        const csv = '﻿'
            + [headers.map(csvCell), ...rows].map(r => r.join(',')).join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `eco-collect-requests-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(
            `Downloaded ${allRequests.length} request${allRequests.length !== 1 ? 's' : ''} as CSV`,
            'success'
        );
    } finally {
        exportBtn.classList.remove('exporting');
        exportBtn.disabled = false;
    }
}
