/**
 * page/opmanager/history_opmanager.js
 * Fokus: Logika Fetch Data, Filter, Sort, State Management & Counter Alert
 * Update: Default Filter Waktu > 5 Menit
 */

window.currentOpmTicketsExcel = {};
window.rawOpmData = []; 

let opmFilterState = { type: "", status: "", ip: "", host: "", detail: "", resTime: "" };
let opmSortState = { col: "issueTs", dir: "desc" };

// --- STATE TOGGLE WAKTU (5 MENIT vs 6 MENIT) ---
window.opmTimeMode = '5MIN'; // Default 5 Menit

window.toggleOpmTimeMode = function() {
    window.opmTimeMode = (window.opmTimeMode === '5MIN') ? '6MIN' : '5MIN';
    
    const btns = document.querySelectorAll('.btn-opm-time-toggle');
    btns.forEach(btn => {
        if (window.opmTimeMode === '6MIN') {
            btn.innerHTML = "⏳ > 6 MENIT";
            btn.style.background = "#e3b341"; // Kuning penanda aktif mode 6 menit
            btn.style.color = "#000";
        } else {
            btn.innerHTML = "⏳ > 5 MENIT";
            btn.style.background = "#21262d"; // Normal
            btn.style.color = "#c9d1d9";
        }
    });
    
    if (typeof performSilentRefresh === 'function') performSilentRefresh();
    else if (typeof renderOpManagerData === 'function') renderOpManagerData();
};

function format24h(timestamp) {
    if (!timestamp || timestamp === 0) return "";
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function handleOpmSort(col) {
    if (opmSortState.col === col) opmSortState.dir = opmSortState.dir === "asc" ? "desc" : "asc";
    else { opmSortState.col = col; opmSortState.dir = "asc"; }
    renderOpmHeader(); applyOpmLogic();
}

function handleOpmFilter(key, val) {
    opmFilterState[key] = val.toLowerCase();
    const activeId = document.activeElement ? document.activeElement.id : null;
    const start = document.activeElement ? document.activeElement.selectionStart : null;
    const end = document.activeElement ? document.activeElement.selectionEnd : null;
    applyOpmLogic();
    if (activeId) { const el = document.getElementById(activeId); if (el) { el.focus(); if (start !== null) el.setSelectionRange(start, end); } }
}

function resetOpmFilter() {
    opmFilterState = { type: "", status: "", ip: "", host: "", detail: "", resTime: "" };
    opmSortState = { col: "issueTs", dir: "desc" };
    renderOpmHeader(); applyOpmLogic();
}

function getOpmSortIcon(col) { return opmSortState.col !== col ? "↕️" : (opmSortState.dir === "asc" ? "🔼" : "🔽"); }

function getCheckedItemsObj() { 
    const s = localStorage.getItem('opm_checked_tickets_v2'); 
    return s ? JSON.parse(s) : {}; 
}

function toggleCheck(alarmId, currentSystemStatus) {
    let checkedObj = getCheckedItemsObj();
    let currentLevel = checkedObj[alarmId] || 0;

    if (currentSystemStatus === "Close") {
        if (currentLevel === 2) delete checkedObj[alarmId];
        else checkedObj[alarmId] = 2;
    } else {
        if (currentLevel === 1) delete checkedObj[alarmId];
        else checkedObj[alarmId] = 1;
    }

    localStorage.setItem('opm_checked_tickets_v2', JSON.stringify(checkedObj));
    applyOpmLogic();
}

function toggleAllDoneOpman() {
    let checkedObj = getCheckedItemsObj();
    const visibleButtons = document.querySelectorAll('.opm-done-btn'); 
    if (visibleButtons.length === 0) return;

    let allFullyDone = true;
    let itemsToUpdate = [];

    visibleButtons.forEach(btn => {
        const id = btn.getAttribute('data-alarm-id');
        const sysStatus = btn.getAttribute('data-sys-status');
        const currentLevel = checkedObj[id] || 0;
        itemsToUpdate.push({id, sysStatus, currentLevel});
        if (sysStatus === "Close" && currentLevel !== 2) allFullyDone = false;
        if (sysStatus === "Open" && currentLevel !== 1) allFullyDone = false;
    });

    if (allFullyDone) {
        itemsToUpdate.forEach(item => { delete checkedObj[item.id]; });
    } else {
        itemsToUpdate.forEach(item => {
            checkedObj[item.id] = (item.sysStatus === "Close") ? 2 : 1;
        });
    }

    localStorage.setItem('opm_checked_tickets_v2', JSON.stringify(checkedObj));
    applyOpmLogic();
}

function toggleSelectAllOpman(source) {
    document.querySelectorAll('.opman-row-checkbox:not(:disabled)').forEach(cb => { 
        if (cb.closest('tr').style.display !== 'none') cb.checked = source.checked; 
    });
}

function changeGlobalOPMPic(val) {
    localStorage.setItem('opm_global_pic', val);
    renderOpmHeader(); applyOpmLogic();
}

function applyOpmLogic() {
    const checkedObj = getCheckedItemsObj();
    const currentPic = localStorage.getItem('opm_global_pic') || 'Affan';

    let filtered = window.rawOpmData.filter(t => {
        return t.caseTypeDisplay.toLowerCase().includes(opmFilterState.type) &&
               t.status.toLowerCase().includes(opmFilterState.status) &&
               t.ip.toLowerCase().includes(opmFilterState.ip) &&
               t.hostname.toLowerCase().includes(opmFilterState.host) &&
               t.detail.toLowerCase().includes(opmFilterState.detail) &&
               t.resTime.toLowerCase().includes(opmFilterState.resTime); 
    });

    filtered.sort((a, b) => {
        let vA = a[opmSortState.col], vB = b[opmSortState.col];
        if (vA < vB) return opmSortState.dir === "asc" ? -1 : 1;
        if (vA > vB) return opmSortState.dir === "asc" ? 1 : -1;
        return 0;
    });

    if (typeof renderOpmTableRows === "function") {
        renderOpmTableRows(filtered, checkedObj, currentPic);
    }
}

function getCaseInfoOPM(msg) {
    const m = msg.toLowerCase();
    let res = { type: "NotFound", prio: "P3", assign: "Infra" };
    if (m.includes("communicating") || m.includes("down") || m.includes("opmanager agent") || m.includes("not responding")) res.type = "OPManager - Services";
    else if (m.includes("memory utilization")) res.type = "OPManager - Memory";
    else if (m.includes("cpu utilization")) res.type = "OPManager - CPU";
    else if (m.includes("interface")) { res.type = "OPManager - Network"; res.assign = "Network"; }
    else if (m.includes("virtual server") || m.includes("pool member")) { res.type = "OPManager - Virtual Server"; res.prio = "P4"; }
    else if (m.includes("disk") || m.includes("partition")) res.type = "OPManager - Disk";
    return res;
}

function getCleanIssueText(rawDetail) {
    let detail = (rawDetail || "").trim();
    let dLower = detail.toLowerCase();
    if (dLower.includes("interface") || dLower.includes("virtual server") || dLower.includes("pool member")) {
        if (dLower.includes("util threshold violated")) {
             return detail.replace(/\.Current IN traffic is.*$/i, '').trim();
        }
        return detail; 
    }
    return detail.replace(/\s+is\s+[0-9]+(\.[0-9]+)?(%\s*|,|\s+Percentage\s*,).*$/i, '').trim();
}

function countAlertFrequencies(historyData, ipMap) {
    let stats = {};
    const nowMs = Date.now();
    
    let thresholdCloseMs = (window.opmTimeMode === '6MIN') ? 360000 : 300000;
    let thresholdOpenMs  = (window.opmTimeMode === '6MIN') ? 375000 : 315000;

    Object.values(historyData).forEach(t => {
        const isClose = t.STATUS === "CLOSE";
        let willRender = false;
        
        if (isClose) { if ((t.SOLVE_TS - t.ISSUE_TS) >= thresholdCloseMs) willRender = true; } 
        else { if ((nowMs - t.ISSUE_TS) >= thresholdOpenMs) willRender = true; }
        
        if (isClose && (nowMs - t.SOLVE_TS) > 32400000) willRender = false;
        if (!willRender) return;

        const ip = t.IP_ADDRESS || ipMap[t.HOSTNAME] || "UNKNOWN";
        const cleanIP = ip.split(':')[0];
        const cleanDetail = getCleanIssueText(t.DETAIL_ISSUE);
        const key = `${cleanIP}::${cleanDetail}`;
        
        if (!stats[key]) stats[key] = { count: 0, latestRenderedTs: 0 };
        stats[key].count += 1;
        if (t.ISSUE_TS > stats[key].latestRenderedTs) stats[key].latestRenderedTs = t.ISSUE_TS;
    });
    return stats;
}

async function renderOpManagerData() {
    if (typeof createOpManagerModal === "function") createOpManagerModal();
    
    try {
        const [respHistory, respInv, respFilter] = await Promise.all([
            fetch('Data_JSON/history_opmanager.json?t=' + Date.now()),
            fetch('Data_JSON/opmanager_inventory.json?t=' + Date.now()),
            fetch('Data_JSON/filter.json?t=' + Date.now()) 
        ]);
        
        const _sj = async (r, fb) => { try { return JSON.parse(await r.text()); } catch { return fb; } };
        const historyData = await _sj(respHistory, []);
        const invData    = await _sj(respInv,     { rows: [] });
        const filterData = await _sj(respFilter,  {});
        const priorityIPs = filterData.priority || [];
        const excludedIPs = filterData.excluded || [];
        const now = Date.now();
        const ipMap = {};
        
        if (invData.rows) invData.rows.forEach(item => { ipMap[item.displayName] = item.ipaddress; });

        const freqStats = countAlertFrequencies(historyData, ipMap);
        let rawTickets = [];
        
        let thresholdCloseMs = (window.opmTimeMode === '6MIN') ? 360000 : 300000;
        let thresholdOpenMs  = (window.opmTimeMode === '6MIN') ? 375000 : 315000;

        Object.values(historyData).forEach(t => {
            const isClose = t.STATUS === "CLOSE";
            let showTicket = false;
            
            if (isClose) {
                if ((t.SOLVE_TS - t.ISSUE_TS) >= thresholdCloseMs) showTicket = true;
            } else {
                if ((now - t.ISSUE_TS) >= thresholdOpenMs) showTicket = true;
            }
            
            if (isClose && (now - t.SOLVE_TS) > 32400000) showTicket = false;
            
            if (showTicket) {
                const alarmId = "OPM_" + t.ALARM_ID + "_" + t.ISSUE_TS;
                const ip = t.IP_ADDRESS || ipMap[t.HOSTNAME] || "";
                const host = t.HOSTNAME || "";
                const c = getCaseInfoOPM(t.DETAIL_ISSUE);

                let resTimeDisplay = "Waiting for Resolution";
                let resTimeMsVal = 9999999999999; 

                if (isClose && t.SOLVE_TS > 0) {
                    const diffMs = t.SOLVE_TS - t.ISSUE_TS;
                    const diffMin = Math.floor(diffMs / 60000);
                    resTimeDisplay = `${Math.floor(diffMin / 60)} hours ${diffMin % 60} minutes`;
                    resTimeMsVal = diffMs; 
                }

                const cleanIP = ip.split(':')[0];
                const cleanDetail = getCleanIssueText(t.DETAIL_ISSUE); 
                const freqKey = `${cleanIP}::${cleanDetail}`;
                
                const statData = freqStats[freqKey] || { count: 1, latestRenderedTs: 0 };
                const munculX = statData.count;
                const isLatestRendered = (t.ISSUE_TS === statData.latestRenderedTs); 

                let displayDetail = t.DETAIL_ISSUE || "";
                if (displayDetail.length > 50) displayDetail = displayDetail.substring(0, 50) + "...";
                if (munculX > 1 && isLatestRendered) {
                    displayDetail += ` <span style="background: #da3633; color: white; padding: 1px 4px; border-radius: 3px; font-weight: bold; font-size: 9px; margin-left: 4px;" title="Terjadi berulang kali (Total ${munculX} alert valid)">x${munculX}</span>`;
                }

                let badges = "";
                if (priorityIPs.includes(cleanIP)) badges += `<span style="background:#da3633; color:#fff; padding:1px 4px; border-radius:3px; font-size:8px; font-weight:bold; margin-right:6px;" title="Priority">P</span>`;
                if (excludedIPs.includes(cleanIP)) badges += `<span style="background:#d29922; color:#fff; padding:1px 4px; border-radius:3px; font-size:8px; font-weight:bold; margin-right:6px;" title="Excluded">E</span>`;

                rawTickets.push({
                    ticketId: alarmId, issueTs: t.ISSUE_TS, solveTs: t.SOLVE_TS || 0,
                    issueDate: format24h(t.ISSUE_TS), solveDate: t.SOLVE_TS ? format24h(t.SOLVE_TS) : "", 
                    resTime: resTimeDisplay, resTimeMs: resTimeMsVal,
                    caseType: c.type, caseTypeDisplay: c.type, detail: t.DETAIL_ISSUE, displayDetail: displayDetail,
                    ip: ip, hostname: host, prio: c.prio, assign: c.assign, resolution: t.RESOLUTION || "", status: isClose ? "Close" : "Open",
                    origStatusParam: t.ORIG_STATUS ? t.ORIG_STATUS.replace(/'/g, "\\'") : "Trouble", badges: badges, rawT: t, caseInfo: c
                });
            }
        });
        
        window.rawOpmData = rawTickets;
        if (typeof renderOpmHeader === "function") renderOpmHeader(); 
        applyOpmLogic();
        
    } catch(e) { console.error(e); }
}

function openOpManager() { 
    if (typeof createOpManagerModal === "function") createOpManagerModal(); 
    document.getElementById('opManagerModal').style.display='block'; 
    renderOpManagerData(); 
}
function closeOpManager() { document.getElementById('opManagerModal').style.display='none'; }
function refreshOpmStandalone(btn) {
    const orig = btn.innerText; btn.innerText = "⏳..."; btn.style.background = "#e3b341"; btn.style.color = "#000";
    renderOpManagerData().then(() => { setTimeout(() => { btn.innerText = orig; btn.style.background = "#1f6feb"; btn.style.color = "white"; }, 800); });
}