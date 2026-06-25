/**
 * panic_modal.js
 * Fitur: Menampilkan UI Detail dari Interface Panic Button (SITE-A & SITE-B)
 * Termasuk tombol Buka OpManager dan Eskalasi WA.
 */

function createPanicModal() {
    if(document.getElementById('panicDetailModal')) return;
    
    const html = `
    <div id="panicDetailModal" class="modal-overlay" style="z-index: 25000; display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); justify-content: center; align-items: center; backdrop-filter: blur(4px);">
        <div class="modal-box" style="width: 650px; background: #0d1117; border: 1px solid #30363d; box-shadow: 0 0 30px rgba(0,0,0,0.8); border-radius: 8px; padding: 25px; font-family: 'Segoe UI', sans-serif;">
            
            <div class="modal-header" style="border-bottom: 1px solid #30363d; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <span class="modal-title" style="color: #ff7b72; font-size: 16px; font-weight: bold; letter-spacing: 1px;">🚨 PANIC LINK DETAILS</span>
                <button class="modal-close" onclick="closePanicModal()" style="background: none; border: none; color: #8b949e; font-size: 24px; cursor: pointer; padding: 0;">&times;</button>
            </div>
            
            <div style="display:flex; gap:15px; margin-bottom:20px;">
                <div id="panicCardBSD" style="flex:1; background:#161b22; border:1px solid #30363d; border-radius:6px; padding:15px;"></div>
                
                <div id="panicCardSTL" style="flex:1; background:#161b22; border:1px solid #30363d; border-radius:6px; padding:15px;"></div>
            </div>
            
            <div class="modal-actions" style="border-top: 1px solid #30363d; padding-top: 15px; margin-top: 0; display: flex; justify-content: flex-end; gap: 10px;">
                <button onclick="closePanicModal()" style="background: transparent; color: #8b949e; border: 1px solid #30363d; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;">BATAL</button>
                <button onclick="closePanicModal(); escalatePanic();" style="background: #2ea043; border: none; color: white; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; box-shadow: 0 0 10px rgba(46,160,67,0.4);">🚀 ESKALASI WA</button>
            </div>

        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function generatePanicCardHTML(data, siteName) {
    // Jika JSON belum ter-fetch oleh API
    if (!data || typeof data === 'undefined') {
        return `
            <h4 style="color:#c9d1d9; margin:0 0 10px 0; font-size:14px;">${siteName} LINK</h4>
            <p style="color:#f85149; font-size:12px;">⏳ Menunggu data dari API...</p>
        `;
    }

    // Extract adminState dan operState dari data (bisa nested di field lain)
    let adminState = data.adminState || (data.stringStatus || "Unknown");
    let operState = data.operState || (data.stringStatus || "Unknown");

    const admColor = (adminState === "Up" || adminState === "5") ? "#3fb950" : "#f85149";
    const oprColor = (operState === "Up" || operState === "5") ? "#3fb950" : "#f85149";
    
    // --- LINK OPMANAGER EMBER CLIENT SESUAI FORMAT ANDA ---
    // data.name = 10.xxx.xxx.xxx, data.moID = 5403/2402
    const opmLink = `https://opmanager.example.com:8060/apiclient/ember/index.jsp#/Inventory/Snapshot/MonitoringInterface/IF-${data.name}-${data.moID}`;

    return `
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #30363d; padding-bottom:8px; margin-bottom:12px;">
            <span style="font-weight:bold; color:#c9d1d9; font-size:14px;">${siteName} LINK</span>
            <span style="font-size:10px; background:#21262d; border:1px solid #30363d; padding:2px 6px; border-radius:10px; color:#8b949e;">${data.name}</span>
        </div>
        
        <div style="font-size:11px; color:#8b949e; margin-bottom:15px; line-height:1.6;">
            <div><b style="color:#c9d1d9;">Interface:</b> ${data.intfDisplayName || data.ifAlias || '-'}</div>
            <div><b style="color:#c9d1d9;">Availability:</b> <span style="color:#58a6ff;">${data.availability ? data.availability.Up + '%' : '-'}</span></div>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:12px;">
            <div style="flex:1; background:#0d1117; border:1px solid #30363d; border-radius:4px; padding:8px; text-align:center;">
                <div style="font-size:9px; color:#8b949e; margin-bottom:4px;">IN TRAFFIC</div>
                <div style="font-size:13px; color:#58a6ff; font-weight:bold;">${data.inTraffic || '0'}</div>
            </div>
            <div style="flex:1; background:#0d1117; border:1px solid #30363d; border-radius:4px; padding:8px; text-align:center;">
                <div style="font-size:9px; color:#8b949e; margin-bottom:4px;">OUT TRAFFIC</div>
                <div style="font-size:13px; color:#d2a8ff; font-weight:bold;">${data.outTraffic || '0'}</div>
            </div>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:20px;">
            <div style="flex:1; background:#0d1117; border:1px solid #30363d; border-radius:4px; padding:8px; text-align:center;">
                <div style="font-size:9px; color:#8b949e; margin-bottom:4px;">ADMIN STATE</div>
                <div style="font-size:13px; color:${admColor}; font-weight:bold;">${adminState}</div>
            </div>
            <div style="flex:1; background:#0d1117; border:1px solid #30363d; border-radius:4px; padding:8px; text-align:center;">
                <div style="font-size:9px; color:#8b949e; margin-bottom:4px;">OPER STATE</div>
                <div style="font-size:13px; color:${oprColor}; font-weight:bold;">${operState}</div>
            </div>
        </div>

        <a href="${opmLink}" target="_blank" style="display:block; text-align:center; background:#21262d; border:1px solid #30363d; color:#c9d1d9; padding:8px; border-radius:4px; text-decoration:none; font-size:11px; font-weight:bold; transition:0.2s;" onmouseover="this.style.background='#30363d'; this.style.color='#58a6ff';" onmouseout="this.style.background='#21262d'; this.style.color='#c9d1d9';">
            🌐 BUKA DI OPMANAGER
        </a>
    `;
}

function openPanicModal() {
    createPanicModal();
    document.getElementById('panicDetailModal').style.display = 'flex';

    // Load fresh data via script tag, then populate modal
    const old = document.getElementById('_panicModalScript');
    if (old) old.remove();
    const s = document.createElement('script');
    s.id = '_panicModalScript';
    s.src = 'Data_JSON/panic_data.js?t=' + Date.now();
    const populate = () => {
        const p1 = typeof panicData1 !== 'undefined' ? panicData1 : null;
        const p2 = typeof panicData2 !== 'undefined' ? panicData2 : null;
        document.getElementById('panicCardBSD').innerHTML = generatePanicCardHTML(p1, "SITE-A");
        document.getElementById('panicCardSTL').innerHTML = generatePanicCardHTML(p2, "SITE-B");
        if (typeof window._reapplyPanicDots === 'function') window._reapplyPanicDots();
    };
    s.onload = populate;
    s.onerror = () => { s.remove(); populate(); };
    document.head.appendChild(s);
}

function closePanicModal() {
    const m = document.getElementById('panicDetailModal');
    if (m) m.style.display = 'none';
}