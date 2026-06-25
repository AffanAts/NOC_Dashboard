/**
 * page/opmanager/opm_action.js
 * Fokus: Mengeksekusi Tombol (WA, SS, ITSM, Excel, Buka OPM)
 * Update: Mode Paling Efisien + Fitur LOCK (Keyword & Excluded IP)
 */

// ======================================================================
// LOGIKA FILTER TIKET ABAIKAN (LOCKED)
// ======================================================================
const FULL_LOCK_KEYWORDS = [
    "server active connections", 
    "bcp and mssql server versions might differ", 
    "apm plugin: resource apm default monitor is down",
    "file integrity" 
];

const ESC_LOCK_KEYWORDS = [
    "pool member",
    "virtual server"
];

window.checkTicketLockLevel = function(detail, ip) {
    let d = (detail || "").toLowerCase();
    
    // 1. Cek Full Lock by Keyword (Excel, WA, ITSM Dilarang)
    if (FULL_LOCK_KEYWORDS.some(kw => d.includes(kw))) return "FULL";
    
    // 2. Cek Full Lock by Excluded IP (Excel, WA, ITSM Dilarang)
    if (ip && typeof globalFilterData !== 'undefined' && globalFilterData && globalFilterData.excluded) {
        let cleanIp = ip.split(':')[0];
        if (globalFilterData.excluded.includes(cleanIp)) return "FULL";
    }

    // 3. Cek Escalation Lock (Boleh Excel, Dilarang WA/ITSM)
    if (ESC_LOCK_KEYWORDS.some(kw => d.includes(kw))) return "ESC_ONLY";
    
    return "NONE";
}

// ======================================================================
// FUNGSI INJEKSI RUMUS LOKAL
// ======================================================================
function formatExcelRowWithFormulaLocal(rowData) {
    let newRow = [...rowData];
    newRow[2] = `=IF(LEN(INDEX(C:C, ROW()))=0, "", IF(LEN(INDEX(D:D, ROW()))=0, "Waiting for Resolution", INT(ABS(INDEX(D:D, ROW())-INDEX(C:C, ROW()))*24) & " hours " & ROUND(MOD(ABS(INDEX(D:D, ROW())-INDEX(C:C, ROW()))*24,1)*60, 0) & " minutes"))`;
    newRow[10] = `=IF(LEN(INDEX(G:G, ROW()))=0, "", IF(LEN(INDEX(D:D, ROW()))=0, "Open", "Close"))`;
    return newRow.join('\t');
}

// ======================================================================
// WRAPPER: CARI DATA TIKET BERDASARKAN ID
// ======================================================================
function actionCopyExcel(btn, ticketId) {
    const tObj = window.rawOpmData.find(x => x.ticketId === ticketId);
    if (!tObj) return;

    const lockLevel = window.checkTicketLockLevel(tObj.detail, tObj.ip);
    
    if(lockLevel === "FULL") { 
        alert("Tiket ini diabaikan / Excluded (Locked). Tidak bisa disalin ke Excel."); 
        return; 
    }

    const data = window.currentOpmTicketsExcel[ticketId];
    if(!data) return;
    
    const textToCopy = formatExcelRowWithFormulaLocal(data);
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const orig = btn.innerText; btn.innerText = "COPIED"; setTimeout(() => btn.innerText = orig, 1000);
    });
}

function actionWA(btn, ticketId) {
    const tObj = window.rawOpmData.find(x => x.ticketId === ticketId);
    if(!tObj) return;

    const lockLevel = window.checkTicketLockLevel(tObj.detail, tObj.ip);
    if(lockLevel !== "NONE") {
        alert("Tiket ini dikunci untuk Eskalasi WA.");
        return;
    }
    autoEscalateWA(btn, tObj.rawT, tObj.hostname, tObj.ip);
}

function actionITSM(ticketId) {
    const tObj = window.rawOpmData.find(x => x.ticketId === ticketId);
    if(!tObj) return;
    
    const lockLevel = window.checkTicketLockLevel(tObj.detail, tObj.ip);
    if(lockLevel !== "NONE") { 
        alert("Tiket ini dikunci untuk Helper ITSM."); 
        return; 
    }
    showItsmPopupOPM(tObj.rawT, tObj.ip, tObj.hostname, tObj.caseInfo);
}

function actionOpenOPM(ticketId) {
    const tObj = window.rawOpmData.find(x => x.ticketId === ticketId);
    if(!tObj || !tObj.rawT || !tObj.rawT.ALARM_ID) {
        alert("Alarm ID tidak ditemukan untuk tiket ini.");
        return;
    }
    const alarmId = tObj.rawT.ALARM_ID;
    const opmUrl = `https://opmanager.example.com:8060/apiclient/ember/index.jsp#/Alarms/Alarm/Details/${alarmId}`;
    
    window.open(opmUrl, '_blank');
}

// ======================================================================
// LOGIKA INTI WA & SS
// ======================================================================
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

async function autoEscalateWA(btn, t, host, ip) {
    const origText = btn.innerText;
    const origBg = btn.style.background;
    btn.innerText = "WAIT...";
    btn.disabled = true;

    const msg = t.DETAIL_ISSUE || "";
    const origStatus = t.ORIG_STATUS ? t.ORIG_STATUS.replace(/'/g, "\\'") : "Trouble";
    const m = msg.toLowerCase(); 
    
    const TAGS = {
        Giri: "Eng @Giri", Sam: "Eng @Sam", John: "Eng @John",
        Alex: "Eng @Alex", Dana: "Eng @Dana", BINO: "Eng @Bino",
        Ryan: "Eng @Ryan", INDRA: "Eng @Indra"
    };

    const cleanIp = ip.split(':')[0];
    const isPriority = (typeof globalFilterData !== 'undefined' && globalFilterData && globalFilterData.priority && globalFilterData.priority.includes(cleanIp));

    const _st = (origStatus || "").toLowerCase();
    let severityTag = _st.includes("critical") ? "Critical" : _st.includes("attention") ? "Attention" : "Trouble";
    let tagsSet = new Set();
    
    if (m.includes("not communicating") || m.includes("device down") || m.includes("device not responding:")) {
        tagsSet.add(TAGS.Giri); tagsSet.add(TAGS.Sam); tagsSet.add(TAGS.John);
    } else if (m.includes("memory") || m.includes("cpu") || m.includes("disk")) {
        tagsSet.add(TAGS.Giri); tagsSet.add(TAGS.Sam); tagsSet.add(TAGS.John); tagsSet.add(TAGS.Dana);
        if (isPriority) tagsSet.add(TAGS.Alex);
    } else if (m.includes("interface")) {
        tagsSet.add(TAGS.Giri); tagsSet.add(TAGS.BINO); tagsSet.add(TAGS.INDRA);
    } else if (m.includes("partition details")) {
        tagsSet.add(TAGS.Giri); tagsSet.add(TAGS.Ryan); tagsSet.add(TAGS.Dana);
        if (isPriority) tagsSet.add(TAGS.Alex);
    } else {
        tagsSet.add(TAGS.Giri); tagsSet.add(TAGS.Dana); tagsSet.add(TAGS.Sam); tagsSet.add(TAGS.John);
    }

    let peopleToTag = Array.from(tagsSet).join('\n');

    if (isPriority) {
        peopleToTag = peopleToTag ? `Tim @Helpdesk\n${peopleToTag}` : `Tim @Helpdesk`;
    }

    const greeting = peopleToTag ? `Dear Team\n${peopleToTag}` : `Dear Team`;
    const waText = `${greeting}\n\nKami informasikan saat ini :\n\n- ${msg} --> ${host} [${ip}]\n\nTerpantau status *${severityTag}* di monitoring OpManager.\nMohon dibantu pengecekannya\n\nTerima Kasih`;

    let statusText = t.ORIG_STATUS || "Trouble";
    let severityColor = "#e36209"; 

    const st = statusText.toLowerCase();
    if (st.includes("critical")) { severityColor = "#da3633"; statusText = "Critical"; } 
    else if (st.includes("attention")) { severityColor = "#e3b341"; statusText = "Attention"; }

    const d = new Date(t.ISSUE_TS);
    const timeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

    const offscreen = document.createElement('div');
    offscreen.style.position = 'fixed'; offscreen.style.left = '-9999px'; offscreen.style.top = '0';
    
    offscreen.innerHTML = `
    <div id="captureArea" style="background: #ffffff; padding: 30px; width: fit-content; min-width: 450px; max-width: 800px; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="display: flex; border-left: 5px solid ${severityColor}; padding-left: 25px; flex-direction: column; gap: 12px;">
           <div style="font-size: 19px; color: #1a1f23; font-weight: 600; line-height: 1.5; white-space: pre-wrap; word-break: break-word;">${t.DETAIL_ISSUE.trim()}</div>
            <div style="font-size: 16px; color: #0969da; font-weight: 400; margin-top: 2px;">${host}</div>
            <div style="font-size: 14px; color: #57606a; display: flex; align-items: center; gap: 6px;">
                <span>${t.CATEGORY || 'Server'}</span> 
                <span style="color: #d0d7de;">::</span> 
                <span>noc.monitor</span> 
                <span style="color: #d0d7de;">::</span> 
                <span style="font-weight: 600; color: ${severityColor};">${statusText}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: #57606a; margin-top: 8px; opacity: 0.8;">
                <span style="font-size: 16px;">📅</span> 
                <span>${timeStr} WIB</span> 
            </div>
        </div>
    </div>`;
    document.body.appendChild(offscreen);

    try {
        const canvas = await html2canvas(offscreen.querySelector('#captureArea'), { 
            backgroundColor: "#ffffff", scale: 2, logging: false, useCORS: true
        });

        canvas.toBlob(async (blob) => {
            document.body.removeChild(offscreen);
            try {
                // Tulis teks dulu, beri jeda agar Windows clipboard history sempat mencatatnya
                await navigator.clipboard.writeText(waText);
                await new Promise(r => setTimeout(r, 400));
                // Tulis gambar → jadi clipboard aktif (Ctrl+V), teks tetap ada di Win+V history
                await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                btn.innerText = "COPIED!";
                btn.style.background = "#3fb950";
                showCopyToast("Gambar & teks ter-copy ke clipboard!");
            } catch (err) {
                btn.innerText = "SS GAGAL";
                btn.style.background = "#da3633";
            }
            setTimeout(() => { btn.innerText = origText; btn.style.background = origBg; btn.disabled = false; }, 2000);
        });
    } catch (err) {
        document.body.removeChild(offscreen);
        btn.innerText = "ERR!"; btn.disabled = false;
    }
}

// ======================================================================
// LOGIKA INTI ITSM
// ======================================================================
function showItsmPopupOPM(t, ip, host, c) {
    const old = document.getElementById('itsmPopup');
    if(old) old.remove();

    const summary = `OpManager - ${c.assign} - ${host} (${ip})`;
    const description = `Dear Team,\n\nMenginformasikan terdapat alert ${ip} [${host}]\n\n- ${t.DETAIL_ISSUE}\n\nMohon dibantu Pengecekannya\nTerima Kasih`;
    const itsmLink = "https://itsm.example.com/servicedesk/customer/portal/13/create/213";

    window.copyItsmItem = function(element, textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalHTML = element.innerHTML;
            element.innerHTML = `<span style="color: #3fb950; font-weight: bold;">✔ COPIED!</span>`;
            element.style.borderColor = "#3fb950";
            
            setTimeout(() => {
                element.innerHTML = originalHTML;
                element.style.borderColor = "#30363d";
            }, 1000);
        });
    };

    const popupHTML = `
    <div id="itsmPopup" style="position: fixed; z-index: 10001; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; font-family: 'Consolas', monospace;">
        <div style="background: #161b22; width: 500px; border: 1px solid #30363d; border-radius: 8px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <h3 style="color: #f1e05a; margin-top: 0; border-bottom: 1px solid #30363d; padding-bottom: 10px; font-size: 16px;">🎫 ITSM HELPER (OPM)</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="color: #8b949e; font-size: 11px;">ITSM WEB (Click to Copy):</label><br>
                <div style="background: #010409; padding: 8px; border-radius: 4px; border: 1px solid #30363d; color: #58a6ff; font-size: 11px; margin-top: 5px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s;" 
                     onclick="copyItsmItem(this, '${itsmLink}')">
                     ${itsmLink}
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="color: #8b949e; font-size: 11px;">SUMMARY (Click to Copy):</label>
                <div style="background: #010409; padding: 8px; border-radius: 4px; border: 1px solid #30363d; color: #c9d1d9; font-size: 12px; margin-top: 5px; cursor: pointer; transition: all 0.2s;" 
                     onclick="copyItsmItem(this, \`${summary}\`)">
                     ${summary}
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="color: #8b949e; font-size: 11px;">TELEPON (Click to Copy):</label>
                <div style="background: #010409; padding: 8px; border-radius: 4px; border: 1px solid #30363d; color: #3fb950; font-size: 13px; font-weight: bold; margin-top: 5px; cursor: pointer; display: inline-block; transition: all 0.2s;"
                     onclick="copyItsmItem(this, '081200000000')">
                     081200000000
                </div>
            </div>
            
            <div style="margin-bottom: 20px; position: relative;">
                <label id="descLabelOPM" style="color: #8b949e; font-size: 11px; transition: all 0.2s;">DESCRIPTION (Click to Copy):</label>
                <textarea readonly style="background: #010409; width: 100%; height: 130px; border: 1px solid #30363d; color: #c9d1d9; font-size: 11px; padding: 8px; border-radius: 4px; resize: none; margin-top: 5px; cursor: pointer; transition: all 0.2s; outline: none; box-sizing: border-box;" 
                          onclick="this.select(); navigator.clipboard.writeText(this.value); const lbl = document.getElementById('descLabelOPM'); const origLbl = lbl.innerHTML; lbl.innerHTML = '<span style=\\'color: #3fb950; font-weight: bold;\\'>✔ COPIED!</span>'; this.style.borderColor = '#3fb950'; setTimeout(() => { lbl.innerHTML = origLbl; this.style.borderColor = '#30363d'; }, 1000);">${description}</textarea>
                <div style="text-align: right; font-size: 9px; color: #8b949e; margin-top: 2px;">*Teks akan otomatis ter-copy saat di-klik</div>
            </div>
            
            <div style="text-align: right;">
                <button onclick="document.getElementById('itsmPopup').remove()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">CLOSE</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', popupHTML);
}