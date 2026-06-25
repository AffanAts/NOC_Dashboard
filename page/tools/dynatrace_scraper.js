/**
 * dynatrace_scraper.js
 * Fitur: UNIVERSAL SCRIPT. 1 Script untuk semua dashboard dengan fitur Auto-Detect.
 * Perbaikan: Deteksi fleksibel "Request", Auto-Tags, & Freeze Layar.
 */

// Definisi Dashboard beserta Tag Eskalasi (Gunakan \n untuk Enter/Baris Baru)
const dynatraceDashboards = [
    { name: "Monitoring CMS", tags: "Eng @Nina\nEng @Fria" },
    { name: "Monitoring JakOne", tags: "Eng @Dana\nEng @Aida" },
    { name: "Monitoring PCE", tags: "Eng @Idham" },
    { name: "Monitoring Jakcard", tags: "Eng @Idham\nEng @Gusti" },
    { name: "Payment Transaction JakOne Monitoring", tags: "Eng @Dana\nEng @Aida" },
    { name: "Monitoring Transaction JakOne", tags: "Eng @Dana\nEng @Aida" }
];

function createDynatraceModal() {
    if (document.getElementById('dynatraceModal')) return;

    // Buat list dukungan dashboard untuk ditampilkan di UI
    const listDB = dynatraceDashboards.map(db => `<li style="margin-bottom: 4px;">✔️ ${db.name}</li>`).join('');

    const modalHTML = `
    <div id="dynatraceModal" style="display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background: rgba(13,17,23,0.95);">
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; font-family: 'Consolas', monospace;">
            <div style="padding: 10px 15px; background: #161b22; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #f1e05a; font-size: 14px; font-weight: bold;">☁️ DYNATRACE TOOLS</span>
                <button onclick="document.getElementById('dynatraceModal').style.display='none'" style="background:transparent; border:none; color:#da3633; cursor:pointer; font-weight:bold; font-size:16px;">X</button>
            </div>

            <div style="flex: 1; overflow: auto; padding: 40px; box-sizing: border-box; display:flex; justify-content:center; align-items:center; gap: 24px; flex-wrap: wrap;">

                <!-- CARD 1: Universal Dynatrace Script -->
                <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 30px; width: 420px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.8); display: flex; flex-direction: column;">
                    <h3 style="margin-top: 0; color: #58a6ff; font-size: 18px; margin-bottom: 10px;">🌟 Universal Dynatrace Script</h3>
                    <p style="color: #8b949e; font-size: 12px; margin-bottom: 20px; line-height:1.5; flex:1;">
                        Deteksi otomatis alert <b style="color:#ff7b72">Merah/Kuning</b> pada semua tile dashboard. Script menyesuaikan Tag PIC sesuai dashboard yang dibuka.
                    </p>
                    <div style="text-align: left; background: #010409; padding: 15px; border-radius: 6px; border: 1px solid #30363d; margin-bottom: 25px;">
                        <b style="color:#c9d1d9; font-size:11px;">Mendukung Auto-Detect untuk Dashboard:</b>
                        <ul style="color:#8b949e; font-size:11px; padding-left: 20px; margin-top: 8px; margin-bottom: 0;">
                            ${listDB}
                        </ul>
                    </div>
                    <button id="btnCopyUniversal" onclick="copyUniversalScript(this)"
                        style="background: #1f6feb; border: 1px solid #388bfd; color: white; border-radius: 6px; padding: 14px 24px; font-size: 14px; cursor: pointer; font-weight: bold; width: 100%; box-shadow: 0 4px 15px rgba(31,111,235,0.4);">
                        📋 COPY SCRIPT
                    </button>
                    <div style="color:#57606a; font-size:10px; margin-top:12px;">Paste di Console (Ctrl+Shift+J) browser Dynatrace.</div>
                </div>

                <!-- CARD 2: Host Availability Scraper -->
                <div style="background: #161b22; border: 1px solid #238636; border-radius: 8px; padding: 30px; width: 420px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.8); display: flex; flex-direction: column;">
                    <h3 style="margin-top: 0; color: #3fb950; font-size: 18px; margin-bottom: 10px;">🖥️ Host Availability Scraper</h3>
                    <p style="color: #8b949e; font-size: 12px; margin-bottom: 20px; line-height:1.5; flex:1;">
                        Scrape widget <b style="color:#3fb950">Host Availability</b> dan cari host dengan availability <b style="color:#ff7b72">&lt; 100%</b>. Hasilkan format teks WhatsApp siap kirim.
                    </p>
                    <div style="text-align: left; background: #010409; padding: 15px; border-radius: 6px; border: 1px solid #30363d; margin-bottom: 25px;">
                        <b style="color:#c9d1d9; font-size:11px;">Cara pakai:</b>
                        <ol style="color:#8b949e; font-size:11px; padding-left:18px; margin:8px 0 0 0; line-height:1.8;">
                            <li>Buka dashboard Dynatrace yang dituju</li>
                            <li>Klik <b style="color:#3fb950">COPY SCRIPT</b> di bawah</li>
                            <li>Tekan <b style="color:#f1e05a">Ctrl+Shift+J</b> di Dynatrace → Console</li>
                            <li>Paste dan tekan <b style="color:#f1e05a">Enter</b></li>
                        </ol>
                    </div>
                    <button id="btnCopyHostAvail" onclick="copyHostAvailScript(this)"
                        style="background: #238636; border: 1px solid #2ea043; color: white; border-radius: 6px; padding: 14px 24px; font-size: 14px; cursor: pointer; font-weight: bold; width: 100%; box-shadow: 0 4px 15px rgba(46,160,67,0.4);">
                        📋 COPY SCRIPT
                    </button>
                    <div style="color:#57606a; font-size:10px; margin-top:12px;">Paste di Console (Ctrl+Shift+J) browser Dynatrace.</div>
                </div>

            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// GENERATOR SCRIPT INJEKSI KE DYNATRACE (Hanya 1 Fungsi)
function getDynatraceScriptString() {
    // Inject database config ke dalam script yang di-copy
    const dbConfigString = JSON.stringify(dynatraceDashboards);
    
    return `(async function() {
    console.log("🚀 Memulai proses: Deteksi Dashboard Otomatis...");

    const dbConfigs = ${dbConfigString};
    let dashboardName = "Unknown Dashboard";
    let tags = "Team";

    // 1. AUTO DETECT DASHBOARD NAME (Mencari dari Judul Tab & DOM Headers)
    let foundDB = dbConfigs.find(db => document.title.toLowerCase().includes(db.name.toLowerCase()));
    
    if (!foundDB) {
        const headers = document.querySelectorAll('[uitestid="gwt-debug-inlineEditLabelViewText"]');
        for(let h of headers) {
            foundDB = dbConfigs.find(db => h.innerText.trim().toLowerCase() === db.name.toLowerCase());
            if(foundDB) break;
        }
    }

    if (foundDB) {
        dashboardName = foundDB.name;
        tags = foundDB.tags;
        console.log("✅ Dashboard Terdeteksi: " + dashboardName);
    } else {
        console.warn("⚠️ Nama Dashboard tidak terdeteksi otomatis. Pastikan Anda berada di dashboard yang didukung.");
    }

    console.log("Mulai keliling kotak + Zoom Out + Tunggu 5 detik...");

    const tiles = document.querySelectorAll('.grid-tile');
    for (let i = 0; i < tiles.length; i++) {
        tiles[i].scrollIntoView({ block: 'center', inline: 'center' });
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 100)); 
    }

    document.body.style.zoom = "25%"; 
    window.scrollTo(0, 0);
    console.log("⌛ Sedang menunggu 5 detik agar semua angka muncul...");
    await new Promise(r => setTimeout(r, 5000));

    const results = {};
    const targetColors = ['rgb(220, 23, 42)', 'rgb(245, 211, 15)'];

    // DAFTAR PENGECUALIAN NAMA HEADER (Otomatis & Statis)
    const ignoreNames = [
        dashboardName.toLowerCase(),
        "payment transaction jakone monitoring",
        "monitoring cms",
        "monitoring jakone",
        "monitoring pce",
        "monitoring jakcard",
        "monitoring transaction jakone"
    ];

    tiles.forEach(tile => {
        const statusBox = tile.querySelector('div.dC-u');
        if (!statusBox) return;

        const bgColor = window.getComputedStyle(statusBox).backgroundColor;
        const metricName = tile.innerText.split('\\n')[0] || "Status";
        const metricValue = statusBox.querySelector('.dYc-n')?.innerText.trim() || "0";
        
        if (metricValue === "-" || metricValue === "" || metricValue.toLowerCase().includes("no data")) return;

        const isAlert = targetColors.includes(bgColor);
        
        // Deteksi "Request" atau "Request Count"
        const isRequest = metricName.toLowerCase().includes("request");

        let serviceName = "Unknown";
        const tileRect = tile.getBoundingClientRect();
        const headers = document.querySelectorAll('[uitestid="gwt-debug-inlineEditLabelViewText"]');
        let minDistance = Infinity;

        headers.forEach(h => {
            const text = h.innerText.trim();
            if (!text || ignoreNames.includes(text.toLowerCase())) return;

            const hRect = h.getBoundingClientRect();
            const dX = Math.abs(hRect.left - tileRect.left);
            const dY = tileRect.top - hRect.top;
            if (dY > 0 && dY < 1500 && dX < 800) { 
                const dist = Math.sqrt(dX*dX + dY*dY);
                if (dist < minDistance) { minDistance = dist; serviceName = text; }
            }
        });

        if (!results[serviceName]) results[serviceName] = { alerts: [], request: "0" };
        if (isRequest) {
            results[serviceName].request = metricValue;
        } else if (isAlert) {
            const status = bgColor.includes('220') ? 'Critical' : 'Attention';
            results[serviceName].alerts.push(metricName + ' ' + status + ' (' + metricValue + ')');
        }
    });

    document.body.style.zoom = "100%"; // Kembalikan zoom normal
    
    // === FITUR FREEZE DYNATRACE (Memblokir Request Data Baru) ===
    console.log("❄️ Membekukan data API (Freeze)...");
    window.fetch = () => new Promise(() => {}); // Block Fetch API
    XMLHttpRequest.prototype.send = function() {}; // Block XHR API
    
    // Ambil service yang bermasalah saja
    const finalObjKeys = Object.keys(results).filter(s => results[s].alerts.length > 0 && s !== "Unknown");
    
    if(finalObjKeys.length === 0) {
        console.clear();
        alert("✅ [" + dashboardName + "] Tidak ada alert Merah/Kuning yang terdeteksi.\\n\\nData layar saat ini telah di-Freeze. Refresh (F5) untuk melanjutkan.");
        return;
    }

    // === PENENTUAN STATUS WARNA DINAMIS (Red/Yellow/Red & Yellow) ===
    let hasCritical = false;
    let hasAttention = false;
    
    finalObjKeys.forEach(s => {
        results[s].alerts.forEach(alertText => {
            if(alertText.includes('Critical')) hasCritical = true;
            if(alertText.includes('Attention')) hasAttention = true;
        });
    });

    let statusWarna = "Red & Yellow";
    if (hasCritical && hasAttention) {
        statusWarna = "Red & Yellow";
    } else if (hasCritical) {
        statusWarna = "Red";
    } else if (hasAttention) {
        statusWarna = "Yellow";
    }

    // 1. FORMAT TEKS WA
    const finalListText = finalObjKeys.map(s => '- *' + s + '* - Request (' + results[s].request + ') - ' + results[s].alerts.join(' & '));
    const waText = \`Dear Team, \${tags.replace(/\\n/g, '\\n')}\\n\\nKami informasikan saat ini *\${dashboardName}*\\n\\n\${finalListText.join('\\n')}\\n\\nTerpantau dalam status \${statusWarna} pada dashboard monitoring Dynatrace - *\${dashboardName}*\\n\\nMohon dibantu pengecekannya,\\nTerima kasih.\`;

    console.clear();
    console.log("⏳ Menampilkan Overlay...");

    // 2. BUILD ELEMEN POPUP
    const overlay = document.createElement('div');
    overlay.id = "dynatraceNOCPopup";
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(13,17,23,0.9); z-index:9999999; display:flex; align-items:center; justify-content:center; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;";

    let listHTML = '';
    finalObjKeys.forEach(s => {
        let hasCrit = results[s].alerts.some(a => a.includes('Critical'));
        let badgeColor = hasCrit ? '#cf222e' : '#d29922'; // Merah atau Kuning
        listHTML += \`
        <div style="margin-bottom: 12px; border-left: 4px solid \${badgeColor}; padding-left: 15px;">
            <div style="font-size: 16px; color: #1a1f23; font-weight: bold;">\${s} <span style="font-weight: normal; color: #57606a; font-size: 14px;">(Req: \${results[s].request})</span></div>
            <div style="color: \${badgeColor}; font-weight: 600; font-size: 14px; margin-top: 3px;">\${results[s].alerts.join(' & ')}</div>
        </div>\`;
    });

    const timeStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    overlay.innerHTML = \`
    <div style="display:flex; max-width: 95vw; max-height: 90vh; gap: 20px;">
        
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
            <div id="dtCaptureArea" style="background: #ffffff; padding: 30px 40px; width: fit-content; min-width: 450px; max-width: 600px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); overflow-y: auto; max-height: 70vh;">
                <div style="border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 800; color: #cf222e; letter-spacing: 0.5px; text-transform: uppercase;">🚨 DYNATRACE ALERT SUMMARY</div>
                    <div style="font-size: 22px; color: #0969da; font-weight: bold; margin-top: 5px;">\${dashboardName}</div>
                    <div style="font-size: 13px; color: #57606a; margin-top: 5px;">🕒 \${timeStr} WIB</div>
                </div>
                <div>\${listHTML}</div>
            </div>
        </div>

        <div style="background:#161b22; padding:20px; border-radius:8px; border:1px solid #30363d; width: 450px; display:flex; flex-direction:column; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                <span style="color:#58a6ff; font-weight:bold;">📝 FORMAT TEKS WHATSAPP</span>
                <button id="closeDTPopup" style="background:transparent; border:none; color:#da3633; font-weight:bold; cursor:pointer; font-size:18px;" title="Tutup popup ini untuk melihat layar asli">X</button>
            </div>
            <div style="color:#8b949e; font-size:11px; margin-bottom:10px; line-height: 1.5;">
                ❄️ <b>Layar Dynatrace telah di-Freeze (Dibekukan)!</b><br>
                1. Klik Copy Teks WA.<br>
                2. Tutup popup ini (Klik tanda X di sudut kanan atas).<br>
                3. Screenshot layar Dynatrace (Win + Shift + S).<br>
                4. Refresh browser (F5) jika ingin kembali melanjutkan monitoring.
            </div>
            <textarea id="dtWaText" readonly style="flex:1; background:#010409; color:#c9d1d9; border:1px solid #30363d; border-radius:4px; padding:15px; font-size:12px; resize:none;">\${waText}</textarea>
            <button id="copyDTText" style="margin-top:15px; background:#238636; border:1px solid #2ea043; color:white; padding:12px; border-radius:4px; cursor:pointer; font-weight:bold;">COPY TEKS WA</button>
        </div>
    </div>\`;
    
    document.body.appendChild(overlay);

    // Event Buttons di dalam Popup
    document.getElementById('closeDTPopup').onclick = () => document.body.removeChild(overlay);
    document.getElementById('copyDTText').onclick = (e) => {
        document.getElementById('dtWaText').select();
        document.execCommand('copy');
        e.target.innerText = "✅ COPIED!";
        e.target.style.background = "#3fb950";
        setTimeout(() => { e.target.innerText = "COPY TEKS WA"; e.target.style.background = "#238636"; }, 2000);
    };

})();`;
}

function copyUniversalScript(btn) {
    const scriptToCopy = getDynatraceScriptString();
    
    navigator.clipboard.writeText(scriptToCopy).then(() => {
        const origText = btn.innerText;
        btn.innerText = "✅ SCRIPT BERHASIL DI-COPY!";
        btn.style.background = "#3fb950";
        btn.style.borderColor = "#3fb950";
        setTimeout(() => {
            btn.innerText = origText;
            btn.style.background = "#238636";
            btn.style.borderColor = "#2ea043";
        }, 2000);
    });
}