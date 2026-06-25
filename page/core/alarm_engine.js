/**
 * alarm_engine.js
 * Mesin Alarm Independen (CCTV Gaib)
 * Update: Hidden Alarms Feature (Grafana Prio 3 Menit) dengan Show/Hide UI
 */

let isGlobalMuted = false;
let isAlarmPlaying = false; 
let currentAudioObj = null;
let currentPlayingTypeId = null;
let playTimeout = null, pauseTimeout = null, alarmWatchdog = null;

// ==========================================
// 1. KONFIGURASI GROUPING KASTA ALARM
// ==========================================
const ALARM_GROUPS = [
    {
        title: "🚨 1. CRITICAL & ESCALATION",
        items: [ { id: 'panic', title: 'PANIC BUTTON (LINK DOWN)', cls: 'ch-panic' } ]
    },
    {
        title: "🎫 2. TICKET ALARMS (TELAT RESPONSE)",
        items: [
            { id: 'opm_tkt_prio',  title: '⭐ OPMANAGER TICKET PRIORITY (> 5 Min)', cls: 'ch-prio-tkt' },
            { id: 'opm_tkt_gen',   title: '🎫 OPMANAGER TICKET BIASA (> 5 Min)',    cls: 'ch-gen-tkt' },
            { id: 'graf_tkt_prio', title: '⭐ GRAFANA TICKET PRIORITY (> 5 Min)',   cls: 'ch-prio-tkt' },
            { id: 'graf_tkt_gen',  title: '🎫 GRAFANA TICKET BIASA (> 5 Min)',      cls: 'ch-gen-tkt' }
        ]
    },
    {
        title: "🔔 3. GRAFANA ALARMS (NEW ALERT)",
        items: [
            { id: 'prio_new',   title: '⭐ Grafana Prio Alert (< 5 Min)',        cls: 'ch-prio-new' },
            { id: 'gen_new',    title: '🔔 Grafana Basic Alert (< 5 Min)',        cls: 'ch-gen-new' },
            { id: 'nodata_cpu', title: '📵 CPU No Data (Hilang dari Grafana)',    cls: 'ch-prio-tkt' },
            { id: 'nodata_mem', title: '📵 Memory No Data (Hilang dari Grafana)', cls: 'ch-prio-tkt' }
        ]
    },
    {
        title: "📡 4. PRTG ALARMS (SITE DOWN)",
        items: [
            { id: 'prtg_vip', title: '⭐ PRTG Priority Site Down', cls: 'ch-prio-new' },
            { id: 'prtg_gen', title: '🔔 PRTG Basic Site Down',    cls: 'ch-gen-new' }
        ]
    },
    {
        title: "💳 5. KIBANA TRANSACTION ALARMS",
        items: [
            { id: 'kibana_153',      title: '🔴 Kibana -153 (4 Bar Merah)',              cls: 'ch-prio-new' },
            { id: 'kibana_194',      title: '🔴 Kibana -194 (4 Bar Merah)',              cls: 'ch-prio-new' },
            { id: 'kibana_qris',     title: '🚨 QRIS Do Not Honor (naik +20)',           cls: 'ch-panic' },
            { id: 'kibana_qris_200', title: '💀 QRIS Do Not Honor (>= 200, CRITICAL)',   cls: 'ch-panic' }
        ]
    },
    {
        title: "🕵️ 6. HIDDEN / SPECIAL ALARMS",
        isHiddenGroup: true,
        items: [
            { id: 'graf_prio_3m',  title: '⭐ GRAFANA PRIO (> 5 Min)',        cls: 'ch-prio-tkt' },
            { id: 'opm_tkt_12m',   title: '🎫 OPMANAGER TICKET (> 12 Min)',   cls: 'ch-prio-tkt' }
        ]
    }
];

const ALARM_IDS = ['panic', 'opm_tkt_prio', 'opm_tkt_gen', 'graf_tkt_prio', 'graf_tkt_gen', 'prio_new', 'gen_new', 'prtg_vip', 'prtg_gen', 'nodata_cpu', 'nodata_mem', 'kibana_153', 'kibana_194', 'kibana_qris', 'kibana_qris_200', 'graf_prio_3m', 'opm_tkt_12m'];

let alarmConfigs = {
    panic:        { enabled: true,  sound: "ahhh.mp3",        vol: 0.39, dur: 2,   rep: 2 },
    opm_tkt_prio: { enabled: true,  sound: "SmokeDet.mp3",    vol: 0.98, dur: 2,   rep: 2 },
    opm_tkt_gen:  { enabled: true,  sound: "SmokeDet.mp3",    vol: 0.98, dur: 1,   rep: 1 },
    graf_tkt_prio:{ enabled: true,  sound: "SmokeDet.mp3",    vol: 0.98, dur: 2,   rep: 2 },
    graf_tkt_gen: { enabled: true,  sound: "SmokeDet.mp3",    vol: 0.98, dur: 1,   rep: 1 },
    prio_new:     { enabled: true,  sound: "amongus.mp3",     vol: 1.0,  dur: 1,   rep: 1 },
    gen_new:      { enabled: true,  sound: "drill_gear.ogg",  vol: 1.0,  dur: 1,   rep: 1 },
    nodata_cpu:   { enabled: true,  sound: "amongus.mp3",     vol: 1.0,  dur: 1,   rep: 2 },
    nodata_mem:   { enabled: true,  sound: "amongus.mp3",     vol: 0.70, dur: 1,   rep: 2 },
    prtg_vip:     { enabled: true,  sound: "ahhh.mp3",        vol: 0.38, dur: 2,   rep: 2 },
    prtg_gen:     { enabled: false, sound: "alarmClock.mp3",  vol: 0.20, dur: 2,   rep: 1 },
    kibana_153:       { enabled: true,  sound: "alarmClock.mp3", vol: 0.88, dur: 0.5, rep: 1 },
    kibana_194:       { enabled: true,  sound: "alarmClock.mp3", vol: 0.88, dur: 0.5, rep: 1 },
    kibana_qris:      { enabled: true,  sound: "alarmClock.mp3", vol: 0.88, dur: 0.5, rep: 1 },
    kibana_qris_200:  { enabled: true,  sound: "amongus.mp3",    vol: 1.0,  dur: 5,   rep: 1 },
    graf_prio_3m: { enabled: false, sound: "Levi.mp3",        vol: 1.0,  dur: 10,  rep: 7 },
    opm_tkt_12m:  { enabled: false, sound: "JohnCena.mp3",    vol: 0.80, dur: 8,   rep: 5 }
};

let availableAlarms = ["SmokeDet.mp3", "drill_gear.ogg", "among us.mp3", "alarmClock.mp3", "JohnCena.mp3", "Levi.mp3", "tititititi.mp3", "cat.mp3", "lawan.mpeg"]; 

function loadAlarmSettings() {
    const saved = localStorage.getItem('noc_alarm_vGrouped');
    if (saved) alarmConfigs = { ...alarmConfigs, ...JSON.parse(saved) };
}
loadAlarmSettings();

function reloadAlarmSettingsFromStorage() {
    loadAlarmSettings();
    if (currentPlayingTypeId && alarmConfigs[currentPlayingTypeId] && alarmConfigs[currentPlayingTypeId].enabled === false) {
        forceStopAlarm();
    } else if (currentAudioObj && currentPlayingTypeId && alarmConfigs[currentPlayingTypeId]) {
        currentAudioObj.volume = parseFloat(alarmConfigs[currentPlayingTypeId].vol);
    }
}

// ==========================================
// CUSTOM GRAFANA ALARM — State & Load
// ==========================================
let customAlarmRules = [];
let customAlarmTriggered = {};
let isFirstCustomScan = true;

function loadCustomAlarmRules() {
    const saved = localStorage.getItem('noc_grafana_custom_rules');
    if (saved) try { customAlarmRules = JSON.parse(saved); } catch(e) {}
}
loadCustomAlarmRules();

function factoryResetAlarm() {
    if(confirm("Hapus memori suara (Termasuk lagu shift)?")) {
        localStorage.removeItem('noc_alarm_vGrouped');
        location.reload();
    }
}

async function fetchAlarmList() {
    try {
        const resp = await fetch('Data_JSON/alarm_list.json?t=' + Date.now());
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) availableAlarms = data;
    } catch (e) {}
}

// ==========================================
// ==========================================
// ALARM HISTORY — catat setiap alarm bunyi
// ==========================================
// CATATAN: ALARM_HISTORY_KEY & ALARM_TYPE_LABELS juga dideklarasikan (const) di
// notification.js, yang dimuat LEBIH DULU dari file ini. Men-deklarasikan ulang
// dengan const/var/let bernama sama di scope global = SyntaxError yang mematikan
// SELURUH file ini. Maka di sini kita TIDAK deklarasikan ulang — cukup pakai dari
// window (sudah disetel notification.js). ALARM_HISTORY_MAX unik milik file ini.
const ALARM_HISTORY_MAX = 200;
// (ALARM_HISTORY_KEY dan ALARM_TYPE_LABELS dipakai langsung — sudah ada di scope global)

function loadAlarmHistory() {
    try { return JSON.parse(localStorage.getItem(ALARM_HISTORY_KEY) || '[]'); } catch(e) { return []; }
}

function pushAlarmHistory(typeId, detail = '') {
    const history = loadAlarmHistory();
    history.unshift({ typeId, detail, ts: Date.now() });
    if (history.length > ALARM_HISTORY_MAX) history.length = ALARM_HISTORY_MAX;
    localStorage.setItem(ALARM_HISTORY_KEY, JSON.stringify(history));
    if (typeof window._refreshAlarmHistoryPanel === 'function') window._refreshAlarmHistoryPanel();
    if (typeof window.showAlarmToast === 'function') window.showAlarmToast(typeId, detail);
}
window.pushAlarmHistory = pushAlarmHistory;

// ==========================================
// 2. AUDIO KILL SWITCH & PLAYER
// ==========================================
function forceStopAlarm() {
    if (currentAudioObj) { currentAudioObj.pause(); currentAudioObj.currentTime = 0; currentAudioObj = null; }
    if (playTimeout) clearTimeout(playTimeout);
    if (pauseTimeout) clearTimeout(pauseTimeout);
    if (alarmWatchdog) clearTimeout(alarmWatchdog);
    currentPlayingTypeId = null;
    isAlarmPlaying = false;
}

function playNocAlarm(typeId, manualConfig = null) {
    if (isGlobalMuted && !manualConfig) return;
    const config = manualConfig || alarmConfigs[typeId];
    if (!config || !config.enabled) return;

    forceStopAlarm();
    currentPlayingTypeId = typeId || null;
    currentAudioObj = new Audio("src/alarm/" + config.sound);
    currentAudioObj.volume = parseFloat(config.vol);
    isAlarmPlaying = true;
    let currentPlayCount = 0;

    // Watchdog: cegah isAlarmPlaying nyangkut 'true' kalau timer main-thread di-throttle
    // (mis. tab background saat shift malam). Paksa reset setelah estimasi durasi total + buffer.
    const watchdogMs = config.rep * (parseFloat(config.dur) * 1000 + 300) + 3000;
    alarmWatchdog = setTimeout(() => { isAlarmPlaying = false; }, watchdogMs);

    const playCycle = () => {
        if (currentPlayCount >= config.rep) { isAlarmPlaying = false; if (alarmWatchdog) clearTimeout(alarmWatchdog); return; }
        currentAudioObj.currentTime = 0;
        currentAudioObj.play().catch(e => console.log("Audio block:", e));
        currentPlayCount++;
        playTimeout = setTimeout(() => {
            if (currentAudioObj) currentAudioObj.pause();
            pauseTimeout = setTimeout(() => {
                if (currentPlayCount < config.rep) playCycle();
                else { isAlarmPlaying = false; if (alarmWatchdog) clearTimeout(alarmWatchdog); }
            }, 300);
        }, parseFloat(config.dur) * 1000);
    };
    playCycle();
}

function toggleGlobalMute() {
    isGlobalMuted = !isGlobalMuted;
    const btn = document.getElementById('muteBtn');
    if (btn) {
        btn.innerText = isGlobalMuted ? "🔕 OFF" : "🔊 ON";
        btn.classList.toggle('active', isGlobalMuted);
        // Indikator visual tegas (tak bergantung pada class .active yang bisa ketimpa inline-style)
        btn.style.color      = isGlobalMuted ? "#ff7b72" : "#3fb950";
        btn.style.fontWeight = "700";
        btn.title = isGlobalMuted ? "Alarm DIMUTE — klik untuk aktifkan" : "Alarm AKTIF — klik untuk mute";
    }
    if (isGlobalMuted) forceStopAlarm();
}

window.addEventListener('storage', (event) => {
    if (event.key === 'noc_alarm_vGrouped') {
        reloadAlarmSettingsFromStorage();
        if (typeof generateAlarmUI === 'function' && document.getElementById('alarmCardsContainer')) {
            generateAlarmUI();
        }
    }
    if (event.key === 'noc_grafana_custom_rules') {
        loadCustomAlarmRules();
        if (typeof generateAlarmUI === 'function' && document.getElementById('alarmCardsContainer')) {
            generateAlarmUI();
        }
    }
});

// ==========================================
// 3. UI MODAL SETTINGS (GROUPED & HIDDEN TOGGLE)
// ==========================================
function toggleCardMute(typeId, isChecked) {
    const card = document.getElementById(`card_${typeId}`);
    if (card) { if (isChecked) card.classList.remove('muted'); else card.classList.add('muted'); }
}

function generateAlarmUI() {
    const container = document.getElementById('alarmCardsContainer');
    if (!container) return;
    container.innerHTML = '';
    
    let hiddenGroupsHtml = `
        <button onclick="const b = document.getElementById('hiddenAlarmsBox'); b.style.display = b.style.display === 'none' ? 'block' : 'none'; this.innerText = b.style.display === 'none' ? '👁️ SHOW HIDDEN ALARMS' : '🙈 HIDE HIDDEN ALARMS';" style="width: 100%; background: #010409; border: 1px dashed #30363d; color: #8b949e; padding: 10px; border-radius: 6px; cursor: pointer; margin-bottom: 15px; font-weight: bold; font-size: 11px; transition: 0.2s;" onmouseover="this.style.borderColor='#58a6ff'; this.style.color='#58a6ff'" onmouseout="this.style.borderColor='#30363d'; this.style.color='#8b949e'">👁️ SHOW HIDDEN ALARMS</button>
        <div id="hiddenAlarmsBox" style="display: none; padding-top: 5px;">
    `;
    let hasHidden = false;

    ALARM_GROUPS.forEach(group => {
        let groupHtml = `
        <div style="background: #010409; border: 1px solid #30363d; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h4 style="margin-top: 0; color: #58a6ff; font-size: 13px; border-bottom: 1px solid #30363d; padding-bottom: 8px; margin-bottom: 15px;">${group.title}</h4>
        `;
        
        group.items.forEach(type => {
            const conf = alarmConfigs[type.id];
            let optionsHtml = '';
            availableAlarms.forEach(file => { optionsHtml += `<option value="${file}" ${file === conf.sound ? 'selected' : ''}>${file}</option>`; });
            const isMutedClass = conf.enabled ? '' : 'muted';
            const isChecked = conf.enabled ? 'checked' : '';

            groupHtml += `
            <div class="alarm-card ${isMutedClass}" id="card_${type.id}">
                <div class="card-header ${type.cls}">
                    <span>${type.title}</span>
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <label class="switch"><input type="checkbox" id="en_${type.id}" ${isChecked} onchange="toggleCardMute('${type.id}', this.checked)"><span class="slider"></span></label>
                        <button onclick="testAlarmPlayback('${type.id}')" style="background:#1f6feb; border:none; color:white; font-size:9px; padding:3px 8px; cursor:pointer; border-radius:3px;">▶️ TEST</button>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 2;"><label>Sound File</label><select id="sel_${type.id}">${optionsHtml}</select></div>
                    <div class="form-group" style="flex: 1.5;"><label>Volume: <span id="volL_${type.id}" style="color:#58a6ff;">${Math.round(conf.vol*100)}%</span></label><input type="range" id="vol_${type.id}" min="0.1" max="1" step="0.1" value="${conf.vol}" oninput="document.getElementById('volL_${type.id}').innerText=Math.round(this.value*100)+'%'"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Dur (Secs)</label><input type="number" id="dur_${type.id}" min="0.5" max="30" step="0.5" value="${conf.dur}"></div>
                    <div class="form-group"><label>Repeat</label><input type="number" id="rep_${type.id}" min="1" max="10" step="1" value="${conf.rep}"></div>
                </div>
            </div>`;
        });
        
        groupHtml += `</div>`; 

        if (group.isHiddenGroup) {
            hiddenGroupsHtml += groupHtml;
            hasHidden = true;
        } else {
            container.insertAdjacentHTML('beforeend', groupHtml);
        }
    });

    if (hasHidden) {
        hiddenGroupsHtml += `</div>`;
        container.insertAdjacentHTML('beforeend', hiddenGroupsHtml);
    }
    _buildCustomAlarmSection(container);
}

function openAlarmModal() {
    generateAlarmUI();
    document.getElementById('alarmModal').style.display = 'flex';
    document.getElementById('alarmStickyFooter').style.display = 'flex';
}
function closeAlarmModal() {
    document.getElementById('alarmModal').style.display = 'none';
    document.getElementById('alarmStickyFooter').style.display = 'none';
    forceStopAlarm();
}
function saveAlarmSettings() {
    ALARM_IDS.forEach(id => {
        alarmConfigs[id] = {
            enabled: document.getElementById(`en_${id}`).checked,
            sound: document.getElementById(`sel_${id}`).value,
            vol: parseFloat(document.getElementById(`vol_${id}`).value),
            dur: parseFloat(document.getElementById(`dur_${id}`).value),
            rep: parseInt(document.getElementById(`rep_${id}`).value)
        };
    });
    localStorage.setItem('noc_alarm_vGrouped', JSON.stringify(alarmConfigs));
    // Simpan juga perubahan custom alarm rules yang belum di-save per-rule
    customAlarmRules.forEach(rule => {
        if (!document.getElementById(`cip_${rule.id}`)) return;
        rule.ip = document.getElementById(`cip_${rule.id}`).value.trim() || rule.ip;
        rule.metric = document.getElementById(`cmet_${rule.id}`).value || rule.metric;
        rule.threshold = parseFloat(document.getElementById(`cthr_${rule.id}`).value) || rule.threshold;
        rule.sound = document.getElementById(`csel_${rule.id}`).value || rule.sound;
        rule.vol = parseFloat(document.getElementById(`cvol_${rule.id}`).value) || rule.vol;
        rule.dur = parseFloat(document.getElementById(`cdur_${rule.id}`).value) || rule.dur;
        rule.rep = parseInt(document.getElementById(`crep_${rule.id}`).value) || rule.rep;
    });
    saveCustomAlarmRulesStorage();
    closeAlarmModal();
}
function testAlarmPlayback(typeId) {
    const testConf = { enabled: true, sound: document.getElementById(`sel_${typeId}`).value, vol: document.getElementById(`vol_${typeId}`).value, dur: document.getElementById(`dur_${typeId}`).value, rep: document.getElementById(`rep_${typeId}`).value };
    playNocAlarm(typeId, testConf);
}

// ==========================================
// CUSTOM GRAFANA ALARM — UI Builder
// ==========================================
function _buildCustomAlarmSection(container) {
    const soundOpts = availableAlarms.map(f => `<option value="${f}">${f}</option>`).join('');

    let html = `
    <div style="background:#010409; border:1px solid #1f6feb; border-radius:8px; padding:15px; margin-bottom:20px;">
        <h4 style="margin-top:0; color:#58a6ff; font-size:13px; border-bottom:1px solid #30363d; padding-bottom:8px; margin-bottom:15px;">🎯 7. GRAFANA CUSTOM ALARM (BY IP)</h4>
        <div id="customRuleList">`;

    if (customAlarmRules.length === 0) {
        html += `<div style="color:#484f58; font-size:11px; padding:8px 0 12px; text-align:center; border-bottom:1px solid #21262d; margin-bottom:12px;">Belum ada custom alarm. Tambah di bawah.</div>`;
    }

    customAlarmRules.forEach(rule => {
        const rOpts = availableAlarms.map(f => `<option value="${f}" ${f===rule.sound?'selected':''}>${f}</option>`).join('');
        const unitLbl = rule.metric==='cpu' ? 'CPU %' : rule.metric==='memory' ? 'Mem %' : 'Packet Loss %';
        const triggeredBadge = customAlarmTriggered[rule.id]
            ? `<span style="background:#da3633;color:#fff;font-size:9px;padding:2px 6px;border-radius:3px;font-weight:bold;">🔴 AKTIF</span>`
            : `<span style="background:#21262d;color:#8b949e;font-size:9px;padding:2px 6px;border-radius:3px;">⚪ Normal</span>`;
        html += `
        <div id="crule_${rule.id}" style="background:#0d1117; border:1px solid #21262d; border-radius:6px; padding:10px 12px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                <label class="switch" title="Enable/Disable"><input type="checkbox" ${rule.enabled?'checked':''} onchange="toggleCustomAlarmRule('${rule.id}',this.checked)"><span class="slider"></span></label>
                <input id="cip_${rule.id}" type="text" value="${rule.ip}" placeholder="IP" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:4px 8px;border-radius:4px;font-size:11px;width:130px;font-family:monospace;">
                <select id="cmet_${rule.id}" onchange="updateCustomUnitLabel('${rule.id}')" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:4px 8px;border-radius:4px;font-size:11px;">
                    <option value="cpu" ${rule.metric==='cpu'?'selected':''}>CPU</option>
                    <option value="memory" ${rule.metric==='memory'?'selected':''}>Memory</option>
                    <option value="availability" ${rule.metric==='availability'?'selected':''}>Availability</option>
                </select>
                <span style="color:#8b949e;font-size:11px;">≥</span>
                <input id="cthr_${rule.id}" type="number" value="${rule.threshold}" min="0" max="100" step="1" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:4px 6px;border-radius:4px;font-size:11px;width:56px;">
                <span id="cunit_${rule.id}" style="color:#8b949e;font-size:10px;">${unitLbl}</span>
                ${triggeredBadge}
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <select id="csel_${rule.id}" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:4px 8px;border-radius:4px;font-size:11px;">${rOpts}</select>
                <input type="range" id="cvol_${rule.id}" min="0.1" max="1" step="0.1" value="${rule.vol}" style="width:70px;" oninput="document.getElementById('cvolL_${rule.id}').innerText=Math.round(this.value*100)+'%'">
                <span id="cvolL_${rule.id}" style="color:#58a6ff;font-size:11px;min-width:30px;">${Math.round(rule.vol*100)}%</span>
                <input id="cdur_${rule.id}" type="number" min="0.5" max="30" step="0.5" value="${rule.dur}" title="Dur (s)" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:4px 6px;border-radius:4px;font-size:11px;width:52px;">
                <input id="crep_${rule.id}" type="number" min="1" max="10" step="1" value="${rule.rep}" title="Repeat" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:4px 6px;border-radius:4px;font-size:11px;width:46px;">
                <button onclick="saveCustomAlarmRule('${rule.id}')" style="background:#238636;border:none;color:#fff;font-size:9px;padding:3px 8px;cursor:pointer;border-radius:3px;">💾 Simpan</button>
                <button onclick="testCustomAlarmById('${rule.id}')" style="background:#1f6feb;border:none;color:#fff;font-size:9px;padding:3px 8px;cursor:pointer;border-radius:3px;">▶ TEST</button>
                <button onclick="deleteCustomAlarmRule('${rule.id}')" style="background:#da3633;border:none;color:#fff;font-size:9px;padding:3px 8px;cursor:pointer;border-radius:3px;">🗑</button>
            </div>
        </div>`;
    });

    html += `
        </div>
        <div style="background:#0d1117; border:1px dashed #30363d; border-radius:6px; padding:12px; margin-top:8px;">
            <div style="color:#8b949e;font-size:11px;font-weight:bold;margin-bottom:10px;">➕ Tambah Rule Baru</div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                <input id="newCip" type="text" placeholder="IP (contoh: 10.30.0.2)" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:5px 8px;border-radius:4px;font-size:11px;width:165px;font-family:monospace;">
                <select id="newCmet" onchange="const u=document.getElementById('newCunit');const v=this.value;u.innerText=v==='cpu'?'CPU %':v==='memory'?'Mem %':'Packet Loss %';" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:5px 8px;border-radius:4px;font-size:11px;">
                    <option value="cpu">CPU</option>
                    <option value="memory">Memory</option>
                    <option value="availability">Availability</option>
                </select>
                <span style="color:#8b949e;font-size:11px;">≥</span>
                <input id="newCthr" type="number" value="80" min="0" max="100" step="1" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:5px 6px;border-radius:4px;font-size:11px;width:58px;">
                <span id="newCunit" style="color:#8b949e;font-size:10px;">CPU %</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <select id="newCsel" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:5px 8px;border-radius:4px;font-size:11px;">${soundOpts}</select>
                <input type="range" id="newCvol" min="0.1" max="1" step="0.1" value="0.8" style="width:70px;" oninput="document.getElementById('newCvolL').innerText=Math.round(this.value*100)+'%'">
                <span id="newCvolL" style="color:#58a6ff;font-size:11px;min-width:30px;">80%</span>
                <input id="newCdur" type="number" min="0.5" max="30" step="0.5" value="2" title="Dur (s)" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:5px 6px;border-radius:4px;font-size:11px;width:52px;">
                <input id="newCrep" type="number" min="1" max="10" step="1" value="2" title="Repeat" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:5px 6px;border-radius:4px;font-size:11px;width:46px;">
                <button onclick="submitCustomAlarmRule()" style="background:#238636;border:1px solid #2ea043;color:#fff;font-weight:bold;font-size:11px;padding:5px 14px;cursor:pointer;border-radius:4px;">+ TAMBAH</button>
            </div>
        </div>
    </div>`;

    container.insertAdjacentHTML('beforeend', html);
}

// ==========================================
// CUSTOM GRAFANA ALARM — CRUD
// ==========================================
function saveCustomAlarmRulesStorage() {
    localStorage.setItem('noc_grafana_custom_rules', JSON.stringify(customAlarmRules));
}

function submitCustomAlarmRule() {
    const ip = document.getElementById('newCip')?.value.trim();
    if (!ip) { alert('IP tidak boleh kosong.'); return; }
    customAlarmRules.push({
        id: 'cr_' + Date.now(),
        ip,
        metric: document.getElementById('newCmet').value,
        threshold: parseFloat(document.getElementById('newCthr').value) || 80,
        sound: document.getElementById('newCsel').value,
        vol: parseFloat(document.getElementById('newCvol').value),
        dur: parseFloat(document.getElementById('newCdur').value),
        rep: parseInt(document.getElementById('newCrep').value),
        enabled: true
    });
    saveCustomAlarmRulesStorage();
    generateAlarmUI();
}

function deleteCustomAlarmRule(id) {
    if (!confirm('Hapus custom alarm rule ini?')) return;
    customAlarmRules = customAlarmRules.filter(r => r.id !== id);
    delete customAlarmTriggered[id];
    saveCustomAlarmRulesStorage();
    generateAlarmUI();
}

function toggleCustomAlarmRule(id, enabled) {
    const rule = customAlarmRules.find(r => r.id === id);
    if (!rule) return;
    rule.enabled = enabled;
    if (!enabled) customAlarmTriggered[id] = false;
    saveCustomAlarmRulesStorage();
}

function saveCustomAlarmRule(id) {
    const rule = customAlarmRules.find(r => r.id === id);
    if (!rule) return;
    rule.ip = document.getElementById(`cip_${id}`)?.value.trim() || rule.ip;
    rule.metric = document.getElementById(`cmet_${id}`)?.value || rule.metric;
    rule.threshold = parseFloat(document.getElementById(`cthr_${id}`)?.value) || rule.threshold;
    rule.sound = document.getElementById(`csel_${id}`)?.value || rule.sound;
    rule.vol = parseFloat(document.getElementById(`cvol_${id}`)?.value) || rule.vol;
    rule.dur = parseFloat(document.getElementById(`cdur_${id}`)?.value) || rule.dur;
    rule.rep = parseInt(document.getElementById(`crep_${id}`)?.value) || rule.rep;
    saveCustomAlarmRulesStorage();
    customAlarmTriggered[id] = false;
}

function testCustomAlarmById(id) {
    const rule = customAlarmRules.find(r => r.id === id);
    if (!rule) return;
    playNocAlarm(null, {
        enabled: true,
        sound: document.getElementById(`csel_${id}`)?.value || rule.sound,
        vol: parseFloat(document.getElementById(`cvol_${id}`)?.value) || rule.vol,
        dur: parseFloat(document.getElementById(`cdur_${id}`)?.value) || rule.dur,
        rep: parseInt(document.getElementById(`crep_${id}`)?.value) || rule.rep
    });
}

function updateCustomUnitLabel(id) {
    const metric = document.getElementById(`cmet_${id}`)?.value;
    const lbl = document.getElementById(`cunit_${id}`);
    if (lbl) lbl.innerText = metric==='cpu' ? 'CPU %' : metric==='memory' ? 'Mem %' : 'Packet Loss %';
}

// ==========================================
// CUSTOM GRAFANA ALARM — SCANNER
// ==========================================
function getLatestGrafanaValue(frames, ip, metric) {
    for (const frame of (frames || [])) {
        const fields = frame.schema?.fields || [];
        const valueField = fields.find(f => f.type === 'number');
        if (!valueField) continue;
        const labels = valueField.labels || {};
        const frameIp = metric === 'availability'
            ? labels.url
            : (labels.instance || '').split(':')[0];
        if (frameIp !== ip) continue;
        const vals = frame.data?.values?.[1] || [];
        for (let i = vals.length - 1; i >= 0; i--) {
            if (vals[i] !== null && vals[i] !== undefined && !isNaN(vals[i])) return vals[i];
        }
    }
    return null;
}

async function independentCustomGrafanaScanner() {
    if (!customAlarmRules.length) return;
    try {
        const t = Date.now();
        const pf = async r => { try { return r?.ok ? ((await r.json()).results?.A?.frames || []) : []; } catch(e) { return []; } };
        const [f1, f2, f3, f4, f5, f6] = await Promise.all([
            fetch('Data_JSON/grafana/raw_cpu_v1.json?t=' + t).catch(() => null),
            fetch('Data_JSON/grafana/raw_cpu_v2.json?t=' + t).catch(() => null),
            fetch('Data_JSON/grafana/raw_mem_v1.json?t=' + t).catch(() => null),
            fetch('Data_JSON/grafana/raw_mem_v2.json?t=' + t).catch(() => null),
            fetch('Data_JSON/grafana/raw_ava_v1.json?t=' + t).catch(() => null),
            fetch('Data_JSON/grafana/raw_ava_v2.json?t=' + t).catch(() => null),
        ]);
        const cpuFrames = [...(await pf(f1)), ...(await pf(f2))];
        const memFrames = [...(await pf(f3)), ...(await pf(f4))];
        const avaFrames = [...(await pf(f5)), ...(await pf(f6))];

        if (isFirstCustomScan) { isFirstCustomScan = false; return; }

        for (const rule of customAlarmRules) {
            if (!rule.enabled) continue;
            const frames = rule.metric === 'cpu' ? cpuFrames : rule.metric === 'memory' ? memFrames : avaFrames;
            const raw = getLatestGrafanaValue(frames, rule.ip, rule.metric);
            if (raw === null) continue;
            const value = rule.metric === 'cpu' ? Math.max(0, raw) : raw;
            const exceeded = value >= rule.threshold;
            if (exceeded && !customAlarmTriggered[rule.id]) {
                customAlarmTriggered[rule.id] = true;
                const metricLabel = rule.metric === 'cpu' ? 'CPU' : rule.metric === 'memory' ? 'Memory' : 'Availability';
                pushAlarmHistory('custom', `${rule.ip} — ${metricLabel} ${value.toFixed(1)} ≥ ${rule.threshold}`);   // log selalu
                // playNocAlarm bypass mute saat manualConfig, jadi cek mute eksplisit di sini
                if (!isGlobalMuted) playNocAlarm(null, { enabled: true, sound: rule.sound, vol: rule.vol, dur: rule.dur, rep: rule.rep });
            } else if (!exceeded) {
                customAlarmTriggered[rule.id] = false;
            }
        }
    } catch(e) {}
}

// ==========================================
// 4. OTAK MATEMATIKA ALARM (GRAFANA & OPM)
// ==========================================
let lastOpmTktPrio = 0, lastOpmTktGen = 0, lastGrafTktPrio = 0, lastGrafTktGen = 0, lastPrioAlert = 0, lastGenAlert = 0, lastGrafPrio3m = 0, lastOpmTkt12m = 0;
let isFirstScanGraf = true; // ISOLASI MEMORI GRAFANA
let seenOpmTktIds = new Set(); // track ticket OPM yang sudah pernah di-fire
let seenGrafTktKeys = new Set(); // track IP+module Grafana ticket yang sudah pernah di-fire

async function independentAlarmScanner() {
    try {
        window._lastAlarmTick = Date.now(); // heartbeat untuk nocAlarmHealth()
        const [resLog, resOpm, resFilt] = await Promise.all([
            fetch('Data_JSON/history_log.json?t=' + Date.now()).catch(() => null),
            fetch('Data_JSON/history_opmanager.json?t=' + Date.now()).catch(() => null),
            fetch('Data_JSON/filter.json?t=' + Date.now()).catch(() => null)
        ]);

        if (!resLog || !resOpm || !resFilt) return;

        // Parse aman: file ini ditulis-ulang start.bat tiap siklus, sesekali ter-baca
        // setengah/kosong. Bila SALAH SATU gagal di-parse, batalkan scan siklus ini
        // (jangan hitung pakai data parsial → bisa salah hitung / alarm palsu).
        // Siklus berikutnya akan membaca versi lengkap.
        const _sj = async (r) => { const t = await r.text(); if (!t || !t.trim()) throw 0; return JSON.parse(t); };
        let logs, opmData, filters;
        try {
            logs    = await _sj(resLog);
            opmData = await _sj(resOpm);
            filters = await _sj(resFilt);
        } catch (e) { return; } // file sedang ditulis — lewati siklus ini dengan aman

        const prioList = filters.priority || [];
        const appIPs = filters.app_level || [];
        const exAva = filters.ex_ava || [];
        const exCpu = filters.ex_cpu || [];
        const exMem = filters.ex_mem || [];
        const nowMs = Date.now();

        let curOpmTktPrio = 0, curOpmTktGen = 0, curGrafTktPrio = 0, curGrafTktGen = 0, curPrioAlert = 0, curGenAlert = 0, curGrafPrio3m = 0, curOpmTkt12m = 0;
        // Simpan detail per-IP untuk ditampilkan di history
        let newGrafTktPrioDetails = [], newGrafTktGenDetails = [], newGrafPrio3mDetails = [];
        let newOpmTktPrioDetails = [], newOpmTktGenDetails = [], newOpmTkt12mDetails = [];

        if (Array.isArray(logs)) {
            let openIssues = {};
            logs.sort((a, b) => new Date(a.time.replace(/-/g, '/')) - new Date(b.time.replace(/-/g, '/'))).forEach(log => {
                const logDate = new Date(log.time.replace(/-/g, '/'));
                const logYear = logDate.getFullYear();
                if (logYear < 2020 || logYear > 2030) return;

                const ipPart = log.ip.split(':')[0];
                const typeRaw = (log.type || "").toUpperCase();
                let module = (typeRaw.includes("CPU")) ? "CPU" : (typeRaw.includes("MEMORY") || typeRaw.includes("MEM") ? "MEM" : "AVA");

                if (module === 'AVA' && exAva.includes(ipPart)) return;
                if (module === 'CPU' && exCpu.includes(ipPart)) return;
                if (module === 'MEM' && exMem.includes(ipPart)) return;

                const critLimit = appIPs.includes(ipPart) ? 60 : 70;
                const key = `${log.ip}-${module}`;
                const isNormal = typeRaw.includes('NORMAL');

                let isCrit = false;
                if (module === "AVA") isCrit = typeRaw.includes('DOWN') || typeRaw.includes('CRIT');
                else {
                    const valMatch = typeRaw.match(/(\d+(\.\d+)?)/);
                    const currentVal = valMatch ? parseFloat(valMatch[0]) : 0;
                    isCrit = typeRaw.includes('HIGH') || typeRaw.includes('CRIT') || (currentVal >= critLimit);
                }

                if (isCrit && !openIssues[key]) {
                    openIssues[key] = { ts: logDate.getTime(), type: log.type || '', module };
                } else if (isNormal && openIssues[key]) {
                    delete openIssues[key];
                }
            });

            // bersihkan key yang sudah resolved (tidak ada di openIssues lagi)
            for (const k of seenGrafTktKeys) {
                if (!openIssues[k]) seenGrafTktKeys.delete(k);
            }

            Object.entries(openIssues).forEach(([key, info]) => {
                const ip = key.split('-')[0].split(':')[0];
                const isPrio = prioList.includes(ip);
                const ageMs = nowMs - info.ts;
                const openAt = new Date(info.ts);
                const jamStr = `${String(openAt.getHours()).padStart(2,'0')}:${String(openAt.getMinutes()).padStart(2,'0')}`;
                const moduleLabel = info.module === 'CPU' ? 'CPU' : info.module === 'MEM' ? 'MEM' : 'AVA';
                const isNew = !seenGrafTktKeys.has(key);

                if (ageMs >= 315000) {
                    if (isPrio) { curGrafTktPrio++; if (isNew) newGrafTktPrioDetails.push(`${ip} [${moduleLabel}] since ${jamStr}`); }
                    else        { curGrafTktGen++;  if (isNew) newGrafTktGenDetails.push(`${ip} [${moduleLabel}] since ${jamStr}`); }
                    seenGrafTktKeys.add(key);
                } else {
                    if (isPrio) {
                        curPrioAlert++;
                        if (ageMs >= 300000) {
                            curGrafPrio3m++;
                            if (isNew) newGrafPrio3mDetails.push(`${ip} [${moduleLabel}] since ${jamStr}`);
                            seenGrafTktKeys.add(key);
                        }
                    } else {
                        curGenAlert++;
                    }
                }
            });
        }

        if (opmData) {
            // bersihkan ticket yg sudah CLOSE dari seen set supaya bisa muncul lagi jika open ulang
            Object.entries(opmData).forEach(([tktKey, t]) => {
                if (t.STATUS === 'CLOSE') seenOpmTktIds.delete(tktKey);
            });
            Object.entries(opmData).forEach(([tktKey, t]) => {
                if (t.STATUS === 'OPEN') {
                    const age = nowMs - t.ISSUE_TS;
                    const openAt = new Date(t.ISSUE_TS);
                    const jamStr = `${String(openAt.getHours()).padStart(2,'0')}:${String(openAt.getMinutes()).padStart(2,'0')}`;
                    const host = t.HOSTNAME || t.IP_ADDRESS || '?';
                    const opmIp = (t.IP_ADDRESS || '').split(':')[0];
                    const isOpmPrio = prioList.includes(opmIp);
                    const shortIssue = (t.DETAIL_ISSUE || '').replace(/\s+/g, ' ').substring(0, 60);
                    const isNew = !seenOpmTktIds.has(tktKey);
                    if (age >= 315000) {
                        curOpmTktPrio += isOpmPrio ? 1 : 0;
                        curOpmTktGen  += isOpmPrio ? 0 : 1;
                        if (isNew) {
                            if (isOpmPrio) newOpmTktPrioDetails.push(`${host} — ${shortIssue} (${jamStr})`);
                            else           newOpmTktGenDetails.push(`${host} — ${shortIssue} (${jamStr})`);
                        }
                    }
                    if (age >= 720000) {
                        curOpmTkt12m++;
                        if (isNew) newOpmTkt12mDetails.push(`${host} — ${shortIssue} (${jamStr})`);
                    }
                    seenOpmTktIds.add(tktKey);
                }
            });
        }

        const homeGraf = document.getElementById('home-graf-open');
        const homeOpm = document.getElementById('home-opm-open');
        const curGrafTktTotal = curGrafTktPrio + curGrafTktGen;
        const curOpmTktTotal = curOpmTktPrio + curOpmTktGen;
        if (homeGraf) { homeGraf.innerText = curGrafTktTotal; homeGraf.style.color = curGrafTktTotal > 0 ? "#f1e05a" : "#3fb950"; }
        if (homeOpm) { homeOpm.innerText = curOpmTktTotal; homeOpm.style.color = curOpmTktTotal > 0 ? "#ff7b72" : "#3fb950"; }

        if (isFirstScanGraf) {
            isFirstScanGraf = false;
        } else {
            let grafSound = null;
            // Prioritas suara per siklus scan (hanya 1 suara diputar).
            // Alarm spesial/eskalasi (>3min, >12min) HARUS menang atas alarm biasa,
            // supaya tidak ke-swallow ketika fire bersamaan dengan opm_tkt/graf_tkt.
            const SOUND_PRIORITY = { graf_prio_3m: 5, opm_tkt_12m: 5, opm_tkt_prio: 4, graf_tkt_prio: 4, opm_tkt_gen: 3, graf_tkt_gen: 3, prio_new: 2, gen_new: 1 };
            const fireGraf = (typeId, detail, logHistory = true) => {
                if (logHistory) pushAlarmHistory(typeId, detail);
                if (!grafSound || (SOUND_PRIORITY[typeId] || 0) > (SOUND_PRIORITY[grafSound] || 0)) grafSound = typeId;
            };
            if (newOpmTktPrioDetails.length > 0)  fireGraf('opm_tkt_prio', newOpmTktPrioDetails.slice(0,5).join(' | '));
            if (newOpmTktGenDetails.length > 0)   fireGraf('opm_tkt_gen',  newOpmTktGenDetails.slice(0,5).join(' | '));
            if (newOpmTkt12mDetails.length > 0)   fireGraf('opm_tkt_12m',  newOpmTkt12mDetails.slice(0,5).join(' | '));
            if (newGrafTktPrioDetails.length > 0) fireGraf('graf_tkt_prio', newGrafTktPrioDetails.slice(0,5).join(' | '));
            if (newGrafTktGenDetails.length > 0)  fireGraf('graf_tkt_gen',  newGrafTktGenDetails.slice(0,5).join(' | '));
            if (newGrafPrio3mDetails.length > 0)  fireGraf('graf_prio_3m',  newGrafPrio3mDetails.slice(0,5).join(' | '));
            if (curPrioAlert > lastPrioAlert)   fireGraf('prio_new', `${curPrioAlert} alert baru Grafana Priority`, false);
            if (curGenAlert > lastGenAlert)     fireGraf('gen_new', `${curGenAlert} alert baru Grafana Basic`, false);
            if (grafSound && !isGlobalMuted) playNocAlarm(grafSound);
        }

        lastOpmTktPrio = curOpmTktPrio;
        lastOpmTktGen = curOpmTktGen;
        lastOpmTkt12m = curOpmTkt12m;
        lastGrafTktPrio = curGrafTktPrio;
        lastGrafTktGen = curGrafTktGen;
        lastGrafPrio3m = curGrafPrio3m;
        lastPrioAlert = curPrioAlert;
        lastGenAlert = curGenAlert;

    } catch (e) {}
}

// ==========================================
// 5. PANIC BUTTON & PRTG SCANNER
// ==========================================
let lastPanicCount = 0;
let isFirstScanPanic = true; 

function _applyPanicDots() {
    const updateDot = (id, status) => {
        const dot = document.getElementById(id); if(!dot) return;
        dot.className = 'status-dot';
        if (status === "Up") dot.classList.add('dot-up'); else if (!status || status === "N/A") dot.classList.add('dot-unknown'); else dot.classList.add('dot-down');
    };
    const box = document.getElementById('panicBtnBox');
    if (typeof panicData1 === 'undefined') return;
    updateDot('dot-SITE-A-adm', panicData1.adminState); updateDot('dot-SITE-A-opr', panicData1.operState);
    updateDot('dot-SITE-B-adm', panicData2.adminState); updateDot('dot-SITE-B-opr', panicData2.operState);
    // Hanya DOWN eksplisit yang trigger alarm. N/A / undefined = data gagal fetch, bukan DOWN.
    const isDown = (s) => s === "Down";
    const hasRealDown = isDown(panicData1.adminState) || isDown(panicData1.operState) ||
                        isDown(panicData2.adminState) || isDown(panicData2.operState);
    const isAllUp = (panicData1.adminState === "Up" && panicData1.operState === "Up" &&
                     panicData2.adminState === "Up" && panicData2.operState === "Up");

    let curPanicCount = hasRealDown ? 1 : 0;
    if (isAllUp || !hasRealDown) { if(box) box.classList.remove('panic-alert-bg'); }
    else { if(box) box.classList.add('panic-alert-bg'); }

    if (isFirstScanPanic) {
        isFirstScanPanic = false;
    } else {
        if (curPanicCount > lastPanicCount) {
            const a1 = panicData1.adminState||'?', o1 = panicData1.operState||'?';
            const a2 = panicData2.adminState||'?', o2 = panicData2.operState||'?';
            pushAlarmHistory('panic', `SITE-A Admin:${a1} Oper:${o1} | SITE-B Admin:${a2} Oper:${o2}`);
            playNocAlarm('panic');
        }
    }
    lastPanicCount = curPanicCount;
}

function independentPanicScanner() {
    const old = document.getElementById('_panicScriptTag');
    if (old) old.remove();
    const s = document.createElement('script');
    s.id = '_panicScriptTag';
    s.src = 'Data_JSON/panic_data.js?t=' + Date.now();
    s.onload = () => { _applyPanicDots(); if (typeof window._reapplyPanicDots === 'function') window._reapplyPanicDots(); };
    s.onerror = () => { s.remove(); _applyPanicDots(); };
    document.head.appendChild(s);
}

// MEMORI ISOLASI PRTG
let lastPrtgVipCount = 0;
let lastPrtgGenCount = 0;
let isFirstScanPrtg = true; 

function independentPrtgScanner() {
    const s = document.createElement('script');
    s.id = 'prtg-alarm-loader'; 
    s.src = 'Data_JSON/prtg_data.js?t=' + Date.now();
    
    s.onload = () => {
        if (typeof prtgData === 'undefined') return;
        
        let allAlarms = [];
        if (prtgData.MPLS && prtgData.MPLS.alarms) allAlarms = allAlarms.concat(prtgData.MPLS.alarms);
        if (prtgData.INTERNET && prtgData.INTERNET.alarms) allAlarms = allAlarms.concat(prtgData.INTERNET.alarms);

        const vipLocations = ['kota-a', 'kota-b', 'kota-c', 'training-center'];
        let curPrtgVipCount = 0;
        let curPrtgGenCount = 0;
        
        allAlarms.forEach(a => {
            let deviceName = (a.device || "").toLowerCase();
            let isVip = false;

            let isTargetLocation = vipLocations.some(loc => deviceName.includes(loc));

            if (isTargetLocation) {
                if (deviceName.includes('training-center')) {
                    isVip = true; 
                } 
                else if (deviceName.includes('kantor pusat') || deviceName.includes('kp ') || deviceName.includes('kp-') || deviceName.includes('[kp]')) {
                    isVip = true;
                }
            }

            if (deviceName.includes("kcp") || deviceName.includes("cabang pembantu")) {
                isVip = false; 
            }

            if (isVip) {
                curPrtgVipCount++; 
            } else {
                curPrtgGenCount++; 
            }
        });

        if (isFirstScanPrtg) {
            isFirstScanPrtg = false;
        } else {
            let prtgSound = null;
            if (curPrtgVipCount > lastPrtgVipCount) {
                const vipAlarms = allAlarms.filter(a => {
                    const n = (a.device||'').toLowerCase();
                    const isVipLoc = ['kota-a','kota-b','kota-c','training-center'].some(l => n.includes(l));
                    const isKcp = n.includes('kcp') || n.includes('cabang pembantu');
                    if (isKcp) return false;
                    if (n.includes('training-center')) return true;
                    return isVipLoc && (n.includes('kantor pusat')||n.includes('kp ')||n.includes('kp-')||n.includes('[kp]'));
                });
                const detail = vipAlarms.slice(0,4).map(a => {
                    const name = (a.device||'').replace(/^\d+\s+/,'').trim();
                    const dt = (a.downtime||'').trim().replace(/&nbsp;/,'—');
                    return `${name} (down: ${dt})`;
                }).join(' | ') || `${curPrtgVipCount} site VIP down`;
                pushAlarmHistory('prtg_vip', detail);
                prtgSound = 'prtg_vip';
            }
            if (curPrtgGenCount > lastPrtgGenCount) {
                const genAlarms = allAlarms.filter(a => {
                    const n = (a.device||'').toLowerCase();
                    const isVipLoc = ['kota-a','kota-b','kota-c','training-center'].some(l => n.includes(l));
                    const isKcp = n.includes('kcp') || n.includes('cabang pembantu');
                    if (isKcp || (isVipLoc && !isKcp)) return false;
                    return true;
                });
                const detail = genAlarms.slice(0,4).map(a => {
                    const name = (a.device||'').replace(/^\d+\s+/,'').trim();
                    const dt = (a.downtime||'').trim().replace(/&nbsp;/,'—');
                    return `${name} (${dt})`;
                }).join(' | ') || `${curPrtgGenCount} site PRTG down`;
                pushAlarmHistory('prtg_gen', detail);
                if (!prtgSound) prtgSound = 'prtg_gen';
            }
            if (prtgSound && !isGlobalMuted) playNocAlarm(prtgSound);
        }
        
        lastPrtgVipCount = curPrtgVipCount;
        lastPrtgGenCount = curPrtgGenCount;
        
        document.getElementById('prtg-alarm-loader').remove();
    };
    
    s.onerror = () => { if(document.getElementById('prtg-alarm-loader')) document.getElementById('prtg-alarm-loader').remove(); };
    document.head.appendChild(s);
}

function _nocShowCopyToast(msg) {
    const prev = document.getElementById('_nocCopyToast');
    if (prev) prev.remove();
    if (!document.getElementById('_nocToastStyle')) {
        const s = document.createElement('style');
        s.id = '_nocToastStyle';
        s.textContent = '@keyframes _nocToastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}';
        document.head.appendChild(s);
    }
    const el = document.createElement('div');
    el.id = '_nocCopyToast';
    el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:#1a3d22;color:#aff5b4;border:1px solid #3fb950;border-radius:8px;padding:11px 16px;font-family:Segoe UI,sans-serif;font-size:13px;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,0.5);animation:_nocToastIn 0.25s ease;max-width:320px;min-width:180px;';
    el.innerHTML = `<span style="font-size:15px">✓</span><span style="flex:1;line-height:1.4">${msg}</span><span onclick="this.parentElement.remove()" style="cursor:pointer;opacity:0.6;font-size:14px;padding-left:6px">✕</span>`;
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentElement) el.remove(); }, 4000);
}

function escalatePanic() {
    if (typeof panicData1 === 'undefined' || typeof panicData2 === 'undefined') { alert("Data belum tersedia."); return; }
    const a1 = panicData1.adminState || "N/A", o1 = panicData1.operState || "N/A";
    const a2 = panicData2.adminState || "N/A", o2 = panicData2.operState || "N/A";
    if (a1 === "Up" && o1 === "Up" && a2 === "Up" && o2 === "Up") { alert("Semua Link AMAN (UP)."); return; }
    const msg = `🚨 *PANIC BUTTON ESCALATION* 🚨\n\nDear Team, @all\n\nTerjadi *Panic Button* (Link Utama DOWN):\n\n📍 *STATUS:*\n• SITE-A : Admin [${a1}] | Operasional [${o1}]\n• SITE-B : Admin [${a2}] | Operasional [${o2}]\n\nMohon pengecekan segera. Terima kasih.`;
    navigator.clipboard.writeText(msg).then(() => {
        document.getElementById('panicBtnBox').style.backgroundColor = "#2ea043";
        setTimeout(() => { document.getElementById('panicBtnBox').style.backgroundColor = ""; }, 300);
        _nocShowCopyToast("Teks Panic Button ter-copy ke clipboard!");
    });
}

function checkScheduledAlarm() {
    if(isGlobalMuted) return; 
    const t = new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});
    if (["22:27", "07:00", "14:30"].includes(t)) {
        forceStopAlarm(); 
        const sAlarm = document.getElementById('scheduledAlarm');
        if(sAlarm) {
            sAlarm.src = "src/alarm/alarm_shift.mp3"; 
            sAlarm.currentTime = 0; sAlarm.play().catch(e => {});
        }
    } 
}

// ==========================================
// AUDIO UNLOCK + ANTI-FREEZE KEEP-ALIVE (MODE TIDUR)
// Masalah 1: browser memblokir Audio.play() yang dipicu timer/Worker sebelum user berinteraksi.
// Masalah 2: browser (Chrome "Memory Saver"/freezing) MEMBEKUKAN tab yang lama di background,
//            sehingga scanner berhenti & alarm tidak bunyi walau tab masih terbuka.
//
// Solusi anti-freeze (berlapis, supaya WORK 100% selama PC menyala):
//   A) Putar AUDIO HENING yang loop terus. Tab yang sedang "playing audio" DIKECUALIKAN dari
//      freezing/discarding -> main thread tetap hidup -> tick Worker diproses -> alarm bunyi.
//   B) Tahan Web Lock selamanya (tab yang memegang Web Lock juga dikecualikan dari freezing).
//   C) Screen Wake Lock (best-effort) supaya layar tidak tidur saat tab aktif.
//   D) Watchdog 4 dtk: nyalakan ulang keep-alive bila sempat ter-pause (mis. direbut audio focus).
//   E) Re-sync saat tab kembali terlihat.
// CATATAN PENTING: ini TIDAK bisa melawan SLEEP/HIBERNATE level OS. PC harus tetap MENYALA
// (layar boleh mati). Set Windows: Power & sleep -> Sleep = Never.
// ==========================================
let _nocAudioUnlocked = false;
let _keepAliveCtx = null;
let _nocWakeLock = null;

// Keep-alive anti-freeze via Web Audio dengan gain = 0 (NOL MUTLAK -> mustahil berbunyi).
// Sengaja TIDAK pakai elemen <audio> bersuara, supaya tidak ada bunyi yang bisa lepas kendali
// dari tombol MUTE/STOP. AudioContext yang "running" membantu tab tetap aktif; dipadukan dengan
// Web Lock + Wake Lock. Jaminan anti-freeze 100% tetap dari setting browser (Memory Saver).
function _startKeepAlive() {
    try {
        if (!_keepAliveCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            _keepAliveCtx = new AC();
            const osc = _keepAliveCtx.createOscillator();
            const gain = _keepAliveCtx.createGain();
            gain.gain.value = 0; // hening total — tidak mengeluarkan suara apa pun
            osc.connect(gain).connect(_keepAliveCtx.destination);
            osc.start(0);
        }
        if (_keepAliveCtx.state === 'suspended') _keepAliveCtx.resume().catch(() => {});
    } catch (e) {}
}

// Tahan Web Lock selamanya (promise tidak pernah resolve) — pertahankan tab dari freezing.
function _holdWebLock() {
    try {
        if (navigator.locks && navigator.locks.request) {
            navigator.locks.request('noc-alarm-keepalive', { mode: 'exclusive' }, () => new Promise(() => {}));
        }
    } catch (e) {}
}

async function _acquireWakeLock() {
    try {
        if ('wakeLock' in navigator && !document.hidden) {
            _nocWakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (e) {}
}

function _unlockNocAudio() {
    if (_nocAudioUnlocked) return;
    _nocAudioUnlocked = true;
    try {
        const primer = new Audio("src/alarm/SmokeDet.mp3");
        primer.volume = 0;
        const p = primer.play();
        if (p && p.then) p.then(() => { primer.pause(); primer.currentTime = 0; }).catch(() => {});
    } catch (e) {}
    _startKeepAlive();   // A) audio hening anti-freeze
    _holdWebLock();      // B) tahan Web Lock
    _acquireWakeLock();  // C) cegah layar tidur
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
        document.removeEventListener(ev, _unlockNocAudio, true));
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, _unlockNocAudio, true));

// E) Saat tab kembali terlihat: pastikan keep-alive + wake lock hidup, lalu scan segera.
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && _nocAudioUnlocked) {
        _startKeepAlive();
        _acquireWakeLock();
        if (typeof independentAlarmScanner === 'function') independentAlarmScanner();
        if (typeof independentPanicScanner === 'function') independentPanicScanner();
        if (typeof independentPrtgScanner === 'function') independentPrtgScanner();
    }
});

// D) Watchdog: jaga keep-alive tetap menyala.
setInterval(() => { if (_nocAudioUnlocked) _startKeepAlive(); }, 4000);

// Diagnostik: ketik nocAlarmHealth() di Console (F12) untuk cek apakah proteksi aktif.
window.nocAlarmHealth = function () {
    const ageSec = Math.round((Date.now() - (window._lastAlarmTick || 0)) / 1000);
    const info = {
        audioUnlocked: _nocAudioUnlocked,
        keepAliveRunning: !!(_keepAliveCtx && _keepAliveCtx.state === 'running'),
        muted: typeof isGlobalMuted !== 'undefined' ? isGlobalMuted : '??',
        wakeLockActive: !!_nocWakeLock,
        tabHidden: document.hidden,
        lastScanSecondsAgo: ageSec
    };
    console.table(info);
    return info;
};

// 6. INITIALIZATION — Gunakan Web Worker agar interval tidak di-freeze browser saat tab background
fetchAlarmList();

document.addEventListener('DOMContentLoaded', () => {
    // Jalankan sekali langsung saat DOM siap
    independentAlarmScanner();
    independentCustomGrafanaScanner();
    _applyPanicDots();
    independentPanicScanner();
    independentPrtgScanner();

    // Path worker relatif terhadap document (index.html), bukan terhadap file ini
    const _workerBase = document.baseURI || (window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/'));
    const _nocWorker = new Worker(_workerBase.replace(/index\.html$/, '') + 'src/alarm_worker.js');
    _nocWorker.onmessage = (e) => {
        const tick = e.data && e.data.tick;
        if (tick === 'alarm')    independentAlarmScanner();
        else if (tick === 'panic')    independentPanicScanner();
        else if (tick === 'prtg')     independentPrtgScanner();
        else if (tick === 'shift')    checkScheduledAlarm();
        else if (tick === 'grafana_custom') independentCustomGrafanaScanner();
        else if (tick === 'masterui' && typeof fetchMasterUI === 'function') fetchMasterUI();
    };

    // Fallback: jika Worker gagal (misal file lokal tanpa server), gunakan setInterval biasa
    _nocWorker.onerror = () => {
        setInterval(independentAlarmScanner, 10000);
        setInterval(independentPanicScanner, 10000);
        setInterval(independentPrtgScanner, 15000);
        setInterval(checkScheduledAlarm, 10000);
        setInterval(independentCustomGrafanaScanner, 10000);
    };
});

document.addEventListener('DOMContentLoaded', () => {
    const modalActions = document.querySelector('.modal-actions');
    if (modalActions) {
        modalActions.insertAdjacentHTML('afterbegin', '<button onclick="factoryResetAlarm()" style="background: transparent; color: #8b949e; border: 1px solid #30363d; padding: 6px 12px; border-radius: 4px; margin-right: 10px;">🔄 RESET AUDIO CACHE</button>');
    }
});