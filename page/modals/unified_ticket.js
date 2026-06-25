/**
 * page/opmanager/opm_ui.js & unified_ticket.js
 * Fokus: Membuat elemen HTML (Modal, Header, dan Baris Tabel)
 * Update: Tombol Toggle Default Teks > 5 Menit
 */

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

function createOpManagerModal() {
    if (document.getElementById('opManagerModal')) return;
    const modalHTML = `
    <style>.hover-row:hover { background-color: #21262d !important; }</style>
    <div id="opManagerModal" style="display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background: #0d1117;">
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; font-family: 'Consolas', monospace;">
            <div style="padding: 10px 15px; background: #161b22; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color: #f1e05a; font-size: 13px; font-weight: bold;">[ OPMANAGER_TICKET_AUTO ]</span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-opm-time-toggle" onclick="toggleOpmTimeMode()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 5px 12px; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s;">⏳ > 5 MENIT</button>
                    <button onclick="refreshOpmStandalone(this)" style="background: #1f6feb; border: none; color: white; padding: 5px 12px; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: bold;">🔄 REFRESH</button>
                    <button onclick="resetOpmFilter()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 5px 12px; border-radius: 3px; cursor: pointer; font-size: 11px;">RESET DEFAULT</button>
                    <button onclick="closeOpManager()" style="background: #da3633; border: none; color: white; padding: 5px 12px; border-radius: 3px; cursor: pointer; font-size: 11px;">EXIT</button>
                </div>
            </div>
            <div style="flex: 1; overflow: auto; padding: 10px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10px; color: #c9d1d9; table-layout: fixed; border: 1px solid #30363d;">
                    <thead id="opmThead" style="position: sticky; top: 0; background: #161b22; text-align: left; box-shadow: 0 1px 0 #30363d; z-index: 2;"></thead>
                    <tbody id="opmBody"></tbody>
                </table>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function renderOpmHeader() {
    const thead = document.getElementById('opmThead');
    if(!thead) return;

    const currentPic = localStorage.getItem('global_noc_pic') || localStorage.getItem('opm_global_pic') || 'Admin';
    const inputStyle = "background: #010409; color: #c9d1d9; font-size: 9px; border: 1px solid #30363d; border-radius: 3px; padding: 3px 5px; width: 100%; box-sizing: border-box; outline: none;";

    thead.innerHTML = `
        <tr style="font-size: 10px; border-bottom: 2px solid #30363d;">
            <th style="border: 1px solid #30363d; width: 30px; padding: 10px 5px; text-align: center; vertical-align: bottom;">
                <input type="checkbox" id="selectAllOpman" onchange="toggleSelectAllOpman(this)" style="cursor:pointer;" title="Pilih Semua (Kecuali Tiket Locked)">
            </th>
            <th style="border: 1px solid #30363d; width: 115px; padding: 10px 5px; color: #8b949e; cursor:pointer; vertical-align: bottom;" onclick="handleOpmSort('issueTs')">
                <div style="display: flex; justify-content: space-between;"><span>ISSUE_DATE</span><span>${getOpmSortIcon('issueTs')}</span></div>
            </th>
            <th style="border: 1px solid #30363d; width: 125px; padding: 10px 5px; color: #8b949e; cursor:pointer; vertical-align: bottom;" onclick="handleOpmSort('solveTs')">
                <div style="display: flex; justify-content: space-between;"><span>SOLVE_DATE</span><span>${getOpmSortIcon('solveTs')}</span></div>
            </th>
            
            <th style="border: 1px solid #30363d; width: 120px; padding: 10px 5px; color: #8b949e; vertical-align: bottom;">
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px; cursor: pointer;" onclick="handleOpmSort('resTimeMs')">
                    <span>RES_TIME</span> <span>${getOpmSortIcon('resTimeMs')}</span>
                </div>
                <input type="text" id="filterOpmResTime" value="${opmFilterState.resTime || ''}" oninput="handleOpmFilter('resTime', this.value)" style="${inputStyle}" placeholder="Filter Time...">
            </th>

            <th style="border: 1px solid #30363d; width: 130px; padding: 10px 5px; color: #8b949e; vertical-align: bottom;">
                <div style="margin-bottom: 4px;">CASE_TYPE</div>
                <select onchange="handleOpmFilter('type', this.value)" style="${inputStyle}"><option value="">ALL CASE</option><option value="Services" ${opmFilterState.type==='services'?'selected':''}>Services</option><option value="Memory" ${opmFilterState.type==='memory'?'selected':''}>Memory</option><option value="CPU" ${opmFilterState.type==='cpu'?'selected':''}>CPU</option><option value="Network" ${opmFilterState.type==='network'?'selected':''}>Network</option><option value="Disk" ${opmFilterState.type==='disk'?'selected':''}>Disk</option></select>
            </th>
            <th style="border: 1px solid #30363d; width: 200px; padding: 10px 5px; color: #8b949e; vertical-align: bottom;">
                <div style="margin-bottom: 4px;">DETAIL_ISSUE</div><input type="text" id="filterOpmDetail" value="${opmFilterState.detail}" oninput="handleOpmFilter('detail', this.value)" style="${inputStyle}">
            </th>
            <th style="border: 1px solid #30363d; width: 100px; padding: 10px 5px; color: #8b949e; vertical-align: bottom;">
                <div style="margin-bottom: 4px;">IP_ADDRESS</div><input type="text" id="filterOpmIP" value="${opmFilterState.ip}" oninput="handleOpmFilter('ip', this.value)" style="${inputStyle}">
            </th>
            <th style="border: 1px solid #30363d; width: 100px; padding: 10px 5px; color: #8b949e; vertical-align: bottom;">
                <div style="margin-bottom: 4px;">HOSTNAME</div><input type="text" id="filterOpmHost" value="${opmFilterState.host}" oninput="handleOpmFilter('host', this.value)" style="${inputStyle}">
            </th>
            <th style="border: 1px solid #30363d; width: 40px; padding: 10px 5px; color: #8b949e; vertical-align: bottom;">PRIO</th>
            <th style="border: 1px solid #30363d; width: 60px; padding: 10px 5px; color: #8b949e; vertical-align: bottom;">ASSIGN</th>
            <th style="border: 1px solid #30363d; width: 150px; padding: 10px 5px; color: #8b949e; vertical-align: bottom;">RESOLUTION</th>
            <th style="border: 1px solid #30363d; width: 70px; padding: 10px 5px; color: #8b949e; vertical-align: bottom;">
                <div style="margin-bottom: 4px;">STATUS</div>
                <select onchange="handleOpmFilter('status', this.value)" style="${inputStyle}"><option value="">ALL</option><option value="Open" ${opmFilterState.status==='open'?'selected':''}>Open</option><option value="Close" ${opmFilterState.status==='close'?'selected':''}>Close</option></select>
            </th>
            <th style="border: 1px solid #30363d; width: 80px; padding: 10px 5px; color: #8b949e; vertical-align: bottom; text-align: center;">
                <div style="margin-bottom: 4px;">PIC</div>
                <div style="color: #58a6ff; font-weight: bold; font-size: 11px; padding-top: 4px;">${currentPic}</div>
            </th>
            <th style="border: 1px solid #30363d; width: 170px; padding: 10px 5px; text-align: center; vertical-align: bottom;">
                <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <span style="color: #8b949e; font-weight: bold;">ACTION</span> 
                    <button onclick="toggleAllDoneOpman()" style="background: #238636; border: 1px solid #2ea043; color: #ffffff; font-size: 9px; padding: 3px 6px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-left: 8px;">ALL DONE</button>
                </div>
            </th>
        </tr>`;

    const activeId = document.activeElement ? document.activeElement.id : null;
    if (activeId && activeId.startsWith('filterOpm')) {
        const el = document.getElementById(activeId);
        if (el) { const val = el.value; el.value = ''; el.value = val; el.focus(); }
    }
}

function renderOpmTableRows(filteredData, checkedObj, currentPic) {
    const body = document.getElementById('opmBody');
    if (!body) return;

    const activeCheckboxes = Array.from(document.querySelectorAll('.opman-row-checkbox:checked')).map(cb => cb.getAttribute('data-id'));
    const isMasterChecked = document.getElementById('selectAllOpman') ? document.getElementById('selectAllOpman').checked : false;

    const finalGlobalPIC = localStorage.getItem('global_noc_pic') || currentPic || 'Admin';

    window.currentOpmTicketsExcel = {};
    let htmlRows = [];

    let countOpen = 0; let countUnack = 0; let countAck = 0; let countVerifyClose = 0;

    filteredData.forEach(t => {
        let currentLevel = checkedObj[t.ticketId] || 0;
        let isSystemClose = (t.status === "Close");
        
        if (!isSystemClose) {
            countOpen++;
            if (currentLevel === 0) countUnack++;
            if (currentLevel === 1) countAck++;
        } else {
            if (currentLevel !== 2) countVerifyClose++;
        }
        
        let rowStyle = "";
        let checkBtnText = "DONE";
        let checkBtnColor = "#30363d"; 
        
        if (isSystemClose) {
            if (currentLevel === 2) {
                rowStyle = "opacity: 0.4; filter: grayscale(1);";
                checkBtnText = "✔"; checkBtnColor = "#2ea043"; 
            } else {
                rowStyle = "opacity: 1;"; 
                checkBtnText = "DONE"; checkBtnColor = "#da3633"; 
            }
        } else {
            if (currentLevel === 1) {
                rowStyle = "opacity: 0.7; filter: brightness(0.7);";
                checkBtnText = "ACK'D"; checkBtnColor = "#e3b341"; 
            } else {
                rowStyle = "opacity: 1;"; 
            }
        }

        let isIgnored = false;
        let dLower = (t.detail || "").toLowerCase();
        let cleanIp = t.ip ? t.ip.split(':')[0] : "";
        let isExcludedIp = (typeof globalFilterData !== 'undefined' && globalFilterData && globalFilterData.excluded && globalFilterData.excluded.includes(cleanIp));

        if (dLower.includes("server active connections") || 
            dLower.includes("bcp and mssql server versions might differ") || 
            dLower.includes("apm plugin: resource apm default monitor is down") ||
            isExcludedIp) {
            isIgnored = true;
        }

        let cbHtml = `<input type="checkbox" class="opman-row-checkbox" data-id="${t.ticketId}" style="cursor:pointer;">`;
        let btnExcelHtml = `<button onclick="actionCopyExcel(this, '${t.ticketId}')" style="background:#21262d; border:1px solid #30363d; color:#c9d1d9; font-size:8px; padding:3px 5px; cursor:pointer; border-radius:3px;" title="Copy Format Excel"><img src="src/img/excel.svg" style="width:14px;height:14px;vertical-align:middle;display:block;"></button>`;
        let btnWaHtml = `<button onclick="actionWA(this, '${t.ticketId}')" style="background:#1f6feb; border:none; color:white; font-size:9px; font-weight:bold; padding:3px 6px; cursor:pointer; border-radius:3px; box-shadow: 0 0 5px rgba(31,111,235,0.4);" title="Copy SS & Buka WhatsApp"><img src="src/img/whatsapp.svg" style="width:14px;height:14px;vertical-align:middle;display:block;"></button>`;
        let btnItsmHtml = `<button onclick="actionITSM('${t.ticketId}')" style="background:#8957e5; border:none; color:white; font-size:8px; padding:3px 5px; cursor:pointer; border-radius:3px;" title="Helper ITSM"><img src="src/img/itsm.svg" style="width:14px;height:14px;vertical-align:middle;display:block;"></button>`;

        if (isIgnored) {
            cbHtml = `<input type="checkbox" class="opman-row-checkbox" data-id="${t.ticketId}" disabled style="cursor:not-allowed;" title="Tiket diabaikan (Locked)">`;
            btnExcelHtml = `<button disabled style="background:#21262d; border:1px solid #30363d; color:#8b949e; font-size:8px; padding:3px 5px; cursor:not-allowed; border-radius:3px; opacity:0.3;" title="Locked / Diabaikan"><img src="src/img/excel.svg" style="width:14px;height:14px;vertical-align:middle;display:block;opacity:0.4;"></button>`;
            btnWaHtml = `<button disabled style="background:#21262d; border:1px solid #30363d; color:#8b949e; font-size:9px; font-weight:bold; padding:3px 6px; cursor:not-allowed; border-radius:3px; opacity:0.3;" title="Locked / Diabaikan"><img src="src/img/whatsapp.svg" style="width:14px;height:14px;vertical-align:middle;display:block;opacity:0.4;"></button>`;
            btnItsmHtml = `<button disabled style="background:#21262d; border:1px solid #30363d; color:#8b949e; font-size:8px; padding:3px 5px; cursor:not-allowed; border-radius:3px; opacity:0.3;" title="Locked / Diabaikan"><img src="src/img/itsm.svg" style="width:14px;height:14px;vertical-align:middle;display:block;opacity:0.4;"></button>`;
            rowStyle += " opacity: 0.6; filter: grayscale(0.3);"; 
        }

        const excelData = [t.issueDate, t.solveDate, t.resTime, t.caseTypeDisplay, t.detail, t.ip, t.hostname, t.prio, t.assign, t.resolution, t.status, finalGlobalPIC];
        window.currentOpmTicketsExcel[t.ticketId] = excelData;

        htmlRows.push(`
            <tr class="hover-row" style="border-bottom: 1px solid #30363d; ${rowStyle} transition: all 0.3s; font-size: 10px;">
                <td style="border: 1px solid #30363d; padding: 8px 5px; text-align: center;">${cbHtml}</td>
                <td style="border: 1px solid #30363d; padding: 8px 5px; color: #8b949e; white-space: nowrap;">${t.issueDate}</td>
                <td style="border: 1px solid #30363d; padding: 8px 5px; color: #8b949e; white-space: nowrap;">${t.solveDate}</td>
                <td style="border: 1px solid #30363d; padding: 8px 5px; white-space: nowrap;">${t.resTime}</td>
                <td style="border: 1px solid #30363d; color: #f1e05a; padding: 8px 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.caseTypeDisplay}</td>
                <td style="border: 1px solid #30363d; padding: 8px 5px; white-space: normal; word-wrap: break-word; min-width: 200px;">${isIgnored ? '🔒 ' : ''}${t.displayDetail}</td>
                <td style="border: 1px solid #30363d; padding: 6px 3px; font-weight:bold; white-space: nowrap; vertical-align: middle;">${t.badges}${t.ip}</td>
                <td style="border: 1px solid #30363d; color: #58a6ff; padding: 8px 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.hostname}</td>
                <td style="border: 1px solid #30363d; padding: 8px 5px; white-space: nowrap; text-align: center;">${t.prio}</td>
                <td style="border: 1px solid #30363d; padding: 8px 5px; white-space: nowrap;">${t.assign}</td>
                <td style="border: 1px solid #30363d; padding: 8px 5px; white-space: normal; word-wrap: break-word; min-width: 150px; color: #8b949e; font-size:9px;">${t.resolution}</td>
                <td style="border: 1px solid #30363d; padding: 8px 5px; color: ${t.status === 'Close' ? '#3fb950' : '#ff7b72'}; font-weight:bold; white-space: nowrap; text-align: center;">${t.status}</td>
                <td style="border: 1px solid #30363d; padding: 8px 5px; color: #58a6ff; font-weight:bold; white-space: nowrap; text-align: center;">${finalGlobalPIC}</td>
                
                <td style="border: 1px solid #30363d; padding: 8px 5px; text-align:center;">
                    <div style="display:flex; gap:4px; justify-content:center; align-items:center;">
                        ${btnExcelHtml}
                        <button onclick="actionOpenOPM('${t.ticketId}')" style="background:transparent; border:1px solid #e3b341; padding:3px 5px; cursor:pointer; border-radius:3px;" title="Buka Detail di Aplikasi OpManager"><img src="src/img/opmanager.svg" style="width:14px;height:14px;vertical-align:middle;display:block;"></button>
                        ${btnWaHtml}
                        ${btnItsmHtml}
                        <button class="opm-done-btn" data-alarm-id="${t.ticketId}" data-sys-status="${t.status}" onclick="toggleCheck('${t.ticketId}', '${t.status}')" style="background:${checkBtnColor}; border:none; color:${checkBtnColor === '#30363d' ? '#c9d1d9' : 'white'}; font-size:10px; font-weight:bold; padding:4px 8px; cursor:pointer; border-radius:3px;">${checkBtnText}</button>
                    </div>
                </td>
            </tr>`
        );
    });

    body.innerHTML = htmlRows.join('');

    activeCheckboxes.forEach(id => {
        const cb = document.querySelector(`.opman-row-checkbox[data-id="${id}"]`);
        if (cb && !cb.disabled) cb.checked = true;
    });
    if (isMasterChecked) {
        const master = document.getElementById('selectAllOpman');
        if (master) master.checked = true;
    }

    const elOpen = document.getElementById('opmUnifiedTotalOpen');
    const elUnack = document.getElementById('opmUnifiedUnack');
    const elAck = document.getElementById('opmUnifiedAck');
    const elVerifyWrap = document.getElementById('opmUnifiedVerifyWrap');
    const elVerify = document.getElementById('opmUnifiedVerify');

    if (elOpen) elOpen.innerText = countOpen;
    if (elUnack) {
        elUnack.innerText = countUnack;
        elUnack.style.color = countUnack === 0 ? "#3fb950" : "#da3633"; 
    }
    if (elAck) elAck.innerText = countAck;
    if (elVerifyWrap && elVerify) {
        elVerify.innerText = countVerifyClose;
        elVerifyWrap.style.display = countVerifyClose > 0 ? 'inline-flex' : 'none'; 
    }
}

// ==========================================
// UNIFIED TICKET
// ==========================================
let activeTab = 'GRAFANA';
window.currentFlapTolerance = 2; 

function changeGlobalUnifiedPic(val) {
    localStorage.setItem('global_noc_pic', val);
    localStorage.setItem('opm_global_pic', val); 
    localStorage.setItem('grafana_pic', val); 
    localStorage.setItem('global_pic', val); 
    performSilentRefresh();
}

function openUnifiedTicket() {
    createUnifiedModal();
    document.getElementById('unifiedTicketModal').style.display = 'block';
    switchTab(activeTab);
    startSmartAutoRefresh(); 
}

function closeUnifiedTicket() {
    document.getElementById('unifiedTicketModal').style.display = 'none';
    stopSmartAutoRefresh(); 
}

function resetAllUnifiedFilters() {
    if (typeof resetGrafanaFilter === 'function') resetGrafanaFilter();
    if (typeof resetOpmFilter === 'function') resetOpmFilter();
    
    const btn = document.getElementById('btnResetUnified');
    if (btn) {
        const origText = btn.innerText;
        btn.innerText = "✔ RESET DONE";
        btn.style.background = "#2ea043"; 
        setTimeout(() => {
            btn.innerText = origText;
            btn.style.background = "#21262d"; 
        }, 1000);
    }
    resetRefreshTimer(20); 
}

function changeFlapTolerance(val) {
    window.currentFlapTolerance = parseInt(val) || 2;
    if (activeTab === 'GRAFANA' && typeof renderTicketBody === 'function') renderTicketBody();
}

function showToleranceInfo() {
    const old = document.getElementById('infoTolerancePopup');
    if (old) old.remove();

    const popupHTML = `
    <div id="infoTolerancePopup" style="position: fixed; z-index: 10002; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; font-family: 'Consolas', monospace;">
        <div style="background: #161b22; width: 400px; border: 1px solid #30363d; border-radius: 8px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <h3 style="color: #58a6ff; margin-top: 0; border-bottom: 1px solid #30363d; padding-bottom: 10px; font-size: 14px;">ℹ️ INFO TOLERANSI (ANTI-FLAPPING)</h3>
            <div style="color: #c9d1d9; font-size: 12px; line-height: 1.6; margin-bottom: 20px;">
                <p>Fitur ini menahan tiket agar tidak langsung berubah menjadi <strong>Close</strong> saat resource (CPU/Memory/Ping) terlihat normal sesaat.</p>
                <p>Sistem akan menunggu selama batas waktu toleransi. Jika dalam waktu tersebut resource kembali naik (Flapping), maka tiket akan tetap <strong>Open</strong>.</p>
                <p style="color: #8b949e; font-style: italic; margin-top: 10px;">Default 2 menit</p>
            </div>
            <div style="text-align: right;">
                <button onclick="document.getElementById('infoTolerancePopup').remove()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 6px 20px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s;" onmouseover="this.style.background='#30363d'" onmouseout="this.style.background='#21262d'">MENGERTI</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', popupHTML);
}

function showBulkCopyDialog() {
    const old = document.getElementById('bulkCopyDialog');
    if (old) old.remove();

    let checkboxes = [];
    if (activeTab === 'GRAFANA') checkboxes = document.querySelectorAll('.grafana-row-checkbox:checked');
    else if (activeTab === 'OPMAN') checkboxes = document.querySelectorAll('.opman-row-checkbox:checked');

    if (checkboxes.length === 0) { 
        alert(`Pilih minimal 1 tiket ${activeTab} terlebih dahulu!`); 
        return; 
    }

    const popupHTML = `
    <div id="bulkCopyDialog" style="position: fixed; z-index: 20000; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; font-family: 'Consolas', monospace; backdrop-filter: blur(2px);">
        <div style="background: #0d1117; width: 350px; border: 1px solid #30363d; border-radius: 8px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.8);">
            <div style="background: #161b22; padding: 12px 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #f1e05a; font-weight: bold; font-size: 14px;">📋 COPY ${checkboxes.length} TICKETS</span>
                <button onclick="document.getElementById('bulkCopyDialog').remove()" style="background: transparent; border: none; color: #8b949e; cursor: pointer; font-size: 16px; padding: 0;">&times;</button>
            </div>
            <div style="padding: 25px 20px; display: flex; flex-direction: column; gap: 15px;">
                <button onclick="executeBulkCopy('EXCEL', this)" style="background: #2ea043; border: none; color: white; padding: 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; transition: 0.2s; display:flex; align-items:center; justify-content:center; gap:8px;" onmouseover="this.style.background='#3fb950'" onmouseout="this.style.background='#2ea043'"><img src="src/img/excel.svg" style="width:20px;height:20px;"> COPY TO EXCEL</button>
                <button onclick="executeBulkCopy('WA', this)" style="background: #1f6feb; border: none; color: white; padding: 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; transition: 0.2s; display:flex; align-items:center; justify-content:center; gap:8px;" onmouseover="this.style.background='#58a6ff'" onmouseout="this.style.background='#1f6feb'"><img src="src/img/whatsapp.svg" style="width:20px;height:20px;"> COPY WA ESKALASI</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', popupHTML);
}

function createUnifiedModal() {
    const oldModal = document.getElementById('unifiedTicketModal');
    if (oldModal) oldModal.remove(); 

    const picList = ['Admin', 'Ririn', 'Egi', 'Alfa', 'John', 'Yama', 'Pram', 'Rizal'];
    const currentPic = localStorage.getItem('global_noc_pic') || localStorage.getItem('opm_global_pic') || 'Admin';
    const picOptions = picList.map(n => `<option value="${n}" ${currentPic===n?'selected':''}>${n}</option>`).join('');

    const modalHTML = `
    <div id="unifiedTicketModal" style="display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; background: #0d1117;">
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; font-family: 'Consolas', monospace;">
            
            <div style="padding: 10px 15px; background: #161b22; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1000;">
                <div style="display: flex; gap: 5px; align-self: flex-end;">
                    <button id="tab-grafana" onclick="switchTab('GRAFANA')" style="padding: 8px 20px; border: 1px solid #30363d; border-bottom: none; border-radius: 6px 6px 0 0; cursor: pointer; font-size: 11px; font-weight: bold;">📈 GRAFANA</button>
                    <button id="tab-opman" onclick="switchTab('OPMAN')" style="padding: 8px 20px; border: 1px solid #30363d; border-bottom: none; border-radius: 6px 6px 0 0; cursor: pointer; font-size: 11px; font-weight: bold;">🚨 OPMANAGER</button>
                    <button id="tab-dynatrace" onclick="switchTab('DYNATRACE')" style="padding: 8px 20px; border: 1px solid #30363d; border-bottom: none; border-radius: 6px 6px 0 0; cursor: pointer; font-size: 11px; font-weight: bold;">☁️ DYNATRACE</button>
                </div>

                <div style="display: flex; gap: 10px; align-items: center;">
                    
                    <div id="grafCounterBox" style="display: none; align-items: center; gap: 8px; background: #010409; border: 1px solid #30363d; padding: 4px 10px; border-radius: 4px; margin-right: 5px;">
                        <span style="color: #8b949e; font-size: 10px; font-weight: bold;">OPEN: <span id="grafUnifiedTotalOpen" style="color: #ff7b72; font-size: 12px;">0</span></span>
                        <span style="color: #8b949e; font-size: 10px; font-weight: bold;">| 🔴: <span id="grafUnifiedUnack" style="color: #da3633; font-size: 12px;">0</span></span>
                        <span style="color: #8b949e; font-size: 10px; font-weight: bold;">| 🟡: <span id="grafUnifiedAck" style="color: #e3b341; font-size: 12px;">0</span></span>
                        <div id="grafUnifiedVerifyWrap" style="display: none; align-items: center; background: rgba(218,54,51,0.15); padding: 2px 6px; border-radius: 3px; border: 1px solid #da3633;">
                            <span style="color: #da3633; font-size: 10px; font-weight: bold;">VERIFY CLOSE: <span id="grafUnifiedVerify" style="font-size: 12px;">0</span></span>
                        </div>
                    </div>

                    <div id="opmCounterBox" style="display: none; align-items: center; gap: 8px; background: #010409; border: 1px solid #30363d; padding: 4px 10px; border-radius: 4px; margin-right: 5px;">
                        <span style="color: #8b949e; font-size: 10px; font-weight: bold;">OPEN: <span id="opmUnifiedTotalOpen" style="color: #ff7b72; font-size: 12px;">0</span></span>
                        <span style="color: #8b949e; font-size: 10px; font-weight: bold;">| 🔴: <span id="opmUnifiedUnack" style="color: #da3633; font-size: 12px;">0</span></span>
                        <span style="color: #8b949e; font-size: 10px; font-weight: bold;">| 🟡: <span id="opmUnifiedAck" style="color: #e3b341; font-size: 12px;">0</span></span>
                        <div id="opmUnifiedVerifyWrap" style="display: none; align-items: center; background: rgba(218,54,51,0.15); padding: 2px 6px; border-radius: 3px; border: 1px solid #da3633;">
                            <span style="color: #da3633; font-size: 10px; font-weight: bold;">VERIFY CLOSE: <span id="opmUnifiedVerify" style="font-size: 12px;">0</span></span>
                        </div>
                    </div>
                    
                    <button class="btn-opm-time-toggle" id="btnOpmTimeToggleUnified" onclick="toggleOpmTimeMode()" style="display: none; background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: bold; margin-right: 5px; transition: 0.2s;">⏳ > 5 MENIT</button>

                    <div style="display: flex; align-items: center; gap: 5px; background: #010409; border: 1px solid #30363d; padding: 4px 8px; border-radius: 4px;">
                        <span style="color: #8b949e; font-size: 10px; font-weight: bold;">PIC:</span>
                        <select id="unifiedPicSelect" onchange="changeGlobalUnifiedPic(this.value)" style="background: transparent; border: none; color: #58a6ff; font-weight: bold; font-size: 12px; outline: none; cursor: pointer;">
                            ${picOptions}
                        </select>
                    </div>

                    <div style="display: flex; align-items: center; gap: 5px; background: #010409; border: 1px solid #30363d; padding: 4px 8px; border-radius: 4px;">
                        <span style="color: #8b949e; font-size: 10px; font-weight: bold;">TOLERANSI:</span>
                        <input type="number" id="flapToleranceInput" value="${window.currentFlapTolerance}" min="1" max="60" onchange="changeFlapTolerance(this.value)" style="background: transparent; border: none; color: #f1e05a; font-size: 12px; width: 30px; outline: none; text-align: center; font-weight: bold;">
                        <button onclick="showToleranceInfo()" style="background: transparent; border: none; color: #58a6ff; cursor: pointer; font-size: 12px; padding: 0 2px;">❓</button>
                    </div>

                    <button id="btnCopyAllUndone" onclick="executeCopyAllUndone(this)" style="background: #8957e5; border: 1px solid #a371f7; color: white; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s;" onmouseover="this.style.background='#a371f7'" onmouseout="this.style.background='#8957e5'">📑 COPY ALL UNDONE</button>
                    <button id="btnBulkExcelUnified" onclick="showBulkCopyDialog()" style="background: #2ea043; border: none; color: white; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; display: none; transition: 0.2s;">📋 COPY SELECTED ▾</button>
                    
                    <div style="display: flex; align-items: center; border: 1px solid #1f6feb; border-radius: 4px; overflow: hidden; background: #010409;">
                        <div id="unifiedCountdownUI" style="padding: 6px 8px; font-size: 11px; font-weight: bold; color: #58a6ff; min-width: 25px; text-align: center; border-right: 1px solid #1f6feb;">20s</div>
                        <button onclick="manualRefreshUnifiedData(this)" style="background: #1f6feb; border: none; color: white; padding: 6px 12px; cursor: pointer; font-size: 13px; font-weight: bold; transition: 0.2s;" title="Refresh Data Sekarang">🔄</button>
                    </div>
                    
                    <button id="btnResetUnified" onclick="resetAllUnifiedFilters()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s;">🔄 RESET FILTER</button>
                    <button onclick="closeUnifiedTicket()" style="background: #da3633; border: none; color: white; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">EXIT</button>
                </div>
            </div>

            <div id="unified-content" style="flex: 1; overflow: hidden; position: relative; background: #0d1117;">
                <div id="view-grafana" style="display: none; height: 100%; width: 100%;"></div>
                <div id="view-opman" style="display: none; height: 100%; width: 100%;"></div>
                <div id="view-dynatrace" style="display: none; height: 100%; width: 100%;"></div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    prepareViews();
    attachInteractionListeners(); 
}

function prepareViews() {
    if(typeof createTicketModal === 'function') createTicketModal();
    const gModal = document.getElementById('ticketModal');
    if (gModal) {
        const gHeader = gModal.querySelector('div[style*="background: #161b22"]');
        if(gHeader) gHeader.style.display = 'none'; 
        gModal.style.position = 'relative'; gModal.style.display = 'block'; gModal.style.height = '100%';
        document.getElementById('view-grafana').appendChild(gModal);
    }

    if(typeof createOpManagerModal === 'function') createOpManagerModal();
    const oModal = document.getElementById('opManagerModal');
    if (oModal) {
        const oHeader = oModal.querySelector('div[style*="background: #161b22"]');
        if(oHeader) oHeader.style.display = 'none'; 
        oModal.style.position = 'relative'; oModal.style.display = 'block'; oModal.style.height = '100%';
        document.getElementById('view-opman').appendChild(oModal);
    }

    if(typeof createDynatraceModal === 'function') createDynatraceModal();
    const dModal = document.getElementById('dynatraceModal');
    if (dModal) {
        const dHeader = dModal.querySelector('div[style*="background: #161b22"]');
        if(dHeader) dHeader.style.display = 'none';
        dModal.style.position = 'relative'; dModal.style.display = 'block'; dModal.style.height = '100%';
        document.getElementById('view-dynatrace').appendChild(dModal);
    }

}

function switchTab(tab) {
    activeTab = tab;
    const views = ['view-grafana', 'view-opman', 'view-dynatrace'];
    const tabs = ['tab-grafana', 'tab-opman', 'tab-dynatrace'];
    
    const btnBulkExcel = document.getElementById('btnBulkExcelUnified');
    const btnCopyUndone = document.getElementById('btnCopyAllUndone');
    const grafCounter = document.getElementById('grafCounterBox');
    const opmCounter = document.getElementById('opmCounterBox');
    const btnTimeToggle = document.getElementById('btnOpmTimeToggleUnified');

    tabs.forEach(t => {
        const el = document.getElementById(t);
        if(el) { el.style.background = '#21262d'; el.style.color = '#8b949e'; }
    });
    views.forEach(v => {
        const el = document.getElementById(v);
        if(el) el.style.display = 'none';
    });

    if (tab === 'GRAFANA') {
        document.getElementById('view-grafana').style.display = 'block';
        const t = document.getElementById('tab-grafana');
        t.style.background = '#0d1117'; t.style.color = '#f1e05a';
        if(btnBulkExcel) btnBulkExcel.style.display = 'block'; 
        if(btnCopyUndone) btnCopyUndone.style.display = 'block';
        if(grafCounter) grafCounter.style.display = 'flex'; 
        if(opmCounter) opmCounter.style.display = 'none';
        if(btnTimeToggle) btnTimeToggle.style.display = 'none';
        if(typeof renderTicketBody === 'function') renderTicketBody(); 
    } 
    else if (tab === 'OPMAN') {
        document.getElementById('view-opman').style.display = 'block';
        const t = document.getElementById('tab-opman');
        t.style.background = '#0d1117'; t.style.color = '#ff7b72';
        if(btnBulkExcel) btnBulkExcel.style.display = 'block'; 
        if(btnCopyUndone) btnCopyUndone.style.display = 'block';
        if(grafCounter) grafCounter.style.display = 'none';
        if(opmCounter) opmCounter.style.display = 'flex'; 
        if(btnTimeToggle) btnTimeToggle.style.display = 'block';
        if(typeof renderOpManagerData === 'function') renderOpManagerData();
    } 
    else if (tab === 'DYNATRACE') {
        document.getElementById('view-dynatrace').style.display = 'block';
        const t = document.getElementById('tab-dynatrace');
        t.style.background = '#0d1117'; t.style.color = '#58a6ff';
        if(btnBulkExcel) btnBulkExcel.style.display = 'none';
        if(btnCopyUndone) btnCopyUndone.style.display = 'none';
        if(grafCounter) grafCounter.style.display = 'none';
        if(opmCounter) opmCounter.style.display = 'none';
        if(btnTimeToggle) btnTimeToggle.style.display = 'none';
    }
}

// === LOGIKA SMART AUTO REFRESH (DEBOUNCING) ===
let autoRefreshTimer = 20;
let refreshIntervalObj = null;

function startSmartAutoRefresh() {
    if (refreshIntervalObj) clearInterval(refreshIntervalObj);
    autoRefreshTimer = 20;
    updateCountdownUI(autoRefreshTimer, false);

    refreshIntervalObj = setInterval(() => {
        autoRefreshTimer--;
        
        if (autoRefreshTimer <= 0) {
            performSilentRefresh();
            autoRefreshTimer = 20; 
            updateCountdownUI(autoRefreshTimer, false);
        } else {
            updateCountdownUI(autoRefreshTimer, autoRefreshTimer > 20);
        }
    }, 1000);
}

function stopSmartAutoRefresh() {
    if (refreshIntervalObj) {
        clearInterval(refreshIntervalObj);
        refreshIntervalObj = null;
    }
}

function resetRefreshTimer(seconds) {
    autoRefreshTimer = seconds;
    updateCountdownUI(autoRefreshTimer, seconds > 20);
}

function updateCountdownUI(time, isExtended) {
    const ui = document.getElementById('unifiedCountdownUI');
    if (!ui) return;
    ui.innerText = `${time}s`;
    ui.style.color = isExtended ? "#d29922" : "#58a6ff"; 
}

function performSilentRefresh() {
    if (activeTab === 'GRAFANA' && typeof renderTicketBody === 'function') {
        renderTicketBody();
    } else if (activeTab === 'OPMAN' && typeof renderOpManagerData === 'function') {
        renderOpManagerData();
    }
}

function manualRefreshUnifiedData(btn) {
    const origHTML = btn.innerHTML;
    btn.innerHTML = "⏳";
    performSilentRefresh();
    resetRefreshTimer(20); 
    setTimeout(() => { btn.innerHTML = origHTML; }, 1000);
}

function attachInteractionListeners() {
    const modal = document.getElementById('unifiedTicketModal');
    if (!modal) return;
    modal.addEventListener('change', function(e) {
        if (e.target && (e.target.classList.contains('grafana-row-checkbox') || e.target.classList.contains('opman-row-checkbox') || e.target.id === 'selectAllGrafana' || e.target.id === 'selectAllOpman')) {
            resetRefreshTimer(60); 
        }
    });
    modal.addEventListener('input', function(e) {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
            resetRefreshTimer(60); 
        }
    });
}

function executeCopyAllUndone(btn) {
    const origText = btn.innerText;
    const origBg = btn.style.background;
    btn.innerText = "⏳ COPYING...";
    btn.disabled = true;

    let allRowsData = [];
    let checkboxes = [];
    let targetExcelData = null;

    if (activeTab === 'GRAFANA') {
        checkboxes = document.querySelectorAll('.grafana-row-checkbox:not(:disabled)');
        targetExcelData = window.currentGrafanaTicketsExcel;
    } else if (activeTab === 'OPMAN') {
        checkboxes = document.querySelectorAll('.opman-row-checkbox:not(:disabled)');
        targetExcelData = window.currentOpmTicketsExcel;
    }

    if (!targetExcelData || checkboxes.length === 0) {
        alert("Data belum tersedia di layar!");
        btn.innerText = origText; btn.style.background = origBg; btn.disabled = false;
        return;
    }

    checkboxes.forEach(cb => {
        const rowElement = cb.closest('tr') || cb.closest('.ticket-row') || cb.closest('div[style*="display: flex"]');
        let isDone = false;
        if (rowElement) {
            const style = window.getComputedStyle(rowElement);
            if (style.display === 'none' || parseFloat(style.opacity) < 1 || rowElement.classList.contains('done-row')) {
                isDone = true;
            }
        }

        if (!isDone) {
            const tId = cb.getAttribute('data-id');
            if (targetExcelData[tId]) {
                if (activeTab === 'OPMAN') {
                    allRowsData.push(formatExcelRowWithFormula(targetExcelData[tId]));
                } else if (activeTab === 'GRAFANA') {
                    allRowsData.push(formatGrafanaExcelRowWithFormula(targetExcelData[tId]));
                } else {
                    allRowsData.push(targetExcelData[tId].join('\t'));
                }
            }
        }
    });

    if (allRowsData.length === 0) {
        btn.innerText = "SEMUA SUDAH DONE";
        btn.style.background = "#d29922"; 
        setTimeout(() => { btn.innerText = origText; btn.style.background = origBg; btn.disabled = false; }, 2000);
        return;
    }

    allRowsData.reverse(); 
    const textToCopy = allRowsData.join('\n');

    navigator.clipboard.writeText(textToCopy).then(() => {
        btn.innerText = `✅ COPIED ${allRowsData.length} TIKET`;
        btn.style.background = "#3fb950"; 
        setTimeout(() => { btn.innerText = origText; btn.style.background = origBg; btn.disabled = false; }, 2000);
    }).catch(() => {
        btn.innerText = "ERR COPY!";
        btn.style.background = "#da3633"; 
        setTimeout(() => { btn.innerText = origText; btn.style.background = origBg; btn.disabled = false; }, 2000);
    });
}

function closeBulkDialogAndNotify(checkboxes, message) {
    const dialog = document.getElementById('bulkCopyDialog');
    if (dialog) dialog.remove();

    const theMainBtn = document.getElementById('btnBulkExcelUnified');
    const originalText = theMainBtn.innerText;
    const originalBg = theMainBtn.style.background;
    
    theMainBtn.innerText = message;
    theMainBtn.style.background = "#3fb950";
    
    checkboxes.forEach(cb => cb.checked = false);
    const masterGraf = document.getElementById('selectAllGrafana'); if(masterGraf) masterGraf.checked = false;
    const masterOpm = document.getElementById('selectAllOpman'); if(masterOpm) masterOpm.checked = false;

    setTimeout(() => {
        theMainBtn.innerText = originalText;
        theMainBtn.style.background = originalBg;
    }, 2000);
}

async function executeBulkCopy(modeType, dialogBtn) {
    const origBtnText = dialogBtn.innerText;
    dialogBtn.innerText = "⏳ COPYING...";
    
    let checkboxes = []; 
    let allRowsData = []; 
    let waTicketsData = []; 
    
    if (activeTab === 'GRAFANA') {
        checkboxes = document.querySelectorAll('.grafana-row-checkbox:checked');
        checkboxes.forEach(cb => {
            const tId = cb.getAttribute('data-id');
            if (window.currentGrafanaTicketsExcel[tId]) {
                allRowsData.push(formatGrafanaExcelRowWithFormula(window.currentGrafanaTicketsExcel[tId]));
            }
            const rawTick = window.rawGrafanaData.find(r => r.ticketId === tId);
            if(rawTick) waTicketsData.push(rawTick);
        });
    } else if (activeTab === 'OPMAN') {
        checkboxes = document.querySelectorAll('.opman-row-checkbox:checked');
        checkboxes.forEach(cb => {
            const tId = cb.getAttribute('data-id');
            if (window.currentOpmTicketsExcel[tId]) {
                allRowsData.push(formatExcelRowWithFormula(window.currentOpmTicketsExcel[tId]));
            }
            const rawTick = window.rawOpmData.find(r => r.ticketId === tId);
            if(rawTick) waTicketsData.push(rawTick);
        });
    }

    let textToCopy = "";
    
    if (modeType === 'EXCEL') {
        allRowsData.reverse();
        textToCopy = allRowsData.join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            closeBulkDialogAndNotify(checkboxes, `✅ COPIED ${checkboxes.length} TICKETS!`);
        });
    } 
    else if (modeType === 'WA') {
        waTicketsData.reverse();

        const TAGS = {
            Giri: "Eng @Giri", Sam: "Eng @Sam", John: "Eng @John",
            Alex: "Eng @Alex", Dana: "Eng @Dana", BINO: "Eng @Bino",
            Ryan: "Eng @Ryan", INDRA: "Eng @Indra"
        };

        // Hitung tag set per tiket, lalu validasi kesamaan
        function getTagsForTicket(t) {
            let ipPart = t.ip ? t.ip.split(':')[0] : "";
            let isPriority = false;
            if (typeof globalFilterData !== 'undefined' && globalFilterData && globalFilterData.priority && globalFilterData.priority.includes(ipPart)) isPriority = true;
            if (t.badges && t.badges.includes('Priority')) isPriority = true;

            let m = (t.detail || t.DETAIL_ISSUE || "").toLowerCase();
            let s = new Set();
            if (m.includes("not communicating") || m.includes("device down") || m.includes("device not responding")) {
                s.add(TAGS.Giri); s.add(TAGS.Sam); s.add(TAGS.John);
            } else if (m.includes("memory") || m.includes("cpu") || m.includes("disk")) {
                s.add(TAGS.Giri); s.add(TAGS.Sam); s.add(TAGS.John); s.add(TAGS.Dana);
                if (isPriority) s.add(TAGS.Alex);
            } else if (m.includes("interface")) {
                s.add(TAGS.Giri); s.add(TAGS.BINO); s.add(TAGS.INDRA);
            } else if (m.includes("partition details")) {
                s.add(TAGS.Giri); s.add(TAGS.Ryan); s.add(TAGS.Dana);
                if (isPriority) s.add(TAGS.Alex);
            } else {
                s.add(TAGS.Giri); s.add(TAGS.Dana); s.add(TAGS.Sam); s.add(TAGS.John);
            }
            return { tags: s, isPriority };
        }

        const perTicketTags = waTicketsData.map(t => getTagsForTicket(t));
        const firstKey = Array.from(perTicketTags[0].tags).sort().join(',');
        const hasMismatch = perTicketTags.some(pt => Array.from(pt.tags).sort().join(',') !== firstKey);

        if (hasMismatch) {
            dialogBtn.innerText = origBtnText;
            const old = document.getElementById('bulkCopyDialog');
            if (old) old.remove();

            // Kelompokkan tiket berdasarkan tag key
            const groupMap = new Map();
            waTicketsData.forEach((t, i) => {
                const key = Array.from(perTicketTags[i].tags).sort().join(',');
                if (!groupMap.has(key)) groupMap.set(key, { tags: perTicketTags[i].tags, isPriority: perTicketTags[i].isPriority, tickets: [] });
                groupMap.get(key).tickets.push(t);
            });

            // Simpan ke global registry agar bisa diakses oleh tombol di popup
            window._mismatchGroups = Array.from(groupMap.values());

            // Render tiap grup dengan tombol eskalasi
            const groupsHtml = window._mismatchGroups.map((grp, gi) => {
                const tagLabel = Array.from(grp.tags).join(', ');
                const ticketRows = grp.tickets.map(t => {
                    let rawDetail = t.detail || t.DETAIL_ISSUE || t.caseType || "Gangguan";
                    let cleanDetail = rawDetail.replace(/<[^>]*>?/gm, '').trim();
                    if (cleanDetail.length > 65) cleanDetail = cleanDetail.slice(0, 65) + '...';
                    return `<div style="color: #8b949e; font-size: 10px; padding: 2px 0; padding-left: 8px; border-left: 2px solid #30363d;">${cleanDetail}</div>`;
                }).join('');

                const isSingle = grp.tickets.length === 1;
                const btnLabel = isSingle ? '📸 WA + SS' : `📸 WA + SS (${grp.tickets.length})`;
                const btnColor = '#1f6feb';

                return `
                <div style="background: #010409; border: 1px solid #30363d; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
                        <div style="color: #58a6ff; font-size: 11px; font-weight: bold; line-height: 1.4;">${tagLabel}</div>
                        <button id="mismatchEscBtn_${gi}" onclick="_executeMismatchGroupEsc(${gi}, this)" style="background: ${btnColor}; border: none; color: white; font-size: 10px; font-weight: bold; padding: 4px 10px; border-radius: 4px; cursor: pointer; white-space: nowrap; flex-shrink: 0;">${btnLabel}</button>
                    </div>
                    ${ticketRows}
                </div>`;
            }).join('');

            document.body.insertAdjacentHTML('beforeend', `
            <div id="tagMismatchAlert" style="position: fixed; z-index: 20001; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; font-family: 'Consolas', monospace; backdrop-filter: blur(3px);">
                <div style="background: #0d1117; width: 500px; border: 1px solid #f85149; border-radius: 8px; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.9);">
                    <div style="background: #161b22; padding: 12px 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #f85149; font-weight: bold; font-size: 13px;">⚠️ TAG ESKALASI TIDAK SERAGAM</span>
                        <button onclick="document.getElementById('tagMismatchAlert').remove()" style="background: transparent; border: none; color: #8b949e; cursor: pointer; font-size: 18px; line-height: 1; padding: 0;">&times;</button>
                    </div>
                    <div style="padding: 16px 20px;">
                        <p style="color: #c9d1d9; font-size: 12px; margin: 0 0 14px 0; line-height: 1.6;">
                            Alert yang dipilih memiliki penerima eskalasi yang berbeda.<br>
                            <span style="color: #f1e05a;">Eskalasi tiap kelompok secara terpisah menggunakan tombol di bawah.</span>
                        </p>
                        <div style="max-height: 320px; overflow-y: auto; margin-bottom: 16px;">
                            ${groupsHtml}
                        </div>
                        <div style="text-align: right;">
                            <button onclick="document.getElementById('tagMismatchAlert').remove()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 7px 20px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">TUTUP</button>
                        </div>
                    </div>
                </div>
            </div>`);
            return;
        }

        let hasPriority = perTicketTags.some(pt => pt.isPriority);
        let tagsSet = perTicketTags[0].tags;

        let finalTags = "";
        if (hasPriority) finalTags = "Tim @Helpdesk\n" + Array.from(tagsSet).join('\n');
        else finalTags = Array.from(tagsSet).join('\n');

        let sourceName = activeTab === 'GRAFANA' ? 'Grafana' : 'OpManager';
        let bodyMsg = `Kami informasikan saat ini :\n\n`;

        // Kumpulkan semua severity unik, urut Critical > Attention > Trouble
        function resolveStatusLabel(rawStatus) {
            const s = (rawStatus || "").toLowerCase();
            if (s.includes("critical")) return "Critical";
            if (s.includes("attention")) return "Attention";
            return "Trouble";
        }
        const severityOrder = ["Critical", "Attention", "Trouble"];
        const statusSet = new Set();
        waTicketsData.forEach(t => {
            const rawTick = window.rawOpmData && window.rawOpmData.find(r => r.ticketId === t.ticketId);
            statusSet.add(resolveStatusLabel(rawTick && rawTick.rawT ? rawTick.rawT.ORIG_STATUS : ""));
        });
        const statusLabel = severityOrder.filter(s => statusSet.has(s)).map(s => `*${s}*`).join(', ');

        waTicketsData.forEach((t) => {
            let ipStr = t.ip ? t.ip.split(':')[0] : "N/A";
            let hName = t.hostname || "Unknown";
            let rawDetail = t.detail || t.DETAIL_ISSUE || t.caseType || "Gangguan";
            let cleanDetail = rawDetail.replace(/<[^>]*>?/gm, '').trim();
            // Deskripsi eskalasi yang di-copy harus LENGKAP — '...' hanya untuk gambar/screenshot.
            bodyMsg += `- ${cleanDetail} --> ${hName} [${ipStr}]\n`;
        });

        bodyMsg += `\nTerpantau status ${statusLabel} di monitoring ${sourceName}.\nMohon dibantu pengecekannya\n\nTerima Kasih`;
        textToCopy = `Dear Team\n${finalTags}\n\n${bodyMsg}`;

        // === GRAFANA ONLY: AUTO-OPEN WEB SEBELUM WA ===
        if (activeTab === 'GRAFANA') {
            try {
                let moduleNames = [...new Set(waTicketsData.map(t => t.moduleName))];
                let targetModule = moduleNames.length === 1 ? moduleNames[0] : 'MIXED';
                let ips = [...new Set(waTicketsData.map(t => t.ip ? t.ip.split(':')[0] : ''))];

                let ipParams = ips.map(ip => `&var-nodeip_all=${ip}`).join('');
                let baseUrl = `https://grafana.example.com:3000/d/noc-dash-beta/noc-overview-v2?orgId=1&from=now-1h&to=now&timezone=browser&var-nodeip_green=$__all&var-nodename_green=$__all&var-nodeip_red=$__all&var-nodename_red=$__all${ipParams}&refresh=30s`;

                let panelParam = "";
                if (targetModule === 'CPU') panelParam = "&viewPanel=panel-59";
                else if (targetModule === 'Memory') panelParam = "&viewPanel=panel-60";
                else if (targetModule === 'Availability') panelParam = "&viewPanel=panel-72";

                window.open(baseUrl + panelParam, '_blank');
            } catch(e) { console.warn("Gagal membuka web Grafana secara otomatis", e); }

            navigator.clipboard.writeText(textToCopy).then(() => {
                closeBulkDialogAndNotify(checkboxes, "✅ COPIED TICKETS!");
                showCopyToast("Teks eskalasi ter-copy ke clipboard!");
            });
        } 
        // === OPMANAGER ONLY: AUTO SCREENSHOT ===
        else if (activeTab === 'OPMAN') {
            const offscreen = document.createElement('div');
            offscreen.style.position = 'fixed';
            offscreen.style.left = '-9999px';
            offscreen.style.top = '0';
            
            let listHtml = '';
            waTicketsData.forEach(t => {
                let st = (t.rawT && t.rawT.ORIG_STATUS ? t.rawT.ORIG_STATUS : t.origStatusParam || "Trouble").toLowerCase();
                let dotColor = "#f4a35d"; 
                let statusText = "Trouble";
                
                if (st.includes("critical")) { dotColor = "#fa5c5c"; statusText = "Critical"; }
                else if (st.includes("attention")) { dotColor = "#eade64"; statusText = "Attention"; }
                
                let hName = t.hostname || "Unknown";
                let rawDetail = t.detail || t.DETAIL_ISSUE || "Gangguan";
                let cleanDetail = rawDetail.replace(/<[^>]*>?/gm, '').trim();
                if (cleanDetail.length > 80) cleanDetail = cleanDetail.slice(0, 80) + '...';

                let rawCategory = t.rawT && t.rawT.CATEGORY ? t.rawT.CATEGORY : (t.caseInfo && t.caseInfo.assign ? t.caseInfo.assign : "Server");
                if (rawCategory.toLowerCase() === "unknown" || rawCategory.trim() === "") {
                    rawCategory = "Server";
                }
                
                listHtml += `
                <div style="display: flex; align-items: center; padding: 7px 0; border-bottom: 1px solid #eaeaea; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    <div style="width: 11px; height: 11px; border-radius: 50%; background-color: ${dotColor}; margin-right: 8px; flex-shrink: 0;"></div>
                    <div style="font-size: 13px; color: #333; line-height: 1.3;">
                        <span>${cleanDetail}</span>
                        <span style="color: #ccc; margin: 0 5px;">|</span>
                        <span>${hName}</span>
                        <span style="color: #ccc; margin: 0 5px;">|</span>
                        <span style="color: #777;">${rawCategory}</span>
                        <span style="color: #ccc; margin: 0 5px;">|</span>
                        <span style="color: #777;">noc.monitor</span>
                        <span style="color: #ccc; margin: 0 5px;">|</span>
                        <span style="color: #777;">${statusText}</span>
                        <span style="color: #ccc; margin: 0 5px;">|</span>
                    </div>
                </div>`;
            });
            
            offscreen.innerHTML = `<div id="captureAreaBulk" style="background:#ffffff; padding: 10px 20px; width: max-content; min-width: 800px; max-width: 1200px; border-radius: 4px;">${listHtml}</div>`;
            document.body.appendChild(offscreen);

            try {
                const canvas = await html2canvas(offscreen.querySelector('#captureAreaBulk'), { 
                    backgroundColor: "#ffffff", scale: 2, logging: false, useCORS: true
                });

                canvas.toBlob(async (blob) => {
                    try {
                        await navigator.clipboard.writeText(textToCopy);
                        await new Promise(r => setTimeout(r, 400));
                        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                        closeBulkDialogAndNotify(checkboxes, "✅ COPIED WA+SS!");
                        showCopyToast("Gambar & teks ter-copy ke clipboard!");
                    } catch (err) {
                        alert("Gagal copy screenshot ke clipboard (Pastikan HTTPS)!");
                        dialogBtn.innerText = origBtnText;
                    }
                });
            } catch (err) {
                alert("Gagal memproses screenshot OpManager!");
                dialogBtn.innerText = origBtnText;
            } finally {
                document.body.removeChild(offscreen);
            }
        }
    }
}

// =========================================================
// ESKALASI PER-GRUP DARI POPUP MISMATCH TAG
// =========================================================
window._executeMismatchGroupEsc = async function(groupIdx, btn) {
    const grp = window._mismatchGroups && window._mismatchGroups[groupIdx];
    if (!grp) return;

    const origText = btn.innerText;
    btn.innerText = "⏳...";
    btn.disabled = true;

    const tickets = grp.tickets;
    const hasPriority = grp.isPriority;
    const tagsArr = Array.from(grp.tags);
    let finalTags = hasPriority ? "Tim @Helpdesk\n" + tagsArr.join('\n') : tagsArr.join('\n');
    let sourceName = activeTab === 'GRAFANA' ? 'Grafana' : 'OpManager';

    // Helper resolve status untuk mismatch esc
    function _resolveStatus(rawOrigStatus) {
        const s = (rawOrigStatus || "").toLowerCase();
        if (s.includes("critical")) return "Critical";
        if (s.includes("attention")) return "Attention";
        return "Trouble";
    }

    if (tickets.length === 1) {
        // === 1 TIKET: WA + SS (sama persis dengan tombol WA+SS per baris) ===
        const t = tickets[0];

        if (activeTab === 'OPMAN') {
            // Cari rawT untuk screenshot single OPM
            const rawTick = window.rawOpmData && window.rawOpmData.find(r => r.ticketId === t.ticketId);
            if (rawTick && rawTick.rawT) {
                // Bangun waText dulu
                let ipStr = t.ip ? t.ip.split(':')[0] : "N/A";
                let hName = t.hostname || "Unknown";
                let rawDetail = t.detail || t.DETAIL_ISSUE || "Gangguan";
                let cleanDetail = rawDetail.replace(/<[^>]*>?/gm, '').trim();

                // Screenshot single (sama seperti autoEscalateWA)
                const rt = rawTick.rawT;
                let statusText = _resolveStatus(rt.ORIG_STATUS);
                let severityColor = "#e36209";
                if (statusText === "Critical") severityColor = "#da3633";
                else if (statusText === "Attention") severityColor = "#e3b341";

                const waText = `Dear Team\n${finalTags}\n\nKami informasikan saat ini :\n\n- ${rt.DETAIL_ISSUE || cleanDetail} --> ${hName} [${ipStr}]\n\nTerpantau status *${statusText}* di monitoring ${sourceName}.\nMohon dibantu pengecekannya\n\nTerima Kasih`;

                const d = new Date(rt.ISSUE_TS);
                const timeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;

                const offscreen = document.createElement('div');
                offscreen.style.cssText = 'position:fixed;left:-9999px;top:0;';
                offscreen.innerHTML = `<div id="captureAreaMismatch" style="background:#ffffff;padding:30px;width:fit-content;min-width:450px;max-width:800px;border-radius:4px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
                    <div style="display:flex;border-left:5px solid ${severityColor};padding-left:25px;flex-direction:column;gap:12px;">
                        <div style="font-size:19px;color:#1a1f23;font-weight:600;line-height:1.5;white-space:pre-wrap;word-break:break-word;">${rt.DETAIL_ISSUE || cleanDetail}</div>
                        <div style="font-size:16px;color:#0969da;font-weight:400;margin-top:2px;">${hName}</div>
                        <div style="font-size:14px;color:#57606a;display:flex;align-items:center;gap:6px;">
                            <span>${rt.CATEGORY || 'Server'}</span><span style="color:#d0d7de;">::</span><span>noc.monitor</span><span style="color:#d0d7de;">::</span>
                            <span style="font-weight:600;color:${severityColor};">${statusText}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;font-size:14px;color:#57606a;margin-top:8px;opacity:0.8;">
                            <span style="font-size:16px;">📅</span><span>${timeStr} WIB</span>
                        </div>
                    </div>
                </div>`;
                document.body.appendChild(offscreen);

                try {
                    const canvas = await html2canvas(offscreen.querySelector('#captureAreaMismatch'), { backgroundColor: "#ffffff", scale: 2, logging: false, useCORS: true });
                    canvas.toBlob(async (blob) => {
                        try {
                            await navigator.clipboard.writeText(waText);
                            await new Promise(r => setTimeout(r, 400));
                            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                            btn.innerText = "✅ COPIED!";
                            btn.style.background = "#3fb950";
                            showCopyToast("Gambar & teks ter-copy ke clipboard!");
                        } catch(err) {
                            btn.innerText = "SS GAGAL";
                            btn.style.background = "#da3633";
                        }
                        setTimeout(() => { btn.innerText = origText; btn.style.background = ""; btn.disabled = false; }, 2500);
                    });
                } catch(err) {
                    btn.innerText = "ERR!"; btn.disabled = false;
                } finally {
                    document.body.removeChild(offscreen);
                }
                return;
            }
        }

        // Grafana single atau OPM tanpa rawT: text saja
        let ipStr = t.ip ? t.ip.split(':')[0] : "N/A";
        let hName = t.hostname || "Unknown";
        let rawDetail = t.detail || t.DETAIL_ISSUE || "Gangguan";
        let cleanDetail = rawDetail.replace(/<[^>]*>?/gm, '').trim();
        const _rawTickFallback = window.rawOpmData && window.rawOpmData.find(r => r.ticketId === t.ticketId);
        const _stFallback = _resolveStatus(_rawTickFallback && _rawTickFallback.rawT ? _rawTickFallback.rawT.ORIG_STATUS : "");
        const waText = `Dear Team\n${finalTags}\n\nKami informasikan saat ini :\n\n- ${cleanDetail} --> ${hName} [${ipStr}]\n\nTerpantau status *${_stFallback}* di monitoring ${sourceName}.\nMohon dibantu pengecekannya\n\nTerima Kasih`;

        navigator.clipboard.writeText(waText).then(() => {
            btn.innerText = "✅ COPIED!";
            btn.style.background = "#3fb950";
            showCopyToast("Teks eskalasi ter-copy ke clipboard!");
            setTimeout(() => { btn.innerText = origText; btn.style.background = ""; btn.disabled = false; }, 2500);
        });

    } else {
        // === > 1 TIKET: BULK WA + SS (sama seperti executeBulkCopy OPMAN) ===
        let bodyMsg = `Kami informasikan saat ini :\n\n`;
        let listHtml = '';

        tickets.forEach(t => {
            let ipStr = t.ip ? t.ip.split(':')[0] : "N/A";
            let hName = t.hostname || "Unknown";
            let rawDetail = t.detail || t.DETAIL_ISSUE || t.caseType || "Gangguan";
            let cleanDetail = rawDetail.replace(/<[^>]*>?/gm, '').trim();
            // Teks copy = LENGKAP; gambar/screenshot = dipotong dengan '...'
            let shortDetail = cleanDetail.length > 80 ? cleanDetail.slice(0, 80) + '...' : cleanDetail;
            bodyMsg += `- ${cleanDetail} --> ${hName} [${ipStr}]\n`;

            // Screenshot list item
            let st = "";
            const rawTick = window.rawOpmData && window.rawOpmData.find(r => r.ticketId === t.ticketId);
            if (rawTick && rawTick.rawT && rawTick.rawT.ORIG_STATUS) st = rawTick.rawT.ORIG_STATUS.toLowerCase();
            let dotColor = "#f4a35d"; let statusText = "Trouble";
            if (st.includes("critical")) { dotColor = "#fa5c5c"; statusText = "Critical"; }
            else if (st.includes("attention")) { dotColor = "#eade64"; statusText = "Attention"; }

            let rawCategory = (rawTick && rawTick.rawT && rawTick.rawT.CATEGORY) ? rawTick.rawT.CATEGORY : (t.caseInfo && t.caseInfo.assign ? t.caseInfo.assign : "Server");
            if (!rawCategory || rawCategory.toLowerCase() === "unknown" || rawCategory.trim() === "") rawCategory = "Server";

            listHtml += `
            <div style="display:flex;align-items:center;padding:7px 0;border-bottom:1px solid #eaeaea;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
                <div style="width:11px;height:11px;border-radius:50%;background-color:${dotColor};margin-right:8px;flex-shrink:0;"></div>
                <div style="font-size:13px;color:#333;line-height:1.3;">
                    <span>${shortDetail}</span>
                    <span style="color:#ccc;margin:0 5px;">|</span>
                    <span>${hName}</span>
                    <span style="color:#ccc;margin:0 5px;">|</span>
                    <span style="color:#777;">${rawCategory}</span>
                    <span style="color:#ccc;margin:0 5px;">|</span>
                    <span style="color:#777;">noc.monitor</span>
                    <span style="color:#ccc;margin:0 5px;">|</span>
                    <span style="color:#777;">${statusText}</span>
                    <span style="color:#ccc;margin:0 5px;">|</span>
                </div>
            </div>`;
        });

        // Kumpulkan semua severity unik di grup ini, urut Critical > Attention > Trouble
        const _sevOrder = ["Critical", "Attention", "Trouble"];
        const _statusSetGrp = new Set();
        tickets.forEach(t2 => {
            const rk = window.rawOpmData && window.rawOpmData.find(r => r.ticketId === t2.ticketId);
            _statusSetGrp.add(_resolveStatus(rk && rk.rawT ? rk.rawT.ORIG_STATUS : ""));
        });
        const statusLabelGrp = _sevOrder.filter(s => _statusSetGrp.has(s)).map(s => `*${s}*`).join(', ');

        bodyMsg += `\nTerpantau status ${statusLabelGrp} di monitoring ${sourceName}.\nMohon dibantu pengecekannya\n\nTerima Kasih`;
        const waText = `Dear Team\n${finalTags}\n\n${bodyMsg}`;

        const offscreen = document.createElement('div');
        offscreen.style.cssText = 'position:fixed;left:-9999px;top:0;';
        offscreen.innerHTML = `<div id="captureAreaMismatchBulk" style="background:#ffffff;padding:10px 20px;width:max-content;min-width:800px;max-width:1200px;border-radius:4px;">${listHtml}</div>`;
        document.body.appendChild(offscreen);

        try {
            const canvas = await html2canvas(offscreen.querySelector('#captureAreaMismatchBulk'), { backgroundColor: "#ffffff", scale: 2, logging: false, useCORS: true });
            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.writeText(waText);
                    await new Promise(r => setTimeout(r, 400));
                    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                    btn.innerText = "✅ COPIED!";
                    btn.style.background = "#3fb950";
                    showCopyToast("Gambar & teks ter-copy ke clipboard!");
                } catch(err) {
                    btn.innerText = "SS GAGAL";
                    btn.style.background = "#da3633";
                }
                setTimeout(() => { btn.innerText = origText; btn.style.background = ""; btn.disabled = false; }, 2500);
            });
        } catch(err) {
            btn.innerText = "ERR!"; btn.disabled = false;
        } finally {
            document.body.removeChild(offscreen);
        }
    }
};

// =========================================================
// LOGIKA INJEKSI RUMUS EXCEL (RESOLVE TIME & STATUS)
// =========================================================

function formatExcelRowWithFormula(rowData) {
    let newRow = [...rowData];
    newRow[2] = `=IF(LEN(INDEX(C:C, ROW()))=0, "", IF(LEN(INDEX(D:D, ROW()))=0, "Waiting for Resolution", INT(ABS(INDEX(D:D, ROW())-INDEX(C:C, ROW()))*24) & " hours " & ROUND(MOD(ABS(INDEX(D:D, ROW())-INDEX(C:C, ROW()))*24,1)*60, 0) & " minutes"))`;
    newRow[10] = `=IF(LEN(INDEX(G:G, ROW()))=0, "", IF(LEN(INDEX(D:D, ROW()))=0, "Open", "Close"))`;
    return newRow.join('\t');
}

function formatGrafanaExcelRowWithFormula(rowData) {
    let newRow = [...rowData];
    newRow[2] = `=IF(LEN(INDEX(C:C, ROW()))=0, "", IF(LEN(INDEX(D:D, ROW()))=0, "Waiting for Resolution", INT(ABS(INDEX(D:D, ROW())-INDEX(C:C, ROW()))*24) & " hours " & ROUND(MOD(ABS(INDEX(D:D, ROW())-INDEX(C:C, ROW()))*24,1)*60, 0) & " minutes"))`;
    newRow[10] = `=IF(LEN(INDEX(G:G, ROW()))=0, "", IF(LEN(INDEX(D:D, ROW()))=0, "Open", "Close"))`;
    return newRow.join('\t');
}