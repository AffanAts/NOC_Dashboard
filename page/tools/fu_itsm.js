/**
 * page/tools/fu_itsm.js
 * Follow Up ITSM — modal kecil, 1 tombol utama
 *
 * Tombol aktif hanya jika Alert Open sudah diisi.
 * Satu klik: download Alert Open xlsx + Disk xlsx + generate gambar ITSM
 *            → copy gambar ke clipboard → buka WhatsApp Web.
 * Tombol "📋 Salin Teks" sebagai fallback manual.
 */

const ITSM_PROXY = 'http://127.0.0.1:3737/itsm';
let _itsmAbortCtrl = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

// Shift 3 melewati tengah malam (00:00–06:59 = masih bagian Shift 3 hari sebelumnya)
// → kembalikan tanggal kemarin agar label laporan tetap benar
function _itsmNocDate() {
    const now = new Date();
    if (now.getHours() < 7) {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        return d;
    }
    return now;
}

function _itsmShiftLabel() {
    const h = new Date().getHours(); // jam asli untuk deteksi shift
    if (h >= 7  && h < 15) return 'Shift 1';
    if (h >= 15 && h < 23) return 'Shift 2';
    return 'Shift 3';
}
function _itsmDateFull() {
    const d = _itsmNocDate();
    const M = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus',
                'September','Oktober','November','Desember'];
    return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
}
function _itsmDateShort() {
    const d = _itsmNocDate();
    const M = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus',
                'September','Oktober','November','Desember'];
    return d.getDate() + ' ' + M[d.getMonth()];
}

// ── Validasi: aktifkan tombol utama saat textarea ada isi ────────────────────
function _itsmCheckBtn() {
    const has  = (document.getElementById('_itsmAlertInput')?.value || '').trim().length > 0;
    const btn  = document.getElementById('_itsmMainBtn');
    if (!btn) return;
    btn.disabled        = !has;
    btn.style.opacity   = has ? '1' : '0.4';
    btn.style.cursor    = has ? 'pointer' : 'not-allowed';
}

// ── Format teks WA (template tetap, tanggal & shift dinamis) ─────────────────
function _itsmBuildWaText() {
    const text = (document.getElementById('_itsmAlertInput')?.value || '').trim();
    const rows = [];
    text.split('\n').forEach(line => {
        line = line.trim(); if (!line) return;
        const p = line.split('\t');
        // Format sama dengan FU PAGI: Tanggal | Case | Detail Issue | IP Address
        rows.push({
            dateStr: (p[0]||'').trim(),
            caseStr: (p[1]||'').trim(),
            detail:  (p[2]||'').trim(),
            ip:      (p[3]||'').trim().split(':')[0]
        });
    });
    const dateStr = _itsmDateFull(), shift = _itsmShiftLabel();
    const waText =
`Dear Team,
Eng @Alex
Eng @Fria
Eng @Dana
Eng @John
Eng @Sam
Eng @Ryan

Berikut terlampir data update per tanggal ${dateStr} (${shift}) mengenai:
- Tiket yang masih berstatus Open.
- Data alert untuk tiket open dengan overall disk usage di atas 70%.

Mohon dibantu untuk melakukan pengecekan serta update progress terkait tiket-tiket tersebut.
Terima kasih.

cc: Mgr @Yossi`;
    return { text: waText, rows };
}

// ── Buka modal ────────────────────────────────────────────────────────────────
function openFuItsm() {
    document.getElementById('_fuItsmDlg')?.remove();

    const dateStr = _itsmDateFull(), shift = _itsmShiftLabel();

    const dlg = document.createElement('div');
    dlg.id = '_fuItsmDlg';
    dlg.style.cssText = 'position:fixed;z-index:99999;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:\'Segoe UI\',sans-serif;';

    dlg.innerHTML = `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:14px;padding:28px 32px;width:500px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,0.7);position:relative;">

        <button id="_fuItsmClose" title="Tutup" style="position:absolute;top:14px;right:16px;background:none;border:none;color:#8b949e;font-size:20px;cursor:pointer;line-height:1;padding:4px 8px;border-radius:6px;transition:background 0.15s;"
            onmouseover="this.style.background='#30363d'" onmouseout="this.style.background='none'">✕</button>

        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
            <div style="background:#8957e5;border-radius:10px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🎫</div>
            <div>
                <div style="color:#e6edf3;font-size:16px;font-weight:700;line-height:1.2;">Follow Up ITSM</div>
                <div style="color:#8b949e;font-size:12px;margin-top:2px;">${dateStr} — ${shift}</div>
            </div>
        </div>

        <!-- Alert Open textarea -->
        <div style="margin-bottom:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <label style="color:#8b949e;font-size:11px;font-weight:600;letter-spacing:0.5px;">ALERT OPEN (TICKET) <span style="color:#f85149;">*</span></label>
                <button id="_itsmCopyTextBtn" onclick="_fuItsmCopyText()"
                    style="background:#21262d;border:1px solid #30363d;color:#8b949e;font-size:11px;padding:3px 10px;border-radius:6px;cursor:pointer;transition:all 0.15s;font-weight:600;"
                    onmouseover="this.style.background='#30363d';this.style.color='#e6edf3'" onmouseout="this.style.background='#21262d';this.style.color='#8b949e'">
                    📋 Salin Teks
                </button>
            </div>
            <div style="background:#0d1117;border:1px solid #21262d;border-radius:6px;padding:7px 11px;font-size:10px;color:#484f58;font-family:monospace;margin-bottom:8px;line-height:1.6;">
                [Tanggal]&nbsp;&nbsp;[Case]&nbsp;&nbsp;[Detail Issue]&nbsp;&nbsp;[IP Address]
            </div>
            <textarea id="_itsmAlertInput" rows="6" wrap="off"
                placeholder="2024-06-15&#9;Grafana AVA&#9;Device not responding&#9;10.30.0.19"
                oninput="_itsmCheckBtn()"
                style="width:100%;box-sizing:border-box;background:#0d1117;border:1.5px solid #30363d;color:#79c0ff;padding:10px 12px;border-radius:8px;font-size:11.5px;font-family:'Consolas',monospace;line-height:1.7;outline:none;resize:vertical;transition:border-color 0.15s;"
                onfocus="this.style.borderColor='#58a6ff'" onblur="this.style.borderColor='#30363d'"></textarea>
            <div id="_itsmCopyStatus" style="min-height:16px;margin-top:4px;font-size:10.5px;color:#8b949e;"></div>
        </div>

        <!-- Tombol utama (disabled sampai textarea diisi) -->
        <button id="_itsmMainBtn" onclick="_fuItsmRunAll()" disabled
            style="width:100%;background:linear-gradient(135deg,#4a1d8c,#8957e5);border:none;color:#fff;padding:13px;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(137,87,229,0.35);opacity:0.4;cursor:not-allowed;transition:opacity 0.2s;">
            📥🖼️ &nbsp;Download Semua + Kirim ke WhatsApp →
        </button>
        <div style="text-align:center;margin-top:6px;font-size:10.5px;color:#484f58;">
            Alert Open xlsx · Disk xlsx · Gambar ITSM → WhatsApp Web
        </div>

        <!-- Status progress -->
        <div id="_itsmMainStatus" style="min-height:20px;margin-top:12px;font-size:11px;color:#8b949e;line-height:2;"></div>

    </div>`;

    document.body.appendChild(dlg);
    document.getElementById('_fuItsmClose').onclick = closeFuItsm;
    dlg.addEventListener('keydown', e => { if (e.key === 'Escape') closeFuItsm(); });
    dlg.addEventListener('click',   e => { if (e.target === dlg) closeFuItsm(); });
}

function closeFuItsm() {
    document.getElementById('_fuItsmDlg')?.remove();
    _itsmAbortCtrl?.abort();
    _itsmAbortCtrl = null;
}

// ── Salin teks ke clipboard (fallback WA) ────────────────────────────────────
async function _fuItsmCopyText() {
    const st = document.getElementById('_itsmCopyStatus');
    const { text, rows } = _itsmBuildWaText();
    if (!rows.length) {
        if (st) st.innerHTML = '<span style="color:#f85149;">Isi textarea dulu.</span>';
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        if (st) st.innerHTML = '<span style="color:#3fb950;">✓ Teks disalin ke clipboard.</span>';
        setTimeout(() => { if (st) st.textContent = ''; }, 3000);
    } catch(e) {
        if (st) st.innerHTML = `<span style="color:#f85149;">Gagal salin: ${e.message}</span>`;
    }
}

// ── Tombol utama: semua langkah sekaligus ────────────────────────────────────
async function _fuItsmRunAll() {
    const btn = document.getElementById('_itsmMainBtn');
    const st  = document.getElementById('_itsmMainStatus');
    btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed';
    _itsmAbortCtrl = new AbortController();

    const upd = html => { if (st) st.innerHTML = html; };

    try {
        const dateStr = _itsmDateFull(), shift = _itsmShiftLabel();

        // ── 1/4 Alert Open Excel (sama persis dengan FU PAGI) ──
        upd('🔄 <b>1/4</b> Membuat Excel Alert Open...');
        const { text: waText, rows: alertRows } = _itsmBuildWaText();
        if (!alertRows.length) throw new Error('Data Alert Open kosong.');
        // Ambil hostname: OPM inventory (untuk OPM rows) + RVTOOLS (untuk Grafana rows)
        // — sama persis dengan cara FU PAGI membangun opmNameKamus & rvKamus
        let opmKamus = {}, rvKamus = {};
        try {
            const [invResp, rvResp] = await Promise.all([
                fetch('Data_JSON/opmanager_inventory.json?t=' + Date.now()).catch(() => null),
                fetch('Data_JSON/RVTOOLS.json?t=' + Date.now()).catch(() => null)
            ]);
            if (invResp && invResp.ok) {
                const inv = await invResp.json();
                (inv.rows || []).forEach(i => {
                    const ip = (i.ipaddress || '').trim();
                    const nm = (i.displayName || '').trim();
                    if (ip && nm) opmKamus[ip] = nm;
                });
            }
            if (rvResp && rvResp.ok) {
                const rv = await rvResp.json();
                Object.keys(rv).forEach(ip => { rvKamus[ip] = rv[ip].VM; });
            }
        } catch(e) {}
        const alertBytes = _itsmBuildAlertOpenXlsx(alertRows, opmKamus, rvKamus);
        _fuXlsxDownload(alertBytes, `NOC Alert Open - ${dateStr} (${shift}).xlsx`);

        // ── 2/4 Disk Excel ──
        upd(`✅ <b>1/4</b> Alert Open xlsx (${alertRows.length} tiket)<br>🔄 <b>2/4</b> Mengambil data disk dari monitoring...`);
        const diskRows = await _itsmLoadDiskRows();
        const crit = diskRows.filter(r => r.last >= 85).length;
        const diskBytes = _fuBuildDiskXlsx(diskRows, dateStr);
        _fuXlsxDownload(diskBytes, `NOC Disk Alert - ${dateStr} (${shift}).xlsx`);

        // ── 3/4 Gambar ITSM ──
        upd(`✅ <b>1/4</b> Alert Open xlsx (${alertRows.length} tiket)<br>✅ <b>2/4</b> Disk xlsx (${diskRows.length} entri, ${crit} kritis)<br>🔄 <b>3/4</b> Mengambil tiket ITSM...`);
        const tickets = await _itsmFetchOpen(_itsmAbortCtrl.signal);
        upd(`✅ <b>1/4</b> Alert Open xlsx (${alertRows.length} tiket)<br>✅ <b>2/4</b> Disk xlsx (${diskRows.length} entri, ${crit} kritis)<br>🔄 <b>3/4</b> Membuat gambar (${tickets.length} tiket)...`);
        await navigator.clipboard.writeText(waText);
        await new Promise(r => setTimeout(r, 400));
        await _itsmGenerateAndCopy(tickets);

        upd(`✅ <b>1/4</b> Alert Open xlsx (${alertRows.length} tiket)<br>✅ <b>2/4</b> Disk xlsx (${diskRows.length} entri, ${crit} kritis)<br>✅ <b>3/4</b> Gambar di clipboard (${tickets.length} tiket)<br>✅ <b>4/4</b> Selesai!<br><span style="color:#3fb950;font-size:12px;">Ctrl+V paste gambar, Win+V untuk teks.</span>`);
        if (typeof showCopyToast === 'function') showCopyToast("Gambar & teks ter-copy ke clipboard!");

    } catch(e) {
        if (e.name === 'AbortError') {
            upd('<span style="color:#8b949e;">Dibatalkan.</span>');
        } else {
            upd(`<span style="color:#f85149;">❌ ${e.message}</span>`);
        }
    } finally {
        btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
    }
}

// ── Load disk rows dari disk_data.js ─────────────────────────────────────────
async function _itsmLoadDiskRows() {
    const resp = await fetch('Data_JSON/disk_data.js?t=' + Date.now());
    if (!resp.ok) throw new Error('disk_data.js tidak ditemukan (HTTP ' + resp.status + ')');
    const text = await resp.text();

    let d1, d2;
    try {
        const fn = new Function(
            text.replace(/\bvar\s+dataDisk1\b/, 'var _fd1')
                .replace(/\bvar\s+dataDisk2\b/, 'var _fd2')
            + '; return { d1: typeof _fd1!=="undefined"?_fd1:null, d2: typeof _fd2!=="undefined"?_fd2:null };'
        );
        ({ d1, d2 } = fn());
    } catch(e) { throw new Error('Gagal parse disk_data.js: ' + e.message); }

    function parseFrames(res) {
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
            out.push({
                ipFull, ip, mount,
                min:  Math.min(...vals),
                max:  Math.max(...vals),
                mean: vals.reduce((a, b) => a + b, 0) / vals.length,
                last: vals[vals.length - 1]
            });
        }
        return out;
    }

    let rows = [...parseFrames(d1), ...parseFrames(d2)];
    rows = rows.filter(r => r.last >= 70).sort((a, b) => b.last - a.last);

    try {
        const rv = await fetch('Data_JSON/RVTOOLS.json?t=' + Date.now());
        if (rv.ok) {
            const rvData = await rv.json();
            rows.forEach(r => { r.hostname = (rvData[r.ip] || {}).VM || ''; });
        }
    } catch(e) {}

    return rows;
}

// ── Fetch ITSM (paginated) ────────────────────────────────────────────────────
async function _itsmFetchOpen(signal) {
    let all = [], start = 0, isLast = false;
    while (!isLast) {
        const url = ITSM_PROXY + '/rest/servicedeskapi/request?requestStatus=OPEN_REQUESTS&expand=requestType&limit=50&start=' + start;
        const r = await fetch(url, { signal });
        if (!r.ok) throw new Error('HTTP ' + r.status + ' — pastikan itsm_proxy sudah berjalan');
        const d = await r.json();
        all = all.concat(d.values || []);
        isLast = d.isLastPage;
        start += 50;
    }
    return all;
}

// ── Excel: Alert Open — sama persis dengan FU PAGI ───────────────────────────
// rows: [{ dateStr, caseStr, detail, ip }]
// opmKamus: { ip -> displayName } dari opmanager_inventory.json  (untuk OPM rows)
// rvKamus:  { ip -> VM }          dari RVTOOLS.json              (untuk Grafana rows)
function _itsmBuildAlertOpenXlsx(rows, opmKamus, rvKamus) {
    const cL    = r => (r.caseStr || '').toLowerCase();
    const isOpm = r => cL(r).includes('opm') || cL(r).includes('opmanager');
    const isIface = r => /(interface)/i.test(r.caseStr || '') || /(interface)/i.test(r.detail || '');
    const assignee  = r => (isOpm(r) && isIface(r)) ? 'Network' : 'Infra';
    const sortByDet = arr => [...arr].sort((a, b) => (a.detail || '').localeCompare(b.detail || ''));
    // Grafana → rvKamus dulu, fallback opmKamus (sama dengan megaKamus di FU PAGI — RVTOOLS menimpa OPM)
    // OPM     → opmKamus dulu, fallback rvKamus (sama dengan toRow(t, true) di FU PAGI)
    const hostname  = (r, useOpm) => useOpm
        ? ((opmKamus&&opmKamus[r.ip]) || (rvKamus&&rvKamus[r.ip]) || '')
        : ((rvKamus&&rvKamus[r.ip])   || (opmKamus&&opmKamus[r.ip]) || 'Not Found');
    const toRow     = (r, useOpm = false) => [r.dateStr||'', r.caseStr||'', r.detail||'', r.ip||'', hostname(r, useOpm), assignee(r)];

    const allGrafana = sortByDet(rows.filter(r => !isOpm(r)));
    const allOpm     = sortByDet(rows.filter(r =>  isOpm(r)));

    // stylesXml identik dengan _fuBuildTicketXlsx di fu_pagi.js
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="8"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1565C0"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B5E20"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF37474F"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC62828"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B5E20"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF37474F"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/></cellXfs></styleSheet>`;

    // colWidths identik dengan _fuBuildTicketXlsx di fu_pagi.js
    const colWidths = '<cols><col min="1" max="1" width="16" customWidth="1"/><col min="2" max="2" width="22" customWidth="1"/><col min="3" max="3" width="50" customWidth="1"/><col min="4" max="4" width="18" customWidth="1"/><col min="5" max="5" width="32" customWidth="1"/><col min="6" max="6" width="12" customWidth="1"/></cols>';

    const HEADERS = ['Issue Date', 'Case', 'Detail Issue', 'IP Address', 'Device Name', 'Assignee'];
    const exRows  = [];
    const addRow  = (values, style = 1) => exRows.push({ values, style });

    addRow(['GRAFANA ALERTS', '', '', '', '', ''], 2);
    addRow(HEADERS, 4);
    if (allGrafana.length > 0) allGrafana.forEach(r => addRow(toRow(r), 1));
    else addRow(['(Tidak ada alert Grafana)', '', '', '', '', ''], 0);

    exRows.push({ values: ['', '', '', '', '', ''], style: 0 });

    addRow(['OPMANAGER ALERTS', '', '', '', '', ''], 3);
    addRow(HEADERS, 4);
    if (allOpm.length > 0) allOpm.forEach(r => addRow(toRow(r, true), 1));
    else addRow(['(Tidak ada alert OpManager)', '', '', '', '', ''], 0);

    return _fuBuildXlsxRaw(exRows, stylesXml, colWidths, 'Alert Open', 6);
}

// ── Generate gambar ITSM → copy to clipboard ──────────────────────────────────
async function _itsmGenerateAndCopy(tickets) {
    const sorted = [...tickets].sort((a, b) =>
        (b.createdDate?.epochMillis || 0) - (a.createdDate?.epochMillis || 0)
    ).slice(0, 20);

    const totalPages = Math.ceil(tickets.length / 20);
    const pageNums   = Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1);
    const pgBtn      = 'display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:3px;font-size:13px;font-weight:500;cursor:default;border:none;';

    const tableRows = sorted.map(t => {
        const summary = t.requestFieldValues?.find(f => f.fieldId === 'summary')?.value || '-';
        const status  = t.currentStatus?.status || '-';
        const sd      = t.serviceDeskId == '13' ? 'IT Infrastructure &amp; Data Center'
                      : t.serviceDeskId == '16' ? 'IT Help Desk &amp; Applications Support'
                      : 'SD-' + t.serviceDeskId;
        const icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 100 100">'
            + '<rect x="5" y="5" width="90" height="62" rx="8" ry="8" fill="#6b5b9e"/>'
            + '<rect x="13" y="12" width="74" height="48" rx="2" ry="2" fill="#ffffff"/>'
            + '<polygon points="35,67 65,67 60,80 40,80" fill="#6b5b9e"/>'
            + '<rect x="32" y="78" width="36" height="7" rx="3" ry="3" fill="#6b5b9e"/></svg>';
        return '<tr style="background:#ffffff;">'
            + `<td style="padding:6px 8px 6px 14px;text-align:center;width:36px;vertical-align:middle;">${icon}</td>`
            + `<td style="padding:6px 14px;white-space:nowrap;vertical-align:middle;"><span style="color:#0052cc;font-size:13px;">${t.issueKey}</span></td>`
            + `<td style="padding:6px 14px;font-size:13px;vertical-align:middle;"><span style="color:#0052cc;">${summary}</span></td>`
            + `<td style="padding:6px 14px;white-space:nowrap;vertical-align:middle;"><span style="display:inline-flex;align-items:center;background:#e9f2ff;color:#0747a6;padding:0 3px;border-radius:2px;font-size:10px;font-weight:700;border:1px solid #b3d4ff;text-transform:uppercase;letter-spacing:0.3px;line-height:1.6;">${status}</span></td>`
            + `<td style="padding:6px 14px;color:#172b4d;font-size:13px;white-space:nowrap;vertical-align:middle;">${sd}</td>`
            + `<td style="padding:6px 14px;color:#172b4d;font-size:13px;white-space:nowrap;vertical-align:middle;">NOC DKI</td>`
            + '</tr>';
    }).join('');

    const pageHtml = pageNums.map((p, i) =>
        i === 0
            ? `<span style="${pgBtn}background:#0747a6;color:#fff;font-weight:700;">${p}</span>`
            : `<span style="${pgBtn}background:transparent;color:#0052cc;">${p}</span>`
    ).join('');

    const offscreen = document.createElement('div');
    offscreen.style.cssText = 'position:fixed;left:-9999px;top:0;';
    offscreen.innerHTML =
        '<div id="_itsmCapture" style="width:1000px;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;padding:16px;">'
      + '<div style="background:#fff;border-radius:4px;box-shadow:0 1px 2px rgba(9,30,66,0.08);">'
      + '<table style="width:100%;border-collapse:collapse;">'
      + '<thead><tr style="border-bottom:1px solid #ebecf0;background:#fff;">'
      + '<th style="padding:6px 8px 6px 14px;color:#5e6c84;font-size:12px;font-weight:600;text-align:left;width:36px;">Type</th>'
      + '<th style="padding:6px 14px;color:#5e6c84;font-size:12px;font-weight:600;text-align:left;">Reference</th>'
      + '<th style="padding:6px 14px;color:#5e6c84;font-size:12px;font-weight:600;text-align:left;">Summary</th>'
      + '<th style="padding:6px 14px;color:#5e6c84;font-size:12px;font-weight:600;text-align:left;">Status</th>'
      + '<th style="padding:6px 14px;color:#5e6c84;font-size:12px;font-weight:600;text-align:left;">Service project</th>'
      + '<th style="padding:6px 14px;color:#5e6c84;font-size:12px;font-weight:600;text-align:left;">Requester</th>'
      + '</tr></thead>'
      + '<tbody>' + tableRows + '</tbody>'
      + '</table>'
      + '<div style="padding:12px 14px;background:#fff;border-top:1px solid #ebecf0;display:flex;justify-content:space-between;align-items:center;">'
      + `<span style="color:#5e6c84;font-size:13px;"><b>1</b> – <b>${sorted.length}</b> of <b>${tickets.length}</b></span>`
      + '<div style="display:flex;gap:2px;align-items:center;">'
      + `<span style="${pgBtn}color:#b3bac5;font-size:15px;">&#8249;</span>`
      + pageHtml
      + `<span style="${pgBtn}color:#0052cc;font-size:15px;">&#8250;</span>`
      + '</div></div></div></div>';
    document.body.appendChild(offscreen);

    const canvas = await html2canvas(offscreen.querySelector('#_itsmCapture'), {
        backgroundColor: '#f4f5f7', scale: 2, logging: false, useCORS: true, allowTaint: false
    });
    document.body.removeChild(offscreen);

    await new Promise(resolve => {
        canvas.toBlob(async blob => {
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            } catch(e) {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'ITSM_Open_' + _itsmDateShort().replace(/ /g, '_') + '.png';
                a.click();
            }
            resolve();
        }, 'image/png');
    });
}
