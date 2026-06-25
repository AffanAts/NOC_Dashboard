/**
 * notification.js
 * Alarm History Panel — mencatat setiap alarm yang berbunyi (Panic, Grafana, OPM, PRTG, Kibana, Custom)
 * History persists di localStorage, tampil di bell icon bottom-right.
 */

// 1. INJECT CSS
const notifStyle = document.createElement('style');
notifStyle.innerHTML = `
    #toastContainer {
        position: fixed;
        bottom: 80px;
        left: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
    }
    .toast {
        min-width: 260px;
        max-width: 340px;
        padding: 10px 14px;
        border-radius: 6px;
        color: #c9d1d9;
        font-size: 11px;
        background: #161b22;
        border: 1px solid #30363d;
        box-shadow: 0 8px 20px rgba(0,0,0,0.6);
        pointer-events: auto;
        animation: toastSlideIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    .toast.alarm-panic    { border-left: 5px solid #f85149; }
    .toast.alarm-grafana  { border-left: 5px solid #f0883e; }
    .toast.alarm-opm      { border-left: 5px solid #ff7b72; }
    .toast.alarm-prtg     { border-left: 5px solid #d29922; }
    .toast.alarm-kibana   { border-left: 5px solid #58a6ff; }
    .toast.alarm-custom   { border-left: 5px solid #bc8cff; }

    @keyframes toastSlideIn {
        from { transform: translateX(-120%); opacity: 0; }
        to   { transform: translateX(0);     opacity: 1; }
    }
    @keyframes toastFadeOut {
        from { opacity: 1; }
        to   { opacity: 0; }
    }

    #notifBell {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 45px;
        height: 45px;
        background: #21262d;
        border: 1px solid #30363d;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10000;
        font-size: 18px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        transition: background 0.2s;
    }
    #notifBell:hover { background: #30363d; }
    #notifBell.has-alarm { background: #3d1a1a; border-color: #f85149; animation: bellPulse 1.5s ease infinite; }

    @keyframes bellPulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(248,81,73,0.4); }
        50%      { box-shadow: 0 0 0 8px rgba(248,81,73,0); }
    }

    #notifBadge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #da3633;
        color: white;
        font-size: 10px;
        font-weight: bold;
        font-family: Arial, sans-serif;
        padding: 2px 5px;
        border-radius: 10px;
        display: none;
        min-width: 16px;
        text-align: center;
    }

    #notifRecapPanel {
        position: fixed;
        bottom: 75px;
        right: 20px;
        width: 340px;
        max-height: 500px;
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 8px;
        z-index: 10001;
        display: none;
        flex-direction: column;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        font-family: 'Segoe UI', sans-serif;
    }
    .recap-header {
        padding: 10px 14px;
        border-bottom: 1px solid #30363d;
        font-weight: bold;
        color: #f1e05a;
        font-size: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
    }
    .recap-filter-bar {
        display: flex;
        gap: 4px;
        padding: 6px 10px;
        border-bottom: 1px solid #21262d;
        flex-wrap: wrap;
        flex-shrink: 0;
        background: #0d1117;
    }
    .recap-filter-btn {
        font-size: 9px;
        padding: 2px 7px;
        border-radius: 10px;
        border: 1px solid #30363d;
        background: #21262d;
        color: #8b949e;
        cursor: pointer;
        transition: 0.15s;
    }
    .recap-filter-btn.active { background: #1f6feb; border-color: #388bfd; color: #fff; }
    .recap-body {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .recap-item {
        background: #0d1117;
        border-left: 3px solid #8b949e;
        padding: 7px 10px;
        border-radius: 4px;
        font-size: 11px;
        color: #c9d1d9;
    }
    .recap-item.alarm-panic   { border-left-color: #f85149; }
    .recap-item.alarm-grafana { border-left-color: #f0883e; }
    .recap-item.alarm-opm     { border-left-color: #ff7b72; }
    .recap-item.alarm-prtg    { border-left-color: #d29922; }
    .recap-item.alarm-kibana  { border-left-color: #58a6ff; }
    .recap-item.alarm-custom  { border-left-color: #bc8cff; }
    .recap-item-title { font-weight: bold; margin-bottom: 2px; }
    .recap-item-detail { font-size: 10px; color: #8b949e; line-height: 1.4; word-break: break-word; }
    .recap-item-time { font-size: 9px; color: #484f58; text-align: right; margin-top: 4px; }
    .recap-footer {
        padding: 6px 10px;
        border-top: 1px solid #21262d;
        display: flex;
        justify-content: flex-end;
        flex-shrink: 0;
    }
`;
document.head.appendChild(notifStyle);

// 2. KONSTANTA & HELPER
const ALARM_HISTORY_KEY = 'noc_alarm_history_v1';
const ONE_HOUR_MS = 14400000; // 4 jam

const ALARM_CATEGORY = {
    panic:           'alarm-panic',
    opm_tkt_prio:    'alarm-opm',
    opm_tkt_gen:     'alarm-opm',
    opm_tkt_12m:     'alarm-opm',
    graf_tkt_prio:   'alarm-grafana',
    graf_tkt_gen:    'alarm-grafana',
    prio_new:        'alarm-grafana',
    gen_new:         'alarm-grafana',
    nodata_cpu:      'alarm-grafana',
    nodata_mem:      'alarm-grafana',
    graf_prio_3m:    'alarm-grafana',
    prtg_vip:        'alarm-prtg',
    prtg_gen:        'alarm-prtg',
    kibana_153:      'alarm-kibana',
    kibana_194:      'alarm-kibana',
    kibana_qris:     'alarm-kibana',
    kibana_qris_200: 'alarm-kibana',
    custom:          'alarm-custom'
};

const ALARM_TYPE_LABELS = {
    panic:           '🚨 PANIC BUTTON',
    opm_tkt_prio:    '⭐ OPM Ticket PRIORITY > 5 Min',
    opm_tkt_gen:     '🎫 OPM Ticket Biasa > 5 Min',
    opm_tkt_12m:     '🎫 OPM Ticket > 12 Min',
    graf_tkt_prio:   '⭐ Grafana Ticket PRIORITY > 5 Min',
    graf_tkt_gen:    '🎫 Grafana Ticket Biasa > 5 Min',
    prio_new:        '⭐ Grafana Prio Alert',
    gen_new:         '🔔 Grafana Basic Alert',
    nodata_cpu:      '📵 CPU No Data',
    nodata_mem:      '📵 Memory No Data',
    graf_prio_3m:    '⭐ Grafana Prio > 3 Min',
    prtg_vip:        '📡 PRTG VIP Down',
    prtg_gen:        '📡 PRTG Basic Down',
    kibana_153:      '💳 Kibana -153 (4 Bar Merah)',
    kibana_194:      '💳 Kibana -194 (4 Bar Merah)',
    kibana_qris:     '🚨 QRIS Do Not Honor +20',
    kibana_qris_200: '💀 QRIS Do Not Honor ≥200',
    custom:          '🎯 Custom Grafana Alarm'
};

const FILTER_GROUPS = [
    { id: 'ticket',  label: '⭐ Penting' },
    { id: 'all',     label: 'Semua' },
    { id: 'panic',   label: '🚨 Panic' },
    { id: 'opm',     label: '🖥️ OPM' },
    { id: 'prtg',    label: '📡 PRTG' },
    { id: 'kibana',  label: '💳 Kibana' },
    { id: 'custom',  label: '🎯 Custom' },
];

// Default view: semua alarm penting kecuali basic/spam (prio_new, gen_new, nodata_cpu, nodata_mem)
const TICKET_TYPE_IDS = new Set([
    'panic',
    'opm_tkt_prio', 'opm_tkt_gen', 'opm_tkt_12m',
    'graf_tkt_prio', 'graf_tkt_gen', 'graf_prio_3m',
    'prtg_vip',
    'kibana_153', 'kibana_194', 'kibana_qris', 'kibana_qris_200',
    'custom'
]);

let activeFilter = 'ticket';

// Bersihkan entri spam lama dari localStorage saat script load
(function _cleanLegacySpam() {
    try {
        const raw = JSON.parse(localStorage.getItem(ALARM_HISTORY_KEY) || '[]');
        const cleaned = raw.filter(h => {
            // Hapus nodata (tidak pernah masuk history lagi sejak fix)
            if (h.typeId === 'nodata_cpu' || h.typeId === 'nodata_mem') return false;
            // Hapus PRTG gen format lama: detail berupa "N site PRTG down" tanpa nama site
            if (h.typeId === 'prtg_gen' && /^\d+ site PRTG down$/.test(h.detail || '')) return false;
            if (h.typeId === 'prtg_vip' && /^\d+ site VIP down$/.test(h.detail || '')) return false;
            return true;
        });
        if (cleaned.length !== raw.length) {
            localStorage.setItem(ALARM_HISTORY_KEY, JSON.stringify(cleaned));
        }
    } catch(e) {}
})();

function getAlarmHistory() {
    try { return JSON.parse(localStorage.getItem(ALARM_HISTORY_KEY) || '[]'); } catch(e) { return []; }
}

function getTimeStr(ts) {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    const ss = String(d.getSeconds()).padStart(2,'0');
    return `${hh}:${mm}:${ss} WIB`;
}

function getCategoryForFilter(typeId) {
    const cat = ALARM_CATEGORY[typeId] || '';
    if (cat === 'alarm-panic')   return 'panic';
    if (cat === 'alarm-grafana') return 'grafana';
    if (cat === 'alarm-opm')     return 'opm';
    if (cat === 'alarm-prtg')    return 'prtg';
    if (cat === 'alarm-kibana')  return 'kibana';
    if (cat === 'alarm-custom')  return 'custom';
    return 'other';
}

// 3. REFRESH PANEL — dipanggil dari alarm_engine setiap kali alarm bunyi
window._refreshAlarmHistoryPanel = function() {
    const now = Date.now();
    const raw = getAlarmHistory().filter(h => (now - h.ts) < ONE_HOUR_MS);

    // Update badge
    const badge = document.getElementById('notifBadge');
    const bell  = document.getElementById('notifBell');
    if (badge) {
        if (raw.length > 0) {
            badge.innerText = raw.length > 99 ? '99+' : raw.length;
            badge.style.display = 'block';
            if (bell) bell.classList.add('has-alarm');
        } else {
            badge.style.display = 'none';
            if (bell) bell.classList.remove('has-alarm');
        }
    }

    // Render panel jika terbuka
    const panel = document.getElementById('notifRecapPanel');
    if (!panel || panel.style.display === 'none' || panel.style.display === '') return;

    const rBody = document.getElementById('recapBody');
    if (!rBody) return;

    const filtered = activeFilter === 'all' ? raw
        : activeFilter === 'ticket' ? raw.filter(h => TICKET_TYPE_IDS.has(h.typeId))
        : raw.filter(h => getCategoryForFilter(h.typeId) === activeFilter);

    if (filtered.length === 0) {
        rBody.innerHTML = `<div style="text-align:center;color:#8b949e;font-size:11px;padding:20px 0;">
            ${activeFilter === 'all' ? 'Belum ada alarm dalam 4 jam terakhir.' : 'Tidak ada alarm kategori ini dalam 4 jam terakhir.'}
        </div>`;
        return;
    }

    rBody.innerHTML = filtered.map(h => {
        const cat   = ALARM_CATEGORY[h.typeId] || '';
        const label = ALARM_TYPE_LABELS[h.typeId] || h.typeId;
        const detail = h.detail ? `<div class="recap-item-detail">${h.detail}</div>` : '';
        return `<div class="recap-item ${cat}">
            <div class="recap-item-title">${label}</div>
            ${detail}
            <div class="recap-item-time">${getTimeStr(h.ts)}</div>
        </div>`;
    }).join('');
};

// 4. TOGGLE PANEL
window.toggleNotifRecap = function() {
    const p = document.getElementById('notifRecapPanel');
    if (!p) return;
    const isOpen = p.style.display === 'flex';
    p.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) window._refreshAlarmHistoryPanel();
};

// 5. TOAST — tampil saat alarm bunyi (dipanggil dari alarm_engine)
window.showAlarmToast = function(typeId, detail) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const cat   = ALARM_CATEGORY[typeId] || '';
    const label = ALARM_TYPE_LABELS[typeId] || typeId;

    const toast = document.createElement('div');
    toast.className = `toast ${cat}`;
    toast.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #21262d;padding-bottom:5px;margin-bottom:5px;">
            <span style="font-weight:bold;font-size:11px;">${label}</span>
            <span style="font-size:9px;color:#8b949e;margin-left:8px;white-space:nowrap;">${getTimeStr(Date.now())}</span>
        </div>
        ${detail ? `<div style="font-size:10px;color:#8b949e;line-height:1.4;word-break:break-word;">${detail}</div>` : ''}
    `;

    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'toastFadeOut 0.4s ease forwards';
            setTimeout(() => { if (toast.parentElement) toast.remove(); }, 400);
        }
    }, 8000);
};

// 6. INJECT HTML & INIT
window.addEventListener('DOMContentLoaded', () => {
    // Toast container (bottom-left agar tidak tumpuk dengan alarm bell kanan)
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    document.body.appendChild(toastContainer);

    // Bell button
    const bellBtn = document.createElement('div');
    bellBtn.id = 'notifBell';
    bellBtn.title = 'Alarm History (4 jam terakhir / < 4 HR)';
    bellBtn.onclick = toggleNotifRecap;
    bellBtn.innerHTML = `🔔<span id="notifBadge"></span>`;
    document.body.appendChild(bellBtn);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'notifRecapPanel';

    const filterBtns = FILTER_GROUPS.map(f =>
        `<button class="recap-filter-btn ${f.id === activeFilter ? 'active' : ''}" data-filter="${f.id}" onclick="window._setAlarmFilter('${f.id}')">${f.label}</button>`
    ).join('');

    panel.innerHTML = `
        <div class="recap-header">
            <span>🔔 ALARM HISTORY (< 4 HR)</span>
            <button onclick="toggleNotifRecap()" style="background:transparent;border:none;color:#8b949e;cursor:pointer;font-size:14px;line-height:1;">✕</button>
        </div>
        <div class="recap-filter-bar">${filterBtns}</div>
        <div id="recapBody" class="recap-body">
            <div style="text-align:center;color:#8b949e;font-size:11px;padding:20px 0;">Belum ada alarm dalam 4 jam terakhir.</div>
        </div>
        <div class="recap-footer" style="gap:6px;">
            <button onclick="window._clearNoDataSpam()" style="background:transparent;border:1px solid #30363d;color:#8b949e;font-size:9px;padding:3px 10px;border-radius:3px;cursor:pointer;" onmouseover="this.style.borderColor='#f1e05a';this.style.color='#f1e05a'" onmouseout="this.style.borderColor='#30363d';this.style.color='#8b949e'">🧹 Hapus Spam NoData</button>
            <button onclick="window._clearAlarmHistory()" style="background:transparent;border:1px solid #30363d;color:#8b949e;font-size:9px;padding:3px 10px;border-radius:3px;cursor:pointer;" onmouseover="this.style.borderColor='#f85149';this.style.color='#f85149'" onmouseout="this.style.borderColor='#30363d';this.style.color='#8b949e'">🗑 Hapus Semua</button>
        </div>
    `;
    document.body.appendChild(panel);

    // Refresh badge dari history yang sudah ada (antar refresh halaman)
    window._refreshAlarmHistoryPanel();
    setInterval(window._refreshAlarmHistoryPanel, 60000);
});

window._setAlarmFilter = function(filterId) {
    activeFilter = filterId;
    document.querySelectorAll('.recap-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filterId);
    });
    window._refreshAlarmHistoryPanel();
};

window._clearNoDataSpam = function() {
    try {
        const history = JSON.parse(localStorage.getItem(ALARM_HISTORY_KEY) || '[]');
        const cleaned = history.filter(h => h.typeId !== 'nodata_cpu' && h.typeId !== 'nodata_mem');
        localStorage.setItem(ALARM_HISTORY_KEY, JSON.stringify(cleaned));
        localStorage.removeItem('_noc_last_nodata_cpu');
        localStorage.removeItem('_noc_last_nodata_mem');
    } catch(e) {}
    window._refreshAlarmHistoryPanel();
};

window._clearAlarmHistory = function() {
    if (!confirm('Hapus semua alarm history?')) return;
    localStorage.removeItem(ALARM_HISTORY_KEY);
    localStorage.removeItem('_noc_last_nodata_cpu');
    localStorage.removeItem('_noc_last_nodata_mem');
    window._refreshAlarmHistoryPanel();
};
