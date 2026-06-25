/**
 * grafana_launcher.js
 * Fitur: Modal mandiri untuk mencari IP dan membukanya di Grafana.
 * Membaca data IP dari globalFilterData atau globalHistoryData.
 */

// Menyimpan daftar IP unik yang tersedia di sistem
let availableIpsForLauncher = [];

function extractAllAvailableIps() {
    let ips = new Set();
    
    // Tarik IP dari Filter Data
    if (typeof globalFilterData !== 'undefined' && globalFilterData) {
        if (globalFilterData.v1) globalFilterData.v1.forEach(ip => ips.add(ip.trim()));
        if (globalFilterData.v2) globalFilterData.v2.forEach(ip => ips.add(ip.trim()));
        if (globalFilterData.app_level) globalFilterData.app_level.forEach(ip => ips.add(ip.trim()));
        if (globalFilterData.priority) globalFilterData.priority.forEach(ip => ips.add(ip.trim()));
    }

    // Tarik IP dari log history Grafana (kalau ada)
    if (typeof window.rawGrafanaData !== 'undefined' && window.rawGrafanaData) {
        window.rawGrafanaData.forEach(t => {
            if (t.ip) ips.add(t.ip.split(':')[0].trim());
        });
    }

    // Tarik IP dari tiket OpManager (kalau ada)
    if (typeof window.rawOpmData !== 'undefined' && window.rawOpmData) {
        window.rawOpmData.forEach(t => {
            if (t.ip) ips.add(t.ip.split(':')[0].trim());
        });
    }

    availableIpsForLauncher = Array.from(ips).filter(ip => ip !== "" && ip !== "null").sort();
}

function openStandaloneGrafanaLauncher() {
    extractAllAvailableIps();

    const oldModal = document.getElementById('standaloneGrafanaLauncherModal');
    if (oldModal) oldModal.remove();

    let listHtml = '';
    if (availableIpsForLauncher.length === 0) {
        listHtml = `<div style="color: #8b949e; text-align: center; padding: 20px;">Data IP belum termuat. Tunggu beberapa detik...</div>`;
    } else {
        availableIpsForLauncher.forEach(ip => {
            listHtml += `
            <label class="launcher-ip-item" style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: #010409; border: 1px solid #30363d; border-radius: 4px; cursor: pointer; transition: 0.2s;">
                <input type="checkbox" value="${ip}" class="launcher-ip-cb" onchange="updateLauncherButtonsState()" style="cursor: pointer; width: 14px; height: 14px;">
                <span style="color: #c9d1d9; font-size: 12px; font-family: 'Consolas', monospace;">${ip}</span>
            </label>`;
        });
    }

    const modalHTML = `
    <div id="standaloneGrafanaLauncherModal" style="position: fixed; z-index: 30000; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', sans-serif; backdrop-filter: blur(3px);">
        <div style="background: #0d1117; width: 700px; height: 500px; border: 1px solid #30363d; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.9);">
            
            <div style="background: #161b22; padding: 15px 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #58a6ff; font-weight: bold; font-size: 15px;">🚀 GRAFANA IP LAUNCHER</span>
                <button onclick="document.getElementById('standaloneGrafanaLauncherModal').remove()" style="background: transparent; border: none; color: #f85149; cursor: pointer; font-size: 20px; padding: 0;">&times;</button>
            </div>
            
            <div style="display: flex; flex: 1; overflow: hidden;">
                <!-- KIRI: DAFTAR IP -->
                <div style="flex: 1; border-right: 1px solid #30363d; display: flex; flex-direction: column; background: #0d1117;">
                    <div style="padding: 10px; border-bottom: 1px solid #30363d;">
                        <input type="text" id="launcherSearchIp" placeholder="🔍 Cari IP Address..." onkeyup="filterLauncherIps()" style="width: 100%; box-sizing: border-box; padding: 8px; background: #010409; border: 1px solid #30363d; color: #c9d1d9; border-radius: 4px; outline: none; font-size: 12px;">
                    </div>
                    <div id="launcherIpList" style="flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 5px;">
                        ${listHtml}
                    </div>
                </div>

                <!-- KANAN: TOMBOL AKSI -->
                <div style="flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 15px; background: #161b22;">
                    <div style="color: #8b949e; font-size: 12px; margin-bottom: 5px; text-align: center;">
                        <span id="launcherSelectedCount" style="color: #f1e05a; font-weight: bold; font-size: 18px;">0</span><br>IP Terpilih
                    </div>

                    <button id="btnLaunchAll" disabled onclick="executeGrafanaLaunch('')" style="background: #2ea043; border: 1px solid #3fb950; color: white; padding: 12px; border-radius: 6px; font-size: 13px; font-weight: bold; transition: 0.2s; opacity: 0.5; cursor: not-allowed; display: flex; justify-content: space-between;">
                        <span>📊 ALL PANELS</span> <span>↗</span>
                    </button>
                    
                    <button id="btnLaunchAva" disabled onclick="executeGrafanaLaunch('&viewPanel=panel-72')" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 12px; border-radius: 6px; font-size: 13px; font-weight: bold; transition: 0.2s; opacity: 0.5; cursor: not-allowed; display: flex; justify-content: space-between;">
                        <span>🟢 AVAILABILITY</span> <span>↗</span>
                    </button>
                    
                    <button id="btnLaunchCpu" disabled onclick="executeGrafanaLaunch('&viewPanel=panel-59')" style="background: #21262d; border: 1px solid #1f6feb; color: #58a6ff; padding: 12px; border-radius: 6px; font-size: 13px; font-weight: bold; transition: 0.2s; opacity: 0.5; cursor: not-allowed; display: flex; justify-content: space-between;">
                        <span>⚙️ CPU ONLY</span> <span>↗</span>
                    </button>
                    
                    <button id="btnLaunchMem" disabled onclick="executeGrafanaLaunch('&viewPanel=panel-60')" style="background: #21262d; border: 1px solid #a371f7; color: #d2a8ff; padding: 12px; border-radius: 6px; font-size: 13px; font-weight: bold; transition: 0.2s; opacity: 0.5; cursor: not-allowed; display: flex; justify-content: space-between;">
                        <span>🧠 MEMORY ONLY</span> <span>↗</span>
                    </button>
                    
                    <div style="margin-top: auto; font-size: 10px; color: #8b949e; text-align: center; font-style: italic;">
                        URL akan di-generate otomatis berdasarkan IP yang dicentang.
                    </div>
                </div>
            </div>
            
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Tambahkan style hover untuk item IP
    const style = document.createElement('style');
    style.innerHTML = `.launcher-ip-item:hover { border-color: #58a6ff !important; }`;
    document.head.appendChild(style);
}

function filterLauncherIps() {
    const input = document.getElementById('launcherSearchIp').value.toLowerCase();
    const items = document.querySelectorAll('.launcher-ip-item');

    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        if (text.includes(input)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function updateLauncherButtonsState() {
    const checkedCount = document.querySelectorAll('.launcher-ip-cb:checked').length;
    document.getElementById('launcherSelectedCount').innerText = checkedCount;

    const buttons = ['btnLaunchAll', 'btnLaunchAva', 'btnLaunchCpu', 'btnLaunchMem'];
    
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (checkedCount > 0) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    });
}

function executeGrafanaLaunch(panelParam) {
    const checkboxes = document.querySelectorAll('.launcher-ip-cb:checked');
    if (checkboxes.length === 0) return;

    let ipParams = "";
    checkboxes.forEach(cb => {
        ipParams += `&var-nodeip_all=${cb.value}`;
    });

    const baseUrl = `https://grafana.example.com:3000/d/noc-dash-beta/noc-overview-v2?orgId=1&from=now-1h&to=now&timezone=browser&var-nodeip_green=$__all&var-nodename_green=$__all&var-nodeip_red=$__all&var-nodename_red=$__all${ipParams}${panelParam}&refresh=30s`;

    window.open(baseUrl, '_blank');
}