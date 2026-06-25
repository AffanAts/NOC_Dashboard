/**
 * host_availability_scraper.js
 * Script inject ke browser Dynatrace untuk scrape tabel "Host Availability" < 100%.
 * Pola sama dengan dynatrace_scraper.js: copy script → paste di Console Dynatrace.
 */

const hostAvailDashboards = [
    { name: "Monitoring CMS",                         tags: "Eng @Nina\nEng @Fria" },
    { name: "Monitoring JakOne",                      tags: "Eng @Dana\nEng @Aida" },
    { name: "Monitoring PCE",                         tags: "Eng @Idham" },
    { name: "Monitoring Jakcard",                     tags: "Eng @Idham\nEng @Gusti" },
    { name: "Payment Transaction JakOne Monitoring",  tags: "Eng @Dana\nEng @Aida" },
    { name: "Monitoring Transaction JakOne",          tags: "Eng @Dana\nEng @Aida" }
];

function createHostAvailModal() {
    if (document.getElementById('hostAvailModal')) return;

    const listDB = hostAvailDashboards.map(db =>
        `<li style="margin-bottom:4px;">✔️ ${db.name}</li>`
    ).join('');

    const modalHTML = `
    <div id="hostAvailModal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background:rgba(13,17,23,0.95);">
        <div style="width:100%; height:100%; display:flex; flex-direction:column; font-family:'Consolas',monospace;">
            <div style="padding:10px 15px; background:#161b22; border-bottom:1px solid #30363d; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#3fb950; font-size:14px; font-weight:bold;">[ HOST AVAILABILITY SCRAPER ]</span>
                <button onclick="document.getElementById('hostAvailModal').style.display='none'"
                    style="background:transparent; border:none; color:#da3633; cursor:pointer; font-weight:bold; font-size:16px;">X</button>
            </div>

            <div style="flex:1; overflow:auto; padding:40px; box-sizing:border-box; display:flex; justify-content:center; align-items:center;">
                <div style="background:#161b22; border:1px solid #30363d; border-radius:8px; padding:30px; max-width:500px; width:100%; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.8);">
                    <h3 style="margin-top:0; color:#3fb950; font-size:18px; margin-bottom:10px;">🖥️ Host Availability Scraper</h3>
                    <p style="color:#8b949e; font-size:12px; margin-bottom:20px; line-height:1.5;">
                        Script akan otomatis mendeteksi dashboard Dynatrace yang sedang dibuka,
                        lalu mencari host dengan availability <b style="color:#ff7b72">&lt; 100%</b>
                        dan menghasilkan format teks WhatsApp siap kirim.
                    </p>

                    <div style="text-align:left; background:#010409; padding:15px; border-radius:6px; border:1px solid #30363d; margin-bottom:25px;">
                        <b style="color:#c9d1d9; font-size:11px;">Mendukung Auto-Detect untuk Dashboard:</b>
                        <ul style="color:#8b949e; font-size:11px; padding-left:20px; margin-top:8px; margin-bottom:0;">
                            ${listDB}
                        </ul>
                    </div>

                    <div style="background:#010409; border:1px solid #1f6feb; border-radius:6px; padding:12px; margin-bottom:20px; text-align:left;">
                        <b style="color:#58a6ff; font-size:11px;">📋 Cara pakai:</b>
                        <ol style="color:#8b949e; font-size:11px; padding-left:18px; margin:8px 0 0 0; line-height:1.8;">
                            <li>Buka dashboard Dynatrace yang dituju</li>
                            <li>Klik tombol <b style="color:#3fb950">COPY SCRIPT</b> di bawah</li>
                            <li>Di tab Dynatrace, tekan <b style="color:#f1e05a">Ctrl + Shift + J</b> (Console)</li>
                            <li>Paste dan tekan <b style="color:#f1e05a">Enter</b></li>
                        </ol>
                    </div>

                    <button id="btnCopyHostAvail" onclick="copyHostAvailScript(this)"
                        style="background:#238636; border:1px solid #2ea043; color:white; border-radius:6px; padding:14px 24px; font-size:14px; cursor:pointer; font-weight:bold; width:100%; box-shadow:0 4px 15px rgba(46,160,67,0.4);">
                        📋 COPY SCRIPT
                    </button>

                    <div style="color:#57606a; font-size:10px; margin-top:15px;">
                        Paste di tab "Console" (Ctrl + Shift + J) pada browser Dynatrace.
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function getHostAvailScriptString() {
    const dbConfigString = JSON.stringify(hostAvailDashboards);

    return `(async function() {
    console.log("🚀 Host Availability Scraper — memulai...");

    const dbConfigs = ${dbConfigString};
    let dashboardName = "Unknown Dashboard";
    let tags = "Team";

    // 1. AUTO-DETECT DASHBOARD
    let foundDB = dbConfigs.find(db => document.title.toLowerCase().includes(db.name.toLowerCase()));
    if (!foundDB) {
        const hdrs = document.querySelectorAll('[uitestid="gwt-debug-inlineEditLabelViewText"]');
        for (let h of hdrs) {
            foundDB = dbConfigs.find(db => h.innerText.trim().toLowerCase() === db.name.toLowerCase());
            if (foundDB) break;
        }
    }
    if (foundDB) {
        dashboardName = foundDB.name;
        tags = foundDB.tags;
        console.log("✅ Dashboard terdeteksi: " + dashboardName);
    } else {
        console.warn("⚠️ Dashboard tidak terdeteksi. Pastikan Anda berada di dashboard yang didukung.");
    }

    // 2. SCROLL semua tile agar data ter-load, lalu zoom out
    console.log("🔍 Scroll semua tile & zoom out...");
    const allGridTiles = document.querySelectorAll('.grid-tile, .grid-tileContent');
    for (let i = 0; i < allGridTiles.length; i++) {
        allGridTiles[i].scrollIntoView({ block: 'center', inline: 'center' });
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 80));
    }
    document.body.style.zoom = "25%";
    window.scrollTo(0, 0);
    console.log("⌛ Menunggu 5 detik agar data ter-render...");
    await new Promise(r => setTimeout(r, 5000));

    // 3. SCRAPE HOST AVAILABILITY
    // Struktur DOM Dynatrace (dari inspeksi langsung):
    // Tile header: [uitestid="gwt-debug-title"] berisi teks "Host Availability"
    // Kolom persen (kiri) : div.dXc-d.dXc-a > div.dXc-c.dXc-k  (teks: "  99.65%")
    // Kolom label (kanan) : div.dXc-d.dXc-i > div.dXc-c > div.dXc-f (teks: "worker02... - 10.x.x.x - tag")
    // Kedua kolom parallel by index.
    const found = [];

    const titleEls = document.querySelectorAll('[uitestid="gwt-debug-title"]');
    titleEls.forEach(titleEl => {
        if (titleEl.innerText.trim() !== 'Host Availability') return;

        // Naik ke container tile
        let tileContainer = titleEl;
        for (let i = 0; i < 15; i++) {
            tileContainer = tileContainer.parentElement;
            if (!tileContainer) break;
            if (tileContainer.className?.includes('grid-tileContent') ||
                tileContainer.className?.includes('grid-tile')) break;
        }
        if (!tileContainer) return;

        // Ambil dua kolom parallel
        const colPct   = tileContainer.querySelector('.dXc-d.dXc-a');  // kolom persen
        const colLabel = tileContainer.querySelector('.dXc-d.dXc-i');  // kolom label host

        if (!colPct || !colLabel) return;

        const pctCells   = colPct.querySelectorAll('.dXc-c.dXc-k');
        const labelCells = colLabel.querySelectorAll('.dXc-f');

        pctCells.forEach((pctEl, idx) => {
            const rawPct = pctEl.innerText.replace('%', '').trim();
            const pct = parseFloat(rawPct);
            if (isNaN(pct) || pct >= 100) return;

            const label = labelCells[idx]?.innerText?.trim() || '(unknown)';
            found.push({ label, pct: pct.toFixed(2) });
        });
    });

    document.body.style.zoom = "100%";

    // 4. FREEZE DYNATRACE
    console.log("❄️ Freeze API...");
    window.fetch = () => new Promise(() => {});
    XMLHttpRequest.prototype.send = function() {};

    if (found.length === 0) {
        console.clear();
        alert("✅ [" + dashboardName + "] Semua host availability 100%.\\nTidak ada yang perlu dieskalasi.\\n\\nLayar telah di-Freeze. Refresh (F5) untuk melanjutkan.");
        return;
    }

    // 5. BUILD FORMAT WA
    const listLines = found.map(h => "- " + h.label + " - " + h.pct + "%").join("\\n");
    const waText =
"Dear Team, " + tags.replace(/\\n/g, "\\n") +
"\\n\\nKami informasikan saat ini *Host Availability* :" +
"\\n\\n" + listLines +
"\\n\\nTerpantau Dibawah 100% di *" + dashboardName + "*" +
"\\nMohon dibantu pengecekannya, Terima kasih.";

    console.clear();
    console.log("⏳ Menampilkan hasil...");

    // 6. POPUP HASIL
    const overlay = document.createElement('div');
    overlay.id = "hostAvailPopup";
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(13,17,23,0.92); z-index:9999999; display:flex; align-items:center; justify-content:center; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;";

    let listHTML = found.map(h =>
        \`<div style="margin-bottom:10px; border-left:4px solid #da3633; padding-left:14px;">
            <div style="font-size:15px; color:#1a1f23; font-weight:bold;">\${h.label}</div>
            <div style="color:#cf222e; font-weight:600; font-size:13px; margin-top:2px;">Availability: \${h.pct}%</div>
        </div>\`
    ).join('');

    const timeStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    overlay.innerHTML = \`
    <div style="display:flex; max-width:95vw; max-height:90vh; gap:20px;">

        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
            <div style="background:#ffffff; padding:30px 40px; min-width:420px; max-width:560px; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.8); overflow-y:auto; max-height:70vh;">
                <div style="border-bottom:2px solid #f0f0f0; padding-bottom:15px; margin-bottom:20px;">
                    <div style="font-size:12px; font-weight:800; color:#cf222e; letter-spacing:0.5px; text-transform:uppercase;">🖥️ HOST AVAILABILITY ALERT</div>
                    <div style="font-size:22px; color:#0969da; font-weight:bold; margin-top:5px;">\${dashboardName}</div>
                    <div style="font-size:13px; color:#57606a; margin-top:5px;">🕒 \${timeStr} WIB</div>
                </div>
                <div>\${listHTML}</div>
                <div style="margin-top:15px; font-size:11px; color:#57606a; border-top:1px solid #f0f0f0; padding-top:10px;">\${found.length} host di bawah 100% terdeteksi</div>
            </div>
        </div>

        <div style="background:#161b22; padding:20px; border-radius:8px; border:1px solid #30363d; width:440px; display:flex; flex-direction:column; box-shadow:0 10px 30px rgba(0,0,0,0.8);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="color:#3fb950; font-weight:bold;">📝 FORMAT TEKS WHATSAPP</span>
                <button id="closeHAPopup" style="background:transparent; border:none; color:#da3633; font-weight:bold; cursor:pointer; font-size:18px;" title="Tutup popup">X</button>
            </div>
            <div style="color:#8b949e; font-size:11px; margin-bottom:10px; line-height:1.6;">
                ❄️ <b>Layar Dynatrace telah di-Freeze!</b><br>
                1. Copy Teks WA → kirim ke grup.<br>
                2. Tutup popup (X) → Screenshot layar Dynatrace.<br>
                3. Refresh (F5) untuk melanjutkan monitoring.
            </div>
            <textarea id="haWaText" readonly style="flex:1; background:#010409; color:#c9d1d9; border:1px solid #30363d; border-radius:4px; padding:15px; font-size:12px; resize:none; min-height:220px;">\${waText}</textarea>
            <button id="copyHAText" style="margin-top:15px; background:#238636; border:1px solid #2ea043; color:white; padding:12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:13px;">COPY TEKS WA</button>
        </div>
    </div>\`;

    document.body.appendChild(overlay);

    document.getElementById('closeHAPopup').onclick = () => document.body.removeChild(overlay);
    document.getElementById('copyHAText').onclick = (e) => {
        document.getElementById('haWaText').select();
        document.execCommand('copy');
        e.target.innerText = "✅ COPIED!";
        e.target.style.background = "#3fb950";
        setTimeout(() => { e.target.innerText = "COPY TEKS WA"; e.target.style.background = "#238636"; }, 2000);
    };

})();`;
}

function copyHostAvailScript(btn) {
    const script = getHostAvailScriptString();
    navigator.clipboard.writeText(script).then(() => {
        const orig = btn.innerText;
        btn.innerText = "✅ SCRIPT BERHASIL DI-COPY!";
        btn.style.background = "#3fb950";
        btn.style.borderColor = "#3fb950";
        setTimeout(() => {
            btn.innerText = orig;
            btn.style.background = "#238636";
            btn.style.borderColor = "#2ea043";
        }, 2000);
    });
}
