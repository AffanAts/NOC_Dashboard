/**
 * ticket_verifier.js
 * Khusus menangani Logika Mode "TICKET STATUS" di IP Checker.
 * Update: Fix Bug "No Record" (Fallback ALARM_ID) & Perbaikan Teks Prefix Ganda.
 */

window.globalTicketVerifierData = [];
window.realAppOpmData = [];
window.closedAppOpmData = [];
window.realAppGrafanaData = [];
window.ticketFilterData = {};
window.ticketSubMode = 'ALL';
window.verifierSortAsc = true;
window.verifierSortDupFirst = false;
window.verifierSearchQuery = '';

function onVerifierSearch(val) {
    window.verifierSearchQuery = val.trim().toLowerCase();
    const inp = document.getElementById('detailIssueSearchInput');
    if (inp && inp.value !== val) inp.value = val;
    if (window.globalTicketVerifierData.length > 0) renderTicketVerifierTable();
}

function clearVerifierSearch() {
    const inp = document.getElementById('detailIssueSearchInput');
    if (inp) inp.value = '';
    onVerifierSearch('');
}

function setTicketSubMode(subMode) {
    window.ticketSubMode = subMode;
    const subIds = ['ALL', 'GRAF_EXCEL', 'OPM_EXCEL', 'COMP_GRAF', 'COMP_OPM'];
    subIds.forEach(id => {
        const el = document.getElementById('st_' + id);
        if (el) {
            el.style.background = (id === subMode) ? '#8957e5' : '#21262d';
            el.style.color = (id === subMode) ? 'white' : (id.includes('COMP') ? (id.includes('GRAF') ? '#f1e05a' : '#ff7b72') : '#c9d1d9');
        }
    });
    if (window.globalTicketVerifierData.length > 0) {
        renderTicketVerifierTable();
    }
}

function toggleTicketSort() {
    window.verifierSortAsc = !window.verifierSortAsc;
    window.verifierSortDupFirst = false; 
    renderTicketVerifierTable();
}

function toggleDupSort() {
    window.verifierSortDupFirst = !window.verifierSortDupFirst;
    renderTicketVerifierTable();
}

function renderTicketVerifierTable() {
    const resultArea = document.getElementById('checkResult');
    const statsArea = document.getElementById('checkStats');

    let baseData = [...window.globalTicketVerifierData];

    if (window.ticketSubMode === 'GRAF_EXCEL') baseData = baseData.filter(d => d.source === 'GRAFANA');
    if (window.ticketSubMode === 'OPM_EXCEL') baseData = baseData.filter(d => d.source === 'OPM');
    if (window.ticketSubMode === 'COMP_GRAF') baseData = baseData.filter(d => d.source === 'GRAFANA');
    if (window.ticketSubMode === 'COMP_OPM') baseData = baseData.filter(d => d.source === 'OPM');

    baseData.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'CLOSE' ? -1 : 1;

        if (window.verifierSortDupFirst) {
            if (a.isDup !== b.isDup) return a.isDup ? -1 : 1;
            let keyA = a.ip + a.matchPrefix;
            let keyB = b.ip + b.matchPrefix;
            if (keyA !== keyB) return keyA.localeCompare(keyB);
        }

        if (window.verifierSortAsc) return a.timestamp - b.timestamp;
        return b.timestamp - a.timestamp;
    });

    // Filter by search query (DETAIL ISSUE)
    const sq = window.verifierSearchQuery || '';
    if (sq) {
        baseData = baseData.filter(d => {
            return (d.detail || '').toLowerCase().includes(sq)
                || (d.ip || '').toLowerCase().includes(sq)
                || (d.hostname || '').toLowerCase().includes(sq)
                || (d.caseStr || '').toLowerCase().includes(sq)
                || (d.matchPrefix || '').toLowerCase().includes(sq);
        });
    }

    const isCompareMode = window.ticketSubMode.startsWith('COMP_');
    const sortIcon = window.verifierSortAsc ? "🔼" : "🔽";
    const dupSortIcon = window.verifierSortDupFirst ? "🔴" : "⚪";
    const headBtnStyle = `background:transparent; border:none; color:#58a6ff; cursor:pointer; font-size:10px; text-decoration:underline; display:block; margin:auto; margin-top:5px;`;

    let htmlTable = `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead style="background: #161b22; position: sticky; top:0; z-index:10; box-shadow: 0 1px 0 #30363d;">
            <tr>
                <th style="padding: 14px 10px; text-align: center; color: #8b949e; width: 40px;">NO.</th>
                <th style="padding: 14px 10px; text-align: left; color: #8b949e; width: 110px; cursor: pointer; transition: 0.2s;" onclick="toggleTicketSort()" onmouseover="this.style.color='#c9d1d9'" onmouseout="this.style.color='#8b949e'">
                    ISSUE DATE ${sortIcon}
                </th>
                <th style="padding: 14px 10px; text-align: left; color: #8b949e; width: 140px;">
                    IP ADDRESS <button onclick="copyFullColumn('col-t-ip', this)" style="${headBtnStyle}">Copy IPs</button>
                </th>
                <th style="border: 1px solid #30363d; padding: 6px 3px; color: #8b949e; vertical-align: bottom;" onclick="toggleDupSort()" title="Klik untuk mengelompokkan Duplikat">
                    <div style="margin-bottom: 3px; cursor: pointer;">DETAIL ISSUE ${dupSortIcon} <span style="font-size:10px; font-weight:normal; opacity:0.7;">(DUP)</span></div>
                    <input type="text" id="detailIssueSearchInput" placeholder="Filter..." oninput="onVerifierSearch(this.value)"
                        style="background: #010409; color: #c9d1d9; font-size: 9px; border: 1px solid #30363d; border-radius: 3px; padding: 3px 5px; width: 100%; box-sizing: border-box; outline: none; transition: border-color 0.2s ease;">
                </th>
                
                ${isCompareMode ? `
                <th style="padding: 14px 10px; text-align: center; color: #f1e05a; width: 100px;">EXCEL STAT</th>
                <th style="padding: 14px 10px; text-align: center; color: #58a6ff; width: 130px;">APP DASHBOARD</th>
                ` : `
                <th style="padding: 14px 10px; text-align: center; color: #8b949e; width: 90px;">
                    STATUS <button onclick="copyFullColumn('col-t-status', this)" style="${headBtnStyle}">Copy Status</button>
                </th>
                `}
            </tr>
        </thead><tbody>`;

    let openCount = 0; let closeCount = 0; let dupCount = 0;
    let missedAppTickets = [];

    let targetAppData = [];
    if (window.ticketSubMode === 'COMP_GRAF') targetAppData = window.realAppGrafanaData;
    if (window.ticketSubMode === 'COMP_OPM') targetAppData = window.realAppOpmData;

    baseData.forEach((t, index) => {
        if (t.status === 'OPEN') openCount++; else closeCount++;
        if (t.isDup) dupCount++;

        if (isCompareMode) return;

        let statusColor = t.status === 'OPEN' ? '#f85149' : '#3fb950';
        let bgRow = t.status === 'OPEN' ? 'rgba(248,81,73,0.05)' : 'rgba(63,185,80,0.05)';
        let dupBadge = t.isDup ? `<span style="background:#da3633; color:white; padding:2px 6px; border-radius:10px; font-size:9px; font-weight:bold; margin-left:6px; box-shadow:0 0 5px rgba(218,54,51,0.5);">DUP</span>` : '';

        let renderedIp = t.ip || '-';
        if (t.source === 'GRAFANA' && t.ip) {
            renderedIp = `<a href="javascript:void(0)" onclick="window.openGrafanaForIp('${t.ip}')" class="grafana-ip-link" title="Buka di Grafana All Panel">${t.ip}</a>`;
        }

        let appLinkBtnHtml = "";
        if (t.source === 'OPM' && t.matchedAlarmId) {
            const opmUrl = `https://opmanager.example.com:8060/apiclient/ember/index.jsp#/Alarms/Alarm/Details/${t.matchedAlarmId}`;
            appLinkBtnHtml = `<div style="margin-top: 8px;"><button onclick="window.open('${opmUrl}', '_blank')" style="background:#21262d; border:1px solid #30363d; color:#c9d1d9; font-size:9px; padding:4px 8px; cursor:pointer; border-radius:4px; font-weight:bold; transition:0.2s;" onmouseover="this.style.background='#30363d'; this.style.color='#fff';" onmouseout="this.style.background='#21262d'; this.style.color='#c9d1d9';">🔗 BUKA OPM</button></div>`;
        } else if (t.source === 'GRAFANA' && t.ip) {
            appLinkBtnHtml = `<div style="margin-top: 8px;"><button onclick="window.openGrafanaForIp('${t.ip}')" style="background:#21262d; border:1px solid #30363d; color:#58a6ff; font-size:9px; padding:4px 8px; cursor:pointer; border-radius:4px; font-weight:bold; transition:0.2s;" onmouseover="this.style.background='#1f6feb'; this.style.color='#fff'; this.style.borderColor='#1f6feb';" onmouseout="this.style.background='#21262d'; this.style.color='#58a6ff'; this.style.borderColor='#30363d';">📈 GRAFANA</button></div>`;
        } else if (t.source === 'OPM' && !t.matchedAlarmId) {
            appLinkBtnHtml = `<div style="margin-top: 8px; font-size: 9px; color: #8b949e; font-style: italic;">No Record</div>`;
        }

        htmlTable += `<tr style="border-bottom: 1px solid #21262d; background: ${bgRow};">
            <td style="padding: 12px 10px; text-align:center; color: #8b949e; font-weight:bold; border-right: 1px solid #30363d;">${index + 1}</td>
            <td style="padding: 12px 10px; color: #8b949e;">${t.dateStr || '-'}</td>
            <td style="padding: 12px 10px; line-height: 1.4;">
                <div class="col-t-ip" style="color: #58a6ff; font-weight:bold;">${renderedIp}</div>
                <div style="font-size: 10px; color: #8b949e;">${t.hostname}</div>
            </td>
            <td style="padding: 12px 10px; color: #8b949e; font-style: italic;">
                ${t.caseStr ? `<span style="color:#d2a8ff; font-size:10px; border:1px solid #30363d; padding:2px 5px; border-radius:4px; margin-right:6px; display:inline-block; margin-bottom:4px;">${t.caseStr}</span><br>` : ''}
                <span style="color:#c9d1d9;">${t.detail}</span><br>
                <span style="color:#8b949e; font-size:10px;">[${t.matchPrefix}]</span> ${dupBadge}
            </td>
            <td class="col-t-status" style="padding: 12px 10px; text-align:center; color: ${statusColor}; font-weight:bold;">
                ${t.status}
                ${appLinkBtnHtml}
            </td>
        </tr>`;
    });

    if (isCompareMode && targetAppData.length > 0) {
        targetAppData.forEach(appT => {
            let foundInExcel = false;
            
            if (window.ticketSubMode === 'COMP_GRAF') {
                foundInExcel = baseData.some(excelT => excelT.ip === appT.ip && excelT.matchPrefix.includes(appT.type));
            } else if (window.ticketSubMode === 'COMP_OPM') {
                foundInExcel = baseData.some(excelT => {
                    if (excelT.ip !== appT.ip) return false;
                    let kw = excelT.matchPrefix.replace('OPM: "', '').replace('"', '');
                    if (kw === 'OPM: Any Open') return true;
                    
                    let tokens = kw.split(/\s+/).filter(tk => tk.length > 0);
                    let appIssueLower = (appT.detail || "").toLowerCase();
                    return tokens.every(token => appIssueLower.includes(token));
                });
            }

            if (!foundInExcel) {
                let alreadyAdded = missedAppTickets.find(m => m.ip === appT.ip && m.detail === appT.detail && m.type === appT.type);
                if (!alreadyAdded) { missedAppTickets.push(appT); }
            }
        });

        const filterData = window.ticketFilterData || {};
        const exAva = filterData.ex_ava || [];
        const exCpu = filterData.ex_cpu || [];
        const exMem = filterData.ex_mem || [];
        const exOpm = filterData.excluded || [];

        if (missedAppTickets.length > 0) {
            htmlTable += `<tr><td colspan="6" style="background:#da3633; color:white; text-align:center; padding:10px; font-weight:bold; letter-spacing:1px;">⚠️ DANGER: ${missedAppTickets.length} ALARM IN APP BUT NOT IN YOUR EXCEL ⚠️</td></tr>`;
            
            missedAppTickets.forEach(mT => {
                let isExcluded = false;
                if (window.ticketSubMode === 'COMP_GRAF') {
                    if (mT.type === 'AVA' && exAva.includes(mT.ip)) isExcluded = true;
                    if (mT.type === 'CPU' && exCpu.includes(mT.ip)) isExcluded = true;
                    if (mT.type === 'MEM' && exMem.includes(mT.ip)) isExcluded = true;
                } else if (window.ticketSubMode === 'COMP_OPM') {
                    if (exOpm.includes(mT.ip)) isExcluded = true;
                }

                let excludeBadge = isExcluded ? `<span style="background:#d29922; color:#fff; padding:2px 4px; border-radius:3px; font-size:9px; font-weight:bold; margin-right:5px; box-shadow:0 0 5px rgba(210,153,34,0.5);">EXCLUDE</span>` : '';

                let renderedIp = mT.ip;
                if (window.ticketSubMode === 'COMP_GRAF' && mT.ip) {
                    renderedIp = `<a href="javascript:void(0)" onclick="window.openGrafanaForIp('${mT.ip}')" class="grafana-ip-link" title="Buka di Grafana All Panel">${mT.ip}</a>`;
                }

                let missedBtnHtml = "";
                if (window.ticketSubMode === 'COMP_OPM' && mT.rawT && mT.rawT.ALARM_ID) {
                    const opmUrl = `https://opmanager.example.com:8060/apiclient/ember/index.jsp#/Alarms/Alarm/Details/${mT.rawT.ALARM_ID}`;
                    missedBtnHtml = `<div style="margin-top: 8px;"><button onclick="window.open('${opmUrl}', '_blank')" style="background:#da3633; border:1px solid #ff7b72; color:#fff; font-size:9px; padding:4px 8px; cursor:pointer; border-radius:4px; font-weight:bold; transition:0.2s;" onmouseover="this.style.background='#b3261e';" onmouseout="this.style.background='#da3633';">🔗 BUKA OPM</button></div>`;
                } else if (window.ticketSubMode === 'COMP_GRAF' && mT.ip) {
                    missedBtnHtml = `<div style="margin-top: 8px;"><button onclick="window.openGrafanaForIp('${mT.ip}')" style="background:#da3633; border:1px solid #ff7b72; color:#fff; font-size:9px; padding:4px 8px; cursor:pointer; border-radius:4px; font-weight:bold; transition:0.2s;" onmouseover="this.style.background='#b3261e';" onmouseout="this.style.background='#da3633';">📈 GRAFANA</button></div>`;
                }

                htmlTable += `<tr style="border-bottom: 1px solid #30363d; background: rgba(218,54,51,0.15);">
                    <td style="padding: 12px 10px; text-align:center; color: #ff7b72; font-weight:bold;">!</td>
                    <td style="padding: 12px 10px; color: #ff7b72;">REAL-TIME</td>
                    <td style="padding: 12px 10px; line-height: 1.4;">
                        <div style="color: #ff7b72; font-weight:bold;">${excludeBadge}${renderedIp}</div>
                        <div style="font-size: 10px; color: #ff7b72; opacity:0.8;">${mT.hostname || '-'}</div>
                    </td>
                    <td style="padding: 12px 10px; color: #ff7b72;">[${mT.type}] ${mT.detail || ''}</td>
                    <td style="padding: 12px 10px; text-align:center; color: #ff7b72; font-weight:bold;">❌ NOT IN EXCEL</td>
                    <td style="padding: 12px 10px; text-align:center; color: #ff7b72; font-weight:bold;">
                        🚨 NEW ALARM
                        ${missedBtnHtml}
                    </td>
                </tr>`;
            });
        } else {
            htmlTable += `<tr><td colspan="6" style="background:#238636; color:white; text-align:center; padding:15px; font-weight:bold; letter-spacing:1px;">✅ ALL APP ALARMS ARE RECORDED IN EXCEL</td></tr>`;
        }
    } else if (isCompareMode && targetAppData.length === 0) {
        htmlTable += `<tr><td colspan="6" style="background:#238636; color:white; text-align:center; padding:15px; font-weight:bold; letter-spacing:1px;">✅ NO OPEN ALARMS IN APP DASHBOARD</td></tr>`;
    }

    htmlTable += '</tbody></table>';
    resultArea.innerHTML = htmlTable;
    
    let statText = `ROWS: ${baseData.length} | <span style="color:#f85149;">OPEN: ${openCount}</span> | <span style="color:#3fb950;">CLOSE: ${closeCount}</span>`;
    if (dupCount > 0) statText += ` | <span style="color:#da3633; border:1px solid #da3633; padding:1px 6px; border-radius:4px;">DUPLICATES: ${dupCount}</span>`;
    if (missedAppTickets.length > 0) statText += ` | <span style="color:#ffffff; background:#da3633; padding:1px 6px; border-radius:4px;">MISSED ALARMS: ${missedAppTickets.length}</span>`;

    const totalOpen = (window.globalTicketVerifierData || []).filter(t => t.status === 'OPEN').length;
    statText += ` &nbsp;<button onclick="exportTicketExcel()" title="Export tiket OPEN ke Excel" style="background:#1f6feb; border:1px solid #388bfd; color:white; padding:5px 14px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; vertical-align:middle; transition:0.2s;" onmouseover="this.style.background='#388bfd'" onmouseout="this.style.background='#1f6feb'">📥 EXPORT EXCEL (${totalOpen} OPEN)</button>`;

    statsArea.innerHTML = statText;
}

async function processTicketVerification(inputText) {
    const resultArea = document.getElementById('checkResult');
    const statsArea = document.getElementById('checkStats');
    resultArea.innerHTML = '<div style="padding:60px; text-align:center; color:#8b949e; font-size:14px;">🔄 Analyzing & Syncing Data...</div>';

    try {
        const [opmResp, utilResp, filtResp, invResp, rvtoolsResp] = await Promise.all([
            fetch('Data_JSON/history_opmanager.json?t=' + Date.now()),
            fetch('Data_JSON/history_utilization.json?t=' + Date.now()),
            fetch('Data_JSON/filter.json?t=' + Date.now()),
            fetch('Data_JSON/opmanager_inventory.json?t=' + Date.now()),
            fetch('Data_JSON/RVTOOLS.json?t=' + Date.now()).catch(() => null)
        ]);

        const opmData = await opmResp.json();
        const utilData = await utilResp.json();
        const filterDataObj = await filtResp.json();
        const invData = await invResp.json();

        let megaKamus = {};

        // 1. Ambil dari OpManager Inventory
        let opmIpMap = {};
        let opmNameKamus = {}; // OpManager display names saja, tidak ditimpa RVTools
        if (invData.rows) {
            invData.rows.forEach(i => {
                let invIp = (i.ipaddress || "").trim();
                let invName = (i.displayName || "").trim();
                opmIpMap[invName] = invIp;
                if (invIp && invName) { megaKamus[invIp] = invName; opmNameKamus[invIp] = invName; }
            });
        }
        window.opmNameKamus = opmNameKamus;

        // 2. Ambil dari RVTools 
        if (rvtoolsResp && rvtoolsResp.ok) {
            const rvData = await rvtoolsResp.json();
            Object.keys(rvData).forEach(ip => {
                megaKamus[ip] = rvData[ip].VM;
            });
        }

        window.ticketFilterData = filterDataObj;
        const appIPs = filterDataObj.app_level || [];

        // 1. DATA OPMANGER (REAL - DISIMPAN BAIK OPEN MAUPUN CLOSE)
        let realAppOpm = [];
        let closedAppOpm = [];
        Object.values(opmData).forEach(t => {
            let ip = t.IP_ADDRESS || opmIpMap[t.HOSTNAME] || "";
            if(ip) ip = ip.split(':')[0].trim();
            
            let vmName = megaKamus[ip] || t.HOSTNAME || "Unknown";
            
            if (t.STATUS === 'OPEN') { 
                realAppOpm.push({ ip: ip, hostname: vmName, detail: t.DETAIL_ISSUE, type: 'OPM', rawT: t });
            } else {
                closedAppOpm.push({ ip: ip, hostname: vmName, detail: t.DETAIL_ISSUE, type: 'OPM', rawT: t, solveTs: t.SOLVE_TS || 0 });
            }
        });

        window.realAppOpmData = realAppOpm;
        window.closedAppOpmData = closedAppOpm;

        // 2. DATA GRAFANA (REAL - DARI LIVE DATA IFRAME VIA postMessage)
        let realAppGrafana = [];

        // Ambil dari liveGrafanaAlerts yang dikumpulkan di parent dari semua iframe
        const liveData = window.liveGrafanaAlerts || [];
        liveData.forEach(g => {
            let ip = (g.ip || "").split(':')[0].trim();
            if (!ip) return;

            let type = 'UNKNOWN';
            if (g.moduleName === 'Availability') type = 'AVA';
            else if (g.moduleName === 'CPU') type = 'CPU';
            else if (g.moduleName === 'Memory') type = 'MEM';

            let vmName = megaKamus[ip] || g.hostname || "Unknown";
            realAppGrafana.push({ ip: ip, hostname: vmName, type: type, detail: g.detail, rawT: g });
        });

        // Fallback ke history_utilization.json jika iframe belum sempat kirim data
        if (realAppGrafana.length === 0 && utilData) {
            ['AVA', 'CPU', 'MEM'].forEach(mod => {
                if (utilData[mod]) {
                    Object.keys(utilData[mod]).forEach(ipStr => {
                        let ip = ipStr.split(':')[0].trim();
                        let vmName = megaKamus[ip] || "Unknown";
                        realAppGrafana.push({ ip: ip, hostname: vmName, type: mod, detail: `${mod} alert` });
                    });
                }
            });
        }

        window.realAppGrafanaData = realAppGrafana;

        // 3. PROSES EXCEL ANDA 
        const lines = inputText.split('\n');
        let tempTickets = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;

            let parts = line.split('\t');
            let dateStr = "", caseStr = "", rawIssue = "", ip = "";

            if (parts.length >= 4) {
                dateStr = parts[0].trim(); caseStr = parts[1].trim(); rawIssue = parts[2].trim(); ip = parts[3].trim();
            } else if (parts.length === 3) { 
                caseStr = parts[0].trim(); rawIssue = parts[1].trim(); ip = parts[2].trim();
            } else if (parts.length === 2) { 
                rawIssue = parts[0].trim(); ip = parts[1].trim();
            } else {
                ip = parts[0].trim();
            }

            ip = ip.split(':')[0].trim();
            let cleanIssue = rawIssue.replace(/["']/g, ""); 
            let status = 'CLOSE';
            let isFound = false;
            let issueLower = cleanIssue.toLowerCase();
            let caseLower = caseStr.toLowerCase();

            let checkGrafana = caseLower.includes('grafana');
            let checkOPM = caseLower.includes('opmanager') || caseLower.includes('opm');
            if (!checkGrafana && !checkOPM) { checkGrafana = true; checkOPM = true; }

            let matchPrefix = "No Keyword";
            let sourceTag = "UNKNOWN";
            let matchedAlarmId = ""; 

            if (checkGrafana && ip && !isFound) {
                let gAva = realAppGrafana.some(g => g.ip === ip && g.type === 'AVA');
                let gCpu = realAppGrafana.some(g => g.ip === ip && g.type === 'CPU');
                let gMem = realAppGrafana.some(g => g.ip === ip && g.type === 'MEM');

                if (caseLower.includes('cpu') || issueLower.includes('cpu')) { 
                    matchPrefix = 'Grafana-CPU'; sourceTag = 'GRAFANA';
                    if (gCpu) { status = 'OPEN'; isFound = true; }
                }
                else if (caseLower.includes('memory') || caseLower.includes('mem') || issueLower.includes('memory') || issueLower.includes('mem')) { 
                    matchPrefix = 'Grafana-MEM'; sourceTag = 'GRAFANA';
                    if (gMem) { status = 'OPEN'; isFound = true; }
                }
                else if (caseLower.includes('ava') || caseLower.includes('ping') || caseLower.includes('down') || issueLower.includes('down') || issueLower.includes('ping') || issueLower.includes('ava')) { 
                    matchPrefix = 'Grafana-AVA'; sourceTag = 'GRAFANA';
                    if (gAva) { status = 'OPEN'; isFound = true; }
                }
            }

            if (checkOPM && ip && !isFound) {
                if (cleanIssue) {
                    let words = cleanIssue.split(/\s+/).filter(w => w.length > 0);
                    let baseKw = words.slice(0, 2).join(' ').toLowerCase(); 

                    let specificId = "";
                    if (caseLower.includes('disk') || baseKw.includes('partition') || baseKw.includes('disk')) {
                        let driveMatch = cleanIssue.match(/\b[a-zA-Z]:/); 
                        if (driveMatch) specificId = driveMatch[0].toLowerCase();
                        else {
                            let pathMatch = cleanIssue.match(/\sfor\s(\/[a-zA-Z0-9\/\-_]+)\s/i);
                            if (pathMatch) specificId = pathMatch[1].toLowerCase();
                        }
                    } else if (baseKw.includes('interface')) {
                        let intfMatch = cleanIssue.match(/interface\s+([a-zA-Z0-9\/\.\-\_]+)/i);
                        if (intfMatch) specificId = intfMatch[1].toLowerCase();
                    }

                    matchPrefix = baseKw;
                    if (specificId && !baseKw.includes(specificId)) matchPrefix = baseKw + " " + specificId; 

                    let searchKeywords = [baseKw];
                    if (baseKw === 'device not') { searchKeywords.push('device down', 'probable device'); } 
                    else if (baseKw === 'device down' || baseKw === 'probable device') {
                        searchKeywords.push('device not', 'device down', 'probable device');
                    }

                    // 1. Cari di tiket yang masih OPEN
                    for (let tObj of realAppOpm) {
                        if (tObj.ip === ip) {
                            let tIssueLower = (tObj.detail || "").toLowerCase().replace(/'/g, "");
                            let matchedBase = searchKeywords.find(kw => tIssueLower.includes(kw));

                            if (matchedBase) {
                                if (specificId && !tIssueLower.includes(specificId)) continue;
                                
                                let isExcelWmi = issueLower.includes('[wmi]');
                                let isAppWmi = tIssueLower.includes('[wmi]');
                                if (isExcelWmi !== isAppWmi) continue;
                                
                                let isExcelForecast = issueLower.includes('expected');
                                let isAppForecast = tIssueLower.includes('expected');
                                if (isExcelForecast !== isAppForecast) continue;
                                
                                let extraTag = "";
                                if (isExcelWmi) extraTag += " [WMI]";
                                if (isExcelForecast) extraTag += " Forecast";

                                status = 'OPEN'; isFound = true; 
                                matchPrefix = `OPM: "${matchedBase}${specificId ? ' ' + specificId : ''}${extraTag}"`; 
                                sourceTag = 'OPM'; 
                                matchedAlarmId = tObj.rawT.ALARM_ID;
                                break;
                            }
                        }
                    }

                    // 2. Jika tidak ketemu di OPEN, cari di memori tiket yang sudah CLOSE
                    if (!isFound) {
                        let sortedClose = [...closedAppOpm].sort((a,b) => b.solveTs - a.solveTs);
                        for (let tObj of sortedClose) {
                            if (tObj.ip === ip) {
                                let tIssueLower = (tObj.detail || "").toLowerCase().replace(/'/g, "");
                                let matchedBase = searchKeywords.find(kw => tIssueLower.includes(kw));

                                if (matchedBase) {
                                    if (specificId && !tIssueLower.includes(specificId)) continue;
                                    
                                    let isExcelWmi = issueLower.includes('[wmi]');
                                    let isAppWmi = tIssueLower.includes('[wmi]');
                                    if (isExcelWmi !== isAppWmi) continue;
                                    
                                    let isExcelForecast = issueLower.includes('expected');
                                    let isAppForecast = tIssueLower.includes('expected');
                                    if (isExcelForecast !== isAppForecast) continue;
                                    
                                    let extraTag = "";
                                    if (isExcelWmi) extraTag += " [WMI]";
                                    if (isExcelForecast) extraTag += " Forecast";

                                    matchPrefix = `OPM: "${matchedBase}${specificId ? ' ' + specificId : ''}${extraTag}"`; 
                                    sourceTag = 'OPM';
                                    matchedAlarmId = tObj.rawT.ALARM_ID;
                                    break; 
                                }
                            }
                        }
                    }
                }
                
                // Pengecekan tanpa keyword ("Any Open")
                if (!isFound && !cleanIssue) {
                    let openT = realAppOpm.find(tObj => tObj.ip === ip);
                    if (openT) {
                        status = 'OPEN'; isFound = true; matchPrefix = 'OPM: Any Open'; sourceTag = 'OPM';
                        matchedAlarmId = openT.rawT.ALARM_ID;
                    } else {
                        let closeT = [...closedAppOpm].sort((a,b) => b.solveTs - a.solveTs).find(tObj => tObj.ip === ip);
                        if (closeT) {
                            sourceTag = 'OPM';
                            matchedAlarmId = closeT.rawT.ALARM_ID;
                        }
                    }
                }

                // 🌟 FALLBACK: JIKA ALARM_ID MASIH KOSONG TAPI ITU OPM
                if (!matchedAlarmId && ip) {
                    let fallbackT = [...closedAppOpm].sort((a,b) => b.solveTs - a.solveTs).find(tObj => tObj.ip === ip) || realAppOpm.find(tObj => tObj.ip === ip);
                    if (fallbackT && fallbackT.rawT) {
                        matchedAlarmId = fallbackT.rawT.ALARM_ID;
                    }
                }
            }

            if (sourceTag === "UNKNOWN") {
                if (caseLower.includes('opm')) sourceTag = 'OPM';
                else if (caseLower.includes('graf')) sourceTag = 'GRAFANA';
                else sourceTag = 'GRAFANA'; 
            }

            let parsedDateMs = new Date(dateStr).getTime();
            if (isNaN(parsedDateMs)) parsedDateMs = i;

            let vmName = megaKamus[ip] || "Unknown Host";

            tempTickets.push({
                dateStr: dateStr, timestamp: parsedDateMs, caseStr: caseStr,
                ip: ip, hostname: vmName, detail: cleanIssue,
                status: status, matchPrefix: matchPrefix, source: sourceTag, isDup: false,
                matchedAlarmId: matchedAlarmId 
            });
        }

        let keyCounts = {};
        tempTickets.forEach(t => {
            if (t.ip && t.matchPrefix !== "No Keyword" && !t.matchPrefix.includes("Any Open")) {
                let k = t.ip + "||" + t.matchPrefix;
                keyCounts[k] = (keyCounts[k] || 0) + 1;
            }
        });
        tempTickets.forEach(t => {
            let k = t.ip + "||" + t.matchPrefix;
            if (keyCounts[k] > 1) t.isDup = true;
        });

        window.globalTicketVerifierData = tempTickets;
        setTicketSubMode('ALL');

    } catch (e) { resultArea.innerHTML = `<div style="padding:60px; text-align:center; color:#f85149;">❌ Error processing tickets: ${e.message}</div>`; }
}

// ============================================================
// === EXPORT EXCEL (Pure JS — no external library) ===========
// ============================================================

function exportTicketExcel() {
    const allData = window.globalTicketVerifierData || [];
    const openOnly = allData.filter(t => t.status === 'OPEN');

    if (openOnly.length === 0) {
        alert('Tidak ada tiket dengan status OPEN untuk diekspor.');
        return;
    }

    // Sort by Detail Issue alphabetically
    const sortByDetail = arr => [...arr].sort((a, b) => (a.detail || '').localeCompare(b.detail || ''));
    const grafanaRows = sortByDetail(openOnly.filter(t => t.source === 'GRAFANA'));
    const opmRows    = sortByDetail(openOnly.filter(t => t.source === 'OPM'));

    function assignee(t) {
        const isIface = /(interface)/i.test(t.caseStr || '') || /(interface)/i.test(t.detail || '');
        return (t.source === 'OPM' && isIface) ? 'Network' : 'Infra';
    }

    const opmNames = window.opmNameKamus || {};
    const HEADERS  = ['Issue Date', 'Case', 'Detail Issue', 'IP Address', 'Device Name', 'Assignee'];
    const toRow    = (t, useOpmName = false) => [
        t.dateStr || '', t.caseStr || '', t.detail || '', t.ip || '',
        (useOpmName ? (opmNames[t.ip] || t.hostname) : t.hostname) || '',
        assignee(t)
    ];

    // style index: 0=no-border(separator), 1=data-with-border, 2=grafana-hdr, 3=opm-hdr, 4=col-hdr
    const rows = [];
    const addRow = (values, style = 1) => rows.push({ values, style });

    addRow(['GRAFANA ALERTS', '', '', '', '', ''], 2);
    addRow(HEADERS, 4);
    if (grafanaRows.length > 0) grafanaRows.forEach(t => addRow(toRow(t)));
    else addRow(['(Tidak ada alert Grafana yang Open)', '', '', '', '', '']);

    rows.push({ values: ['', '', '', '', '', ''], style: 0 }); // separator, no border

    addRow(['OPMANAGER ALERTS', '', '', '', '', ''], 3);
    addRow(HEADERS, 4);
    if (opmRows.length > 0) opmRows.forEach(t => addRow(toRow(t, true)));
    else addRow(['(Tidak ada alert OpManager yang Open)', '', '', '', '', '']);

    const now = new Date();
    const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const filename = `Alert Open (${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}).xlsx`;

    try {
        const bytes = _buildTicketXlsx(rows);
        _xlsxDownload(bytes, filename);
    } catch(e) {
        alert('Gagal membuat file Excel: ' + e.message);
    }
}

function _xlsxDownload(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function _buildTicketXlsx(rows) {
    // Styles: 5 xf entries — 0=no-border(separator), 1=data+border, 2=grafana-hdr+border, 3=opm-hdr+border, 4=col-hdr+border
    // border 0=none, border 1=thin all sides (#BFBFBF)
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1565C0"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B5E20"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF37474F"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/></cellXfs></styleSheet>`;

    // Shared strings table
    const ss = []; const ssIdx = {};
    function si(raw) {
        const s = String(raw).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        if (ssIdx[s] === undefined) { ssIdx[s] = ss.length; ss.push(s); }
        return ssIdx[s];
    }

    // 0-based column index → Excel letter (A, B, ... Z, AA, ...)
    function colLetter(n) {
        let s = ''; n++;
        while (n > 0) { s = String.fromCharCode(64 + (n % 26 || 26)) + s; n = Math.floor((n - 1) / 26); }
        return s;
    }

    // Build worksheet XML
    let sheetRows = '';
    rows.forEach((row, ri) => {
        const xfIdx = row.style || 0;
        sheetRows += `<row r="${ri + 1}">`;
        row.values.forEach((cell, ci) => {
            sheetRows += `<c r="${colLetter(ci)}${ri + 1}" t="s" s="${xfIdx}"><v>${si(cell)}</v></c>`;
        });
        sheetRows += '</row>';
    });

    const colWidths = '<cols><col min="1" max="1" width="16" customWidth="1"/><col min="2" max="2" width="22" customWidth="1"/><col min="3" max="3" width="50" customWidth="1"/><col min="4" max="4" width="18" customWidth="1"/><col min="5" max="5" width="32" customWidth="1"/><col min="6" max="6" width="12" customWidth="1"/></cols>';

    const sheetXml  = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${colWidths}<sheetData>${sheetRows}</sheetData></worksheet>`;
    const ssXml     = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${ss.length}" uniqueCount="${ss.length}">${ss.map(s => `<si><t xml:space="preserve">${s}</t></si>`).join('')}</sst>`;
    const wbXml     = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Alert Open" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const wbRels    = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const rootRels  = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const ctXml     = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

    return _buildZip([
        { name: '[Content_Types].xml',          data: ctXml },
        { name: '_rels/.rels',                  data: rootRels },
        { name: 'xl/workbook.xml',              data: wbXml },
        { name: 'xl/_rels/workbook.xml.rels',   data: wbRels },
        { name: 'xl/worksheets/sheet1.xml',     data: sheetXml },
        { name: 'xl/sharedStrings.xml',         data: ssXml },
        { name: 'xl/styles.xml',                data: stylesXml },
    ]);
}

function _buildZip(files) {
    const enc = new TextEncoder();

    // Build CRC32 lookup table
    const CRC_T = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        CRC_T[n] = c;
    }
    function crc32(data) {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) c = CRC_T[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    function u16(n) { return new Uint8Array([n & 0xFF, (n >> 8) & 0xFF]); }
    function u32(n) { return new Uint8Array([n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, ((n >>> 24) & 0xFF)]); }
    function cat(...parts) {
        const len = parts.reduce((s, p) => s + p.length, 0);
        const out = new Uint8Array(len); let off = 0;
        for (const p of parts) { out.set(p, off); off += p.length; }
        return out;
    }

    const locals = [];
    let offset = 0;

    for (const f of files) {
        const nameB = enc.encode(f.name);
        const dataB = enc.encode(f.data);
        const crc   = crc32(dataB);
        const sz    = dataB.length;
        // Local file header (30 bytes fixed) + filename
        const hdr = cat(
            new Uint8Array([0x50,0x4B,0x03,0x04, 20,0, 0,0, 0,0, 0,0,0,0]),
            u32(crc), u32(sz), u32(sz), u16(nameB.length), u16(0), nameB
        );
        locals.push({ hdr, dataB, nameB, crc, sz, offset });
        offset += hdr.length + sz;
    }

    // Central directory
    const centrals = locals.map(f => cat(
        new Uint8Array([0x50,0x4B,0x01,0x02, 20,0, 20,0, 0,0, 0,0, 0,0,0,0]),
        u32(f.crc), u32(f.sz), u32(f.sz),
        u16(f.nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0),
        u32(f.offset), f.nameB
    ));

    const cdSize = centrals.reduce((s, c) => s + c.length, 0);
    const eocd = cat(
        new Uint8Array([0x50,0x4B,0x05,0x06, 0,0, 0,0]),
        u16(files.length), u16(files.length), u32(cdSize), u32(offset), u16(0)
    );

    return cat(...locals.flatMap(f => [f.hdr, f.dataB]), ...centrals, eocd);
}