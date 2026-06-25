/**
 * page/grafana/grafana_ui.js
 * Fokus: Render elemen HTML untuk tabel tiket Grafana
 * Update: Penambahan tombol "OPEN" untuk langsung lompat ke web Grafana
 */

function toggleFlapGroup(groupId, headerRow) {
    const children = document.querySelectorAll(`.flap-child[data-group="${groupId}"]`);
    const arrow = document.getElementById(`arrow_${groupId}`);
    const isHidden = children.length > 0 && children[0].style.display === 'none';
    children.forEach(row => { row.style.display = isHidden ? '' : 'none'; });
    if (arrow) arrow.textContent = isHidden ? '▼' : '▶';
}

function createTicketModal() {
    if(document.getElementById('ticketModal')) return;

    const modalHTML = `
    <style> .hover-row:hover { background-color: #21262d !important; } </style>
    <div id="ticketModal" style="display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background: #0d1117;">
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; font-family: 'Consolas', monospace;">
            
            <div style="padding: 6px 12px; background: #161b22; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color: #f1e05a; font-size: 13px; font-weight: bold;">[ TICKET_SYSTEM_AUTO_GRAFANA ]</span> 
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button onclick="resetGrafanaFilter()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 4px 10px; border-radius: 3px; cursor: pointer; font-size: 11px;">RESET DEFAULT</button>
                    <button onclick="closeTicket()" style="background: #da3633; border: none; color: white; padding: 4px 10px; border-radius: 3px; cursor: pointer; font-size: 11px;">EXIT</button>
                </div>
            </div>
            
            <div style="flex: 1; overflow: auto; padding: 10px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10px; color: #c9d1d9; table-layout: fixed; border: 1px solid #30363d;">
                    <thead id="grafanaThead" style="position: sticky; top: 0; background: #161b22; text-align: left; box-shadow: 0 1px 0 #30363d; z-index: 2;"></thead>
                    <tbody id="ticketBody"></tbody>
                </table>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function renderGrafanaHeader() {
    const thead = document.getElementById('grafanaThead');
    if(!thead) return;

    const currentPic = localStorage.getItem('global_noc_pic') || localStorage.getItem('grafana_global_pic') || 'Affan';
    const headerInputStyle = "background: #010409; color: #c9d1d9; font-size: 9px; border: 1px solid #30363d; border-radius: 3px; padding: 3px 5px; width: 100%; box-sizing: border-box; outline: none; transition: border-color 0.2s ease;";

    thead.innerHTML = `
        <tr style="border-bottom: 2px solid #30363d;">
            <th style="border: 1px solid #30363d; width: 25px; padding: 6px 3px; text-align: center; vertical-align: bottom;">
                <input type="checkbox" id="selectAllGrafana" onchange="toggleSelectAllGrafana(this)" style="cursor:pointer;" title="Pilih Semua">
            </th>
            <th style="border: 1px solid #30363d; width: 110px; padding: 6px 3px; color: #8b949e; cursor:pointer; vertical-align: bottom; transition: color 0.2s;" onclick="handleGrafSort('issueTs')" onmouseover="this.style.color='#c9d1d9'" onmouseout="this.style.color='#8b949e'">
                <div style="display: flex; align-items: center; gap: 5px;"><span>ISSUE_DATE</span> <span>${getSortIcon('issueTs')}</span></div>
            </th>
            <th style="border: 1px solid #30363d; width: 110px; padding: 6px 3px; color: #8b949e; cursor:pointer; vertical-align: bottom; transition: color 0.2s;" onclick="handleGrafSort('solveTs')" onmouseover="this.style.color='#c9d1d9'" onmouseout="this.style.color='#8b949e'">
                <div style="display: flex; align-items: center; gap: 5px;"><span>SOLVE_DATE</span> <span>${getSortIcon('solveTs')}</span></div>
            </th>
            <th style="border: 1px solid #30363d; width: 120px; padding: 6px 3px; color: #8b949e; vertical-align: bottom;">
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 3px; cursor: pointer; transition: color 0.2s;" onclick="handleGrafSort('resTimeMs')" onmouseover="this.style.color='#c9d1d9'" onmouseout="this.style.color='#8b949e'">
                    <span>RES_TIME</span> <span>${getSortIcon('resTimeMs')}</span>
                </div>
                <input type="text" id="filterResTime" placeholder="Filter Time..." value="${grafFilter.resTime}" oninput="handleGrafFilter('resTime', this.value)" style="${headerInputStyle}">
            </th>
            <th style="border: 1px solid #30363d; width: 90px; padding: 6px 3px; color: #8b949e; vertical-align: bottom;">
                <div style="margin-bottom: 3px;">CASE_TYPE</div>
                <select onchange="handleGrafFilter('type', this.value)" style="${headerInputStyle} cursor:pointer;">
                    <option value="">ALL CASE</option>
                    <option value="Availability" ${grafFilter.type==='availability'?'selected':''}>Availability</option>
                    <option value="Memory" ${grafFilter.type==='memory'?'selected':''}>Memory</option>
                    <option value="CPU" ${grafFilter.type==='cpu'?'selected':''}>CPU</option>
                </select>
            </th>
            <th style="border: 1px solid #30363d; width: 180px; padding: 6px 3px; color: #8b949e; vertical-align: bottom;">DETAIL_ISSUE</th>
            <th style="border: 1px solid #30363d; width: 95px; padding: 6px 3px; color: #8b949e; vertical-align: bottom;">
                <div style="margin-bottom: 3px;">IP_ADDRESS</div>
                <input type="text" id="filterIP" placeholder="Filter IP..." value="${grafFilter.ip}" oninput="handleGrafFilter('ip', this.value)" style="${headerInputStyle}">
            </th>
            <th style="border: 1px solid #30363d; width: 100px; padding: 6px 3px; color: #8b949e; vertical-align: bottom;">
                <div style="margin-bottom: 3px;">HOSTNAME</div>
                <input type="text" id="filterHost" placeholder="Filter Host..." value="${grafFilter.host}" oninput="handleGrafFilter('host', this.value)" style="${headerInputStyle}">
            </th>
            <th style="border: 1px solid #30363d; width: 35px; padding: 6px 3px; color: #8b949e; vertical-align: bottom;">PRIO</th>
            <th style="border: 1px solid #30363d; width: 50px; padding: 6px 3px; color: #8b949e; vertical-align: bottom;">ASSIGN</th>
            <th style="border: 1px solid #30363d; width: 150px; padding: 6px 3px; color: #8b949e; vertical-align: bottom;">RESOLUTION</th>
            <th style="border: 1px solid #30363d; width: 65px; padding: 6px 3px; color: #8b949e; vertical-align: bottom;">
                <div style="margin-bottom: 3px;">STATUS</div>
                <select onchange="handleGrafFilter('status', this.value)" style="${headerInputStyle} cursor:pointer;">
                    <option value="">ALL</option>
                    <option value="Open" ${grafFilter.status==='open'?'selected':''}>Open</option>
                    <option value="Close" ${grafFilter.status==='close'?'selected':''}>Close</option>
                </select>
            </th>
            <th style="border: 1px solid #30363d; width: 70px; padding: 6px 3px; color: #8b949e; vertical-align: bottom; text-align: center;">
                <div style="margin-bottom: 3px;">PIC</div>
                <div style="color: #58a6ff; font-weight: bold; font-size: 11px; padding-top: 4px;">${currentPic}</div>
            </th>
            <th style="border: 1px solid #30363d; width: 185px; padding: 6px 3px; text-align: center; vertical-align: bottom;">
                <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <span style="color: #8b949e; font-weight: bold;">ACTION</span> 
                    <button onclick="toggleAllDoneGrafana()" style="background: #238636; border: 1px solid #2ea043; color: #ffffff; font-size: 8px; padding: 2px 4px; border-radius: 3px; cursor: pointer; font-weight: bold; margin-left: 5px; transition: 0.2s;" onmouseover="this.style.background='#2ea043'" onmouseout="this.style.background='#238636'" title="Check/Uncheck Semua">ALL DONE</button>
                </div>
            </th>
        </tr>`;

    const activeId = document.activeElement ? document.activeElement.id : null;
    if (activeId && (activeId === 'filterIP' || activeId === 'filterHost' || activeId === 'filterResTime')) {
        const el = document.getElementById(activeId);
        if (el) { const val = el.value; el.value = ''; el.value = val; el.focus(); }
    }
}

function buildTicketRow(t, checkedObj, finalGlobalPIC, isChild = false, groupId = null) {
    let currentLevel = checkedObj[t.ticketId] || 0;
    let isSystemClose = (t.status === "Close");
    let rowStyle = isChild ? "background:#0d1117; display:none;" : "";
    let checkBtnText = "DONE";
    let checkBtnColor = "#30363d";
    const childAttrs = groupId ? `class="hover-row flap-child" data-group="${groupId}"` : `class="hover-row"`;

    if (isSystemClose) {
        if (currentLevel === 2) {
            rowStyle += " opacity: 0.4; filter: grayscale(1);";
            checkBtnText = "✔"; checkBtnColor = "#2ea043";
        } else {
            checkBtnText = "DONE"; checkBtnColor = "#da3633";
        }
    } else {
        if (currentLevel === 1) {
            rowStyle += " opacity: 0.7; filter: brightness(0.7);";
            checkBtnText = "ACK'D"; checkBtnColor = "#e3b341";
        }
    }

    const excelData = [t.issueDate, t.solveDate, t.resTime, t.caseType, t.detail, t.ip, t.hostname, t.prio, t.assign, t.resolution, t.status, finalGlobalPIC];
    window.currentGrafanaTicketsExcel[t.ticketId] = excelData;
    const stCol = t.status === 'Open' ? "#ff7b72" : "#3fb950";
    const indentStyle = isChild ? "padding-left: 18px;" : "";

    return `
        <tr ${childAttrs} style="border-bottom: 1px solid #30363d; ${rowStyle} transition: 0.2s;">
            <td style="border: 1px solid #30363d; padding: 6px 3px; text-align: center;"><input type="checkbox" class="grafana-row-checkbox" data-id="${t.ticketId}" style="cursor:pointer;"></td>
            <td style="border: 1px solid #30363d; padding: 6px 3px; color: #8b949e; white-space: nowrap; ${indentStyle}">${t.issueDate}</td>
            <td style="border: 1px solid #30363d; padding: 6px 3px; color: #8b949e; white-space: nowrap;">${t.solveDate}</td>
            <td style="border: 1px solid #30363d; padding: 6px 3px; white-space: nowrap;">
                ${t.resTime}
            </td>
            <td style="border: 1px solid #30363d; padding: 6px 3px; color: #f1e05a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.caseType}</td>
            <td style="border: 1px solid #30363d; padding: 6px 3px; white-space: normal; word-wrap: break-word; min-width: 150px; line-height: 1.2;">
                ${t.detail}${t._isLatestForIp && t._incidentCount > 1 ? ` <span style="background:#58a6ff; color:#fff; padding:1px 5px; border-radius:3px; font-size:9px; font-weight:bold; margin-left:5px; vertical-align:middle;">x${t._incidentCount}</span>` : ''}
            </td>
            <td style="border: 1px solid #30363d; padding: 6px 3px; font-weight:bold; white-space: nowrap; vertical-align: middle;">${t.badges}<span onclick="navigator.clipboard.writeText('${t.ip.split(':')[0]}'); this.style.color='#3fb950'; setTimeout(()=>this.style.color='',1000);" style="cursor:pointer; color:inherit;" title="Klik untuk copy IP">${t.ip}</span></td>
            <td style="border: 1px solid #30363d; padding: 6px 3px; color: #58a6ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.hostname}</td>
            <td style="border: 1px solid #30363d; padding: 6px 3px; white-space: nowrap; text-align: center;">${t.prio}</td>
            <td style="border: 1px solid #30363d; padding: 6px 3px; white-space: nowrap;">${t.assign}</td>
            <td style="border: 1px solid #30363d; padding: 6px 3px; white-space: normal; word-wrap: break-word; min-width: 120px; line-height: 1.2; color: #8b949e; font-size: 9px;">${t.resolution}</td>
            <td style="border: 1px solid #30363d; padding: 6px 3px; color: ${stCol}; font-weight:bold; white-space: nowrap; text-align: center;">${t.status}</td>
            <td style="border: 1px solid #30363d; padding: 6px 3px; color: #58a6ff; font-weight:bold; white-space: nowrap; text-align: center;">${finalGlobalPIC}</td>
            <td style="border: 1px solid #30363d; padding: 6px 3px; text-align:center;">
                <div style="display:flex; gap:3px; justify-content:center; align-items:center;">
                    <button onclick='openGrafanaPanel(${JSON.stringify(t).replace(/'/g, "&apos;")})' style="background:#e3b341; border:none; padding:2px 4px; border-radius:3px; cursor:pointer;" title="Buka Grafana Panel Web"><img src="src/img/grafana.svg" style="width:14px;height:14px;vertical-align:middle;display:block;"></button>
                    <button onclick='copyExcel(this, ${JSON.stringify(excelData).replace(/'/g, "&apos;")})' style="background:#21262d; border:1px solid #30363d; color:#c9d1d9; font-size:8px; padding:2px 4px; border-radius:3px; cursor:pointer;" title="Copy Format Excel"><img src="src/img/excel.svg" style="width:14px;height:14px;vertical-align:middle;display:block;"></button>
                    <button onclick='copyWA(this, ${JSON.stringify(t).replace(/'/g, "&apos;")})' style="background:#1f6feb; border:none; color:white; font-size:9px; font-weight:bold; padding:2px 5px; cursor:pointer; border-radius:3px; box-shadow: 0 0 5px rgba(31,111,235,0.4);" title="Buka Web Grafana & WA"><img src="src/img/whatsapp.svg" style="width:14px;height:14px;vertical-align:middle;display:block;"></button>
                    <button onclick='showItsmPopup(${JSON.stringify(t).replace(/'/g, "&apos;")})' style="background:#8957e5; border:none; color:white; font-size:8px; padding:2px 4px; border-radius:3px; cursor:pointer;" title="Helper ITSM"><img src="src/img/itsm.svg" style="width:14px;height:14px;vertical-align:middle;display:block;"></button>
                    <button class="graf-done-btn" data-ticket-id="${t.ticketId}" data-sys-status="${t.status}" onclick="toggleCheckGrafana('${t.ticketId}', '${t.status}')" style="background:${checkBtnColor}; border:none; color:${checkBtnColor === '#30363d' ? '#c9d1d9' : 'white'}; font-size:9px; font-weight:bold; padding:2px 6px; cursor:pointer; border-radius:3px;">${checkBtnText}</button>
                </div>
            </td>
        </tr>`;
}

function renderGrafanaTableRows(filteredData, checkedObj, currentGlobalPIC) {
    const body = document.getElementById('ticketBody');
    if (!body) return;

    const activeCheckboxes = Array.from(document.querySelectorAll('.grafana-row-checkbox:checked')).map(cb => cb.getAttribute('data-id'));
    const isMasterChecked = document.getElementById('selectAllGrafana') ? document.getElementById('selectAllGrafana').checked : false;

    const finalGlobalPIC = localStorage.getItem('global_noc_pic') || currentGlobalPIC || 'Affan';
    window.currentGrafanaTicketsExcel = {};
    let htmlRows = [];

    let countOpen = 0;
    let countUnack = 0;
    let countAck = 0;
    let countVerifyClose = 0;

    // --- GROUPING: IP + caseType + detail sama, ≥5 ticket → dijadikan 1 group ---
    const FLAP_GROUP_MIN = 5;
    const groupMap = {};
    const ungrouped = [];

    filteredData.forEach(t => {
        const gKey = `${t.ip}||${t.caseType}||${t.detail}`;
        if (!groupMap[gKey]) groupMap[gKey] = [];
        groupMap[gKey].push(t);
    });

    const groupHeaders = [];
    const normalTickets = [];

    Object.entries(groupMap).forEach(([gKey, tickets]) => {
        if (tickets.length >= FLAP_GROUP_MIN) {
            groupHeaders.push({ gKey, tickets });
        } else {
            tickets.forEach(t => normalTickets.push(t));
        }
    });

    // Hitung counter untuk group headers (semua ticket di dalamnya)
    groupHeaders.forEach(g => {
        g.tickets.forEach(t => {
            const isSystemClose = t.status === "Close";
            if (!isSystemClose) {
                countOpen++;
                const lvl = checkedObj[t.ticketId] || 0;
                if (lvl === 0) countUnack++;
                if (lvl === 1) countAck++;
            } else {
                if ((checkedObj[t.ticketId] || 0) !== 2) countVerifyClose++;
            }
        });
    });

    normalTickets.forEach(t => {
        const isSystemClose = t.status === "Close";
        if (!isSystemClose) {
            countOpen++;
            const lvl = checkedObj[t.ticketId] || 0;
            if (lvl === 0) countUnack++;
            if (lvl === 1) countAck++;
        } else {
            if ((checkedObj[t.ticketId] || 0) !== 2) countVerifyClose++;
        }
    });

    // --- RENDER GROUP HEADERS (di paling atas) ---
    if (groupHeaders.length > 0) {
        const totalFlapGroups = groupHeaders.length;
        const totalFlapTickets = groupHeaders.reduce((s, g) => s + g.tickets.length, 0);
        const colspan = 14;
        htmlRows.push(`
            <tr>
                <td colspan="${colspan}" style="padding: 3px 10px; background: #161008; border-bottom: 1px solid #3d2e00;">
                    <span style="color:#6b5a2a; font-size:9px; font-weight:bold; letter-spacing:0.3px; margin-right:8px;">⚠ FLAPPING</span>
                    <span style="color:#504030; font-size:8px;">Terdeteksi ${totalFlapGroups} grup (${totalFlapTickets} tiket) dengan sinyal naik-turun berulang kali — kemungkinan gangguan intermittent atau threshold terlalu sensitif.</span>
                </td>
            </tr>`);
    }

    groupHeaders.forEach(g => {
        const rep = g.tickets[0]; // representatif: ambil ticket pertama
        const total = g.tickets.length;
        const openCount = g.tickets.filter(t => t.status === 'Open').length;
        const closeCount = total - openCount;
        const groupId = `flapgrp_${g.gKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const groupAllDone = g.tickets.every(t => {
            const lvl = checkedObj[t.ticketId] || 0;
            return t.status === 'Close' ? lvl === 2 : lvl === 1;
        });

        const latestTicket = g.tickets.reduce((a, b) => a.issueTs > b.issueTs ? a : b);
        const earliestTicket = g.tickets.reduce((a, b) => a.issueTs < b.issueTs ? a : b);

        // Hitung durasi flapping (earliest → latest)
        const flapDurMs = new Date(latestTicket.issueTs) - new Date(earliestTicket.issueTs);
        const flapDurHr = Math.floor(flapDurMs / 3600000);
        const flapDurMin = Math.floor((flapDurMs % 3600000) / 60000);
        const flapDurStr = flapDurHr > 0 ? `${flapDurHr}j ${flapDurMin}m` : `${flapDurMin}m`;

        htmlRows.push(`
            <tr class="flap-group-header" data-group-id="${groupId}" style="background:#181c20; border-top: 1px solid #3d3520; border-bottom: 1px solid #3d3520; cursor:pointer; line-height:1; ${groupAllDone ? 'opacity:0.45; filter:grayscale(0.6);' : ''}" onclick="toggleFlapGroup('${groupId}', this)">
                <td style="border: 1px solid #252a30; padding: 2px 3px; text-align:center; color:#6b5a2a;">
                    <span id="arrow_${groupId}" style="font-size:9px;">▶</span>
                </td>
                <td style="border: 1px solid #252a30; padding: 2px 5px; color: #555d68; white-space: nowrap; font-size:8px;">
                    ${earliestTicket.issueDate} <span style="color:#333;">–</span> ${latestTicket.issueDate}
                    <span style="color:#4a3e1a; margin-left:4px;">⏱ ${flapDurStr}</span>
                </td>
                <td style="border: 1px solid #252a30; padding: 2px 5px;" colspan="2">
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span style="background:#3d2e00; color:#8b7535; padding:1px 7px; border-radius:3px; font-size:8px; font-weight:bold;">🔁 FLAPPING ×${total}</span>
                    </div>
                </td>
                <td style="border: 1px solid #252a30; padding: 2px 3px; color: #7a7020; white-space: nowrap; font-size:9px;">${rep.caseType}</td>
                <td style="border: 1px solid #252a30; padding: 2px 3px; color: #6e7681; font-size:9px;">${rep.detail}</td>
                <td style="border: 1px solid #252a30; padding: 2px 3px; white-space:nowrap; font-size:9px; color:#4a5568;">
                    <span onclick="event.stopPropagation(); navigator.clipboard.writeText('${rep.ip.split(':')[0]}'); this.style.color='#3fb950'; setTimeout(()=>this.style.color='',1000);" style="cursor:pointer; color:inherit;" title="Klik untuk copy IP">${rep.ip}</span>
                </td>
                <td style="border: 1px solid #252a30; padding: 2px 3px; color: #3a5a7a; white-space:nowrap; font-size:9px;">${rep.hostname}</td>
                <td style="border: 1px solid #252a30; padding: 2px 3px; text-align:center; font-size:9px; color:#555d68;">${rep.prio}</td>
                <td style="border: 1px solid #252a30; padding: 2px 3px; font-size:9px; color:#555d68;">${rep.assign}</td>
                <td style="border: 1px solid #252a30; padding: 2px 4px;">
                    <div style="display:flex; gap:4px; align-items:center;">
                        <span style="border:1px solid #5a2020; color:#7a3030; padding:0px 5px; border-radius:3px; font-size:8px;">● ${openCount} OPEN</span>
                        <span style="border:1px solid #1a4020; color:#2a6030; padding:0px 5px; border-radius:3px; font-size:8px;">✔ ${closeCount} CLOSE</span>
                    </div>
                </td>
                <td style="border: 1px solid #252a30; padding: 2px 3px; text-align:left;">
                    <span style="color:#4a3e1a; font-size:8px; font-weight:bold;">🔁 FLAPPING</span>
                </td>
                <td style="border: 1px solid #252a30; padding: 2px 3px; color: #3a5a7a; font-weight:bold; text-align:center; font-size:9px;">${finalGlobalPIC}</td>
                <td style="border: 1px solid #252a30; padding: 2px 5px; text-align:center;">
                    <div style="display:flex; gap:4px; justify-content:center; align-items:center;">
                        <span style="border:1px solid #3d3520; color:#6b5a2a; padding:1px 7px; border-radius:3px; font-size:8px; white-space:nowrap;">▶ expand (${total})</span>
                        <button onclick="event.stopPropagation(); markFlapGroupDone('${groupId}', this)" style="background:${groupAllDone ? '#2ea043' : '#238636'}; border:1px solid #2ea043; color:#fff; font-size:8px; font-weight:bold; padding:1px 7px; border-radius:3px; cursor:pointer; white-space:nowrap;" onmouseover="this.style.background='#2ea043'" onmouseout="this.style.background='${groupAllDone ? '#2ea043' : '#238636'}'" title="${groupAllDone ? 'Batalkan DONE semua tiket grup ini' : 'Tandai DONE semua tiket dalam grup flapping ini'}">${groupAllDone ? '↩ UNDO' : '✔ DONE'} (${total})</button>
                    </div>
                </td>
            </tr>`
        );

        g.tickets.forEach(t => {
            htmlRows.push(buildTicketRow(t, checkedObj, finalGlobalPIC, true, groupId));
        });
    });

    // --- RENDER TICKET NORMAL (bukan group) ---
    normalTickets.forEach(t => {
        htmlRows.push(buildTicketRow(t, checkedObj, finalGlobalPIC, false, null));
    });

    body.innerHTML = htmlRows.join('');

    activeCheckboxes.forEach(id => {
        const cb = document.querySelector(`.grafana-row-checkbox[data-id="${id}"]`);
        if (cb) cb.checked = true;
    });
    if (isMasterChecked) {
        const master = document.getElementById('selectAllGrafana');
        if (master) master.checked = true;
    }

    const elGrafOpen = document.getElementById('grafUnifiedTotalOpen');
    const elUnack = document.getElementById('grafUnifiedUnack');
    const elAck = document.getElementById('grafUnifiedAck');
    const elVerify = document.getElementById('grafUnifiedVerify');
    const elVerifyWrap = document.getElementById('grafUnifiedVerifyWrap');

    if (elGrafOpen) elGrafOpen.innerText = countOpen;
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