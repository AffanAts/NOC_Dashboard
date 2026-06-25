/**
 * rvtools_manager.js
 * Engine Pembaca RVTOOLS Multi-File (Auto-Scan Directory)
 * Fitur: Multi-Tab, Per-Column Search, dan TAB MERGE (IP Aggregation)
 */

window.rvtoolsMaster = {};
window.activeTab = "";
window.columnFilters = {};
window.grafanaMonitoredIPs = new Set();
window.opmanagerMonitoredIPs = new Set();

const GRAFANA_LOGO_SVG = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style="width:14px; height:14px; vertical-align:middle; display:inline-block; flex-shrink:0;"><defs><linearGradient id="grafGrad2" x1="50%" y1="0%" x2="50%" y2="100%"><stop offset="0%" stop-color="#F05A28"/><stop offset="100%" stop-color="#FBCA0A"/></linearGradient></defs><path fill="url(#grafGrad2)" d="M245.477 105.469c-.43-4.586-1.262-9.852-2.852-15.621-1.59-5.77-4.012-12.043-7.469-18.617-3.453-6.578-7.945-13.453-13.738-20.078-2.27-2.617-4.766-5.18-7.484-7.687 4.078-16.184-4.918-30.117-4.918-30.117-15.555-.973-25.434 4.844-29.105 7.41-.621-.262-1.246-.547-1.879-.793-2.66-1.05-5.395-2.012-8.211-2.871-2.82-.855-5.71-1.609-8.687-2.253-2.973-.645-6.027-1.176-9.156-1.59-.547-.07-1.106-.137-1.668-.207-6.766-21.992-26.328-31.176-26.328-31.176C103.582-2.469 89.516 7.426 89.516 7.426c-3.043 2.137-5.703 4.418-8.121 6.781-1.094.184-2.215.398-3.371.652-1.594.355-3.219.781-4.871 1.27-1.652.488-3.34 1.043-5.043 1.668-3.418 1.254-6.875 2.793-10.348 4.582-3.477 1.79-6.969 3.836-10.4 6.156-.547.37-1.082.738-1.617 1.121C12.227 28.59 5.852 73.555 5.852 73.555c-3.992 21.984.652 35.703 5.945 43.652-1.094 3.063-2.105 6.215-2.957 9.504-.93 3.594-1.668 7.355-2.176 11.297C.207 154.488 7.512 174.07 7.512 174.07c2.156 13.422 7.508 23.93 14.879 32.262 1.234 1.394 2.535 2.722 3.882 4.012-.328 3.043-.512 6.144-.527 9.273-.012 3.566.184 7.137.605 10.598.422 3.46 1.07 6.82 1.93 10 .859 3.18 1.93 6.184 3.16 8.992.918 2.117 1.946 4.137 3.07 6.082 9.328 16.043 24.391 24.516 41.598 27.488 1.484.262 2.992.469 4.524.629a14.7 14.7 0 0 0 1.512.117c.039 0 .078.012.117.012 1.586.105 3.187.156 4.808.156 14.219 0 26.875-4.926 36.422-13.078 1.305-1.117 2.535-2.297 3.7-3.547 1.16-1.246 2.249-2.554 3.265-3.91 5.105-6.793 8.227-15.066 8.227-23.984 0-1.477-.082-2.937-.246-4.379a47.34 47.34 0 0 0-.66-4.07c2.21.625 4.527 1.066 6.93 1.293 1.273.121 2.566.18 3.879.18 13.066 0 25.359-5.703 33.66-15.969 4.598-5.687 7.434-12.61 8.18-19.875.121-1.18.183-2.379.183-3.582 0-1.27-.066-2.523-.199-3.762 3.598.512 7.367.781 11.273.781 13.418 0 26.328-3.16 37.484-10.453 21.844-14.273 30.219-43.832 30.219-43.832s3.293-19.297-.227-37.605z"/></svg>`;

const OPMANAGER_LOGO_SVG = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style="width:14px; height:14px; vertical-align:middle; display:inline-block; flex-shrink:0;"><rect width="256" height="256" rx="40" fill="#0a0e14"/><path fill="#f5a623" d="M88 168c-22 0-40-18-40-40 0-9 3-17 8-23 7 19 25 33 47 33h25c-7 18-25 30-40 30z"/><path fill="#5cb85c" d="M168 88c22 0 40 18 40 40 0 9-3 17-8 23-7-19-25-33-47-33h-25c7-18 25-30 40-30z"/><path fill="#d9534f" d="M88 88c22 0 40 18 40 40 0 22-18 40-40 40-22 0-40-18-40-40 0-22 18-40 40-40z" opacity="0.9"/></svg>`;

async function scanAndLoadRVTools() {
    const tableArea = document.getElementById('rvtoolsTableArea');

    try {
        const response = await fetch('Data_JSON/RVTOOLS/');
        if (!response.ok) throw new Error("Folder tidak ditemukan.");

        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        const links = Array.from(doc.querySelectorAll('a'));

        const csvFiles = links
            .map(a => decodeURIComponent(a.getAttribute('href')))
            .filter(href => href.toLowerCase().endsWith('.csv'));

        if (csvFiles.length === 0) {
            throw new Error("Folder ditemukan, tapi tidak ada file .csv di dalamnya.");
        }

        tableArea.innerHTML = `<div style="padding:30px; color:#58a6ff;">⏳ Ditemukan ${csvFiles.length} file CSV. Sedang membaca data...</div>`;

        // 1. BACA SEMUA FILE CSV
        for (let fileName of csvFiles) {
            await fetchAndParseCSV(fileName);
        }

        // 1.5 LOAD GRAFANA FILTER (IP yang terpantau)
        await loadGrafanaFilter();

        // 1.6 LOAD & MERGE OPMANAGER INVENTORY
        await loadAndMergeOpmanagerInventory();

        // 2. [BARU] BUAT TAB VIRTUAL UNTUK MERGE DATA
        generateMergedData();

        // 3. TAMPILKAN TAB & TABEL
        const allTabs = Object.keys(window.rvtoolsMaster);
        window.activeTab = 'RVTools Merge'; // Jadikan Tab Merge sebagai tampilan Default pertama (opsional, bisa diganti)

        renderTabs(allTabs);
        buildColumnToggles();
        renderRVToolsTable(); 

    } catch (error) {
        console.error(error);
        tableArea.innerHTML = `<div style="color:#f85149; padding:30px; font-size:14px;">❌ Gagal memuat data: ${error.message}<br><br>Pastikan Anda meletakkan file CSV RVTools ke dalam folder <b>Data_JSON/RVTOOLS/</b>.</div>`;
    }
}

async function fetchAndParseCSV(fileName) {
    const res = await fetch(`Data_JSON/RVTOOLS/${fileName}?t=${Date.now()}`);
    const text = await res.text();
    const lines = text.split('\n');
    if (lines.length < 2) return;

    let headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/"/g, '').trim());
    let idxIP = headers.findIndex(h => h.toLowerCase() === 'primary ip address');
    let idxVM = headers.findIndex(h => h.toLowerCase() === 'vm');
    let idxOSConfig = headers.findIndex(h => h.toLowerCase() === 'os according to the configuration file');

    let hidden = new Set();
    headers.forEach((_, idx) => {
        if (idx !== idxIP && idx !== idxVM && idx !== idxOSConfig) hidden.add(idx);
    });

    let arrayData = [];
    let dbData = {};

    for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        
        let cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, '').trim());
        
        if (idxIP !== -1 && idxVM !== -1) {
            let ipMain = (cols[idxIP] || "").split(/[\s,;]+/)[0]; 
            if (ipMain) dbData[ipMain] = { hostname: cols[idxVM], fullData: cols };
        }
        arrayData.push(cols);
    }

    window.rvtoolsMaster[fileName] = {
        headers: headers,
        array: arrayData,
        hidden: hidden,
        db: dbData
    };
    
    console.log(`✅ File ${fileName} dimuat: ${arrayData.length} baris.`);
}

// ==========================================
// LOAD GRAFANA FILTER (IP YANG TERPANTAU)
// ==========================================
async function loadGrafanaFilter() {
    try {
        const res = await fetch('Data_JSON/filter.json?t=' + Date.now());
        const data = await res.json();
        const allIPs = [...(data.v1 || []), ...(data.v2 || [])];
        allIPs.forEach(ip => window.grafanaMonitoredIPs.add(ip.trim()));
        console.log(`✅ Filter Grafana dimuat: ${window.grafanaMonitoredIPs.size} IP terpantau.`);
    } catch (e) {
        console.warn("⚠️ Gagal memuat filter.json:", e);
    }
}

// ==========================================
// LOAD & MERGE OPMANAGER INVENTORY
// ==========================================
async function loadAndMergeOpmanagerInventory() {
    try {
        const response = await fetch('Data_JSON/opmanager_inventory.json?t=' + Date.now());
        const data = await response.json();

        if (!data.rows || !Array.isArray(data.rows)) return;

        // Ubah opmanager data menjadi format CSV-like untuk rvtoolsMaster
        // Hanya ambil: IP Address dan Display Name
        let headers = ['Primary IP Address', 'VM', '_Source'];
        let arrayData = [];

        data.rows.forEach(item => {
            let ip = (item.ipaddress || '').trim();
            let row = [
                ip,
                item.displayName || item.deviceName || '',
                'OpManager'
            ];
            arrayData.push(row);
            if (ip) window.opmanagerMonitoredIPs.add(ip);
        });

        console.log(`✅ OpManager Monitor IPs: ${window.opmanagerMonitoredIPs.size} device.`);

        // Masukkan ke rvtoolsMaster sebagai tab baru
        window.rvtoolsMaster['OpManager Inventory'] = {
            headers: headers,
            array: arrayData,
            hidden: new Set(),
            db: {}
        };

        console.log(`✅ OpManager Inventory dimuat: ${arrayData.length} devices.`);
    } catch (error) {
        console.warn("⚠️ OpManager Inventory tidak ditemukan atau error:", error);
    }
}

// ==========================================
// [BARU] FUNGSI PENGGABUNGAN DATA (MERGE)
// ==========================================
function generateMergedData() {
    const ipMap = new Map(); // Map: IP -> {vmWithSource: [], sourceSet: Set}

    // Looping semua file yang sudah dibaca (Situs A, Site B, dsb, dan OpManager)
    for (let fileName in window.rvtoolsMaster) {
        let fileData = window.rvtoolsMaster[fileName];

        let idxIP = fileData.headers.findIndex(h => h.toLowerCase() === 'primary ip address');
        let idxVM = fileData.headers.findIndex(h => h.toLowerCase() === 'vm');
        let idxSource = fileData.headers.findIndex(h => h.toLowerCase() === '_source'); // Cek ada _Source field (OpManager)

        if (idxIP === -1 || idxVM === -1) continue; // Skip jika kolom hilang

        for (let row of fileData.array) {
            let rawIP = row[idxIP] || "";
            let ipMain = rawIP.split(/[\s,;]+/)[0].trim(); // Bersihkan IP
            let vmName = (row[idxVM] || "").trim();
            let source = (idxSource !== -1 && row[idxSource]) ? row[idxSource] : 'RVTools';

            if (ipMain && ipMain !== "") {
                if (!ipMap.has(ipMain)) {
                    ipMap.set(ipMain, { vmWithSource: [], sourceSet: new Set() });
                }
                if (vmName) {
                    ipMap.get(ipMain).vmWithSource.push({ vm: vmName, source: source });
                    ipMap.get(ipMain).sourceSet.add(source);
                }
            }
        }
    }

    // Ubah Map tadi menjadi bentuk Array yang siap digambar ke Tabel
    let mergedArray = [];
    for (let [ip, info] of ipMap.entries()) {
        let vmWithSourceList = info.vmWithSource;
        let sourceSet = info.sourceSet;

        const sourceLogos = {
            'OpManager': OPMANAGER_LOGO_SVG,
            'RVTools': GRAFANA_LOGO_SVG
        };

        // Tentukan apakah ada multi-source conflict (OpManager + RVTools di IP yang sama)
        let hasOpManager = sourceSet.has('OpManager');
        let hasRVTools = sourceSet.has('RVTools');
        let isMultiSource = (hasOpManager && hasRVTools);

        // Format setiap VM dengan logo sumbernya - hanya tampilkan logo jika:
        // 1. Item adalah OpManager (selalu tampilkan logo)
        // 2. Item adalah RVTools DAN ada multi-source conflict
        let vmStrings = vmWithSourceList.map(item => {
            let logo = '';
            if (item.source === 'OpManager') {
                // OpManager selalu pake logo
                logo = sourceLogos[item.source] || '';
            } else if (item.source === 'RVTools' && isMultiSource) {
                // RVTools hanya pake logo jika ada conflict dengan OpManager
                logo = sourceLogos[item.source] || '';
            }
            return `${item.vm}${logo}`;
        });

        let vmString = vmStrings.join(' / ');

        if (isMultiSource) {
            vmString = "⚠️ " + vmString;
        }

        // Badge Grafana (clickable jika ada di monitoring)
        const isMonitoredGrafana = window.grafanaMonitoredIPs.has(ip);
        const grafanaUrl = `https://grafana.example.com:3000/d/noc-dash-beta/noc-overview-v2?orgId=1&from=now-1h&to=now&timezone=browser&var-nodeip_green=$__all&var-nodename_green=$__all&var-nodeip_red=$__all&var-nodename_red=$__all&var-nodeip_all=${ip}&refresh=30s`;
        const grafanaBadge = isMonitoredGrafana
            ? `<button onclick="window.open('${grafanaUrl}','_blank')" title="Buka Grafana untuk ${ip}" style="display:inline-flex;align-items:center;gap:4px;background:#1a0d04;border:1px solid #f05a28;color:#f05a28;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:bold;font-family:inherit;transition:0.15s;" onmouseover="this.style.background='#f05a28';this.style.color='#fff';" onmouseout="this.style.background='#1a0d04';this.style.color='#f05a28';">${GRAFANA_LOGO_SVG} Grafana ↗</button>`
            : `<button onclick="window.open('${grafanaUrl}','_blank')" title="Tidak ada di filter Grafana, tapi bisa dibuka" style="display:inline-flex;align-items:center;gap:4px;background:transparent;border:1px solid #484f58;color:#484f58;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:bold;font-family:inherit;transition:0.15s;" onmouseover="this.style.borderColor='#8b949e';this.style.color='#8b949e';" onmouseout="this.style.borderColor='#484f58';this.style.color='#484f58';">${GRAFANA_LOGO_SVG} Grafana ↗</button>`;

        // Badge OpManager (clickable jika ada di inventory)
        const isMonitoredOPM = window.opmanagerMonitoredIPs.has(ip);
        const opmUrl = `https://opmanager.example.com:8060/apiclient/ember/index.jsp#/Inventory/Snapshot/MonitoringDevice/${ip}`;
        const opmBadge = isMonitoredOPM
            ? `<button onclick="window.open('${opmUrl}','_blank')" title="Buka OpManager untuk ${ip}" style="display:inline-flex;align-items:center;gap:4px;background:#0a1a0a;border:1px solid #5cb85c;color:#5cb85c;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:bold;font-family:inherit;transition:0.15s;" onmouseover="this.style.background='#5cb85c';this.style.color='#fff';" onmouseout="this.style.background='#0a1a0a';this.style.color='#5cb85c';">${OPMANAGER_LOGO_SVG} OpManager ↗</button>`
            : `<button onclick="window.open('${opmUrl}','_blank')" title="Tidak ada di inventory OpManager, tapi bisa dibuka" style="display:inline-flex;align-items:center;gap:4px;background:transparent;border:1px solid #484f58;color:#484f58;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:bold;font-family:inherit;transition:0.15s;" onmouseover="this.style.borderColor='#8b949e';this.style.color='#8b949e';" onmouseout="this.style.borderColor='#484f58';this.style.color='#484f58';">${OPMANAGER_LOGO_SVG} OpManager ↗</button>`;

        const monitoringCell = `<div style="display:flex;gap:5px;align-items:center;">${grafanaBadge}${opmBadge}</div>`;

        // Susun array: [IP, VM with Source Icons, Monitoring Status]
        mergedArray.push([ip, vmString, monitoringCell]);
    }

    // Sort by IP agar lebih rapi
    mergedArray.sort((a, b) => {
        let aIP = a[0].split('.').map(Number);
        let bIP = b[0].split('.').map(Number);
        for (let i = 0; i < 4; i++) {
            if (aIP[i] !== bIP[i]) return aIP[i] - bIP[i];
        }
        return 0;
    });

    // Simpan hasilnya sebagai "File" Tab Virtual di Master
    window.rvtoolsMaster['RVTools Merge'] = {
        headers: ['Primary IP Address', 'VM', 'Monitoring'],
        array: mergedArray,
        hidden: new Set(),
        db: {}
    };
}

// ==========================================
// KONTROL TAB & TAMPILAN
// ==========================================
function renderTabs(files) {
    const tabContainer = document.getElementById('rvtoolsTabs');
    if (!tabContainer) return;
    
    let html = '';
    files.forEach(file => {
        let isActive = file === window.activeTab;
        
        // Style Khusus untuk Tab Merge
        let isMergeTab = file === 'RVTools Merge';
        let bg = isActive ? (isMergeTab ? '#8957e5' : '#1f6feb') : '#21262d';
        let color = isActive ? 'white' : '#8b949e';
        let borderHighlight = isMergeTab && isActive ? 'border-top: 3px solid #d2a8ff;' : '';
        
        let displayName = isMergeTab ? "✨ MERGED (ALL SITES)" : file.replace(/RVTools-?/, '').replace('.csv', '');
        let icon = isMergeTab ? "🔗" : "📄";
        
        html += `<button onclick="switchTab('${file}')" style="background:${bg}; color:${color}; border:1px solid #30363d; border-bottom:none; ${borderHighlight} padding:8px 15px; border-radius:6px 6px 0 0; cursor:pointer; font-size:11px; font-weight:bold; transition:0.2s; white-space:nowrap;">${icon} ${displayName}</button>`;
    });
    tabContainer.innerHTML = html;
}

function switchTab(fileName) {
    window.activeTab = fileName;
    window.columnFilters = {};
    window.multiIpSet = null;
    window.multiIpOrderedList = [];
    renderTabs(Object.keys(window.rvtoolsMaster));
    buildColumnToggles();
    renderRVToolsTable();
}

// ==========================================
// KONTROL KOLOM (HIDE/SHOW)
// ==========================================
function buildColumnToggles() {
    const menu = document.getElementById('rvtoolsColMenu');
    if (!menu) return;

    let activeData = window.rvtoolsMaster[window.activeTab];
    if (!activeData) return;

    // Jika Tab Merge, sembunyikan menu Show/Hide All (karena memang cuma 2 kolom)
    if (window.activeTab === 'RVTools Merge') {
        menu.innerHTML = `<div style="color:#8b949e; font-size:11px; font-style:italic;">Kolom tidak dapat disembunyikan pada mode Merge.</div>`;
        return;
    }

    let html = '<div style="display:flex; gap:10px; width:100%; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid #30363d;">' +
               '<button onclick="showAllRVColumns()" style="background:#238636; color:white; border:none; padding:6px 12px; border-radius:3px; font-size:11px; cursor:pointer; font-weight:bold;">☑️ CHECK ALL</button>' +
               '<button onclick="hideAllRVColumns()" style="background:#da3633; color:white; border:none; padding:6px 12px; border-radius:3px; font-size:11px; cursor:pointer; font-weight:bold;">🔲 UNCHECK ALL</button>' +
               '</div>';

    activeData.headers.forEach((headerName, idx) => {
        let isChecked = !activeData.hidden.has(idx) ? 'checked' : '';
        let labelColor = (headerName.toLowerCase() === 'vm' || headerName.toLowerCase().includes('ip address')) ? '#58a6ff' : '#c9d1d9';
        let bgStyle = isChecked ? 'background:#21262d;' : 'background:#0d1117; opacity:0.6;';
        
        html += `
        <label style="display:flex; align-items:center; gap:5px; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer; border:1px solid #30363d; color:${labelColor}; ${bgStyle} transition:0.2s;">
            <input type="checkbox" ${isChecked} onchange="toggleRVColumn(${idx}, this.checked)" style="margin:0;"> 
            ${headerName || `Column ${idx+1}`}
        </label>`;
    });

    menu.innerHTML = html;
}

function showAllRVColumns() { window.rvtoolsMaster[window.activeTab].hidden.clear(); buildColumnToggles(); renderRVToolsTable(); }
function hideAllRVColumns() { 
    window.rvtoolsMaster[window.activeTab].headers.forEach((_, idx) => window.rvtoolsMaster[window.activeTab].hidden.add(idx)); 
    buildColumnToggles(); renderRVToolsTable(); 
}
function toggleRVColumn(idx, isVisible) {
    let hiddenSet = window.rvtoolsMaster[window.activeTab].hidden;
    if (isVisible) hiddenSet.delete(idx); else hiddenSet.add(idx);
    buildColumnToggles(); renderRVToolsTable(); 
}

// ==========================================
// MULTI-IP SEARCH (untuk tab DB Merged)
// ==========================================
window.multiIpSet = null;          // null = tidak aktif
window.multiIpOrderedList = [];    // urutan asli dari textarea

function _parseMultiIpInput(raw) {
    const lines = raw.split(/[\n,;]+/).map(l => l.trim().split(':')[0].trim()).filter(l => l.length > 0);
    if (lines.length === 0) return { set: null, ordered: [] };
    return { set: new Set(lines), ordered: lines }; // ordered boleh duplikat
}

window.applyMultiIpSearch = function() {
    const ta = document.getElementById('multiIpTextarea');
    if (!ta) return;
    const parsed = _parseMultiIpInput(ta.value);
    window.multiIpSet = parsed.set;
    window.multiIpOrderedList = parsed.ordered;
    const total = parsed.ordered.length;
    const unique = parsed.set ? parsed.set.size : 0;
    const lbl = document.getElementById('multiIpCount');
    if (lbl) lbl.innerText = total > 0 ? (total !== unique ? `${total} baris (${unique} IP unik)` : `${total} IP dicari`) : '';
    renderTableBodyOnly();
};

window.clearMultiIpSearch = function() {
    window.multiIpSet = null;
    window.multiIpOrderedList = [];
    const ta = document.getElementById('multiIpTextarea');
    if (ta) ta.value = '';
    const lbl = document.getElementById('multiIpCount');
    if (lbl) lbl.innerText = '';
    renderTableBodyOnly();
};

window.toggleMultiIpPanel = function() {
    const panel = document.getElementById('multiIpPanel');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (isOpen) window.clearMultiIpSearch();
};

// ==========================================
// RVTOOLS GRAFANA LAUNCHER (dari Multi-IP)
// ==========================================
window.openRvGrafanaLauncher = function() {
    // Kumpulkan IP dari multiIpOrderedList (kalau ada), fallback ke semua baris tabel
    const activeData = window.rvtoolsMaster[window.activeTab];
    const ipColIdx = activeData ? activeData.headers.findIndex(h => h.toLowerCase().includes('ip address')) : -1;

    let ipList = [];
    if (window.multiIpOrderedList && window.multiIpOrderedList.length > 0) {
        // Pakai urutan dari textarea, dedupe
        const seen = new Set();
        window.multiIpOrderedList.forEach(ip => { if (!seen.has(ip)) { seen.add(ip); ipList.push(ip); } });
    } else if (activeData && ipColIdx >= 0) {
        // Tidak ada multi-IP filter — ambil semua baris yang sedang tampil
        const seen = new Set();
        for (const cols of activeData.array) {
            const ip = (cols[ipColIdx] || '').split(':')[0].trim();
            if (ip && !seen.has(ip)) { seen.add(ip); ipList.push(ip); }
        }
    }

    if (ipList.length === 0) {
        alert('Tidak ada IP untuk diluncurkan.');
        return;
    }

    const oldModal = document.getElementById('rvGrafanaLauncherModal');
    if (oldModal) oldModal.remove();

    const GRAFANA_BASE = 'https://grafana.example.com:3000/d/noc-dash-beta/noc-overview-v2?orgId=1&from=now-1h&to=now&timezone=browser&var-nodeip_green=$__all&var-nodename_green=$__all&var-nodeip_red=$__all&var-nodename_red=$__all';

    // Pisahkan: ada di Grafana vs tidak
    const inGrafana = ipList.filter(ip => window.grafanaMonitoredIPs.has(ip));
    const notInGrafana = ipList.filter(ip => !window.grafanaMonitoredIPs.has(ip));

    function buildIpItem(ip, monitored) {
        const dotColor = monitored ? '#f05a28' : '#484f58';
        const textColor = monitored ? '#c9d1d9' : '#6e7681';
        const borderColor = monitored ? '#30363d' : '#21262d';
        const group = monitored ? 'in' : 'out';
        return `<label class="rv-launcher-item" data-group="${group}" style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:#010409;border:1px solid ${borderColor};border-radius:4px;cursor:pointer;transition:0.15s;">
            <input type="checkbox" value="${ip}" class="rv-launcher-cb" checked onchange="_rvLauncherUpdate()" style="cursor:pointer;width:13px;height:13px;accent-color:#58a6ff;">
            <span style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0;"></span>
            <span style="color:${textColor};font-size:11px;font-family:'JetBrains Mono',monospace;flex:1;">${ip}</span>
        </label>`;
    }

    function groupHeader(label, color, group, count) {
        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 2px;margin-top:${group==='in'?'2px':'8px'};">
            <span style="color:${color};font-size:10px;font-weight:700;letter-spacing:0.5px;flex:1;">${label} (${count})</span>
            <button onclick="_rvLauncherSelectGroup('${group}',true)" style="background:transparent;border:1px solid ${color};color:${color};padding:2px 7px;border-radius:3px;font-size:9px;cursor:pointer;opacity:0.8;" title="Pilih semua grup ini">☑</button>
            <button onclick="_rvLauncherSelectGroup('${group}',false)" style="background:transparent;border:1px solid #484f58;color:#484f58;padding:2px 7px;border-radius:3px;font-size:9px;cursor:pointer;opacity:0.8;" title="Hapus semua grup ini">☐</button>
        </div>`;
    }

    let listHtml = '';
    if (inGrafana.length > 0) {
        listHtml += groupHeader('● TERPANTAU GRAFANA', '#f05a28', 'in', inGrafana.length);
        listHtml += inGrafana.map(ip => buildIpItem(ip, true)).join('');
    }
    if (notInGrafana.length > 0) {
        listHtml += groupHeader('○ TIDAK DI GRAFANA', '#484f58', 'out', notInGrafana.length);
        listHtml += notInGrafana.map(ip => buildIpItem(ip, false)).join('');
    }

    const modalHTML = `
    <div id="rvGrafanaLauncherModal" style="position:fixed;z-index:30000;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;font-family:'Inter','Segoe UI',sans-serif;backdrop-filter:blur(3px);">
        <div style="background:#0d1117;width:720px;height:520px;border:1px solid #30363d;border-radius:10px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.95);">

            <div style="background:#161b22;padding:14px 20px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="color:#58a6ff;font-weight:700;font-size:14px;">🚀 GRAFANA IP LAUNCHER</span>
                    <span style="color:#484f58;font-size:11px;">dari Multi-IP Search</span>
                </div>
                <button onclick="document.getElementById('rvGrafanaLauncherModal').remove()" style="background:transparent;border:none;color:#f85149;cursor:pointer;font-size:22px;line-height:1;padding:0;">&times;</button>
            </div>

            <div style="display:flex;flex:1;overflow:hidden;">

                <!-- KIRI: DAFTAR IP -->
                <div style="flex:1;border-right:1px solid #30363d;display:flex;flex-direction:column;">
                    <div style="padding:10px;border-bottom:1px solid #21262d;display:flex;gap:6px;align-items:center;">
                        <input type="text" id="rvLauncherSearch" placeholder="🔍 Cari IP..." oninput="_rvLauncherFilter(this.value)"
                            style="flex:1;padding:6px 8px;background:#010409;border:1px solid #30363d;color:#c9d1d9;border-radius:4px;outline:none;font-size:11px;">
                        <button onclick="_rvLauncherSelectAll(true)" style="background:transparent;border:1px solid #3fb950;color:#3fb950;padding:4px 8px;border-radius:4px;font-size:10px;cursor:pointer;white-space:nowrap;">☑ Semua</button>
                        <button onclick="_rvLauncherSelectAll(false)" style="background:transparent;border:1px solid #484f58;color:#484f58;padding:4px 8px;border-radius:4px;font-size:10px;cursor:pointer;white-space:nowrap;">☐ Hapus</button>
                    </div>
                    <div id="rvLauncherIpList" style="flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:4px;">
                        ${listHtml}
                    </div>
                </div>

                <!-- KANAN: AKSI -->
                <div style="width:200px;padding:18px 16px;display:flex;flex-direction:column;gap:12px;background:#161b22;">
                    <div style="text-align:center;padding-bottom:10px;border-bottom:1px solid #30363d;">
                        <div style="color:#f1e05a;font-weight:700;font-size:26px;" id="rvLauncherCount">${ipList.length}</div>
                        <div style="color:#8b949e;font-size:11px;">IP Terpilih</div>
                    </div>

                    <button id="rvBtnAll" onclick="_rvLauncherLaunch('')"
                        style="background:#2ea043;border:1px solid #3fb950;color:white;padding:11px 10px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:0.15s;"
                        onmouseover="this.style.background='#3fb950'" onmouseout="this.style.background='#2ea043'">
                        <span>📊 ALL PANELS</span><span>↗</span>
                    </button>
                    <button id="rvBtnAva" onclick="_rvLauncherLaunch('&viewPanel=panel-72')"
                        style="background:#21262d;border:1px solid #30363d;color:#c9d1d9;padding:11px 10px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:0.15s;"
                        onmouseover="this.style.background='#2ea043';this.style.borderColor='#3fb950'" onmouseout="this.style.background='#21262d';this.style.borderColor='#30363d'">
                        <span>🟢 AVAILABILITY</span><span>↗</span>
                    </button>
                    <button id="rvBtnCpu" onclick="_rvLauncherLaunch('&viewPanel=panel-59')"
                        style="background:#21262d;border:1px solid #1f6feb;color:#58a6ff;padding:11px 10px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:0.15s;"
                        onmouseover="this.style.background='#1f6feb';this.style.color='#fff'" onmouseout="this.style.background='#21262d';this.style.color='#58a6ff'">
                        <span>⚙️ CPU ONLY</span><span>↗</span>
                    </button>
                    <button id="rvBtnMem" onclick="_rvLauncherLaunch('&viewPanel=panel-60')"
                        style="background:#21262d;border:1px solid #a371f7;color:#d2a8ff;padding:11px 10px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:0.15s;"
                        onmouseover="this.style.background='#a371f7';this.style.color='#fff'" onmouseout="this.style.background='#21262d';this.style.color='#d2a8ff'">
                        <span>🧠 MEMORY ONLY</span><span>↗</span>
                    </button>

                    <div style="margin-top:auto;font-size:10px;color:#484f58;text-align:center;font-style:italic;line-height:1.4;">
                        ● terpantau Grafana<br>○ tidak terpantau
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window._rvLauncherUpdate = function() {
    const count = document.querySelectorAll('.rv-launcher-cb:checked').length;
    const el = document.getElementById('rvLauncherCount');
    if (el) el.innerText = count;
};

window._rvLauncherFilter = function(q) {
    q = q.toLowerCase();
    document.querySelectorAll('.rv-launcher-item').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(q) ? 'flex' : 'none';
    });
};

window._rvLauncherSelectAll = function(checked) {
    document.querySelectorAll('.rv-launcher-cb').forEach(cb => {
        const item = cb.closest('.rv-launcher-item');
        if (!item || item.style.display !== 'none') cb.checked = checked;
    });
    window._rvLauncherUpdate();
};

window._rvLauncherSelectGroup = function(group, checked) {
    document.querySelectorAll(`.rv-launcher-item[data-group="${group}"]`).forEach(item => {
        if (item.style.display !== 'none') {
            const cb = item.querySelector('.rv-launcher-cb');
            if (cb) cb.checked = checked;
        }
    });
    window._rvLauncherUpdate();
};

window._rvLauncherLaunch = function(panelParam) {
    const cbs = document.querySelectorAll('.rv-launcher-cb:checked');
    if (cbs.length === 0) { alert('Pilih minimal 1 IP.'); return; }
    let ipParams = '';
    cbs.forEach(cb => { ipParams += `&var-nodeip_all=${cb.value}`; });
    const url = `https://grafana.example.com:3000/d/noc-dash-beta/noc-overview-v2?orgId=1&from=now-1h&to=now&timezone=browser&var-nodeip_green=$__all&var-nodename_green=$__all&var-nodeip_red=$__all&var-nodename_red=$__all${ipParams}${panelParam}&refresh=30s`;
    window.open(url, '_blank');
};

// ==========================================
// OPEN ALL LINKS (Grafana & OpManager)
// ==========================================
window.openAllMonitorLinks = function(service, monitoredOnly) {
    const ipList = window.multiIpOrderedList && window.multiIpOrderedList.length > 0
        ? [...new Set(window.multiIpOrderedList)]
        : (() => {
            const activeData = window.rvtoolsMaster[window.activeTab];
            const ipColIdx = activeData ? activeData.headers.findIndex(h => h.toLowerCase().includes('ip address')) : -1;
            if (!activeData || ipColIdx < 0) return [];
            const seen = new Set();
            return activeData.array.reduce((arr, cols) => {
                const ip = (cols[ipColIdx] || '').split(':')[0].trim();
                if (ip && !seen.has(ip)) { seen.add(ip); arr.push(ip); }
                return arr;
            }, []);
        })();

    const filtered = ipList.filter(ip =>
        monitoredOnly
            ? (service === 'grafana' ? window.grafanaMonitoredIPs.has(ip) : window.opmanagerMonitoredIPs.has(ip))
            : (service === 'grafana' ? !window.grafanaMonitoredIPs.has(ip) : !window.opmanagerMonitoredIPs.has(ip))
    );

    if (filtered.length === 0) { alert('Tidak ada IP yang cocok.'); return; }

    if (service === 'grafana') {
        // Grafana: satu tab, semua IP dalam satu URL (seperti Launcher)
        const ipParams = filtered.map(ip => `&var-nodeip_all=${ip}`).join('');
        const url = `https://grafana.example.com:3000/d/noc-dash-beta/noc-overview-v2?orgId=1&from=now-1h&to=now&timezone=browser&var-nodeip_green=$__all&var-nodename_green=$__all&var-nodeip_red=$__all&var-nodename_red=$__all${ipParams}&refresh=30s`;
        window.open(url, '_blank');
    } else {
        // OPM: buka banyak tab dengan delay
        if (filtered.length > 20) {
            if (!confirm(`Akan membuka ${filtered.length} tab sekaligus. Lanjutkan?`)) return;
        }
        filtered.forEach((ip, i) => {
            setTimeout(() => {
                const url = `https://opmanager.example.com:8060/apiclient/ember/index.jsp#/Inventory/Snapshot/MonitoringDevice/${ip}`;
                const a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.rel = 'noopener';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }, i * 150);
        });
    }
};

// ==========================================
// COPY MONITORING STATUS (True/False)
// ==========================================
window.copyMonitoringStatus = function(service) {
    const activeData = window.rvtoolsMaster[window.activeTab];
    if (!activeData) return;

    const ipColIdx = activeData.headers.findIndex(h => h.toLowerCase().includes('ip address'));
    if (ipColIdx < 0) return;

    // Pakai urutan multiIpOrderedList kalau aktif, fallback ke semua baris
    let ipList;
    if (window.multiIpOrderedList && window.multiIpOrderedList.length > 0) {
        ipList = window.multiIpOrderedList;
    } else {
        const seen = new Set();
        ipList = [];
        for (const cols of activeData.array) {
            const ip = (cols[ipColIdx] || '').split(':')[0].trim();
            if (ip && !seen.has(ip)) { seen.add(ip); ipList.push(ip); }
        }
    }

    const monitoredSet = service === 'grafana' ? window.grafanaMonitoredIPs : window.opmanagerMonitoredIPs;
    const lines = ipList.map(ip => monitoredSet.has(ip) ? 'True' : 'False');
    const text = lines.join('\n');

    navigator.clipboard.writeText(text).then(() => {
        const btnText = service === 'grafana' ? '📋 Grafana' : '📋 OPM';
        const doneText = '✅ Copied!';
        // Flash feedback pada tombol yang diklik
        const btns = document.querySelectorAll('button');
        btns.forEach(b => {
            if (b.innerText.trim() === btnText) {
                const orig = b.innerText;
                b.innerText = doneText;
                setTimeout(() => { b.innerText = orig; }, 1500);
            }
        });
    }).catch(() => {
        // Fallback: textarea select
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    });
};

// ==========================================
// FUNGSI PENCARIAN PER KOLOM
// ==========================================
function updateColumnFilter(idx, value) {
    window.columnFilters[idx] = value.toLowerCase();
    renderTableBodyOnly();
}

// ==========================================
// RENDER KERANGKA TABEL UTAMA
// ==========================================
function renderRVToolsTable() {
    const tableArea = document.getElementById('rvtoolsTableArea');
    let activeData = window.rvtoolsMaster[window.activeTab];
    if (!activeData || activeData.array.length === 0) return;

    // Inject panel Multi-IP search di tab Merged
    let multiIpHtml = '';
    if (window.activeTab === 'RVTools Merge') {
        const savedText = document.getElementById('multiIpTextarea')?.value || '';
        const savedCount = window.multiIpSet ? window.multiIpSet.size : 0;
        multiIpHtml = `
        <div style="background:#11161d; border:1px solid #30363d; border-radius:8px; padding:12px 16px; margin-bottom:10px; display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap;">
            <div style="flex:1; min-width:260px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                    <span style="color:#58a6ff; font-weight:700; font-size:11px;">🔍 MULTI-IP SEARCH</span>
                    <span id="multiIpCount" style="color:#3fb950; font-size:10px; font-weight:600;">${savedCount > 0 ? savedCount + ' IP dicari' : ''}</span>
                </div>
                <textarea id="multiIpTextarea" rows="5" placeholder="Paste IP di sini, satu per baris:&#10;10.30.0.21&#10;10.30.0.22&#10;10.30.0.23&#10;(port :9100 otomatis diabaikan)"
                    style="width:100%; box-sizing:border-box; background:#010409; color:#c9d1d9; border:1px solid #30363d; border-radius:4px; padding:8px; font-size:11px; font-family:'JetBrains Mono',monospace; resize:vertical; outline:none; line-height:1.5;"
                    oninput="window.applyMultiIpSearch()">${savedText}</textarea>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; padding-top:22px;">
                <button onclick="window.openRvGrafanaLauncher()" style="background:#1a0d04; border:1px solid #f05a28; color:#f05a28; font-size:10px; font-weight:700; padding:5px 12px; border-radius:4px; cursor:pointer; white-space:nowrap;" onmouseover="this.style.background='#f05a28';this.style.color='#fff'" onmouseout="this.style.background='#1a0d04';this.style.color='#f05a28'">🚀 Grafana Launcher</button>
                <div style="border-top:1px solid #21262d; padding-top:6px; display:flex; flex-direction:column; gap:4px;">
                    <div style="color:#484f58; font-size:9px; font-weight:700; letter-spacing:0.4px; padding-bottom:2px;">BUKA SEMUA TAB</div>
                    <button onclick="window.openAllMonitorLinks('grafana',true)" style="background:transparent; border:1px solid #f05a28; color:#f05a28; font-size:10px; padding:4px 10px; border-radius:4px; cursor:pointer; white-space:nowrap; text-align:left;" onmouseover="this.style.background='#f05a28';this.style.color='#fff'" onmouseout="this.style.background='transparent';this.style.color='#f05a28'">● Grafana ada</button>
                    <button onclick="window.openAllMonitorLinks('grafana',false)" style="background:transparent; border:1px solid #484f58; color:#6e7681; font-size:10px; padding:4px 10px; border-radius:4px; cursor:pointer; white-space:nowrap; text-align:left;" onmouseover="this.style.borderColor='#8b949e';this.style.color='#8b949e'" onmouseout="this.style.borderColor='#484f58';this.style.color='#6e7681'">○ Grafana tidak ada</button>
                    <button onclick="window.openAllMonitorLinks('opm',true)" style="background:transparent; border:1px solid #5cb85c; color:#5cb85c; font-size:10px; padding:4px 10px; border-radius:4px; cursor:pointer; white-space:nowrap; text-align:left;" onmouseover="this.style.background='#5cb85c';this.style.color='#fff'" onmouseout="this.style.background='transparent';this.style.color='#5cb85c'">● OPM ada</button>
                    <button onclick="window.openAllMonitorLinks('opm',false)" style="background:transparent; border:1px solid #484f58; color:#6e7681; font-size:10px; padding:4px 10px; border-radius:4px; cursor:pointer; white-space:nowrap; text-align:left;" onmouseover="this.style.borderColor='#8b949e';this.style.color='#8b949e'" onmouseout="this.style.borderColor='#484f58';this.style.color='#6e7681'">○ OPM tidak ada</button>
                </div>
                <button onclick="window.clearMultiIpSearch()" style="background:transparent; border:1px solid #30363d; color:#8b949e; font-size:10px; padding:5px 12px; border-radius:4px; cursor:pointer; white-space:nowrap;" onmouseover="this.style.borderColor='#f85149';this.style.color='#f85149'" onmouseout="this.style.borderColor='#30363d';this.style.color='#8b949e'">✕ Clear</button>
            </div>
        </div>`;
    }

    if (activeData.hidden.size === activeData.headers.length) {
        tableArea.innerHTML = `<div style="padding:30px; color:#8b949e; font-size:14px; text-align:center;">👻 Semua kolom disembunyikan. Silakan pilih kolom dari menu HIDE / SHOW COLUMNS di atas.</div>`;
        return;
    }

    let html = `<table style="border-collapse: collapse; white-space: nowrap; font-size: 12px; text-align: left; margin: 0; min-width: 100%;">
        <thead style="background: #21262d; position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
            <tr>`;

    activeData.headers.forEach((headerName, idx) => {
        if (!activeData.hidden.has(idx)) {
            let hColor = (headerName.toLowerCase() === 'vm' || headerName.toLowerCase().includes('ip address')) ? '#58a6ff' : '#8b949e';
            let extraBtn = '';
            if (headerName === 'Monitoring' && window.activeTab === 'RVTools Merge') {
                extraBtn = `<div style="display:flex;gap:4px;margin-top:5px;">
                    <button onclick="window.copyMonitoringStatus('grafana')" style="background:transparent;border:1px solid #f05a28;color:#f05a28;padding:2px 7px;border-radius:3px;font-size:9px;cursor:pointer;font-weight:700;" onmouseover="this.style.background='#f05a28';this.style.color='#fff'" onmouseout="this.style.background='transparent';this.style.color='#f05a28'" title="Copy IP + status Grafana (True/False)">📋 Grafana</button>
                    <button onclick="window.copyMonitoringStatus('opm')" style="background:transparent;border:1px solid #5cb85c;color:#5cb85c;padding:2px 7px;border-radius:3px;font-size:9px;cursor:pointer;font-weight:700;" onmouseover="this.style.background='#5cb85c';this.style.color='#fff'" onmouseout="this.style.background='transparent';this.style.color='#5cb85c'" title="Copy IP + status OpManager (True/False)">📋 OPM</button>
                </div>`;
            }
            html += `<th style="padding: 10px 15px 5px 15px; border-right: 1px solid #30363d; color: ${hColor}; font-weight: bold;">${headerName}${extraBtn}</th>`;
        }
    });
    html += `</tr><tr>`;

    activeData.headers.forEach((_, idx) => {
        if (!activeData.hidden.has(idx)) {
            let currentFilterVal = window.columnFilters[idx] || "";
            html += `<th style="padding: 0 10px 10px 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #58a6ff;">
                        <input type="text" placeholder="🔍 Filter..." value="${currentFilterVal}"
                               oninput="updateColumnFilter(${idx}, this.value)"
                               style="width: 100%; box-sizing: border-box; background: #010409; color: #c9d1d9; border: 1px solid #30363d; border-radius: 3px; padding: 4px; font-size: 10px; outline: none;">
                     </th>`;
        }
    });

    html += `</tr></thead><tbody id="rvtoolsTbody"></tbody></table>`;
    tableArea.innerHTML = multiIpHtml + html;

    renderTableBodyOnly();
}

// ==========================================
// RENDER ISI TABEL SAJA (FAST RENDERING)
// ==========================================
function renderTableBodyOnly() {
    const tbody = document.getElementById('rvtoolsTbody');
    if (!tbody) return;

    let activeData = window.rvtoolsMaster[window.activeTab];
    let html = '';
    let renderCount = 0;
    const MAX_RENDER = 1000;

    // Cari index kolom IP untuk filter multi-IP
    const ipColIdx = activeData.headers.findIndex(h => h.toLowerCase().includes('ip address'));

    function _renderRow(cols) {
        let rowHtml = `<tr style="background: #0d1117; transition: 0.1s;" onmouseover="this.style.background='#161b22'" onmouseout="this.style.background='#0d1117'">`;
        cols.forEach((val, idx) => {
            if (!activeData.hidden.has(idx)) {
                let cellColor = '#c9d1d9';
                let cellBg = 'transparent';
                if (val.toLowerCase() === 'poweredon') cellColor = '#3fb950';
                else if (val.toLowerCase() === 'poweredoff') cellColor = '#f85149';
                else if (val === '0' || val === 'False') cellColor = '#8b949e';
                else if (val.includes('⚠️ [SHARED IP]')) cellColor = '#f1e05a';
                else if (val.includes('🖥️')) cellColor = '#1f6feb';
                rowHtml += `<td style="padding: 8px 15px; border-right: 1px solid #30363d; border-bottom: 1px solid #21262d; color: ${cellColor}; background: ${cellBg};">${val}</td>`;
            }
        });
        rowHtml += `</tr>`;
        return rowHtml;
    }

    // Jika multi-IP aktif: tampilkan sesuai URUTAN IP di textarea
    if (window.multiIpSet && window.multiIpSet.size > 0 && window.multiIpOrderedList && window.multiIpOrderedList.length > 0) {
        // Buat index: IP -> array of rows
        const ipToRows = new Map();
        for (let i = 0; i < activeData.array.length; i++) {
            const cols = activeData.array[i];
            const rowIp = ipColIdx >= 0 ? (cols[ipColIdx] || '').split(':')[0].trim() : '';
            if (!window.multiIpSet.has(rowIp)) continue;

            // Cek column filter juga
            let isMatch = true;
            for (let filterIdx in window.columnFilters) {
                let filterText = window.columnFilters[filterIdx];
                if (filterText && filterText !== "") {
                    let cellValue = (cols[filterIdx] || "").toLowerCase();
                    if (!cellValue.includes(filterText)) { isMatch = false; break; }
                }
            }
            if (!isMatch) continue;

            if (!ipToRows.has(rowIp)) ipToRows.set(rowIp, []);
            ipToRows.get(rowIp).push(cols);
        }

        // Render dalam urutan textarea (duplikat ditampilkan ulang)
        for (const ip of window.multiIpOrderedList) {
            const rows = ipToRows.get(ip);
            if (!rows) {
                // IP tidak ditemukan — tampilkan baris "not found"
                const colSpan = activeData.headers.length - activeData.hidden.size;
                html += `<tr style="background:#0d1117;"><td colspan="${colSpan}" style="padding:6px 15px; border-bottom:1px solid #21262d; color:#484f58; font-style:italic; font-size:11px;">— ${ip} tidak ditemukan</td></tr>`;
                renderCount++;
            } else {
                for (const cols of rows) {
                    html += _renderRow(cols);
                    renderCount++;
                    if (renderCount >= MAX_RENDER) break;
                }
            }
            if (renderCount >= MAX_RENDER) break;
        }
    } else {
        // Mode normal: urutan dari array
        for (let i = 0; i < activeData.array.length; i++) {
            const cols = activeData.array[i];

            if (window.multiIpSet && window.multiIpSet.size > 0) {
                const rowIp = ipColIdx >= 0 ? (cols[ipColIdx] || '').split(':')[0].trim() : '';
                if (!window.multiIpSet.has(rowIp)) continue;
            }

            let isMatch = true;
            for (let filterIdx in window.columnFilters) {
                let filterText = window.columnFilters[filterIdx];
                if (filterText && filterText !== "") {
                    let cellValue = (cols[filterIdx] || "").toLowerCase();
                    if (!cellValue.includes(filterText)) { isMatch = false; break; }
                }
            }
            if (!isMatch) continue;

            html += _renderRow(cols);
            renderCount++;
            if (renderCount >= MAX_RENDER) break;
        }
    }

    if (renderCount === 0) {
        html += `<tr><td colspan="${activeData.headers.length - activeData.hidden.size}" style="text-align: center; padding: 20px; color: #f85149; font-style: italic;">
            Pencarian tidak menemukan hasil.
        </td></tr>`;
    } else if (renderCount >= MAX_RENDER) {
        html += `<tr><td colspan="${activeData.headers.length - activeData.hidden.size}" style="text-align: center; padding: 15px; color: #8b949e; background: #010409;">
            <i>... Menampilkan ${MAX_RENDER} baris teratas yang cocok. Sempitkan pencarian Anda untuk melihat sisanya ...</i></td></tr>`;
    }

    tbody.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', scanAndLoadRVTools);