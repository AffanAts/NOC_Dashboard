/**
 * page/grafana/grafana_action.js
 * Fokus: Eksekusi tombol aksi pada tiket Grafana (Open, Copy Excel, WA, ITSM)
 * Update: Aturan Teks WA Khusus untuk Status "NO DATA"
 */

function getGrafanaPanelUrl(ipList, moduleName) {
    let ipParams = ipList.map(ip => `&var-nodeip_all=${ip}`).join('');
    let baseUrl = `https://grafana.example.com:3000/d/noc-dash-beta/noc-overview-v2?orgId=1&from=now-1h&to=now&timezone=browser&var-nodeip_green=$__all&var-nodename_green=$__all&var-nodeip_red=$__all&var-nodename_red=$__all${ipParams}&refresh=30s`;

    let panelParam = "";
    if (moduleName === 'CPU') panelParam = "&viewPanel=panel-59";
    else if (moduleName === 'Memory') panelParam = "&viewPanel=panel-60";
    else if (moduleName === 'Availability') panelParam = "&viewPanel=panel-72";

    return baseUrl + panelParam;
}

const MEMORY_SPECIAL_IPS = ["10.30.0.5", "10.30.0.3"];
const MEMORY_SPECIAL_URL = "https://grafana.example.com:3000/d/noc-dash/noc-overview?orgId=1&from=now-1h&to=now&timezone=browser&refresh=1m&viewPanel=panel-60";

function openGrafanaPanel(t) {
    if (!t || !t.ip) return;
    let cleanIp = t.ip.split(':')[0];

    // Memory IP tertentu → URL khusus
    if (t.moduleName === 'Memory' && MEMORY_SPECIAL_IPS.includes(cleanIp)) {
        window.open(MEMORY_SPECIAL_URL, '_blank');
        return;
    }

    let url = getGrafanaPanelUrl([cleanIp], t.moduleName);
    window.open(url, '_blank');
}

function formatGrafanaExcelRowWithFormulaLocal(rowData) {
    let newRow = [...rowData];
    newRow[2] = `=IF(LEN(INDEX(C:C, ROW()))=0, "", IF(LEN(INDEX(D:D, ROW()))=0, "Waiting for Resolution", INT(ABS(INDEX(D:D, ROW())-INDEX(C:C, ROW()))*24) & " hours " & ROUND(MOD(ABS(INDEX(D:D, ROW())-INDEX(C:C, ROW()))*24,1)*60, 0) & " minutes"))`;
    newRow[10] = `=IF(LEN(INDEX(G:G, ROW()))=0, "", IF(LEN(INDEX(D:D, ROW()))=0, "Open", "Close"))`;
    return newRow.join('\t');
}

function copyExcel(btn, data) {
    const textToCopy = formatGrafanaExcelRowWithFormulaLocal(data);
    navigator.clipboard.writeText(textToCopy).then(() => {
        const original = btn.innerText;
        btn.innerText = "COPIED!";
        btn.style.background = "#238636";
        setTimeout(() => {
            btn.innerText = original;
            btn.style.background = "#21262d";
        }, 1000);
    });
}

function showCopyToast(msg) {
    const prev = document.getElementById('_nocCopyToast');
    if (prev) prev.remove();
    if (!document.getElementById('_nocToastStyle')) {
        const s = document.createElement('style');
        s.id = '_nocToastStyle';
        s.textContent = '@keyframes _nocToastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}';
        document.head.appendChild(s);
    }
    const el = document.createElement('div');
    el.id = '_nocCopyToast';
    el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:#1a3d22;color:#aff5b4;border:1px solid #3fb950;border-radius:8px;padding:11px 16px;font-family:Segoe UI,sans-serif;font-size:13px;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,0.5);animation:_nocToastIn 0.25s ease;max-width:320px;min-width:180px;';
    el.innerHTML = `<span style="font-size:15px">✓</span><span style="flex:1;line-height:1.4">${msg}</span><span onclick="this.parentElement.remove()" style="cursor:pointer;opacity:0.6;font-size:14px;padding-left:6px">✕</span>`;
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentElement) el.remove(); }, 4000);
}

function showGrafanaCopyModal(t) {
    const old = document.getElementById('_grafanaCopyModal');
    if (old) old.remove();

    if (!document.getElementById('_grafanaModalStyle')) {
        const s = document.createElement('style');
        s.id = '_grafanaModalStyle';
        s.textContent = '@keyframes _gcmIn{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}@keyframes _gcmCheck{0%{transform:scale(0.4);opacity:0}65%{transform:scale(1.18)}100%{transform:scale(1);opacity:1}}';
        document.head.appendChild(s);
    }

    const detailStr = t.detail ? ' &nbsp;·&nbsp; ' + t.detail : '';
    const html = `
    <div id="_grafanaCopyModal" style="position:fixed;z-index:999999;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;" onclick="if(event.target===this)this.remove()">
        <div style="background:#161b22;border:2px solid #3fb950;border-radius:14px;padding:38px 44px;min-width:320px;max-width:460px;box-shadow:0 0 60px rgba(63,185,80,0.22),0 10px 40px rgba(0,0,0,0.7);text-align:center;animation:_gcmIn 0.22s ease">
            <div style="width:76px;height:76px;border-radius:50%;background:#122b18;border:3px solid #3fb950;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;animation:_gcmCheck 0.38s ease 0.08s both">
                <span style="color:#3fb950;font-size:38px;line-height:1;font-weight:700">✓</span>
            </div>
            <div style="color:#aff5b4;font-size:21px;font-weight:700;letter-spacing:0.3px;margin-bottom:8px">Teks Ter-Copy!</div>
            <div style="color:#8b949e;font-size:13px;margin-bottom:4px">${t.ip} &nbsp;—&nbsp; <b style="color:#c9d1d9">${t.hostname}</b></div>
            <div style="color:#f1e05a;font-size:12px;font-weight:600;margin-bottom:26px">${t.moduleName}${detailStr}</div>
            <div id="_gcmGrafanaStatus" style="color:#58a6ff;font-size:13px;margin-bottom:22px;padding:10px 14px;background:#0d1117;border-radius:8px;border:1px solid #1c3a52;transition:all 0.3s">⏳ Membuka Grafana panel...</div>
            <button onclick="document.getElementById('_grafanaCopyModal').remove()" style="background:#1a3d22;border:1px solid #3fb950;color:#aff5b4;padding:9px 30px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:700;letter-spacing:0.5px">TUTUP</button>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    setTimeout(() => {
        openGrafanaPanel(t);
        const el = document.getElementById('_gcmGrafanaStatus');
        if (el) {
            el.style.color = '#3fb950';
            el.style.borderColor = '#3fb950';
            el.style.background = '#122b18';
            el.innerHTML = '✅ Grafana sudah dibuka di tab baru';
        }
    }, 600);

    setTimeout(() => {
        const el = document.getElementById('_grafanaCopyModal');
        if (el) el.remove();
    }, 5000);
}

function copyWA(btn, t) {
    const ipPart = t.ip.split(':')[0];
    const isPriority = (typeof globalFilterData !== 'undefined' && globalFilterData && globalFilterData.priority && globalFilterData.priority.includes(ipPart)) 
                       || (t.badges && t.badges.includes('Priority')); 
    
    const annisaIPs = [
        "10.30.0.5", "10.30.0.6", "10.30.0.7", "10.30.0.8",
        "10.30.0.9", "10.30.0.10", "10.30.0.11", "10.30.0.12", "10.30.0.13"
    ];
    
    const idhamIPs = [
        "10.30.0.3", "10.30.0.3:10100", "10.30.0.14", "10.30.0.15", "10.30.0.16"
    ];

    let tagsSet = new Set();
    const TAGS = { Giri: "Eng @Giri", Dana: "Eng @Dana", Nina: "Eng @Nina", Sam: "Eng @Sam", John: "Eng @John", IDHAM: "Eng @Idham" };
    
    tagsSet.add(TAGS.Giri);
    tagsSet.add(TAGS.Dana);
    tagsSet.add(TAGS.Sam);
    tagsSet.add(TAGS.John);
    
    if (annisaIPs.includes(ipPart) || annisaIPs.includes(t.ip)) {
        tagsSet.add(TAGS.Nina);
    }

    if (idhamIPs.includes(ipPart) || idhamIPs.includes(t.ip)) {
        tagsSet.add(TAGS.IDHAM);
    }
    
    let tags = Array.from(tagsSet).join('\n');
    
    if (isPriority) {
        tags = "Tim @Helpdesk\n" + tags;
    }

    // Penyesuaian Pesan WA untuk Status NO DATA
    // t.detail untuk no data: "CPU No Data" / "Memory No Data" / "No Data"
    let messageBody = "";
    if (t.detail && t.detail.toLowerCase().includes("no data")) {
        messageBody = `Kami informasikan bahwa saat ini status ${t.moduleName} mengalami No Data`;
    } else {
        messageBody = `Kami informasikan bahwa saat ini ${t.moduleName} more than ${t.limit}%`;
    }

    const msg = `Dear Team\n${tags}\n\n${messageBody}\n\n* ${t.ip} - [${t.hostname}]\n\nBerdasarkan monitoring Grafana.\nMohon bantuannya untuk dilakukan pengecekan lebih lanjut.\n\nTerima kasih.`;
    
    navigator.clipboard.writeText(msg).then(() => {
        const origText = btn.innerText;
        const origBg = btn.style.background;
        btn.innerText = "COPIED!";
        btn.style.background = "#3fb950";
        showGrafanaCopyModal(t);
        setTimeout(() => { btn.innerText = origText; btn.style.background = origBg; }, 2000);
    });
}

function showItsmPopup(t) {
    const old = document.getElementById('itsmPopup');
    if(old) old.remove();

    const summary = `Grafana - ${t.assign} - ${t.hostname} (${t.ip})`;
    const description = `Dear Team,\n\nMenginformasikan terdapat ${t.detail}\n\n- ${t.ip} [${t.hostname}]\n\nMohon dibantu Pengecekannya\nTerima Kasih`;
    const itsmLink = "https://itsm.example.com/servicedesk/customer/portal/13/create/213";

    window.copyItsmItemGrafana = function(element, textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalHTML = element.innerHTML;
            element.innerHTML = `<span style="color: #3fb950; font-weight: bold;">✔ COPIED!</span>`;
            element.style.borderColor = "#3fb950";
            setTimeout(() => {
                element.innerHTML = originalHTML;
                element.style.borderColor = "#30363d";
            }, 1000);
        });
    };

    const popupHTML = `
    <div id="itsmPopup" style="position: fixed; z-index: 10001; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; font-family: 'Consolas', monospace;">
        <div style="background: #161b22; width: 500px; border: 1px solid #30363d; border-radius: 8px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <h3 style="color: #f1e05a; margin-top: 0; border-bottom: 1px solid #30363d; padding-bottom: 10px; font-size: 16px;">🎫 ITSM HELPER</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="color: #8b949e; font-size: 11px;">ITSM WEB (Click to Copy):</label><br>
                <div style="background: #010409; padding: 8px; border-radius: 4px; border: 1px solid #30363d; color: #58a6ff; font-size: 11px; margin-top: 5px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s;" 
                     onclick="copyItsmItemGrafana(this, '${itsmLink}')">${itsmLink}</div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="color: #8b949e; font-size: 11px;">SUMMARY (Click to Copy):</label>
                <div style="background: #010409; padding: 8px; border-radius: 4px; border: 1px solid #30363d; color: #c9d1d9; font-size: 12px; margin-top: 5px; cursor: pointer; transition: all 0.2s;" 
                     onclick="copyItsmItemGrafana(this, \`${summary}\`)">${summary}</div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="color: #8b949e; font-size: 11px;">TELEPON (Click to Copy):</label>
                <div style="background: #010409; padding: 8px; border-radius: 4px; border: 1px solid #30363d; color: #3fb950; font-size: 13px; font-weight: bold; margin-top: 5px; cursor: pointer; display: inline-block; transition: all 0.2s;"
                     onclick="copyItsmItemGrafana(this, '081200000000')">081200000000</div>
            </div>
            
            <div style="margin-bottom: 20px; position: relative;">
                <label id="descLabelGrafana" style="color: #8b949e; font-size: 11px; transition: all 0.2s;">DESCRIPTION (Click to Copy):</label>
                <textarea readonly style="background: #010409; width: 100%; height: 130px; border: 1px solid #30363d; color: #c9d1d9; font-size: 11px; padding: 8px; border-radius: 4px; resize: none; margin-top: 5px; cursor: pointer; transition: all 0.2s; outline: none; box-sizing: border-box;" 
                          onclick="this.select(); navigator.clipboard.writeText(this.value); const lbl = document.getElementById('descLabelGrafana'); const origLbl = lbl.innerHTML; lbl.innerHTML = '<span style=\\'color: #3fb950; font-weight: bold;\\'>✔ COPIED!</span>'; this.style.borderColor = '#3fb950'; setTimeout(() => { lbl.innerHTML = origLbl; this.style.borderColor = '#30363d'; }, 1000);">${description}</textarea>
                <div style="text-align: right; font-size: 9px; color: #8b949e; margin-top: 2px;">*Teks akan otomatis ter-copy saat di-klik</div>
            </div>
            
            <div style="text-align: right;">
                <button onclick="document.getElementById('itsmPopup').remove()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">CLOSE</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', popupHTML);
}