/**
 * page/opmanager/opm_ui.js
 * Fokus: Membuat elemen HTML (Modal, Header, dan Baris Tabel)
 * Update: Fitur Lock/Abaikan Tiket Tertentu (Mengecek Excluded IP juga)
 */

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

    // AMBIL PIC DARI GLOBAL STORAGE
    const currentPic = localStorage.getItem('global_noc_pic') || localStorage.getItem('opm_global_pic') || 'Affan';
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
    const finalGlobalPIC = localStorage.getItem('global_noc_pic') || currentPic || 'Affan';

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

        // ==========================================
        // ⭐ LOGIKA TAMPILAN LOCK TIKET (RegEx BOMB!)
        // ==========================================
        let isFullLock = false;
        let isEscLock = false;

        // Hilangkan spasi berlebih, enter, atau karakter aneh dari detail
        let rawDetail = (t.detail || t.DETAIL_ISSUE || "").replace(/\s+/g, ' ').toLowerCase();
        let cleanIp = t.ip ? t.ip.split(':')[0] : "";
        let isExcludedIp = (typeof globalFilterData !== 'undefined' && globalFilterData && globalFilterData.excluded && globalFilterData.excluded.includes(cleanIp));

        // 1. CEK FULL LOCK DENGAN REGEX (Sangat Fleksibel)
        // RegEx /file.*integrity/ akan menangkap "file integrity", "file_integrity", "file-integrity", "file  integrity"
        if (rawDetail.includes("server active connections") || 
            rawDetail.includes("bcp and mssql server") || 
            rawDetail.includes("apm plugin") ||
            /file.*integrity/.test(rawDetail) || 
            /new.*files.*were.*found/.test(rawDetail) ||
            isExcludedIp) {
            isFullLock = true;
        } 
        // 2. CEK ESCALATION LOCK 
        else if (rawDetail.includes("pool member") || rawDetail.includes("virtual server")) {
            isEscLock = true;
        }

        let cbHtml = `<input type="checkbox" class="opman-row-checkbox" data-id="${t.ticketId}" style="cursor:pointer;">`;
        let btnExcelHtml = `<button onclick="actionCopyExcel(this, '${t.ticketId}')" style="background:#21262d; border:1px solid #30363d; color:#c9d1d9; font-size:8px; padding:3px 5px; cursor:pointer; border-radius:3px;" title="Copy Format Excel">EXCEL</button>`;
        let btnWaHtml = `<button onclick="actionWA(this, '${t.ticketId}')" style="background:#1f6feb; border:none; color:white; font-size:9px; font-weight:bold; padding:3px 6px; cursor:pointer; border-radius:3px; box-shadow: 0 0 5px rgba(31,111,235,0.4);" title="Copy SS & Buka WhatsApp">WA+SS</button>`;
        let btnItsmHtml = `<button onclick="actionITSM('${t.ticketId}')" style="background:#8957e5; border:none; color:white; font-size:8px; padding:3px 5px; cursor:pointer; border-radius:3px;" title="Helper ITSM">ITSM</button>`;
        
        let displayDetailIcon = "";

        if (isFullLock) {
            displayDetailIcon = "🔒 ";
            cbHtml = `<input type="checkbox" class="opman-row-checkbox" data-id="${t.ticketId}" disabled style="cursor:not-allowed;" title="Tiket diabaikan (Fully Locked)">`;
            btnExcelHtml = `<button disabled style="background:#21262d; border:1px solid #30363d; color:#8b949e; font-size:8px; padding:3px 5px; cursor:not-allowed; border-radius:3px; opacity:0.3;" title="Fully Locked">EXCEL</button>`;
            btnWaHtml = `<button disabled style="background:#21262d; border:1px solid #30363d; color:#8b949e; font-size:9px; font-weight:bold; padding:3px 6px; cursor:not-allowed; border-radius:3px; opacity:0.3;" title="Fully Locked">WA+SS</button>`;
            btnItsmHtml = `<button disabled style="background:#21262d; border:1px solid #30363d; color:#8b949e; font-size:8px; padding:3px 5px; cursor:not-allowed; border-radius:3px; opacity:0.3;" title="Fully Locked">ITSM</button>`;
            rowStyle += " opacity: 0.5; filter: grayscale(0.6);"; 
        } else if (isEscLock) {
            displayDetailIcon = "🔕 ";
            btnWaHtml = `<button disabled style="background:#21262d; border:1px solid #30363d; color:#8b949e; font-size:9px; font-weight:bold; padding:3px 6px; cursor:not-allowed; border-radius:3px; opacity:0.3;" title="Eskalasi Dilarang (Pool/Virtual)">WA+SS</button>`;
            btnItsmHtml = `<button disabled style="background:#21262d; border:1px solid #30363d; color:#8b949e; font-size:8px; padding:3px 5px; cursor:not-allowed; border-radius:3px; opacity:0.3;" title="Eskalasi Dilarang (Pool/Virtual)">ITSM</button>`;
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
                <td style="border: 1px solid #30363d; padding: 8px 5px; white-space: normal; word-wrap: break-word; min-width: 200px;">${displayDetailIcon}${t.displayDetail}</td>
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
                        <button onclick="actionOpenOPM('${t.ticketId}')" style="background:transparent; border:1px solid #e3b341; color:#e3b341; font-size:8px; padding:3px 5px; cursor:pointer; border-radius:3px; font-weight:bold;" title="Buka Detail di Aplikasi OpManager">OPM</button>
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