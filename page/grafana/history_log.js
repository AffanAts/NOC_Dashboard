/**
 * history_log.js - Terminal Console Version
 * Update: Ultra-Lightweight, Terminal UI, Anti-Lag, Direct JSON Fetch, Logic Tag Khusus Nina & Idham.
 */

function createLogModal() {
    const oldModal = document.getElementById('logModal');
    if(oldModal) oldModal.remove();

    const modalHTML = `
    <div id="logModal" style="display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); font-family: 'Consolas', 'Monaco', monospace;">
        <div style="width: 90%; max-width: 1200px; height: 90%; margin: 2% auto; background: #010409; border: 1px solid #30363d; border-radius: 6px; display: flex; flex-direction: column; box-shadow: 0 0 20px rgba(0,0,0,0.8);">
            
            <div style="padding: 10px 15px; background: #161b22; border-bottom: 1px solid #30363d; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #3fb950; font-size: 13px; font-weight: bold;">>_ SYSTEM_EVENT_LOG</span>
                
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="logSearchIP" placeholder="Filter IP / Host..." 
                        style="background: #0d1117; border: 1px solid #30363d; color: #3fb950; padding: 4px 10px; border-radius: 3px; font-size: 12px; width: 200px; outline: none;">
                    <button onclick="closeLog()" style="background: #da3633; border: none; color: white; padding: 4px 12px; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 12px;">EXIT</button>
                </div>
            </div>

            <div id="logBody" style="flex: 1; overflow-y: auto; padding: 15px; background: #010409; color: #8b949e; font-size: 11.5px; line-height: 1.6;">
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function copyLogWA(btn, logData, hName, limit) {
    const typeUpper = logData.type.toUpperCase();
    let module = "Device Status";
    if (typeUpper.includes("CPU")) module = "CPU";
    else if (typeUpper.includes("MEMORY") || typeUpper.includes("MEM")) module = "Memory";
    else if (typeUpper.includes("AVAILABILITY")) module = "Availability";

    const cleanIPForWA = logData.ip.replace(':9100', '');
    const isPriority = (typeof globalFilterData !== 'undefined' && globalFilterData && globalFilterData.priority && globalFilterData.priority.includes(cleanIPForWA));

    // DAFTAR IP KHUSUS UNTUK Nina & IDHAM
    const annisaIPs = [
        "10.30.0.5", "10.30.0.6", "10.30.0.7", "10.30.0.8",
        "10.30.0.9", "10.30.0.10", "10.30.0.11", "10.30.0.12", "10.30.0.13"
    ];
    
    const idhamIPs = [
        "10.30.0.3", "10.30.0.3:10100", "10.30.0.14", "10.30.0.15", "10.30.0.16"
    ];

    let tagsSet = new Set();
    const TAGS = { Giri: "Eng @Giri", Dana: "Eng @Dana", Nina: "Eng @Nina", Sam: "Eng @Sam", John: "Eng @John", IDHAM: "Eng @Idham" };
    
    // Tag Dasar
    tagsSet.add(TAGS.Giri);
    tagsSet.add(TAGS.Dana);
    tagsSet.add(TAGS.Sam);
    tagsSet.add(TAGS.John);
    
    // Logika Khusus Nina
    if (annisaIPs.includes(cleanIPForWA) || annisaIPs.includes(logData.ip)) {
        tagsSet.add(TAGS.Nina);
    }
    
    // Logika Khusus Idham
    if (idhamIPs.includes(cleanIPForWA) || idhamIPs.includes(logData.ip)) {
        tagsSet.add(TAGS.IDHAM);
    }

    let tags = Array.from(tagsSet).join('\n');
    if (isPriority) { tags = "Tim @Helpdesk\n" + tags; }

    const msg = `Dear Team\n${tags}\n\nKami informasikan bahwa saat ini ${module} more than ${limit}%\n\n* ${cleanIPForWA} - [${hName}]\n\nBerdasarkan monitoring Grafana.\nMohon bantuannya untuk dilakukan pengecekan lebih lanjut.\n\nTerima kasih.`;

    navigator.clipboard.writeText(msg).then(() => {
        const original = btn.innerText;
        btn.innerText = "[COPIED]";
        btn.style.color = "#3fb950";
        setTimeout(() => {
            btn.innerText = original;
            btn.style.color = "#58a6ff";
        }, 1000);
    });
}

async function openLog() {
    createLogModal();
    const modal = document.getElementById('logModal');
    const body = document.getElementById('logBody');
    const searchInput = document.getElementById('logSearchIP');
    
    const currentFilter = document.getElementById('masterFilter') ? document.getElementById('masterFilter').value : 'all';
    modal.style.display = 'block';
    body.innerHTML = '<div style="color: #8b949e;">> Fetching log streams...</div>';

    try {
        const [respLog, respFilter, respRVTools] = await Promise.all([
            fetch('Data_JSON/history_log.json?t=' + Date.now()),
            fetch('Data_JSON/filter.json?t=' + Date.now()),
            fetch('Data_JSON/RVTOOLS.json?t=' + Date.now()).catch(() => null) 
        ]);

        const logs = await respLog.json();
        const filterData = await respFilter.json();
        const appIPs = filterData.app_level || [];
        
        let rvtoolsKamus = {};
        if (respRVTools && respRVTools.ok) {
            rvtoolsKamus = await respRVTools.json();
        }
        
        const refreshTable = (keyword = "") => {
            const lowKey = keyword.toLowerCase();
            const filteredLogs = logs.filter(log => {
                const cleanIP = (log.ip && log.ip.includes(':')) ? log.ip.split(':')[0] : log.ip;
                
                // [PERBAIKAN] Mengambil properti .VM dari struktur objek RVTOOLS
                let hName = "";
                if (rvtoolsKamus[cleanIP]) {
                    hName = rvtoolsKamus[cleanIP].VM || "";
                }
                
                const matchesGroup = (currentFilter === 'all') || (filterData[currentFilter] && filterData[currentFilter].includes(cleanIP));
                const matchesSearch = log.ip.toLowerCase().includes(lowKey) || hName.toLowerCase().includes(lowKey);
                
                return matchesGroup && matchesSearch;
            });

            filteredLogs.sort((a, b) => new Date(b.time.replace(/-/g, '/')) - new Date(a.time.replace(/-/g, '/')));

            if (filteredLogs.length === 0) {
                body.innerHTML = `<div style="color: #ff7b72;">> No matching logs found.</div>`;
                return;
            }

            const maxRender = Math.min(filteredLogs.length, 150);
            let htmlContent = "";

            for (let i = 0; i < maxRender; i++) {
                const log = filteredLogs[i];
                const cleanIP = (log.ip && log.ip.includes(':')) ? log.ip.split(':')[0] : log.ip;
                
                // [PERBAIKAN] Mengambil properti .VM
                let hName = "Unknown";
                if (rvtoolsKamus[cleanIP] && rvtoolsKamus[cleanIP].VM) {
                    hName = rvtoolsKamus[cleanIP].VM;
                }
                
                const type = (log.type || "").toUpperCase();
                const limit = appIPs.includes(cleanIP) ? 60 : 70;

                let stCol = "#c9d1d9"; 
                let showWA = false;

                if (type.includes('DOWN') || type.includes('CRIT') || type.includes('HIGH')) {
                    stCol = "#ff7b72"; showWA = true;
                } else if (type.includes('NORMAL')) {
                    stCol = "#3fb950";
                } else if (type.includes('WARN')) {
                    stCol = "#d29922";
                }

                // Escape tanda kutip tunggal pada hName agar tidak mematahkan fungsi onClick HTML
                const safeHName = hName.replace(/'/g, "\\'");
                const waBtn = showWA ? `<span onclick='copyLogWA(this, ${JSON.stringify(log)}, "${safeHName}", ${limit})' style="color:#58a6ff; cursor:pointer; text-decoration:none; font-weight:bold; margin-left:10px;">[WA]</span>` : "";

                htmlContent += `
                    <div style="display: flex; border-bottom: 1px dashed #21262d; padding: 6px 0;">
                        <span style="color: #8b949e; width: 140px; flex-shrink: 0;">[${log.time}]</span>
                        <span style="color: #c9d1d9; width: 140px; flex-shrink: 0; font-weight: bold;">${log.ip}</span>
                        <span style="color: #8b949e; width: 220px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${hName}</span>
                        <span style="color: ${stCol}; flex: 1;">${log.type} ${waBtn}</span>
                    </div>
                `;
            }

            if (filteredLogs.length > 150) {
                htmlContent += `<div style="color: #8b949e; padding-top: 10px; font-style: italic;">> Showing latest 150 logs. ${filteredLogs.length - 150} older logs hidden to prevent UI lag.</div>`;
            }

            body.innerHTML = htmlContent;
        };

        refreshTable();
        searchInput.oninput = () => refreshTable(searchInput.value.trim());
        searchInput.focus();

    } catch(e) {
        body.innerHTML = `<div style="color: #ff7b72;">> ERROR: Failed to load log streams.</div>`;
    }
}

function closeLog() { 
    const modal = document.getElementById('logModal');
    if(modal) modal.style.display = 'none'; 
}