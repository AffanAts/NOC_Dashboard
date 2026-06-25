/**
 * ip_checker.js
 * Unified Asset Checker (AVA/CPU/MEM) & JSON Extractor
 * UI Master untuk Ticket Verifier.
 * Update: MEGA DICTIONARY Hostname (RVTools Object + OPM Inv), No Filter.json
 */

let checkerMode = 'OPM'; 

function createIpCheckerModal() {
    const old = document.getElementById('ipCheckerModal');
    if(old) old.remove();

    const html = `
    <div id="ipCheckerModal" style="display: none; position: fixed; z-index: 11000; left: 0; top: 0; width: 100vw; height: 100vh; background: #0d1117; flex-direction: column; font-family: 'Consolas', monospace;">
        
        <div style="padding: 15px 30px; background: #161b22; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 20px; align-items: center;">
                <span style="color: #f1e05a; font-weight: bold; font-size: 16px;">📡 NOC ASSET VERIFICATOR</span>
                <div style="display: flex; background: #0d1117; padding: 4px; border-radius: 6px; border: 1px solid #30363d; gap: 4px;">
                    <button id="btnModeOpm" onclick="setCheckerMode('OPM')" style="background: #238636; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s;">OPMANAGER</button>
                    <button id="btnModeGrafana" onclick="setCheckerMode('GRAFANA')" style="background: transparent; color: #8b949e; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s;">GRAFANA</button>
                    <button id="btnModeExtract" onclick="setCheckerMode('EXTRACT')" style="background: transparent; color: #8b949e; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s;">⚡ JSON TO IP</button>
                    <button id="btnModeTicket" onclick="setCheckerMode('TICKET')" style="background: transparent; color: #8b949e; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s;">🎫 TICKET STATUS</button>
                </div>
            </div>
            <button onclick="closeIpChecker()" style="background: #da3633; border: 1px solid #b3261e; color: white; padding: 8px 20px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#b3261e'" onmouseout="this.style.background='#da3633'">⬅ BACK TO DASHBOARD</button>
        </div>

        <div style="flex: 1; display: flex; padding: 25px 30px; gap: 25px; overflow: hidden;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 15px; max-width: 650px;">
                <label id="inputLabel" style="color: #8b949e; font-size: 13px; font-weight: bold;">Paste List IP / Hostname:</label>
                
                <div style="flex: 1; display: flex; gap: 10px;">
                    <textarea id="bulkInput" wrap="off" placeholder="10.100.x.x\n10,100,x,x" 
                        style="flex: 1; background: #010409; border: 1px solid #30363d; color: #58a6ff; padding: 15px; border-radius: 8px; resize: none; font-size: 12px; line-height: 1.6; outline: none;"></textarea>
                </div>

                <button id="actionBtn" onclick="processIpCheck()" style="background: #238636; border: none; color: white; padding: 16px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; transition: 0.2s; letter-spacing: 1px;">🔍 ANALYZE LIST</button>

                <div id="ticketSubTabs" style="display: none; background: #161b22; border: 1px solid #30363d; padding: 8px; border-radius: 6px; gap: 5px; flex-wrap: wrap;">
                    <div style="width: 100%; color: #8b949e; font-size: 10px; font-weight: bold; margin-bottom: 4px; text-align: center;">FILTER & COMPARE DATA (TICKET MODE)</div>
                    <div style="display: flex; gap: 5px; width: 100%; justify-content: center;">
                        <button onclick="setTicketSubMode('ALL')" id="st_ALL" style="background: #8957e5; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: bold; flex: 1;">ALL EXCEL</button>
                        <button onclick="setTicketSubMode('GRAF_EXCEL')" id="st_GRAF_EXCEL" style="background: #21262d; color: #c9d1d9; border: 1px solid #30363d; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: bold; flex: 1;">GRAF EXCEL</button>
                        <button onclick="setTicketSubMode('OPM_EXCEL')" id="st_OPM_EXCEL" style="background: #21262d; color: #c9d1d9; border: 1px solid #30363d; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: bold; flex: 1;">OPM EXCEL</button>
                    </div>
                    <div style="display: flex; gap: 5px; width: 100%; justify-content: center; margin-top: 4px;">
                        <button onclick="setTicketSubMode('COMP_GRAF')" id="st_COMP_GRAF" style="background: #21262d; color: #f1e05a; border: 1px solid #30363d; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: bold; flex: 1;">VS APP GRAFANA</button>
                        <button onclick="setTicketSubMode('COMP_OPM')" id="st_COMP_OPM" style="background: #21262d; color: #ff7b72; border: 1px solid #30363d; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: bold; flex: 1;">VS APP OPMANAGER</button>
                    </div>
                </div>
            </div>

            <div style="flex: 2; display: flex; flex-direction: column; gap: 15px; overflow: hidden;">
                <div id="checkStats" style="font-size: 13px; font-weight: bold; text-align: right; color: #8b949e;"></div>
                <div id="checkResult" style="flex: 1; background: #010409; border: 1px solid #30363d; border-radius: 8px; overflow-y: auto;">
                    <div style="padding: 60px; text-align: center; color: #484f58; font-size: 13px;">Input data and click Analyze.</div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function setCheckerMode(mode) {
    checkerMode = mode;
    const btns = {
        'OPM': document.getElementById('btnModeOpm'),
        'GRAFANA': document.getElementById('btnModeGrafana'),
        'EXTRACT': document.getElementById('btnModeExtract'),
        'TICKET': document.getElementById('btnModeTicket')
    };

    Object.keys(btns).forEach(k => {
        btns[k].style.background = (k === mode) ? (k === 'EXTRACT' ? '#1f6feb' : (k === 'TICKET' ? '#8957e5' : '#238636')) : 'transparent';
        btns[k].style.color = (k === mode) ? 'white' : '#8b949e';
    });

    const lbl = document.getElementById('inputLabel');
    const inputBulk = document.getElementById('bulkInput');
    const btn = document.getElementById('actionBtn');
    const subTabs = document.getElementById('ticketSubTabs');

    subTabs.style.display = (mode === 'TICKET') ? 'flex' : 'none';

    if (mode === 'EXTRACT') {
        lbl.innerText = "Paste Raw JSON Grafana Here:";
        btn.innerText = "⚡ EXTRACT & FORMAT IP";
        btn.style.background = "#1f6feb";
        inputBulk.placeholder = 'Paste JSON here...';
    } else if (mode === 'TICKET') {
        lbl.innerText = "Blok 4 Kolom di Excel, Copy, lalu Paste ke sini:";
        btn.innerText = "🎫 VERIFY TICKETS";
        btn.style.background = "#8957e5";
        inputBulk.placeholder = 'Format Excel:\n[Tanggal]  [Case]  [Detail Issue]  [IP Address]\n\nContoh:\n10/9/25 23:14 \t OPManager - Disk \t Memory Utilization is 77%... \t 10.30.0.1';
    } else {
        lbl.innerText = "Paste List IP / Hostname:";
        btn.innerText = "🔍 ANALYZE LIST";
        btn.style.background = "#238636";
        inputBulk.placeholder = '10.100.x.x\n10.200.x.x';
    }
    
    document.getElementById('checkResult').innerHTML = `<div style="padding: 60px; text-align: center; color: #484f58; font-size: 13px;">Mode switched to ${mode}.</div>`;
}

function copyFullColumn(className, btn) {
    const elements = document.querySelectorAll('.' + className);
    let textToCopy = "";
    elements.forEach((el, index) => {
        textToCopy += el.innerText.trim() + (index === elements.length - 1 ? "" : "\n");
    });
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = btn.innerText;
        btn.innerText = "COPIED!";
        setTimeout(() => { btn.innerText = originalText; }, 1500);
    });
}

function copyIpAndHostname(btn) {
    const ipElements = document.querySelectorAll('.col-ip');
    const dnameElements = document.querySelectorAll('.col-dname');
    let textToCopy = "";
    ipElements.forEach((el, index) => {
        const ip = el.innerText.trim();
        const dname = dnameElements[index] ? dnameElements[index].innerText.trim() : "Not";
        textToCopy += `${ip} - [${dname}]\n`;
    });
    navigator.clipboard.writeText(textToCopy.trim()).then(() => {
        const originalText = btn.innerText; btn.innerText = "COPIED!"; setTimeout(() => { btn.innerText = originalText; }, 1500);
    });
}

async function processIpCheck() {
    const inputText = document.getElementById('bulkInput').value;
    const resultArea = document.getElementById('checkResult');
    const statsArea = document.getElementById('checkStats');
    
    if (!inputText.trim()) return;

    if (checkerMode === 'GRAFANA') {
        const confirmMsg = "⚠️ PERINGATAN: Data Ketersediaan (Availability) dari Grafana mungkin tidak sepenuhnya akurat.\n\nDisarankan untuk memverifikasi secara manual ketersediaan perangkat (misalnya, dengan melakukan ping) sebelum bergantung pada hasil ini.\n\nKlik 'OK' untuk melanjutkan analisis, atau 'Batal' untuk membatalkan.";
        if (!confirm(confirmMsg)) {
            return;
        }
    }

    if (checkerMode === 'TICKET') {
        if (typeof processTicketVerification === "function") {
            return processTicketVerification(inputText);
        } else {
            resultArea.innerHTML = `<div style="padding:60px; text-align:center; color:#f85149;">❌ Error: ticket_verifier.js belum di-load di index.html</div>`;
            return;
        }
    }

    if (checkerMode === 'EXTRACT') {
        try {
            const regexAvail = /"(?:url|displayNameFromDS)"\s*:\s*"([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)"/g;
            const regexInstance = /"instance"\s*:\s*"([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)(?::[0-9]+)?"/g;
            let match, extractedIps = [];
            while ((match = regexAvail.exec(inputText)) !== null) { extractedIps.push(match[1]); }
            while ((match = regexInstance.exec(inputText)) !== null) { extractedIps.push(match[1]); }
            
            const uniqueIps = [...new Set(extractedIps)]; 
            if (uniqueIps.length === 0) { 
                resultArea.innerHTML = `<div style="padding:60px; text-align:center; color:#f85149;">❌ No IP found in JSON.</div>`; return; 
            }
            
            let htmlExtract = `<div style="padding:15px; border-bottom:1px solid #30363d; display:flex; justify-content:space-between; align-items:center;"><span style="color:#8b949e; font-size:13px;">Formatted List (${uniqueIps.length} IPs)</span><button onclick="copyExtractResults(this)" style="background:#238636; color:white; border:none; padding:6px 16px; border-radius:4px; cursor:pointer; font-size:12px;">Copy All</button></div><div id="formattedOutput" style="padding:20px; color:#c9d1d9; font-size:13px; line-height:1.8; white-space: pre-wrap;">`;
            uniqueIps.forEach((ip, idx) => { htmlExtract += `"${ip}"${idx === uniqueIps.length - 1 ? "" : ",\n"}`; });
            htmlExtract += `</div>`;
            
            resultArea.innerHTML = htmlExtract; statsArea.innerHTML = `EXTRACTED: ${uniqueIps.length}`;
            return;
        } catch (e) { resultArea.innerHTML = `<div style="padding:60px; text-align:center; color:#f85149;">❌ Error processing JSON.</div>`; return; }
    }

    resultArea.innerHTML = '<div style="padding:60px; text-align:center; color:#8b949e; font-size:14px;">🔄 Analyzing...</div>';
    
    // --- MODE 3 & 4: OPM & GRAFANA ASSET CHECKER ---
    const rawLines = inputText.split(/\n/);
    const cleanIps = rawLines.map(line => line.replace(/,/g, '.').trim()).filter(ip => ip !== "");

    try {
        let ipMap = {}; 
        
        // Load API Data
        const [fResp, invResp, rvtoolsResp] = await Promise.all([
            fetch('Data_JSON/filter.json?t=' + Date.now()),
            fetch('Data_JSON/opmanager_inventory.json?t=' + Date.now()),
            fetch('Data_JSON/RVTOOLS.json?t=' + Date.now()).catch(() => null)
        ]);

        const filterData = await fResp.json();
        const registeredIps = [...(filterData.v1 || []), ...(filterData.v2 || [])];
        
        const invData = await invResp.json();
        const inventory = invData.rows || [];

        // 🌟 KEAJAIBAN MEGA-DICTIONARY (RVTools Object + OPM) 🌟
        let megaKamus = {};

        // 1. Ambil dari OpManager Inventory
        inventory.forEach(i => {
            let invIp = (i.ipaddress || "").trim();
            let invName = (i.displayName || "").trim();
            if (invIp && invName) megaKamus[invIp] = invName;
        });

        // 2. Ambil dari RVTools (Kasta Tertinggi, Format Objek)
        if (rvtoolsResp && rvtoolsResp.ok) {
            const rvData = await rvtoolsResp.json();
            Object.keys(rvData).forEach(ip => {
                megaKamus[ip] = rvData[ip].VM;
            });
        }

        if (checkerMode === 'OPM') {
            inventory.forEach(item => { 
                if(item.ipaddress) ipMap[item.ipaddress] = { found: true, dname: megaKamus[item.ipaddress] || item.displayName || "N/A" }; 
            });
        } else {
            const iframes = {
                ava: document.querySelector('iframe[src*="availability.html"]'),
                cpu: document.querySelector('iframe[src*="cpu_monitor.html"]'),
                mem: document.querySelector('iframe[src*="memory_monitor.html"]')
            };

            const getIframeData = (iframe, varPrefix) => {
                if (!iframe) return;
                const win = iframe.contentWindow;
                Object.keys(win).filter(k => k.startsWith(varPrefix)).forEach(key => {
                    const src = win[key];
                    if (src?.results?.A?.frames) {
                        src.results.A.frames.forEach(f => {
                            const labels = f.schema.fields[1].labels;
                            const ip = (labels.url || labels.instance || "").split(':')[0].trim();
                            const val = f.data.values[1].slice(-1)[0] || 0;
                            
                            if (!ip || !registeredIps.includes(ip)) return; 
                            
                            const dname = megaKamus[ip] || "Unknown Host";
                            if (!ipMap[ip]) ipMap[ip] = { ava: false, cpu: false, mem: false, dname: dname };
                            
                            if (varPrefix === 'dataDS') ipMap[ip].ava = (val < 100);
                            if (varPrefix === 'dataCPU') ipMap[ip].cpu = true;
                            if (varPrefix === 'dataMem') ipMap[ip].mem = true;
                        });
                    }
                });
            };
            getIframeData(iframes.ava, 'dataDS');
            getIframeData(iframes.cpu, 'dataCPU');
            getIframeData(iframes.mem, 'dataMem');
        }

        const headBtnStyle = `background:transparent; border:none; color:#58a6ff; cursor:pointer; font-size:10px; text-decoration:underline; display:block; margin:auto; margin-top:5px;`;
        const multiBtnContainer = `display:flex; gap:10px; justify-content:center;`;

        let htmlTable = `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead style="background: #161b22; position: sticky; top:0; z-index:10; box-shadow: 0 1px 0 #30363d;">
                <tr>
                    <th style="padding: 14px 10px; text-align: center; color: #8b949e; width: 60px;">NO.</th>
                    <th style="padding: 14px 10px; text-align: left; color: #8b949e; width: 180px;">TARGET IP <div style="${multiBtnContainer}"><button onclick="copyFullColumn('col-ip', this)" style="${headBtnStyle}">Copy IP</button><button onclick="copyIpAndHostname(this)" style="${headBtnStyle}; color:#f1e05a;">Copy IP-[Host]</button></div></th>
                    <th style="padding: 14px 10px; text-align: left; color: #8b949e;">DISPLAY NAME <button onclick="copyFullColumn('col-dname', this)" style="${headBtnStyle}">Copy Name</button></th>
                    ${checkerMode === 'OPM' ? `<th style="padding: 14px 10px; text-align: center; color: #8b949e; width: 100px;">OPM STATUS <button onclick="copyFullColumn('col-opm', this)" style="${headBtnStyle}">Copy</button></th>` : `<th style="padding: 14px 10px; text-align: center; color: #8b949e; width: 80px;">AVAIL <button onclick="copyFullColumn('col-ava', this)" style="${headBtnStyle}">Copy</button></th><th style="padding: 14px 10px; text-align: center; color: #8b949e; width: 80px;">CPU <button onclick="copyFullColumn('col-cpu', this)" style="${headBtnStyle}">Copy</button></th><th style="padding: 14px 10px; text-align: center; color: #8b949e; width: 80px;">MEM <button onclick="copyFullColumn('col-mem', this)" style="${headBtnStyle}">Copy</button></th>`}
                </tr>
            </thead><tbody>`;

        let matchSuccess = 0;
        cleanIps.forEach((targetIp, index) => {
            const data = ipMap[targetIp];
            if (!!data) matchSuccess++;
            
            // Pencarian nama akhir: Jika ada di ipMap pakai itu, jika tidak cari di MegaKamus
            let finalDName = data?.dname || megaKamus[targetIp] || "tidak ada";

            htmlTable += `<tr style="border-bottom: 1px solid #21262d;">
                <td style="padding: 12px 10px; text-align:center; color: #8b949e; border-right: 1px solid #30363d;">${index + 1}</td>
                <td class="col-ip" style="padding: 12px 10px; color: ${!!data ? '#c9d1d9' : '#f85149'}; font-weight:bold;">${targetIp}</td>
                <td class="col-dname" style="padding: 12px 10px; color: ${finalDName === 'tidak ada' ? '#f85149' : '#8b949e'};">${finalDName}</td>
                ${checkerMode === 'OPM' ? `<td class="col-opm" style="padding: 12px 10px; text-align:center; color: ${data?.found ? '#3fb950' : '#f85149'}">${data?.found ? 'ada' : 'tidak ada'}</td>` : `<td class="col-ava" style="padding: 12px 10px; text-align:center; color: ${data?.ava ? '#3fb950' : '#f85149'}">${data?.ava ? 'ada' : 'tidak ada'}</td><td class="col-cpu" style="padding: 12px 10px; text-align:center; color: ${data?.cpu ? '#3fb950' : '#f85149'}">${data?.cpu ? 'ada' : 'tidak ada'}</td><td class="col-mem" style="padding: 12px 10px; text-align:center; color: ${data?.mem ? '#3fb950' : '#f85149'}">${data?.mem ? 'ada' : 'tidak ada'}</td>`}
            </tr>`;
        });

        htmlTable += '</tbody></table>';
        resultArea.innerHTML = htmlTable;
        statsArea.innerHTML = `ROWS PROCESSED: ${cleanIps.length} | MATCHED: ${matchSuccess}`;
    } catch (e) { resultArea.innerHTML = `<div style="padding:60px; text-align:center; color:#f85149;">❌ Error: ${e.message}</div>`; }
}

function copyExtractResults(btn) {
    navigator.clipboard.writeText(document.getElementById('formattedOutput').innerText).then(() => {
        btn.innerText = "COPIED!"; setTimeout(() => { btn.innerText = "Copy All"; }, 1500);
    });
}

function openIpChecker() { createIpCheckerModal(); document.getElementById('ipCheckerModal').style.display = 'flex'; }
function closeIpChecker() { document.getElementById('ipCheckerModal').style.display = 'none'; }