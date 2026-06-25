/**
 * page/grafana/history_ticket.js
 * Fokus: Data Fetching, Logika Anti-Flapping, Filter/Sort State, dan State Management "Done"
 * Update: Perbaikan Logika Deteksi Modul untuk "CRITICAL (NO DATA)" & Format Pesan Khusus No Data.
 */

window.currentGrafanaTicketsExcel = {};
window.rawGrafanaData = []; 

let grafFilter = { type: "", status: "", ip: "", host: "", resTime: "" };
let grafSort = { col: "issueTs", dir: "desc" };

function handleGrafSort(col) {
    if (grafSort.col === col) grafSort.dir = grafSort.dir === "asc" ? "desc" : "asc";
    else { grafSort.col = col; grafSort.dir = "asc"; }
    renderGrafanaHeader(); applyGrafanaLogic();
}

function handleGrafFilter(key, val) {
    grafFilter[key] = val.toLowerCase();
    const activeId = document.activeElement ? document.activeElement.id : null;
    const start = document.activeElement ? document.activeElement.selectionStart : null;
    const end = document.activeElement ? document.activeElement.selectionEnd : null;
    applyGrafanaLogic();
    if (activeId) {
        const el = document.getElementById(activeId);
        if (el) { el.focus(); if (start !== null && end !== null) el.setSelectionRange(start, end); }
    }
}

function resetGrafanaFilter() {
    grafFilter = { type: "", status: "", ip: "", host: "", resTime: "" };
    grafSort = { col: "issueTs", dir: "desc" };
    renderGrafanaHeader(); applyGrafanaLogic();
}

function getSortIcon(col) {
    if (grafSort.col !== col) return "↕️";
    return grafSort.dir === "asc" ? "🔼" : "🔽";
}

function getCheckedGrafanaObj() {
    const saved = localStorage.getItem('grafana_checked_tickets_v2');
    return saved ? JSON.parse(saved) : {};
}

function toggleCheckGrafana(ticketId, currentSystemStatus) {
    let checkedObj = getCheckedGrafanaObj();
    let currentLevel = checkedObj[ticketId] || 0;

    if (currentSystemStatus === "Close") {
        if (currentLevel === 2) delete checkedObj[ticketId];
        else checkedObj[ticketId] = 2;
    } else {
        if (currentLevel === 1) delete checkedObj[ticketId];
        else checkedObj[ticketId] = 1;
    }

    localStorage.setItem('grafana_checked_tickets_v2', JSON.stringify(checkedObj));
    applyGrafanaLogic(); 
}

function toggleAllDoneGrafana() {
    let checkedObj = getCheckedGrafanaObj();
    const visibleButtons = document.querySelectorAll('.graf-done-btn'); 
    if (visibleButtons.length === 0) return;

    let allFullyDone = true;
    let itemsToUpdate = [];

    visibleButtons.forEach(btn => {
        const id = btn.getAttribute('data-ticket-id');
        const sysStatus = btn.getAttribute('data-sys-status');
        const currentLevel = checkedObj[id] || 0;
        itemsToUpdate.push({id, sysStatus, currentLevel});
        if (sysStatus === "Close" && currentLevel !== 2) allFullyDone = false;
        if (sysStatus === "Open" && currentLevel !== 1) allFullyDone = false;
    });

    if (allFullyDone) itemsToUpdate.forEach(item => { delete checkedObj[item.id]; });
    else itemsToUpdate.forEach(item => { checkedObj[item.id] = (item.sysStatus === "Close") ? 2 : 1; });
    
    localStorage.setItem('grafana_checked_tickets_v2', JSON.stringify(checkedObj));
    applyGrafanaLogic();
}

// Tandai DONE semua tiket di dalam satu grup FLAPPING sekaligus.
// Toggle: kalau semua sudah done -> batalkan semua; kalau belum -> done semua.
function markFlapGroupDone(groupId, btnEl) {
    let checkedObj = getCheckedGrafanaObj();
    const childBtns = document.querySelectorAll(`tr.flap-child[data-group="${groupId}"] .graf-done-btn`);
    if (childBtns.length === 0) return;

    let items = [];
    childBtns.forEach(btn => {
        const id = btn.getAttribute('data-ticket-id');
        const sysStatus = btn.getAttribute('data-sys-status');
        items.push({ id, sysStatus, level: checkedObj[id] || 0 });
    });

    const allDone = items.every(it => it.sysStatus === 'Close' ? it.level === 2 : it.level === 1);
    if (allDone) items.forEach(it => { delete checkedObj[it.id]; });
    else items.forEach(it => { checkedObj[it.id] = (it.sysStatus === 'Close') ? 2 : 1; });

    localStorage.setItem('grafana_checked_tickets_v2', JSON.stringify(checkedObj));
    applyGrafanaLogic();
}

function toggleSelectAllGrafana(source) {
    const checkboxes = document.querySelectorAll('.grafana-row-checkbox');
    checkboxes.forEach(cb => { if (cb.closest('tr').style.display !== 'none') { cb.checked = source.checked; } });
}

function changeGlobalPIC(val) {
    localStorage.setItem('grafana_global_pic', val);
    renderGrafanaHeader(); applyGrafanaLogic();
}

function applyGrafanaLogic() {
    const checkedObj = getCheckedGrafanaObj();
    const currentGlobalPIC = localStorage.getItem('grafana_global_pic') || 'Affan'; 
    const filterData = window.ticketFilterData || {};
    const exAva = filterData.ex_ava || [];
    const exCpu = filterData.ex_cpu || [];
    const exMem = filterData.ex_mem || [];

    let filtered = window.rawGrafanaData.filter(t => {
        let ipPart = t.ip.split(':')[0];
        if (t.moduleName === 'Availability' && exAva.includes(ipPart)) return false;
        if (t.moduleName === 'CPU' && exCpu.includes(ipPart)) return false;
        if (t.moduleName === 'Memory' && exMem.includes(ipPart)) return false;

        return t.caseType.toLowerCase().includes(grafFilter.type) &&
               t.status.toLowerCase().includes(grafFilter.status) &&
               t.ip.toLowerCase().includes(grafFilter.ip) &&
               t.hostname.toLowerCase().includes(grafFilter.host) &&
               t.resTime.toLowerCase().includes(grafFilter.resTime);
    });

    filtered.sort((a, b) => {
        let valA = a[grafSort.col], valB = b[grafSort.col];
        if (valA < valB) return grafSort.dir === 'asc' ? -1 : 1;
        if (valA > valB) return grafSort.dir === 'asc' ? 1 : -1;
        return 0;
    });

    if (typeof renderGrafanaTableRows === "function") {
        renderGrafanaTableRows(filtered, checkedObj, currentGlobalPIC);
    }
}

// === FUNGSI PENGHITUNG INCIDENT ===
function getGrafanaIncidentCount(ip, logs) {
    const ipPart = ip.split(':')[0];
    return logs.filter(log => log.ip.split(':')[0] === ipPart).length;
}

// Hitung jumlah tiket per IP+Module (CPU, Memory, Availability dihitung terpisah)
function buildIpTicketCountMap(rawTickets) {
    const countMap = {};
    rawTickets.forEach(t => {
        const key = t.ip.split(':')[0] + '|' + t.moduleName;
        countMap[key] = (countMap[key] || 0) + 1;
    });
    return countMap;
}

// Tandai tiket terbaru per IP+Module (issueTs terbesar = terbaru)
function markLatestTicketsPerIp(rawTickets) {
    const latestTs = {};
    rawTickets.forEach(t => {
        const key = t.ip.split(':')[0] + '|' + t.moduleName;
        if (!latestTs[key] || t.issueTs > latestTs[key]) {
            latestTs[key] = t.issueTs;
        }
    });
    rawTickets.forEach(t => {
        const key = t.ip.split(':')[0] + '|' + t.moduleName;
        t._isLatestForIp = (t.issueTs === latestTs[key]);
    });
}

// === FUNGSI INTI PENGOLAHAN DATA ===
async function renderTicketBody() {
    if (typeof createTicketModal === "function") createTicketModal();

    try {
        const [respLog, respFilter, respRVTools, respHistUtil] = await Promise.all([
            fetch('Data_JSON/history_log.json?t=' + Date.now()),
            fetch('Data_JSON/filter.json?t=' + Date.now()),
            fetch('Data_JSON/RVTOOLS.json?t=' + Date.now()).catch(() => null),
            fetch('Data_JSON/history_utilization.json?t=' + Date.now()).catch(() => null)
        ]);

        const _sj = async (r, fb) => { try { return JSON.parse(await r.text()); } catch { return fb; } };
        const logs = await _sj(respLog, []);
        const filterData = await _sj(respFilter, {});
        window.ticketFilterData = filterData;

        let histUtil = {};
        if (respHistUtil && respHistUtil.ok) {
            histUtil = await _sj(respHistUtil, {});
        }

        let rvtoolsKamus = {};
        if (respRVTools && respRVTools.ok) {
            rvtoolsKamus = await respRVTools.json();
        }

        const appIPs = filterData.app_level || [];
        const priorityIPs = filterData.priority || [];
        const excludedIPs = filterData.excluded || [];

        const currentTol = window.currentFlapTolerance || 2;
        const flapToleranceMs = parseInt(currentTol) * 60000;

        let openIssues = {};
        let rawTickets = [];
        const sortedLogs = logs.sort((a, b) => new Date(a.time.replace(/-/g, '/')) - new Date(b.time.replace(/-/g, '/')));

        for (let i = 0; i < sortedLogs.length; i++) {
            const log = sortedLogs[i];

            // Sanity check timestamp — skip log dengan tahun di luar range wajar
            const logYear = parseInt((log.time || "").substring(0, 4));
            if (isNaN(logYear) || logYear < 2020 || logYear > 2099) continue;

            const ipPart = log.ip.split(':')[0];
            const portPart = log.ip.split(':')[1];
            const typeRaw = (log.type || "").toUpperCase();

            // --- LOGIKA PENENTUAN MODUL YANG LEBIH PINTAR ---
            const critLimit = appIPs.includes(ipPart) ? 60 : 70;
            const isNormal = typeRaw.includes('NORMAL');
            const isNoData = typeRaw.includes('NO DATA');

            // Untuk NO DATA: kumpulkan semua modul yang relevan untuk IP ini
            // (bisa CPU saja, MEM saja, CPU+MEM, atau AVA)
            let modulesToProcess = [];
            if (isNoData) {
                const hasCPU = histUtil.CPU && (histUtil.CPU[log.ip] || histUtil.CPU[ipPart]);
                const hasMEM = histUtil.MEM && (histUtil.MEM[log.ip] || histUtil.MEM[ipPart]);
                if (hasCPU) modulesToProcess.push("CPU");
                if (hasMEM) modulesToProcess.push("MEM");
                if (modulesToProcess.length === 0) {
                    if (histUtil.AVA && histUtil.AVA[ipPart]) modulesToProcess.push("AVA");
                    else if (portPart === "9100") modulesToProcess.push("CPU");
                    else modulesToProcess.push("AVA");
                }
            } else {
                const m = (typeRaw.includes("CPU")) ? "CPU" : (typeRaw.includes("MEMORY") || typeRaw.includes("MEM") ? "MEM" : "AVA");
                modulesToProcess.push(m);
            }

            for (const module of modulesToProcess) {
            let fullName = module === "CPU" ? "CPU Utilization" : (module === "MEM" ? "Memory Utilization" : "Availability");
            const key = `${log.ip}-${module}`;

            // isNormal selalu menang atas threshold numerik — cegah NORMAL log membuka ticket
            let isCrit = false;
            if (isNoData) isCrit = true;
            else if (module === "AVA") isCrit = !isNormal && (typeRaw.includes('DOWN') || typeRaw.includes('CRIT'));
            else {
                const valMatch = typeRaw.match(/(\d+(\.\d+)?)/);
                const currentVal = valMatch ? parseFloat(valMatch[0]) : 0;
                isCrit = !isNormal && (typeRaw.includes('HIGH') || typeRaw.includes('CRIT') || (currentVal >= critLimit));
            }

            if (isCrit && !openIssues[key]) {
                let badges = "";
                if (priorityIPs.includes(ipPart)) badges += `<span style="background:#da3633; color:#fff; padding:1px 4px; border-radius:3px; font-size:8px; font-weight:bold; margin-right:6px;">P</span>`;
                if (excludedIPs.includes(ipPart)) badges += `<span style="background:#d29922; color:#fff; padding:1px 4px; border-radius:3px; font-size:8px; font-weight:bold; margin-right:6px;">E</span>`;

                let hName = "---";
                if (rvtoolsKamus[ipPart] && rvtoolsKamus[ipPart].VM) {
                    hName = rvtoolsKamus[ipPart].VM;
                }

                // Format Pesan Khusus NO DATA
                let finalDetailText = "";
                if (isNoData) {
                    finalDetailText = module === "CPU" ? "CPU No Data" : module === "MEM" ? "Memory No Data" : "No Data";
                } else if (module === "AVA") {
                    finalDetailText = log.type;
                } else {
                    finalDetailText = `${module === 'MEM' ? 'High Memory' : 'High CPU'} more than ${critLimit}%`;
                }

                openIssues[key] = {
                    issueDate: log.time,
                    issueTs: new Date(log.time.replace(/-/g, '/')).getTime(),
                    moduleName: module === 'MEM' ? 'Memory' : (module === 'AVA' ? 'Availability' : module),
                    limit: critLimit, ip: (portPart === "9100") ? ipPart : log.ip, hostname: hName,
                    caseType: `Grafana - ${module === 'MEM' ? 'Memory' : (module === 'AVA' ? 'Availability' : module)}`,
                    detail: finalDetailText,
                    prio: module === "AVA" ? "P1" : "P3", assign: 'Infra', fullName: fullName, badges: badges, status: 'Open',
                    _openedAsHigh: !isNoData
                };
            } else if (isCrit && openIssues[key]) {
                // Ticket sudah open, tidak perlu action
            } else if (isNormal && openIssues[key]) {
                const ticket = openIssues[key];
                const normalTime = new Date(log.time.replace(/-/g, '/'));
                const diffFromIssueMs = normalTime - new Date(ticket.issueDate.replace(/-/g, '/'));
                const totalMinutes = Math.floor(diffFromIssueMs / 60000);

                // Ticket AVA yang dibuka murni dari NO DATA dan resolve < 5 menit:
                // hapus saja (noise scraping sesaat, bukan insiden nyata).
                // Khusus CPU/MEM NO DATA tetap diproses — sinyal scraper mati valid.
                if (!ticket._openedAsHigh && totalMinutes < 5 && ticket.moduleName === 'Availability') {
                    delete openIssues[key];
                    continue; // lanjut ke modul berikutnya dalam modulesToProcess
                }

                let isFlapping = false;
                for (let j = i + 1; j < sortedLogs.length; j++) {
                    const futureLog = sortedLogs[j];
                    const futureTime = new Date(futureLog.time.replace(/-/g, '/'));

                    if ((futureTime - normalTime) > flapToleranceMs) break;

                    const fTypeRaw = (futureLog.type || "").toUpperCase();
                    let fModule = "AVA";

                    if (fTypeRaw.includes("NO DATA")) {
                        const fIpPart = futureLog.ip.split(':')[0];
                        if (histUtil.CPU && (histUtil.CPU[futureLog.ip] || histUtil.CPU[fIpPart])) fModule = "CPU";
                        else if (histUtil.MEM && (histUtil.MEM[futureLog.ip] || histUtil.MEM[fIpPart])) fModule = "MEM";
                        else if (histUtil.AVA && histUtil.AVA[fIpPart]) fModule = "AVA";
                        else { if (futureLog.ip.includes("9100")) fModule = "CPU"; }
                    } else {
                        fModule = (fTypeRaw.includes("CPU")) ? "CPU" : (fTypeRaw.includes("MEMORY") || fTypeRaw.includes("MEM") ? "MEM" : "AVA");
                    }

                    if (futureLog.ip === log.ip && fModule === module) {
                        let fIsCrit = false;
                        // NO DATA setelah Normal TIDAK dihitung sebagai flapping —
                        // ini hanya gangguan scraping sesaat, bukan CPU/MEM naik kembali.
                        const fIsNormal = fTypeRaw.includes('NORMAL');
                        if (fTypeRaw.includes("NO DATA")) fIsCrit = false;
                        else if (fModule === "AVA") fIsCrit = !fIsNormal && (fTypeRaw.includes('DOWN') || fTypeRaw.includes('CRIT'));
                        else {
                            const fValMatch = fTypeRaw.match(/(\d+(\.\d+)?)/);
                            fIsCrit = !fIsNormal && (fTypeRaw.includes('HIGH') || fTypeRaw.includes('CRIT') || (fValMatch && parseFloat(fValMatch[0]) >= critLimit));
                        }
                        if (fIsCrit) { isFlapping = true; break; }
                    }
                }

                if (isFlapping) continue; // lanjut ke modul berikutnya dalam modulesToProcess

                if (totalMinutes >= 5) {
                    ticket.solveDate = log.time;
                    ticket.solveTs = normalTime.getTime();
                    ticket.resTime = `${Math.floor(totalMinutes / 60)} hours ${totalMinutes % 60} minutes`;
                    ticket.resTimeMs = diffFromIssueMs;
                    ticket.resolution = `${ticket.fullName} back to normal`;
                    ticket.status = 'Close';

                    ticket.ticketId = `GRAF_${ticket.ip}_${ticket.moduleName}_CLOSE_${ticket.solveTs}`.replace(/[:.\s-]+/g, '_');

                    rawTickets.push({...ticket});
                }
                delete openIssues[key];
            }
            } // end for (const module of modulesToProcess)
        }
        
        Object.values(openIssues).forEach(t => {
            const diffMs = new Date() - new Date(t.issueDate.replace(/-/g, '/'));
            if (Math.floor(diffMs / 60000) >= 5) {
                t.solveDate = ""; t.solveTs = 0; 
                t.resTime = "Waiting for Resolution"; 
                t.resTimeMs = 9999999999999; 
                t.resolution = ""; t.status = 'Open';
                
                t.ticketId = `GRAF_${t.ip}_${t.moduleName}_OPEN`.replace(/[:.\s-]+/g, '_');
                
                rawTickets.push(t);
            }
        });
        
        // Hitung berapa kali tiap IP+Module muncul, lalu tandai tiket terbaru per case
        const caseCountMap = buildIpTicketCountMap(rawTickets);
        markLatestTicketsPerIp(rawTickets);

        // Sisipkan badge count ke detail hanya pada tiket terbaru per IP+Module
        rawTickets.forEach(t => {
            const key = t.ip.split(':')[0] + '|' + t.moduleName;
            t._incidentCount = caseCountMap[key] || 1;
        });

        window.rawGrafanaData = rawTickets;

        // Kirim data ke parent window untuk dipakai ticket_verifier
        try {
            const openTickets = rawTickets
                .filter(t => t.status !== 'Close')
                .map(t => ({ ip: t.ip, hostname: t.hostname, moduleName: t.moduleName, detail: t.detail, status: t.status }));
            window.parent.postMessage({ type: 'GRAFANA_LIVE_DATA', payload: openTickets }, '*');
        } catch(e) {}

        if (typeof renderGrafanaHeader === "function") renderGrafanaHeader();
        applyGrafanaLogic();
    } catch(e) {
        console.error(e);
        const tb = document.getElementById('ticketBody');
        if (tb) tb.innerHTML = '<tr><td colspan="15" style="padding:20px; color:#ff7b72;">ERROR_LOAD_TICKET</td></tr>';
    }
}

async function openTicket() {   
    if (typeof createTicketModal === "function") createTicketModal(); 
    document.getElementById('ticketModal').style.display = 'block'; 
    renderTicketBody(); 
}

function closeTicket() { document.getElementById('ticketModal').style.display = 'none'; }