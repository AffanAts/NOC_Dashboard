/**
 * page/tools/fu_unified.js
 * Follow Up Report — Modal terpadu (FU Pagi, FU ITSM, EOS Report)
 * Input Alert Open tersimpan di localStorage, persisten walau modal ditutup.
 *
 * Depends on (loaded before this file):
 *   fu_pagi.js  → _fuXlsxDownload, _fuBuildDiskXlsx, _fuDateStr, FU_WA_RECIPIENTS, sendFuEskalasi
 *   fu_itsm.js  → _itsmBuildAlertOpenXlsx, _itsmDateFull, _itsmShiftLabel,
 *                  _itsmLoadDiskRows, _itsmFetchOpen, _itsmGenerateAndCopy
 *   eos_report.js → _eosGetDefaultShift, _eosTglID, _eosNow,
 *                   _eosLoadConfig, _eosRunWithParams, _eosShowSettingPanel
 */

const _FU_ALERT_LS_KEY = 'noc_fu_alert_open_v1';
let _fuActiveTab        = 'pagi';
let _fuAlertSaveTimer   = null;
let _fuUnifiedDiskRows  = [];

// ── LocalStorage helpers ──────────────────────────────────────────────────────

function _fuAlertLoad() {
    try {
        const raw = localStorage.getItem(_FU_ALERT_LS_KEY);
        if (!raw) return { text: '', savedAt: null };
        return JSON.parse(raw);
    } catch(e) { return { text: '', savedAt: null }; }
}

function _fuAlertSave(text) {
    const data = { text, savedAt: Date.now() };
    localStorage.setItem(_FU_ALERT_LS_KEY, JSON.stringify(data));
    return data;
}

function _fuAlertFmtTime(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    const M = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}`;
}

function _fuEscHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Open / Close modal ────────────────────────────────────────────────────────

function openFollowUpReport() {
    document.getElementById('_fuReportModal')?.remove();

    const { text: savedText, savedAt } = _fuAlertLoad();
    const savedLabel     = savedAt ? 'Terakhir diperbarui: ' + _fuAlertFmtTime(savedAt) : 'Belum ada data tersimpan';
    const savedLabelStyle = savedAt
        ? 'color:#3fb950;font-size:11px;font-weight:700;'
        : 'color:#484f58;font-size:10px;';

    const modal = document.createElement('div');
    modal.id = '_fuReportModal';
    modal.style.cssText = 'display:flex;position:fixed;z-index:11000;inset:0;background:#0d1117;flex-direction:column;font-family:\'Segoe UI\',system-ui,sans-serif;overflow:hidden;';

    modal.innerHTML = `
    <!-- ══ HEADER ══ -->
    <div style="padding:0 32px;height:56px;background:#161b22;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">📊</span>
            <div>
                <div style="color:#f1e05a;font-weight:700;font-size:15px;letter-spacing:0.3px;">FOLLOW UP REPORT</div>
                <div style="color:#484f58;font-size:11px;margin-top:1px;">FU Pagi · FU ITSM · EOS Report</div>
            </div>
        </div>
        <button onclick="closeFollowUpReport()" style="background:transparent;border:1px solid #30363d;color:#8b949e;padding:6px 18px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;letter-spacing:0.3px;"
            onmouseover="this.style.background='#21262d';this.style.borderColor='#8b949e';this.style.color='#c9d1d9';"
            onmouseout="this.style.background='transparent';this.style.borderColor='#30363d';this.style.color='#8b949e';">
            ← Kembali
        </button>
    </div>

    <!-- ══ BODY ══ -->
    <div style="flex:1;display:flex;flex-direction:column;padding:24px 32px;gap:20px;overflow-y:auto;">

        <!-- ── ALERT OPEN (shared, persistent) ── -->
        <div style="background:#161b22;border:1px solid #21262d;border-top:2px solid #58a6ff;border-radius:10px;overflow:hidden;flex-shrink:0;">
            <div style="padding:10px 16px;display:flex;align-items:center;gap:8px;">
                <span style="font-size:13px;">📋</span>
                <span style="color:#c9d1d9;font-size:12px;font-weight:700;letter-spacing:0.4px;">ALERT OPEN</span>
                <span style="color:#484f58;font-size:10px;">— dipakai semua tab</span>
                <span style="margin-left:auto;">
                    <span style="${savedLabelStyle}" id="_fuAlertSavedLbl">${savedLabel}</span>
                </span>
            </div>
            <!-- Tombol paste selalu di tengah -->
            <div style="padding:12px 16px;border-top:1px solid #21262d;display:flex;align-items:center;justify-content:center;gap:14px;">
                <button onclick="_fuAlertPasteDummy()"
                    style="background:linear-gradient(135deg,#0d2d4a,#1a4a6e);border:2px solid #388bfd;color:#79c0ff;padding:10px 40px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.5px;box-shadow:0 0 18px rgba(56,139,253,0.35);transition:all 0.2s;"
                    onmouseover="this.style.background='linear-gradient(135deg,#1a4a6e,#1f5f9e)';this.style.boxShadow='0 0 28px rgba(56,139,253,0.6)';this.style.borderColor='#79c0ff';this.style.color='#cae8ff';"
                    onmouseout="this.style.background='linear-gradient(135deg,#0d2d4a,#1a4a6e)';this.style.boxShadow='0 0 18px rgba(56,139,253,0.35)';this.style.borderColor='#388bfd';this.style.color='#79c0ff';">
                    📋&nbsp;&nbsp;Paste Alert Open
                </button>
                <span id="_fuPasteStatus" style="font-size:12px;font-weight:700;opacity:0;transition:opacity 0.3s;"></span>
            </div>
            <textarea id="_fuAlertTA" wrap="off"
                oninput="_fuAlertOnInput();_fuAlertRenderPreview()"
                style="display:none;height:0;width:0;opacity:0;position:absolute;">${_fuEscHtml(savedText)}</textarea>
            <div id="_fuAlertPreview" style="overflow-x:auto;max-height:180px;overflow-y:auto;"></div>
        </div>

        <!-- ── TABS ── -->
        <div style="display:flex;flex-direction:column;flex:1;min-height:0;">
            <div style="display:flex;border-bottom:2px solid #21262d;flex-shrink:0;">
                <button id="_fuTab_pagi" onclick="_fuSwitchTab('pagi')" style="${_fuTabBtnStyle(true)}">☀️ FU Pagi</button>
                <button id="_fuTab_itsm" onclick="_fuSwitchTab('itsm')" style="${_fuTabBtnStyle(false)}"><img src="src/img/itsm.svg" style="width:15px;height:15px;vertical-align:middle;margin-right:5px;margin-bottom:1px;"> FU ITSM</button>
                <button id="_fuTab_eos"  onclick="_fuSwitchTab('eos')"  style="${_fuTabBtnStyle(false)}">🌙 EOS Report</button>
            </div>
            <div id="_fuTabContent" style="padding-top:20px;overflow-y:auto;flex:1;"></div>
        </div>

    </div>`;

    document.body.appendChild(modal);
    _fuActiveTab = 'pagi';
    _fuRenderTab('pagi');
    _fuAlertRenderPreview();
}

function closeFollowUpReport() {
    document.getElementById('_fuReportModal')?.remove();
}

// ── Tab styling & switching ───────────────────────────────────────────────────

function _fuTabBtnStyle(active) {
    return active
        ? 'background:transparent;border:none;border-bottom:2px solid #58a6ff;margin-bottom:-2px;color:#e6edf3;padding:8px 22px;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit;transition:all 0.15s;'
        : 'background:transparent;border:none;border-bottom:2px solid transparent;margin-bottom:-2px;color:#8b949e;padding:8px 22px;cursor:pointer;font-size:13px;font-family:inherit;transition:all 0.15s;';
}

function _fuSwitchTab(tab) {
    _fuActiveTab = tab;
    ['pagi', 'itsm', 'eos'].forEach(t => {
        const btn = document.getElementById('_fuTab_' + t);
        if (btn) btn.style.cssText = _fuTabBtnStyle(t === tab);
    });
    _fuRenderTab(tab);
}

function _fuRenderTab(tab) {
    const el = document.getElementById('_fuTabContent');
    if (!el) return;
    if (tab === 'pagi')      el.innerHTML = _fuTabPagiHtml();
    else if (tab === 'itsm') el.innerHTML = _fuTabItsmHtml();
    else if (tab === 'eos')  el.innerHTML = _fuTabEosHtml();
}

// ── Alert auto-save (debounced 500ms) ────────────────────────────────────────

function _fuAlertOnInput() {
    clearTimeout(_fuAlertSaveTimer);
    _fuAlertSaveTimer = setTimeout(() => {
        const text = document.getElementById('_fuAlertTA')?.value || '';
        const data = _fuAlertSave(text);
        const lbl  = document.getElementById('_fuAlertSavedLbl');
        if (lbl) {
            lbl.textContent   = 'Terakhir diperbarui: ' + _fuAlertFmtTime(data.savedAt);
            lbl.style.color      = '#3fb950';
            lbl.style.fontSize   = '11px';
            lbl.style.fontWeight = '700';
        }
    }, 500);
}

// ── Dummy inject (portfolio mode — no clipboard needed) ───────────────────────

function _fuAlertPasteDummy() {
    const now = new Date();
    const d = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
    const rows = [
        [d, 'INC-20240001', 'CPU usage tinggi > 90% sustained 15 menit',        '10.20.0.101'],
        [d, 'INC-20240002', 'Disk usage partition /data mencapai 87%',           '10.20.2.13'],
        [d, 'INC-20240003', 'Interface Down GigabitEthernet0/0/5 link flapping', '10.20.1.216'],
        [d, 'INC-20240004', 'Memory usage tinggi > 85% aplikasi payment lambat', '10.20.0.19'],
        [d, 'INC-20240005', 'Device Down no response from device 5 polls',       '10.20.2.14'],
        [d, 'INC-20240006', 'Disk usage partition /var/log full 95%',            '10.20.5.107'],
    ];
    const text = rows.map(r => r.join('\t')).join('\n');
    const ta = document.getElementById('_fuAlertTA');
    if (!ta) return;
    ta.value = text;
    const data = _fuAlertSave(text);
    const lbl = document.getElementById('_fuAlertSavedLbl');
    if (lbl) {
        lbl.textContent  = 'Terakhir diperbarui: ' + _fuAlertFmtTime(data.savedAt);
        lbl.style.color      = '#3fb950';
        lbl.style.fontSize   = '11px';
        lbl.style.fontWeight = '700';
    }
    _fuAlertHideError();
    _fuPasteStatus('ok', `Demo data dimuat — ${rows.length} tiket`);
    _fuAlertRenderPreview();
}

// ── Paste dari clipboard ke hidden textarea + render preview ─────────────────

async function _fuAlertPaste() {
    let text;
    try {
        text = await navigator.clipboard.readText();
    } catch(e) {
        _fuAlertShowError('Tidak bisa akses clipboard: ' + e.message);
        _fuPasteStatus('err', 'Clipboard tidak bisa diakses');
        return;
    }

    // Validasi format: kolom 1 = tanggal (M/D/YY atau M/D/YYYY + opsional jam), kolom 4 = IP
    const reDate = /^\d{1,2}\/\d{1,2}\/\d{2,4}(\s+\d{1,2}:\d{2})?$/;
    const reIp   = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

    function _isValidLine(line) {
        const p = line.trim().split('\t');
        if (p.length < 4) return false;
        const dateOk = reDate.test(p[0].trim());
        const ipRaw  = p[p.length - 1].trim().split(':')[0];  // strip port jika ada
        const ipOk   = reIp.test(ipRaw);
        return dateOk && ipOk;
    }

    const lines = text.trim().split('\n').filter(l => l.trim());
    if (!lines.length) {
        _fuAlertShowError('Clipboard kosong.');
        _fuPasteStatus('err', 'Clipboard kosong');
        return;
    }

    const invalidCount = lines.filter(l => !_isValidLine(l)).length;
    const validCount   = lines.length - invalidCount;

    if (invalidCount === lines.length) {
        _fuAlertShowError('Format salah — tiap baris harus: Tanggal[TAB]Case[TAB]Detail Issue[TAB]IP Address. Kolom pertama harus tanggal (M/D/YY), kolom terakhir harus IP.');
        _fuPasteStatus('err', 'Format tidak valid — bukan data Alert Open');
        return;
    }
    if (invalidCount > 0) {
        _fuAlertShowError(`${invalidCount} dari ${lines.length} baris format-nya tidak valid dan akan dilewati.`);
        _fuPasteStatus('warn', `${validCount} baris dimuat, ${invalidCount} baris dilewati`);
    } else {
        _fuAlertHideError();
        _fuPasteStatus('ok', `Alert Open berhasil dimuat — ${validCount} baris`);
    }

    const ta = document.getElementById('_fuAlertTA');
    if (!ta) return;
    ta.value = text;
    const data = _fuAlertSave(text);
    const lbl = document.getElementById('_fuAlertSavedLbl');
    if (lbl) {
        lbl.textContent   = 'Terakhir diperbarui: ' + _fuAlertFmtTime(data.savedAt);
        lbl.style.color      = '#3fb950';
        lbl.style.fontSize   = '11px';
        lbl.style.fontWeight = '700';
    }
    _fuAlertRenderPreview();
}

function _fuAlertShowError(msg) {
    let el = document.getElementById('_fuAlertErr');
    if (!el) {
        el = document.createElement('div');
        el.id = '_fuAlertErr';
        el.style.cssText = 'padding:7px 14px;background:rgba(248,81,73,0.1);border-top:1px solid rgba(248,81,73,0.3);color:#f85149;font-size:11px;line-height:1.5;';
        const preview = document.getElementById('_fuAlertPreview');
        preview?.parentElement?.insertBefore(el, preview);
    }
    el.textContent = '⚠ ' + msg;
    el.style.display = 'block';
}

function _fuAlertHideError() {
    const el = document.getElementById('_fuAlertErr');
    if (el) el.style.display = 'none';
}

function _fuPasteStatus(type, msg) {
    const el = document.getElementById('_fuPasteStatus');
    if (!el) return;
    const colors = { ok: '#3fb950', warn: '#d29922', err: '#f85149' };
    el.style.color   = colors[type] || '#c9d1d9';
    el.textContent   = msg;
    el.style.opacity = '1';
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => { el.style.opacity = '0'; }, 4000);
}

function _fuAlertRenderPreview() {
    const el = document.getElementById('_fuAlertPreview');
    if (!el) return;
    const rows = _fuGetAlertRows();

    if (!rows.length) {
        el.innerHTML = '<div style="padding:8px 16px 12px;color:#484f58;font-size:11px;text-align:center;">Belum ada data — copy dari sumber lalu klik Paste.</div>';
        return;
    }
    const cols = ['Tanggal', 'Case', 'Detail Issue', 'IP Address'];
    const thStyle = 'padding:6px 12px;text-align:left;color:#8b949e;font-size:10.5px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid #21262d;white-space:nowrap;';
    const tdStyle = 'padding:5px 12px;font-size:11.5px;color:#c9d1d9;border-bottom:1px solid #161b22;white-space:nowrap;';
    const tdIpStyle = 'padding:5px 12px;font-size:11.5px;color:#79c0ff;border-bottom:1px solid #161b22;font-family:Consolas,monospace;white-space:nowrap;';
    el.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-family:'Segoe UI',system-ui,sans-serif;">
        <thead style="background:#0d1117;position:sticky;top:0;">
            <tr>
                <th style="${thStyle}">#</th>
                ${cols.map(c => `<th style="${thStyle}">${c}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${rows.map((r, i) => `
            <tr style="background:${i % 2 === 0 ? '#0d1117' : 'transparent'};transition:background 0.1s;"
                onmouseover="this.style.background='#1c2128'" onmouseout="this.style.background='${i % 2 === 0 ? '#0d1117' : 'transparent'}'">
                <td style="${tdStyle}color:#484f58;">${i + 1}</td>
                <td style="${tdStyle}color:#e3b341;">${_fuEscHtml(r.dateStr)}</td>
                <td style="${tdStyle}font-weight:600;">${_fuEscHtml(r.caseStr)}</td>
                <td style="${tdStyle}color:#8b949e;max-width:260px;overflow:hidden;text-overflow:ellipsis;">${_fuEscHtml(r.detail)}</td>
                <td style="${tdIpStyle}">${_fuEscHtml(r.ip)}</td>
            </tr>`).join('')}
        </tbody>
    </table>
    <div style="padding:6px 14px;background:#0d1117;border-top:1px solid #21262d;color:#484f58;font-size:10.5px;">
        ${rows.length} tiket
    </div>`;
}

// ── Stale check: apakah Alert Open belum diupdate sebelum threshold shift ────

function _fuAlertStaleCheck(tab) {
    const { savedAt } = _fuAlertLoad();
    if (!savedAt) return true;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let thresholdDate;

    if (tab === 'pagi') {
        thresholdDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 25);
    } else {
        if (nowMin >= 7*60 && nowMin < 14*60+30) {
            // S1 → pulang 15:00 → threshold 14:10
            thresholdDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 10);
        } else if (nowMin >= 14*60+30 && nowMin < 22*60+30) {
            // S2 → pulang 23:00 → threshold 22:10
            thresholdDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 10);
        } else if (nowMin >= 22*60+30) {
            // S3 awal (22:30-23:59) → threshold besok 06:40, belum lewat → aman
            return false;
        } else {
            // S3 akhir (00:00-07:29) → pulang 07:30 → threshold 06:40
            thresholdDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 40);
        }
    }

    // Alert jika data disimpan sebelum waktu threshold (kapanpun generate-nya)
    return savedAt < thresholdDate.getTime();
}

// ── Custom stale dialog (Promise → true = lanjut, false = batal) ─────────────

function _fuAlertStalePrompt(tab) {
    return new Promise(resolve => {
        document.getElementById('_fuStaleOverlay')?.remove();

        const { savedAt } = _fuAlertLoad();
        const time = savedAt ? _fuAlertFmtTime(savedAt) : 'belum pernah';

        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        let shiftLabel, thresholdStr;
        if (tab === 'pagi') {
            shiftLabel = 'FU Pagi'; thresholdStr = '09:25';
        } else if (nowMin >= 7*60 && nowMin < 14*60+30) {
            shiftLabel = 'Shift 1'; thresholdStr = '14:10';
        } else if (nowMin >= 14*60+30 && nowMin < 22*60+30) {
            shiftLabel = 'Shift 2'; thresholdStr = '22:10';
        } else {
            shiftLabel = 'Shift 3'; thresholdStr = '06:40';
        }

        const overlay = document.createElement('div');
        overlay.id = '_fuStaleOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
        overlay.innerHTML = `
        <div style="background:#161b22;border:1px solid #30363d;border-top:3px solid #d29922;border-radius:14px;padding:28px 30px;width:360px;box-shadow:0 24px 64px rgba(0,0,0,0.7);font-family:'Segoe UI',system-ui,sans-serif;">
            <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:20px;">
                <div style="font-size:30px;line-height:1;flex-shrink:0;">⚠️</div>
                <div>
                    <div style="color:#e6edf3;font-size:14px;font-weight:700;line-height:1.3;">Data Alert Open<br>Belum Diperbarui</div>
                    <div style="color:#8b949e;font-size:11px;margin-top:5px;">${shiftLabel} — minimal pukul <span style="color:#d29922;font-weight:600;">${thresholdStr}</span></div>
                </div>
            </div>

            <div style="background:#0d1117;border:1px solid #21262d;border-radius:9px;padding:14px 16px;margin-bottom:20px;">
                <div style="color:#484f58;font-size:10px;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:6px;">Terakhir diperbarui</div>
                <div style="color:#d29922;font-size:22px;font-weight:700;letter-spacing:0.5px;">${time}</div>
            </div>

            <div style="display:flex;flex-direction:column;gap:9px;">
                <button id="_fuStaleUpdate"
                    style="background:linear-gradient(135deg,#271d00,#3d2c00);border:1.5px solid #d29922;color:#e3b341;padding:12px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.15s;letter-spacing:0.2px;text-align:center;"
                    onmouseover="this.style.background='linear-gradient(135deg,#3d2c00,#5a4000)';this.style.borderColor='#e3b341';"
                    onmouseout="this.style.background='linear-gradient(135deg,#271d00,#3d2c00)';this.style.borderColor='#d29922';">
                    ✏️ Update Data Dulu
                </button>
                <button id="_fuStaleContinue"
                    style="background:#21262d;border:1px solid #30363d;color:#8b949e;padding:11px 16px;border-radius:8px;font-size:12px;cursor:pointer;transition:all 0.15s;"
                    onmouseover="this.style.background='#2d333b';this.style.color='#c9d1d9'"
                    onmouseout="this.style.background='#21262d';this.style.color='#8b949e'">
                    Lanjutkan pakai data ${time}
                </button>
            </div>
        </div>`;

        document.body.appendChild(overlay);
        document.getElementById('_fuStaleUpdate').onclick    = () => { overlay.remove(); resolve(false); };
        document.getElementById('_fuStaleContinue').onclick  = () => { overlay.remove(); resolve(true);  };
    });
}

// ── Parse alert rows dari shared textarea ────────────────────────────────────

function _fuGetAlertRows() {
    const text = (document.getElementById('_fuAlertTA')?.value || '').trim();
    const rows = [];
    text.split('\n').forEach(line => {
        line = line.trim(); if (!line) return;
        const p = line.split('\t');
        rows.push({
            dateStr: (p[0] || '').trim(),
            caseStr: (p[1] || '').trim(),
            detail:  (p[2] || '').trim(),
            ip:      (p[3] || '').trim().split(':')[0]
        });
    });
    return rows;
}

// ── Shared: build + download Alert Open xlsx (format & nama seperti FU ITSM) ──

async function _fuDownloadAlertOpenXlsx(rows, mode = 'eos') {
    let opmKamus = {}, rvKamus = {};
    try {
        const [invR, rvR] = await Promise.all([
            fetch('Data_JSON/opmanager_inventory.json?t=' + Date.now()).catch(() => null),
            fetch('Data_JSON/RVTOOLS.json?t=' + Date.now()).catch(() => null)
        ]);
        if (invR && invR.ok) {
            const inv = await invR.json();
            (inv.rows || []).forEach(i => {
                const ip = (i.ipaddress  || '').trim();
                const nm = (i.displayName|| '').trim();
                if (ip && nm) opmKamus[ip] = nm;
            });
        }
        if (rvR && rvR.ok) {
            const rv = await rvR.json();
            Object.keys(rv).forEach(ip => { rvKamus[ip] = rv[ip].VM; });
        }
    } catch(e) {}
    const bytes   = _itsmBuildAlertOpenXlsx(rows, opmKamus, rvKamus);
    const dateStr = _itsmDateFull(), shift = _itsmShiftLabel();
    let fname;
    if (mode === 'pagi')      fname = `Alert Open (${dateStr}).xlsx`;
    else if (mode === 'itsm') fname = `Alert Open EndOfShift - ${dateStr} (${shift}).xlsx`;
    else                      fname = `NOC Alert Open - ${dateStr} (${shift}).xlsx`;
    _fuXlsxDownload(bytes, fname);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB — FU PAGI
// ═══════════════════════════════════════════════════════════════════════════════

function _fuTabPagiHtml() {
    const dateStr = _fuComputerDateFull();
    const waRows  = typeof FU_WA_RECIPIENTS !== 'undefined' ? FU_WA_RECIPIENTS : [];
    const followUpText = _fuBuildFollowUpBaruText(dateStr);
    return `
    <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">

        <!-- Kiri: Export buttons -->
        <div style="width:300px;flex-shrink:0;display:flex;flex-direction:column;gap:14px;">
            <div style="background:#161b22;border:1px solid #21262d;border-top:2px solid #8957e5;border-radius:10px;overflow:hidden;">
                <div style="padding:12px 16px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #21262d;">
                    <img src="src/img/excel.svg" style="width:18px;height:18px;vertical-align:middle;">
                    <span style="color:#c9d1d9;font-size:12px;font-weight:700;letter-spacing:0.4px;">EXPORT EXCEL</span>
                </div>
                <div style="padding:12px 16px;display:flex;flex-direction:column;gap:10px;">
                    <button onclick="_fuPagiExportAlert()"
                        style="background:linear-gradient(135deg,#8957e5,#a371f7);border:none;color:white;padding:10px 16px;border-radius:7px;cursor:pointer;font-weight:700;font-size:12px;transition:opacity 0.15s;"
                        onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                        <img src="src/img/excel.svg" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;margin-bottom:1px;"> Export Alert Open xlsx
                    </button>
                    <div id="_fuPagiAlertSt" style="font-size:11px;color:#8b949e;min-height:14px;"></div>
                    <hr style="border:none;border-top:1px solid #21262d;margin:2px 0;">
                    <button onclick="_fuPagiExportDisk()"
                        style="background:linear-gradient(135deg,#b45309,#d97706);border:none;color:white;padding:10px 16px;border-radius:7px;cursor:pointer;font-weight:700;font-size:12px;transition:opacity 0.15s;"
                        onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                        <img src="src/img/excel.svg" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;margin-bottom:1px;"> Export Disk Alert xlsx
                    </button>
                    <div id="_fuPagiDiskSt" style="font-size:11px;color:#8b949e;min-height:14px;"></div>
                </div>
            </div>
        </div>

        <!-- Kanan: WA Eskalasi -->
        <div style="flex:1;min-width:280px;">
            <div style="background:#161b22;border:1px solid #21262d;border-top:2px solid #25D366;border-radius:10px;overflow:hidden;">
                <div style="padding:12px 16px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #21262d;">
                    <img src="src/img/whatsapp.svg" style="width:18px;height:18px;vertical-align:middle;">
                    <span style="color:#c9d1d9;font-size:12px;font-weight:700;letter-spacing:0.4px;">PESAN FOLLOW UP</span>
                    <span style="margin-left:auto;color:#484f58;font-size:10px;">⚠ Lampiran file dikirim manual</span>
                </div>
                <div style="padding:10px 16px 14px;display:flex;flex-direction:column;gap:10px;">
                    <div style="background:#0d1117;border:1px solid #21262d;border-radius:8px;overflow:hidden;">
                        <div style="padding:8px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #21262d;">
                            <div style="flex:1;">
                                <span style="color:#e6edf3;font-size:12px;font-weight:600;">Follow Up Grup</span>
                                <span style="color:#484f58;font-size:10px;font-family:'Consolas',monospace;margin-left:8px;"></span>
                            </div>
                            <button onclick="_fuOpenFollowUpBaruWA()"
                                style="background:#0d4a1f;border:1px solid #238636;color:#3fb950;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;transition:all 0.15s;"
                                onmouseover="this.style.background='#58a6ff';this.style.color='white';"
                                onmouseout="this.style.background='#0d4a1f';this.style.color='#3fb950';">
                                <img src="src/img/whatsapp.svg" style="width:14px;height:14px;vertical-align:middle;margin-right:5px;margin-bottom:1px;"> Kirim WA
                            </button>
                        </div>
                        <div style="padding:8px 12px;color:#8b949e;font-size:11px;line-height:1.7;white-space:pre-wrap;">${_fuEscHtml(followUpText)}</div>
                    </div>
                    ${waRows.map((r, i) => {
                        const closing = r.sapaan === 'Mba'
                            ? 'Mohon dibantu pengecekan dan updatenya mba. Terima kasih'
                            : 'Mohon dibantu pengecekan dan updatenya. Terima kasih';
                        const preview = `Selamat Pagi ${r.sapaan}, mohon maaf mengganggu waktunya, izin mengirim data alert yang tiketnya masih status open dan overall disk usage di atas 70% per tanggal ${dateStr}\n${closing}`;
                        return `
                        <div style="background:#0d1117;border:1px solid #21262d;border-radius:8px;overflow:hidden;">
                            <div style="padding:7px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #21262d;">
                                <div style="flex:1;">
                                    <span style="color:#e6edf3;font-size:12px;font-weight:600;">${r.name}</span>
                                    <span style="color:#484f58;font-size:10px;font-family:'Consolas',monospace;margin-left:8px;">${r.number.replace('62','0')}</span>
                                </div>
                                <button onclick="sendFuEskalasi(${i})"
                                    style="background:#0d4a1f;border:1px solid #238636;color:#3fb950;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;transition:all 0.15s;"
                                    onmouseover="this.style.background='#238636';this.style.color='white';"
                                    onmouseout="this.style.background='#0d4a1f';this.style.color='#3fb950';">
                                    <img src="src/img/whatsapp.svg" style="width:14px;height:14px;vertical-align:middle;margin-right:5px;margin-bottom:1px;"> Kirim WA
                                </button>
                            </div>
                            <div style="padding:8px 12px;color:#8b949e;font-size:11px;line-height:1.7;white-space:pre-wrap;">${preview}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>

    </div>`;
}

function _fuComputerDateFull() {
    const now = new Date();
    const M = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return `${now.getDate()} ${M[now.getMonth()]} ${now.getFullYear()}`;
}

function _fuBuildFollowUpBaruText(dateStr) {
    return `Dear Team,\nEng @Sam\nEng @John\nEng @Ryan\nEng @Dana\nEng @Alex\nTeam @Helpdesk\n\nizin mengirim data alert yang tiketnya masih status open dan overall disk usage di atas 70% per tanggal ${dateStr}\nMohon dibantu pengecekan dan updatenya. Terima kasih\n\nCC : Mgr @Yossi`;
}

function showCopyToast(msg) {
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

function _fuOpenFollowUpBaruWA() {
    const text = _fuBuildFollowUpBaruText(_fuComputerDateFull());
    navigator.clipboard.writeText(text).then(() => {
        showCopyToast("Teks Follow Up ter-copy ke clipboard!");
    });
}

async function _fuPagiExportAlert() {
    const stEl = document.getElementById('_fuPagiAlertSt');
    const rows = _fuGetAlertRows();
    if (!rows.length) {
        if (stEl) stEl.innerHTML = '<span style="color:#f85149;">Isi Alert Open terlebih dahulu.</span>';
        return;
    }
    if (_fuAlertStaleCheck('pagi')) {
        const proceed = await _fuAlertStalePrompt('pagi');
        if (!proceed) return;
    }
    if (stEl) stEl.innerHTML = '<span style="color:#f1e05a;">🔄 Membuat Excel...</span>';
    try {
        await _fuDownloadAlertOpenXlsx(rows, 'pagi');
        if (stEl) stEl.innerHTML = `<span style="color:#3fb950;">✓ ${rows.length} tiket — File terdownload.</span>`;
    } catch(e) {
        if (stEl) stEl.innerHTML = `<span style="color:#f85149;">❌ ${e.message}</span>`;
    }
}

async function _fuPagiExportDisk() {
    const stEl = document.getElementById('_fuPagiDiskSt');
    if (stEl) stEl.innerHTML = '<span style="color:#f1e05a;">🔄 Memuat data disk...</span>';

    try {
        const resp = await fetch('Data_JSON/disk_data.js?t=' + Date.now());
        if (!resp.ok) throw new Error('disk_data.js tidak ditemukan');
        const txt = await resp.text();
        const fn = new Function(
            txt.replace(/\bvar\s+dataDisk1\b/, 'var _fd1').replace(/\bvar\s+dataDisk2\b/, 'var _fd2')
            + '; return { d1: typeof _fd1!=="undefined"?_fd1:null, d2: typeof _fd2!=="undefined"?_fd2:null };'
        );
        const { d1, d2 } = fn();

        function pf(res) {
            if (!res) return [];
            const out = [];
            for (const f of (res?.results?.A?.frames ?? [])) {
                const lbl    = f.schema?.fields?.[1]?.labels ?? {};
                const ipFull = lbl.instance ?? '';
                const ip     = ipFull.split(':')[0];
                const mount  = lbl.mountpoint ?? '/';
                if (!ip) continue;
                const vals = (f.data?.values?.[1] ?? []).filter(v => v != null && !isNaN(v));
                if (!vals.length) continue;
                out.push({ ipFull, ip, mount,
                    min:  Math.min(...vals),
                    max:  Math.max(...vals),
                    mean: vals.reduce((a, b) => a + b, 0) / vals.length,
                    last: vals[vals.length - 1]
                });
            }
            return out;
        }

        let rows = [...pf(d1), ...pf(d2)].filter(r => r.last >= 70).sort((a, b) => b.last - a.last);
        try {
            const rv = await fetch('Data_JSON/RVTOOLS.json?t=' + Date.now());
            if (rv.ok) { const rvD = await rv.json(); rows.forEach(r => { r.hostname = (rvD[r.ip] || {}).VM || ''; }); }
        } catch(e) {}

        const dateStr = _itsmDateFull();
        const bytes   = _fuBuildDiskXlsx(rows, dateStr);
        _fuXlsxDownload(bytes, `Alert Disk (${dateStr}).xlsx`);
        const crit = rows.filter(r => r.last >= 85).length;
        if (stEl) stEl.innerHTML = `<span style="color:#3fb950;">✓ ${rows.length} entri (${crit} kritis) — File terdownload.</span>`;
    } catch(e) {
        if (stEl) stEl.innerHTML = `<span style="color:#f85149;">❌ ${e.message}</span>`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB — FU ITSM
// ═══════════════════════════════════════════════════════════════════════════════

function _fuTabItsmHtml() {
    const dateStr = _itsmDateFull(), shift = _itsmShiftLabel();
    return `
    <div style="max-width:560px;">
        <div style="background:#161b22;border:1px solid #21262d;border-top:2px solid #8957e5;border-radius:10px;overflow:hidden;">
            <div style="padding:12px 16px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #21262d;">
                <img src="src/img/itsm.svg" style="width:18px;height:18px;vertical-align:middle;">
                <span style="color:#c9d1d9;font-size:12px;font-weight:700;letter-spacing:0.4px;">FOLLOW UP ITSM</span>
                <span style="margin-left:auto;color:#484f58;font-size:11px;">${dateStr} — ${shift}</span>
            </div>
            <div style="padding:14px 16px;display:flex;flex-direction:column;gap:12px;">
                <div style="display:flex;gap:8px;">
                    <button id="_fuItsmMainBtn" onclick="_fuItsmRun()"
                        style="flex:1;background:linear-gradient(135deg,#4a1d8c,#8957e5);border:none;color:#fff;padding:12px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(137,87,229,0.35);cursor:pointer;transition:opacity 0.2s;">
                        <img src="src/img/excel.svg" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;margin-bottom:1px;"><img src="src/img/whatsapp.svg" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;margin-bottom:1px;"> Download Semua + Kirim ke WhatsApp
                    </button>
                    <button onclick="_fuItsmCopyText()"
                        style="background:#21262d;border:1px solid #30363d;color:#8b949e;font-size:12px;padding:10px 14px;border-radius:8px;cursor:pointer;transition:all 0.15s;font-weight:600;white-space:nowrap;"
                        onmouseover="this.style.background='#30363d';this.style.color='#e6edf3'"
                        onmouseout="this.style.background='#21262d';this.style.color='#8b949e'">
                        📋 Salin Teks
                    </button>
                </div>
                <div style="text-align:center;font-size:10.5px;color:#484f58;">Alert Open xlsx · Disk xlsx · Gambar ITSM → WhatsApp Web</div>
                <div id="_fuItsmSt" style="min-height:20px;font-size:11px;color:#8b949e;line-height:2;"></div>
            </div>
        </div>
    </div>`;
}

async function _fuItsmRun() {
    const btn = document.getElementById('_fuItsmMainBtn');
    const st  = document.getElementById('_fuItsmSt');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; }
    const upd = html => { if (st) st.innerHTML = html; };

    const alertRows = _fuGetAlertRows();
    const dateStr   = _itsmDateFull(), shift = _itsmShiftLabel();

    try {
        if (_fuAlertStaleCheck('itsm')) {
            const proceed = await _fuAlertStalePrompt('itsm');
            if (!proceed) {
                if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
                return;
            }
        }

        upd('🔄 <b>1/4</b> Membuat Excel Alert Open...');
        if (!alertRows.length) throw new Error('Data Alert Open kosong. Isi terlebih dahulu di atas.');
        await _fuDownloadAlertOpenXlsx(alertRows, 'itsm');

        upd(`✅ <b>1/4</b> Alert Open xlsx (${alertRows.length} tiket)<br>🔄 <b>2/4</b> Mengambil data disk...`);
        const diskRows = await _itsmLoadDiskRows();
        const crit     = diskRows.filter(r => r.last >= 85).length;
        _fuXlsxDownload(_fuBuildDiskXlsx(diskRows, dateStr), `Alert Disk EndOfShift - ${dateStr} (${shift}).xlsx`);

        upd(`✅ <b>1/4</b> Alert Open xlsx (${alertRows.length} tiket)<br>✅ <b>2/4</b> Disk xlsx (${diskRows.length} entri, ${crit} kritis)<br>🔄 <b>3/4</b> Mengambil tiket ITSM...`);
        const tickets = await _itsmFetchOpen(new AbortController().signal);
        upd(`✅ <b>1/4</b> Alert Open xlsx<br>✅ <b>2/4</b> Disk xlsx<br>🔄 <b>3/4</b> Membuat gambar (${tickets.length} tiket)...`);
        const waText = _fuItsmWaText();
        await navigator.clipboard.writeText(waText);
        await new Promise(r => setTimeout(r, 400));
        await _itsmGenerateAndCopy(tickets);

        upd(`✅ <b>1/4</b> Alert Open xlsx<br>✅ <b>2/4</b> Disk xlsx<br>✅ <b>3/4</b> Gambar di clipboard<br>✅ <b>4/4</b> Selesai!<br><span style="color:#3fb950;">Ctrl+V paste gambar, Win+V untuk teks.</span>`);
        showCopyToast("Gambar & teks ter-copy ke clipboard!");

    } catch(e) {
        upd(`<span style="color:#f85149;">❌ ${e.message}</span>`);
    } finally {
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
    }
}

async function _fuItsmCopyText() {
    const st = document.getElementById('_fuItsmSt');
    try {
        await navigator.clipboard.writeText(_fuItsmWaText());
        if (st) st.innerHTML = '<span style="color:#3fb950;">✓ Teks disalin ke clipboard.</span>';
        setTimeout(() => { if (st && st.innerHTML.includes('Teks disalin')) st.textContent = ''; }, 3000);
    } catch(e) {
        if (st) st.innerHTML = `<span style="color:#f85149;">Gagal salin: ${e.message}</span>`;
    }
}

function _fuItsmWaText() {
    const dateStr = _itsmDateFull(), shift = _itsmShiftLabel();
    return `Dear Team,\nEng @Alex\nEng @Fria\nEng @Dana\nEng @John\nEng @Sam\nEng @Ryan\n\nBerikut terlampir data update per tanggal ${dateStr} (${shift}) mengenai:\n- Tiket yang masih berstatus Open.\n- Data alert untuk tiket open dengan overall disk usage di atas 70%.\n\nMohon dibantu untuk melakukan pengecekan serta update progress terkait tiket-tiket tersebut.\nTerima kasih.\n\ncc: Mgr @Yossi`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB — EOS REPORT
// ═══════════════════════════════════════════════════════════════════════════════

function _fuTabEosHtml() {
    const defaults = (typeof _eosGetDefaultShift === 'function') ? _eosGetDefaultShift() : { onShift: '', nextShift: '' };
    const tgl      = (typeof _eosTglID === 'function' && typeof _eosNow === 'function') ? _eosTglID(_eosNow()) : '';
    return `
    <div style="max-width:560px;">
        <div style="background:#161b22;border:1px solid #21262d;border-top:2px solid #2b78c5;border-radius:10px;overflow:hidden;">
            <div style="padding:12px 16px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #21262d;">
                <span>🌙</span>
                <span style="color:#c9d1d9;font-size:12px;font-weight:700;letter-spacing:0.4px;">EOS REPORT</span>
                <span style="margin-left:auto;color:#484f58;font-size:11px;">${tgl}</span>
                <button onclick="_eosShowSettingPanel()"
                    style="background:#21262d;border:1px solid #30363d;color:#8b949e;font-size:15px;cursor:pointer;padding:5px 9px;border-radius:7px;margin-left:8px;transition:all 0.15s;"
                    onmouseover="this.style.background='#30363d';this.style.color='#e6edf3'"
                    onmouseout="this.style.background='#21262d';this.style.color='#8b949e'">⚙</button>
            </div>
            <div style="padding:14px 16px;display:flex;flex-direction:column;gap:12px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div>
                        <label style="color:#8b949e;font-size:11px;font-weight:600;letter-spacing:0.5px;display:block;margin-bottom:6px;">ON SHIFT (sekarang)</label>
                        <input id="_fuEosOn" type="text" value="${_fuEscHtml(defaults.onShift)}" placeholder="Nama petugas..."
                            style="width:100%;box-sizing:border-box;background:#0d1117;border:1.5px solid #30363d;color:#e6edf3;padding:9px 12px;border-radius:7px;font-size:13px;outline:none;transition:border-color 0.15s;"
                            onfocus="this.style.borderColor='#2b78c5'" onblur="this.style.borderColor='#30363d'">
                    </div>
                    <div>
                        <label style="color:#8b949e;font-size:11px;font-weight:600;letter-spacing:0.5px;display:block;margin-bottom:6px;">NEXT SHIFT</label>
                        <input id="_fuEosNext" type="text" value="${_fuEscHtml(defaults.nextShift)}" placeholder="Nama petugas..."
                            style="width:100%;box-sizing:border-box;background:#0d1117;border:1.5px solid #30363d;color:#e6edf3;padding:9px 12px;border-radius:7px;font-size:13px;outline:none;transition:border-color 0.15s;"
                            onfocus="this.style.borderColor='#2b78c5'" onblur="this.style.borderColor='#30363d'">
                    </div>
                </div>
                <div>
                    <label style="color:#8b949e;font-size:11px;font-weight:600;letter-spacing:0.5px;display:block;margin-bottom:6px;">SUMMARY TICKET</label>
                    <textarea id="_fuEosSummary" rows="4" placeholder="Paste Total Ticket di sini Blayy..."
                        style="width:100%;box-sizing:border-box;background:#0d1117;border:1.5px solid #30363d;color:#e6edf3;padding:9px 12px;border-radius:7px;font-size:12px;outline:none;resize:vertical;transition:border-color 0.15s;"
                        onfocus="this.style.borderColor='#2b78c5'" onblur="this.style.borderColor='#30363d'"></textarea>
                </div>
                <div id="_fuEosWarn" style="display:none;background:rgba(218,54,51,0.12);border:1px solid rgba(218,54,51,0.35);border-radius:7px;color:#ff7b72;font-size:12px;padding:8px 12px;"></div>
                <button id="_fuEosBtn" onclick="_fuEosGenerate()"
                    style="width:100%;background:#2b78c5;border:none;color:#fff;padding:12px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.3px;transition:background 0.15s;box-shadow:0 4px 14px rgba(43,120,197,0.4);"
                    onmouseover="this.style.background='#1a5fa8'" onmouseout="this.style.background='#2b78c5'">
                    Generate EOS Report →
                </button>
                <div style="color:#484f58;font-size:11px;text-align:center;">Alert Open xlsx · NOC Disk Alert xlsx · EOS Excel + TXT + HTML</div>
                <div id="_fuEosSt" style="min-height:14px;font-size:11px;color:#8b949e;line-height:1.8;"></div>
            </div>
        </div>
    </div>`;
}

async function _fuEosGenerate() {
    const on            = (document.getElementById('_fuEosOn')?.value      || '').trim();
    const next          = (document.getElementById('_fuEosNext')?.value     || '').trim();
    const summaryTicket = (document.getElementById('_fuEosSummary')?.value  || '').trim();
    const warn  = document.getElementById('_fuEosWarn');
    const stEl  = document.getElementById('_fuEosSt');
    const btn   = document.getElementById('_fuEosBtn');

    if (!on) {
        if (warn) { warn.textContent = 'Nama On Shift tidak boleh kosong.'; warn.style.display = 'block'; }
        return;
    }
    if (warn) warn.style.display = 'none';
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; }

    // Stale check
    if (_fuAlertStaleCheck('eos')) {
        const proceed = await _fuAlertStalePrompt('eos');
        if (!proceed) {
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
            return;
        }
    }

    // Step 1: skip config fetch (demo/static mode — no grafana_proxy)
    if (stEl) stEl.innerHTML = '<span style="color:#f1e05a;">🔄 Memuat data EOS (demo mode)...</span>';

    // Step 2: Alert Open xlsx (opsional jika ada isinya)
    const alertRows = _fuGetAlertRows();
    if (alertRows.length > 0) {
        if (stEl) stEl.innerHTML = '<span style="color:#f1e05a;">🔄 Membuat Alert Open xlsx...</span>';
        try {
            await _fuDownloadAlertOpenXlsx(alertRows, 'eos');
            if (stEl) stEl.innerHTML = `<span style="color:#3fb950;">✓ Alert Open xlsx (${alertRows.length} tiket) — generating EOS Report...</span>`;
        } catch(e) {
            if (stEl) stEl.innerHTML = `<span style="color:#f85149;">❌ Alert Open: ${e.message}</span>`;
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
            return;
        }
    } else {
        if (stEl) stEl.innerHTML = '<span style="color:#484f58;">Alert Open kosong — melanjutkan EOS Report...</span>';
    }

    // Step 3: NOC Disk Alert xlsx
    if (stEl) stEl.innerHTML = '<span style="color:#f1e05a;">🔄 Mengambil data disk...</span>';
    try {
        const diskRows = await _itsmLoadDiskRows();
        const dateStr  = _itsmDateFull(), shift = _itsmShiftLabel();
        _fuXlsxDownload(_fuBuildDiskXlsx(diskRows, dateStr), `NOC Disk Alert - ${dateStr} (${shift}).xlsx`);
        const crit = diskRows.filter(r => r.last >= 85).length;
        if (stEl) stEl.innerHTML = `<span style="color:#3fb950;">✓ NOC Disk Alert xlsx (${diskRows.length} entri, ${crit} kritis) — generating EOS Report...</span>`;
    } catch(e) {
        if (stEl) stEl.innerHTML = `<span style="color:#f1e05a;">⚠ Disk: ${e.message} — melanjutkan EOS Report...</span>`;
    }

    // Step 4: generate EOS (demo mode — no live Grafana/OpManager)
    await _eosRunDemo({ petugas: on, next: next || '-', summaryTicket });

    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
}
