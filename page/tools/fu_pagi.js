/**
 * page/tools/fu_pagi.js
 * Follow Up Pagi — Verifikasi tiket, Export Excel (ALL rows), Disk Alert Export, WhatsApp Eskalasi
 */

const FU_WA_RECIPIENTS = [
    { name: 'IT Helpdesk',       number: '6281200000001', sapaan: 'team' },
    { name: 'John Doe',    number: '6281200000002', sapaan: 'Bro'  },
    { name: 'Engineer A',        number: '6281200000003', sapaan: 'Mas'  },
    { name: 'Sam Lee', number: '6281200000004', sapaan: 'Mas'  },
    { name: 'Engineer B',         number: '6281200000005', sapaan: 'Mas'  },
    { name: 'Engineer C',         number: '6281200000006', sapaan: 'Mba'  },
];

function _fuDateStr() {
    const now = new Date();
    const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus',
                    'September','Oktober','November','Desember'];
    return `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

function openFuPagi() {
    const old = document.getElementById('fuPagiModal');
    if (old) old.remove();

    const dateStr = _fuDateStr();

    const html = `
    <div id="fuPagiModal" style="
        display:flex; position:fixed; z-index:11000; inset:0;
        background:#0d1117; flex-direction:column; font-family:'Segoe UI',system-ui,sans-serif;
        overflow:hidden;">

        <!-- ══ HEADER ══ -->
        <div style="
            padding:0 32px; height:56px; background:#161b22;
            border-bottom:1px solid #30363d;
            display:flex; justify-content:space-between; align-items:center;
            flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:20px;">☀️</span>
                <div>
                    <div style="color:#f1e05a; font-weight:700; font-size:15px; letter-spacing:0.3px;">FOLLOW UP PAGI</div>
                    <div style="color:#484f58; font-size:11px; margin-top:1px;">Verifikasi Tiket &amp; Disk Alert — ${dateStr}</div>
                </div>
            </div>
            <button onclick="closeFuPagi()" style="
                background:transparent; border:1px solid #30363d; color:#8b949e;
                padding:6px 18px; border-radius:6px; font-size:12px; font-weight:600;
                cursor:pointer; transition:all 0.15s; letter-spacing:0.3px;"
                onmouseover="this.style.background='#21262d';this.style.borderColor='#8b949e';this.style.color='#c9d1d9';"
                onmouseout="this.style.background='transparent';this.style.borderColor='#30363d';this.style.color='#8b949e';">
                ← Kembali
            </button>
        </div>

        <!-- ══ BODY ══ -->
        <div style="flex:1; display:flex; padding:28px 32px; gap:24px; overflow-y:auto; align-items:flex-start; flex-wrap:wrap;">

            <!-- ── KOLOM KIRI: Input Data ── -->
            <div style="width:360px; flex-shrink:0; display:flex; flex-direction:column; gap:16px;">

                <!-- Card: Tiket -->
                <div style="
                    background:#161b22; border:1px solid #21262d;
                    border-top:2px solid #8957e5;
                    border-radius:10px; overflow:hidden;">
                    <div style="padding:14px 18px 10px; display:flex; align-items:center; gap:8px; border-bottom:1px solid #21262d;">
                        <span style="font-size:14px;">🎫</span>
                        <span style="color:#c9d1d9; font-size:12px; font-weight:700; letter-spacing:0.4px;">DATA TIKET</span>
                        <span style="margin-left:auto; color:#484f58; font-size:10px;">Blok 4 kolom dari Excel → Paste</span>
                        <button onclick="fuPasteDummy()" style="
                            background:transparent; border:1px dashed #30363d; color:#484f58;
                            padding:3px 10px; border-radius:5px; font-size:10px; cursor:pointer;
                            transition:all 0.15s; margin-left:8px;"
                            onmouseover="this.style.borderColor='#8957e5';this.style.color='#a371f7';"
                            onmouseout="this.style.borderColor='#30363d';this.style.color='#484f58';"
                            title="Isi dengan data dummy untuk demo">📋 Dummy</button>
                    </div>
                    <div style="padding:14px 18px; display:flex; flex-direction:column; gap:10px;">
                        <textarea id="fuTicketInput" wrap="off"
                            placeholder="[Tanggal]&#9;[Case]&#9;[Detail Issue]&#9;[IP Address]"
                            style="height:140px; background:#0d1117; border:1px solid #30363d;
                                   color:#79c0ff; padding:10px 12px; border-radius:6px;
                                   resize:vertical; font-size:11.5px; font-family:'Consolas',monospace;
                                   line-height:1.7; outline:none; width:100%; box-sizing:border-box;
                                   transition:border-color 0.15s;"
                            onfocus="this.style.borderColor='#8957e5'"
                            onblur="this.style.borderColor='#30363d'"></textarea>
                        <button onclick="fuVerifyTickets()" style="
                            background:linear-gradient(135deg,#8957e5,#a371f7);
                            border:none; color:white; padding:11px 16px;
                            border-radius:7px; cursor:pointer; font-weight:700;
                            font-size:12.5px; letter-spacing:0.4px; transition:opacity 0.15s;"
                            onmouseover="this.style.opacity='0.85'"
                            onmouseout="this.style.opacity='1'">
                            🎫 &nbsp;VERIFY &amp; EXPORT TICKETS
                        </button>
                        <div id="fuTicketStatus" style="font-size:11px; color:#8b949e; min-height:18px; padding:0 2px;"></div>
                    </div>
                </div>

                <!-- Card: Disk -->
                <div style="
                    background:#161b22; border:1px solid #21262d;
                    border-top:2px solid #e3b341;
                    border-radius:10px; overflow:hidden;">
                    <div style="padding:14px 18px 10px; display:flex; align-items:center; gap:8px; border-bottom:1px solid #21262d;">
                        <span style="font-size:14px;">💾</span>
                        <span style="color:#c9d1d9; font-size:12px; font-weight:700; letter-spacing:0.4px;">DATA DISK USAGE</span>
                        <span style="margin-left:auto; color:#484f58; font-size:10px;">Filter LAST ≥ 70%</span>
                    </div>
                    <div style="padding:14px 18px; display:flex; flex-direction:column; gap:10px;">
                        <div style="background:#0d1117; border:1px solid #21262d; border-radius:6px; padding:10px 14px; font-size:11px; color:#8b949e; line-height:1.6;">
                            Sumber: <span style="color:#e3b341;">Data Monitoring Realtime</span> — 4 jam terakhir dari Grafana
                        </div>
                        <button onclick="fuLoadDiskFromMonitoring()" style="
                            background:linear-gradient(135deg,#1a3a5c,#1f6feb);
                            border:none; color:white; padding:10px 16px;
                            border-radius:7px; cursor:pointer; font-weight:700;
                            font-size:12px; letter-spacing:0.4px; transition:opacity 0.15s;"
                            onmouseover="this.style.opacity='0.85'"
                            onmouseout="this.style.opacity='1'">
                            🔄 &nbsp;Muat dari Monitoring
                        </button>
                        <div id="fuDiskLoadStatus" style="font-size:11px; color:#8b949e; min-height:16px; padding:0 2px;"></div>
                        <button onclick="fuExportDisk()" id="fuDiskExportBtn" disabled style="
                            background:linear-gradient(135deg,#b45309,#d97706);
                            border:none; color:white; padding:11px 16px;
                            border-radius:7px; cursor:pointer; font-weight:700;
                            font-size:12.5px; letter-spacing:0.4px; transition:opacity 0.15s;
                            opacity:0.4;"
                            onmouseover="if(!this.disabled)this.style.opacity='0.85'"
                            onmouseout="if(!this.disabled)this.style.opacity='1'">
                            💾 &nbsp;EXPORT DISK ALERT
                        </button>
                        <div id="fuDiskStatus" style="font-size:11px; color:#8b949e; min-height:18px; padding:0 2px;"></div>
                    </div>
                </div>

            </div>

            <!-- ── KOLOM KANAN: Pesan & WA ── -->
            <div style="flex:1; min-width:320px; display:flex; flex-direction:column; gap:16px;">

                <!-- Card: Pesan FU + WA (gabung) -->
                <div style="
                    background:#161b22; border:1px solid #21262d;
                    border-top:2px solid #25D366;
                    border-radius:10px; overflow:hidden;">
                    <div style="padding:14px 18px 10px; display:flex; align-items:center; gap:8px; border-bottom:1px solid #21262d;">
                        <span style="font-size:14px;">💬</span>
                        <span style="color:#c9d1d9; font-size:12px; font-weight:700; letter-spacing:0.4px;">PESAN FOLLOW UP</span>
                        <span style="margin-left:auto; color:#484f58; font-size:10px;">⚠ Lampiran file dikirim manual</span>
                    </div>
                    <div style="padding:12px 18px 16px; display:flex; flex-direction:column; gap:10px;">
                        ${FU_WA_RECIPIENTS.map((r, i) => {
                            const closing = r.sapaan === 'Mba'
                                ? `Mohon dibantu pengecekan dan updatenya mba. Terima kasih`
                                : `Mohon dibantu pengecekan dan updatenya. Terima kasih`;
                            const preview = `Selamat Pagi ${r.sapaan}, mohon maaf mengganggu waktunya, izin mengirim data alert yang tiketnya masih status open dan overall disk usage di atas 70% per tanggal ${dateStr}\n${closing}`;
                            return `
                            <div style="background:#0d1117; border:1px solid #21262d; border-radius:8px; overflow:hidden;">
                                <div style="padding:8px 12px 8px; display:flex; align-items:center; gap:8px; border-bottom:1px solid #21262d;">
                                    <div style="flex:1;">
                                        <span style="color:#e6edf3; font-size:12px; font-weight:600;">${r.name}</span>
                                        <span style="color:#484f58; font-size:10px; font-family:'Consolas',monospace; margin-left:8px;">${r.number.replace('62','0')}</span>
                                    </div>
                                    <button onclick="sendFuEskalasi(${i})" style="
                                        background:#0d4a1f; border:1px solid #238636; color:#3fb950;
                                        padding:5px 14px; border-radius:6px; cursor:pointer;
                                        font-size:11px; font-weight:700; white-space:nowrap;
                                        flex-shrink:0; transition:all 0.15s;"
                                        onmouseover="this.style.background='#238636';this.style.color='white';"
                                        onmouseout="this.style.background='#0d4a1f';this.style.color='#3fb950';">
                                        💬 Kirim WA
                                    </button>
                                </div>
                                <div style="padding:10px 12px; color:#8b949e; font-size:11px; line-height:1.7; white-space:pre-wrap;">${preview}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>

            </div>

        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
}

function closeFuPagi() {
    const el = document.getElementById('fuPagiModal');
    if (el) el.remove();
}

// ─── DUMMY DATA PASTE ──────────────────────────────────────────────────────────

function fuPasteDummy() {
    const today = _fuDateStr();
    const rows = [
        [today, 'INC-20240001', 'CPU usage tinggi > 90% sustained 15 menit', '10.20.0.101'],
        [today, 'INC-20240002', 'Disk usage partition /data mencapai 87%', '10.20.2.13'],
        [today, 'INC-20240003', 'Interface Down GigabitEthernet0/0/5 link flapping', '10.20.1.216'],
        [today, 'INC-20240004', 'Memory usage tinggi > 85% aplikasi payment lambat', '10.20.0.19'],
        [today, 'INC-20240005', 'Device Down no response from device 5 polls', '10.20.2.14'],
        [today, 'INC-20240006', 'Disk usage partition /var/log full 95%', '10.20.5.107'],
    ];
    document.getElementById('fuTicketInput').value = rows.map(r => r.join('\t')).join('\n');
    document.getElementById('fuTicketStatus').innerHTML = '<span style="color:#f1e05a;">🔄 Loading dummy data...</span>';
    fuVerifyTickets();
}

// ─── VERIFY TICKETS ────────────────────────────────────────────────────────────

async function fuVerifyTickets() {
    const inputText = document.getElementById('fuTicketInput').value.trim();
    if (!inputText) return;

    const statusEl = document.getElementById('fuTicketStatus');
    statusEl.innerHTML = '<span style="color:#f1e05a;">🔄 Verifying...</span>';

    try {
        const [opmResp, utilResp, filtResp, invResp, rvResp] = await Promise.all([
            fetch('Data_JSON/history_opmanager.json?t=' + Date.now()),
            fetch('Data_JSON/history_utilization.json?t=' + Date.now()),
            fetch('Data_JSON/filter.json?t=' + Date.now()),
            fetch('Data_JSON/opmanager_inventory.json?t=' + Date.now()),
            fetch('Data_JSON/RVTOOLS.json?t=' + Date.now()).catch(() => null)
        ]);

        const opmData       = await opmResp.json();
        const utilData      = await utilResp.json();
        const filterDataObj = await filtResp.json();
        const invData       = await invResp.json();

        let megaKamus = {}, opmIpMap = {}, opmNameKamus = {};
        if (invData.rows) {
            invData.rows.forEach(i => {
                const invIp   = (i.ipaddress   || "").trim();
                const invName = (i.displayName || "").trim();
                opmIpMap[invName] = invIp;
                if (invIp && invName) { megaKamus[invIp] = invName; opmNameKamus[invIp] = invName; }
            });
        }
        window.opmNameKamus = opmNameKamus;

        if (rvResp && rvResp.ok) {
            const rvData = await rvResp.json();
            const rvKamus = {};
            Object.keys(rvData).forEach(ip => { megaKamus[ip] = rvData[ip].VM; rvKamus[ip] = rvData[ip].VM; });
            window.fuRvKamus = rvKamus;
        }

        window.ticketFilterData = filterDataObj;

        let realAppOpm = [], closedAppOpm = [];
        Object.values(opmData).forEach(t => {
            let ip     = (t.IP_ADDRESS || opmIpMap[t.HOSTNAME] || "").split(':')[0].trim();
            let vmName = megaKamus[ip] || t.HOSTNAME || "Unknown";
            if (t.STATUS === 'OPEN') realAppOpm.push({ ip, hostname: vmName, detail: t.DETAIL_ISSUE, type: 'OPM', rawT: t });
            else closedAppOpm.push({ ip, hostname: vmName, detail: t.DETAIL_ISSUE, type: 'OPM', rawT: t, solveTs: t.SOLVE_TS || 0 });
        });
        window.realAppOpmData   = realAppOpm;
        window.closedAppOpmData = closedAppOpm;

        let realAppGrafana = [];
        (window.liveGrafanaAlerts || []).forEach(g => {
            let ip   = (g.ip || "").split(':')[0].trim();
            if (!ip) return;
            let type = g.moduleName === 'Availability' ? 'AVA' : g.moduleName === 'CPU' ? 'CPU' : 'MEM';
            realAppGrafana.push({ ip, hostname: megaKamus[ip] || g.hostname || "Unknown", type, detail: g.detail, rawT: g });
        });
        if (realAppGrafana.length === 0 && utilData) {
            ['AVA', 'CPU', 'MEM'].forEach(mod => {
                if (utilData[mod]) {
                    Object.keys(utilData[mod]).forEach(ipStr => {
                        let ip = ipStr.split(':')[0].trim();
                        realAppGrafana.push({ ip, hostname: megaKamus[ip] || "Unknown", type: mod, detail: mod + ' alert' });
                    });
                }
            });
        }
        window.realAppGrafanaData = realAppGrafana;

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
            let cleanIssue  = rawIssue.replace(/["']/g, "");
            let status      = 'CLOSE';
            let isFound     = false;
            let issueLower  = cleanIssue.toLowerCase();
            let caseLower   = caseStr.toLowerCase();

            let checkGrafana = caseLower.includes('grafana');
            let checkOPM     = caseLower.includes('opmanager') || caseLower.includes('opm');
            if (!checkGrafana && !checkOPM) { checkGrafana = true; checkOPM = true; }

            let matchPrefix = "No Keyword", sourceTag = "UNKNOWN", matchedAlarmId = "";

            if (checkGrafana && ip && !isFound) {
                let gAva = realAppGrafana.some(g => g.ip === ip && g.type === 'AVA');
                let gCpu = realAppGrafana.some(g => g.ip === ip && g.type === 'CPU');
                let gMem = realAppGrafana.some(g => g.ip === ip && g.type === 'MEM');

                if (caseLower.includes('cpu') || issueLower.includes('cpu')) {
                    matchPrefix = 'Grafana-CPU'; sourceTag = 'GRAFANA';
                    if (gCpu) { status = 'OPEN'; isFound = true; }
                } else if (caseLower.includes('memory') || caseLower.includes('mem') || issueLower.includes('memory') || issueLower.includes('mem')) {
                    matchPrefix = 'Grafana-MEM'; sourceTag = 'GRAFANA';
                    if (gMem) { status = 'OPEN'; isFound = true; }
                } else if (caseLower.includes('ava') || caseLower.includes('ping') || caseLower.includes('down') || issueLower.includes('down') || issueLower.includes('ping') || issueLower.includes('ava')) {
                    matchPrefix = 'Grafana-AVA'; sourceTag = 'GRAFANA';
                    if (gAva) { status = 'OPEN'; isFound = true; }
                }
            }

            if (checkOPM && ip && !isFound) {
                if (cleanIssue) {
                    let words   = cleanIssue.split(/\s+/).filter(w => w.length > 0);
                    let baseKw  = words.slice(0, 2).join(' ').toLowerCase();
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

                    for (let tObj of realAppOpm) {
                        if (tObj.ip === ip) {
                            let tIssueLower  = (tObj.detail || "").toLowerCase().replace(/'/g, "");
                            let matchedBase  = searchKeywords.find(kw => tIssueLower.includes(kw));
                            if (matchedBase) {
                                if (specificId && !tIssueLower.includes(specificId)) continue;
                                let isExcelWmi = issueLower.includes('[wmi]');
                                if (isExcelWmi !== tIssueLower.includes('[wmi]')) continue;
                                let isExcelFc  = issueLower.includes('expected');
                                if (isExcelFc !== tIssueLower.includes('expected')) continue;
                                let extraTag   = (isExcelWmi ? ' [WMI]' : '') + (isExcelFc ? ' Forecast' : '');
                                status = 'OPEN'; isFound = true;
                                matchPrefix = `OPM: "${matchedBase}${specificId ? ' ' + specificId : ''}${extraTag}"`;
                                sourceTag = 'OPM'; matchedAlarmId = tObj.rawT.ALARM_ID;
                                break;
                            }
                        }
                    }

                    if (!isFound) {
                        let sortedClose = [...closedAppOpm].sort((a, b) => b.solveTs - a.solveTs);
                        for (let tObj of sortedClose) {
                            if (tObj.ip === ip) {
                                let tIssueLower  = (tObj.detail || "").toLowerCase().replace(/'/g, "");
                                let matchedBase  = searchKeywords.find(kw => tIssueLower.includes(kw));
                                if (matchedBase) {
                                    if (specificId && !tIssueLower.includes(specificId)) continue;
                                    let isExcelWmi = issueLower.includes('[wmi]');
                                    if (isExcelWmi !== tIssueLower.includes('[wmi]')) continue;
                                    let isExcelFc  = issueLower.includes('expected');
                                    if (isExcelFc !== tIssueLower.includes('expected')) continue;
                                    let extraTag   = (isExcelWmi ? ' [WMI]' : '') + (isExcelFc ? ' Forecast' : '');
                                    matchPrefix = `OPM: "${matchedBase}${specificId ? ' ' + specificId : ''}${extraTag}"`;
                                    sourceTag = 'OPM'; matchedAlarmId = tObj.rawT.ALARM_ID;
                                    break;
                                }
                            }
                        }
                    }
                }

                if (!isFound && !cleanIssue) {
                    let openT = realAppOpm.find(t => t.ip === ip);
                    if (openT) {
                        status = 'OPEN'; isFound = true; matchPrefix = 'OPM: Any Open'; sourceTag = 'OPM';
                        matchedAlarmId = openT.rawT.ALARM_ID;
                    } else {
                        let closeT = [...closedAppOpm].sort((a, b) => b.solveTs - a.solveTs).find(t => t.ip === ip);
                        if (closeT) { sourceTag = 'OPM'; matchedAlarmId = closeT.rawT.ALARM_ID; }
                    }
                }

                if (!matchedAlarmId && ip) {
                    let fallback = [...closedAppOpm].sort((a, b) => b.solveTs - a.solveTs).find(t => t.ip === ip) || realAppOpm.find(t => t.ip === ip);
                    if (fallback && fallback.rawT) matchedAlarmId = fallback.rawT.ALARM_ID;
                }
            }

            if (sourceTag === "UNKNOWN") sourceTag = caseLower.includes('opm') ? 'OPM' : 'GRAFANA';

            let parsedDateMs = new Date(dateStr).getTime();
            if (isNaN(parsedDateMs)) parsedDateMs = i;

            tempTickets.push({
                dateStr, timestamp: parsedDateMs, caseStr, ip,
                hostname: megaKamus[ip] || "Unknown Host",
                detail: cleanIssue, status, matchPrefix, source: sourceTag,
                isDup: false, matchedAlarmId
            });
        }

        // Tandai duplikat
        let keyCounts = {};
        tempTickets.forEach(t => {
            if (t.ip && t.matchPrefix !== "No Keyword" && !t.matchPrefix.includes("Any Open")) {
                let k = t.ip + "||" + t.matchPrefix;
                keyCounts[k] = (keyCounts[k] || 0) + 1;
            }
        });
        tempTickets.forEach(t => { if (keyCounts[t.ip + "||" + t.matchPrefix] > 1) t.isDup = true; });

        window.globalTicketVerifierData = tempTickets;

        const openCount  = tempTickets.filter(t => t.status === 'OPEN').length;
        const closeCount = tempTickets.filter(t => t.status === 'CLOSE').length;

        // Langsung export — tidak tampilkan tabel
        _fuExportTicketExcel(tempTickets);

        statusEl.innerHTML = `<span style="color:#3fb950;">✓ Done: ${tempTickets.length} rows — <span style="color:#f85149;">${openCount} OPEN</span> / <span style="color:#3fb950;">${closeCount} CLOSE</span> — File terdownload.</span>`;

    } catch(e) {
        statusEl.innerHTML = `<span style="color:#f85149;">❌ Error: ${e.message}</span>`;
    }
}

// ─── EXPORT TIKET EXCEL (ALL rows — OPEN + CLOSE) ─────────────────────────────

function _fuExportTicketExcel(tickets) {
    if (!tickets || tickets.length === 0) {
        alert('Tidak ada data tiket untuk diekspor.');
        return;
    }

    const sortByDetail  = arr => [...arr].sort((a, b) => (a.detail || '').localeCompare(b.detail || ''));
    const allGrafana    = sortByDetail(tickets.filter(t => t.source === 'GRAFANA'));
    const allOpm        = sortByDetail(tickets.filter(t => t.source === 'OPM'));

    function assignee(t) {
        const isIface = /(interface)/i.test(t.caseStr || '') || /(interface)/i.test(t.detail || '');
        return (t.source === 'OPM' && isIface) ? 'Network' : 'Infra';
    }

    const opmNames = window.opmNameKamus || {};
    const HEADERS  = ['Issue Date', 'Case', 'Detail Issue', 'IP Address', 'Device Name', 'Assignee'];
    const toRow = (t, useOpmName = false) => [
        t.dateStr || '', t.caseStr || '', t.detail || '', t.ip || '',
        (useOpmName ? (opmNames[t.ip] || t.hostname) : t.hostname) || 'Not Found',
        assignee(t)
    ];

    // style index: 0=separator, 1=data-border, 2=grafana-hdr, 3=opm-hdr, 4=col-hdr
    const rows = [];
    const addRow = (values, style = 1) => rows.push({ values, style });

    addRow(['GRAFANA ALERTS', '', '', '', '', ''], 2);
    addRow(HEADERS, 4);
    if (allGrafana.length > 0) allGrafana.forEach(t => addRow(toRow(t), 1));
    else addRow(['(Tidak ada alert Grafana)', '', '', '', '', '']);

    rows.push({ values: ['', '', '', '', '', ''], style: 0 });

    addRow(['OPMANAGER ALERTS', '', '', '', '', ''], 3);
    addRow(HEADERS, 4);
    if (allOpm.length > 0) allOpm.forEach(t => addRow(toRow(t, true), 1));
    else addRow(['(Tidak ada alert OpManager)', '', '', '', '', '']);

    const dateStr  = _fuDateStr();
    const filename = `Alert Open (${dateStr}).xlsx`;

    try {
        const bytes = _fuBuildTicketXlsx(rows, 6);
        _fuXlsxDownload(bytes, filename);
    } catch(e) {
        alert('Gagal membuat file Excel tiket: ' + e.message);
    }
}

// ─── EXPORT DISK ALERT ────────────────────────────────────────────────────────

let _fuDiskMonitoringRows = [];

async function fuLoadDiskFromMonitoring() {
    const loadEl = document.getElementById('fuDiskLoadStatus');
    const exportBtn = document.getElementById('fuDiskExportBtn');
    loadEl.innerHTML = '<span style="color:#f1e05a;">🔄 Memuat data dari monitoring...</span>';
    exportBtn.disabled = true;
    exportBtn.style.opacity = '0.4';
    _fuDiskMonitoringRows = [];

    try {
        const resp = await fetch('Data_JSON/disk_data.js?t=' + Date.now());
        if (!resp.ok) throw new Error('disk_data.js tidak ditemukan');
        const text = await resp.text();

        // Evaluasi file JS untuk dapat dataDisk1 & dataDisk2
        let d1, d2;
        try {
            const fn = new Function(
                text.replace(/\bvar\s+dataDisk1\b/, 'var _fd1')
                    .replace(/\bvar\s+dataDisk2\b/, 'var _fd2')
                + '; return { d1: typeof _fd1!=="undefined"?_fd1:null, d2: typeof _fd2!=="undefined"?_fd2:null };'
            );
            ({ d1, d2 } = fn());
        } catch(e) { throw new Error('Gagal parse disk_data.js: ' + e.message); }

        // Parse frames dari kedua datasource
        function parseFrames(resp) {
            if (!resp) return [];
            const out = [];
            for (const f of (resp?.results?.A?.frames ?? [])) {
                const lbl   = f.schema?.fields?.[1]?.labels ?? {};
                const ipFull = lbl.instance ?? '';
                const ip    = ipFull.split(':')[0];
                const mount = lbl.mountpoint ?? '/';
                if (!ip) continue;
                const vals = (f.data?.values?.[1] ?? []).filter(v => v != null && !isNaN(v));
                if (!vals.length) continue;
                out.push({
                    ipFull, ip, mount,
                    min:  Math.min(...vals),
                    max:  Math.max(...vals),
                    mean: vals.reduce((a, b) => a + b, 0) / vals.length,
                    last: vals[vals.length - 1]
                });
            }
            return out;
        }

        let rows = [...parseFrames(d1), ...parseFrames(d2)];
        rows = rows.filter(r => r.last >= 70).sort((a, b) => b.last - a.last);

        // Ambil hostname dari RVTOOLS
        let hostnameKamus = {};
        if (window.fuRvKamus) {
            hostnameKamus = { ...window.fuRvKamus };
        } else {
            try {
                const rv = await fetch('Data_JSON/RVTOOLS.json?t=' + Date.now());
                if (rv.ok) {
                    const rvData = await rv.json();
                    Object.keys(rvData).forEach(ip => { hostnameKamus[ip] = rvData[ip].VM; });
                    window.fuRvKamus = { ...hostnameKamus };
                }
            } catch(e) {}
        }
        rows.forEach(r => { r.hostname = hostnameKamus[r.ip] || ''; });

        _fuDiskMonitoringRows = rows;
        const crit = rows.filter(r => r.last >= 85).length;
        loadEl.innerHTML = `<span style="color:#3fb950;">✓ ${rows.length} entri dimuat — ${crit} kritis · ${rows.length - crit} warning</span>`;
        exportBtn.disabled = false;
        exportBtn.style.opacity = '1';
    } catch(e) {
        loadEl.innerHTML = `<span style="color:#f85149;">❌ ${e.message}</span>`;
    }
}

async function fuExportDisk() {
    const statusEl = document.getElementById('fuDiskStatus');
    if (!_fuDiskMonitoringRows.length) {
        statusEl.innerHTML = '<span style="color:#f85149;">Muat data dari monitoring terlebih dahulu.</span>';
        return;
    }
    try {
        const dateStr  = _fuDateStr();
        const filename = `Disk Alert (${dateStr}).xlsx`;
        const bytes    = _fuBuildDiskXlsx(_fuDiskMonitoringRows, dateStr);
        _fuXlsxDownload(bytes, filename);
        statusEl.innerHTML = `<span style="color:#3fb950;">✓ ${_fuDiskMonitoringRows.length} entri — File terdownload.</span>`;
    } catch(e) {
        statusEl.innerHTML = `<span style="color:#f85149;">❌ Error: ${e.message}</span>`;
    }
}

function _fuParseDisk(raw) {
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const results = [];

    for (let i = 0; i < lines.length - 1; i++) {
        const headerLine = lines[i];
        const valueLine  = lines[i + 1];

        // Baris header: IP:PORT /mount  (punya karakter / atau IP:PORT)
        const headerMatch = headerLine.match(/^(\S+:\d+)\s+(\S+)$/);
        if (!headerMatch) continue;

        // Baris nilai: 4 angka persen (tab atau spasi)
        const vals = valueLine.split(/[\t\s]+/).map(v => parseFloat(v.replace('%', '')));
        if (vals.length < 4 || vals.some(isNaN)) continue;

        const ipFull = headerMatch[1]; // contoh 10.30.0.20:9100
        const ip     = ipFull.split(':')[0];
        const mount  = headerMatch[2];

        results.push({
            ipFull, ip, mount,
            min:  vals[0],
            max:  vals[1],
            mean: vals[2],
            last: vals[3]
        });
        i++; // Skip baris nilai
    }

    // Sort by LAST desc
    return results.sort((a, b) => b.last - a.last);
}

// ─── EXCEL BUILDERS ───────────────────────────────────────────────────────────

function _fuBuildDiskXlsx(rows, dateStr) {
    // Styles: 0=no-border, 1=data, 2=header-section, 3=col-hdr, 4=alert-critical(>=90), 5=alert-warning(>=80)
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1565C0"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF37474F"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC62828"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF57F17"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE65100"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/></cellXfs></styleSheet>`;

    const exRows = [];
    const addRow = (values, style = 1) => exRows.push({ values, style });

    // Title row — 7 kolom sekarang
    addRow([`Disk Usage Alert — ${dateStr}`, '', '', '', '', '', ''], 2);
    addRow(['Threshold: LAST ≥ 70%', '', '', '', '', '', ''], 0);
    exRows.push({ values: ['', '', '', '', '', '', ''], style: 0 });

    // Header: Name (IP:PORT /mount) | Hostname | MIN | MEAN | MAX | LAST
    addRow(['Name', 'Hostname', 'Mount Point', 'MIN', 'MEAN', 'MAX', 'LAST'], 3);

    // Data rows — warna berdasarkan LAST
    rows.forEach(r => {
        const style = r.last >= 85 ? 4 : 5;
        addRow([
            r.ipFull,
            r.hostname || '',
            r.mount,
            `${r.min.toFixed(1)}%`,
            `${r.mean.toFixed(1)}%`,
            `${r.max.toFixed(1)}%`,
            `${r.last.toFixed(1)}%`
        ], style);
    });

    // A=Name(IP:PORT /mount), B=Hostname, C=Mount, D=MIN, E=MEAN, F=MAX, G=LAST
    const colWidths = '<cols>'
        + '<col min="1" max="1" width="32" customWidth="1"/>'
        + '<col min="2" max="2" width="26" customWidth="1"/>'
        + '<col min="3" max="3" width="22" customWidth="1"/>'
        + '<col min="4" max="4" width="10" customWidth="1"/>'
        + '<col min="5" max="5" width="10" customWidth="1"/>'
        + '<col min="6" max="6" width="10" customWidth="1"/>'
        + '<col min="7" max="7" width="10" customWidth="1"/>'
        + '</cols>';

    return _fuBuildXlsxRaw(exRows, stylesXml, colWidths, 'Disk Alert', 7);
}

function _fuBuildTicketXlsx(rows, colCount) {
    // Styles: 0=no-border, 1=data, 2=grafana-hdr, 3=opm-hdr, 4=col-hdr, 5=open-row, 6=close-row
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="8"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1565C0"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B5E20"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF37474F"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC62828"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B5E20"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF37474F"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/></cellXfs></styleSheet>`;

    const colWidths = '<cols><col min="1" max="1" width="16" customWidth="1"/><col min="2" max="2" width="22" customWidth="1"/><col min="3" max="3" width="50" customWidth="1"/><col min="4" max="4" width="18" customWidth="1"/><col min="5" max="5" width="32" customWidth="1"/><col min="6" max="6" width="12" customWidth="1"/></cols>';

    return _fuBuildXlsxRaw(rows, stylesXml, colWidths, 'Alert Status', colCount);
}

function _fuBuildXlsxRaw(rows, stylesXml, colWidths, sheetName, colCount) {
    const enc = new TextEncoder();

    const ss = []; const ssIdx = {};
    function si(raw) {
        const s = String(raw).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        if (ssIdx[s] === undefined) { ssIdx[s] = ss.length; ss.push(s); }
        return ssIdx[s];
    }
    function colLetter(n) {
        let s = ''; n++;
        while (n > 0) { s = String.fromCharCode(64 + (n % 26 || 26)) + s; n = Math.floor((n - 1) / 26); }
        return s;
    }

    let sheetRows = '';
    rows.forEach((row, ri) => {
        const xfIdx = row.style || 0;
        sheetRows += `<row r="${ri + 1}">`;
        row.values.forEach((cell, ci) => {
            sheetRows += `<c r="${colLetter(ci)}${ri + 1}" t="s" s="${xfIdx}"><v>${si(cell)}</v></c>`;
        });
        sheetRows += '</row>';
    });

    const safeSheetName = sheetName.replace(/[\\\/\?\*\[\]:]/g, '').slice(0, 31);
    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${colWidths}<sheetData>${sheetRows}</sheetData></worksheet>`;
    const ssXml    = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${ss.length}" uniqueCount="${ss.length}">${ss.map(s => `<si><t xml:space="preserve">${s}</t></si>`).join('')}</sst>`;
    const wbXml    = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const wbRels   = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const ctXml    = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

    function buildZip(files) {
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
        const locals = []; let offset = 0;
        for (const f of files) {
            const nameB = enc.encode(f.name);
            const dataB = enc.encode(f.data);
            const crc   = crc32(dataB);
            const sz    = dataB.length;
            const hdr   = cat(new Uint8Array([0x50,0x4B,0x03,0x04, 20,0, 0,0, 0,0, 0,0,0,0]), u32(crc), u32(sz), u32(sz), u16(nameB.length), u16(0), nameB);
            locals.push({ hdr, dataB, nameB, crc, sz, offset });
            offset += hdr.length + sz;
        }
        const centrals = locals.map(f => cat(new Uint8Array([0x50,0x4B,0x01,0x02, 20,0, 20,0, 0,0, 0,0, 0,0,0,0]), u32(f.crc), u32(f.sz), u32(f.sz), u16(f.nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(f.offset), f.nameB));
        const cdSize = centrals.reduce((s, c) => s + c.length, 0);
        const eocd   = cat(new Uint8Array([0x50,0x4B,0x05,0x06, 0,0, 0,0]), u16(files.length), u16(files.length), u32(cdSize), u32(offset), u16(0));
        return cat(...locals.flatMap(f => [f.hdr, f.dataB]), ...centrals, eocd);
    }

    return buildZip([
        { name: '[Content_Types].xml',        data: ctXml },
        { name: '_rels/.rels',                data: rootRels },
        { name: 'xl/workbook.xml',            data: wbXml },
        { name: 'xl/_rels/workbook.xml.rels', data: wbRels },
        { name: 'xl/worksheets/sheet1.xml',   data: sheetXml },
        { name: 'xl/sharedStrings.xml',       data: ssXml },
        { name: 'xl/styles.xml',              data: stylesXml },
    ]);
}

function _fuXlsxDownload(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
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

function sendFuEskalasi(idx) {
    const r = FU_WA_RECIPIENTS[idx];
    if (!r) return;
    const dateStr = _fuDateStr();
    const closing = r.sapaan === 'Mba'
        ? `Mohon dibantu pengecekan dan updatenya mba. Terima kasih`
        : `Mohon dibantu pengecekan dan updatenya. Terima kasih`;
    const msg = `Selamat Pagi ${r.sapaan}, mohon maaf mengganggu waktunya, izin mengirim data alert yang tiketnya masih status open dan overall disk usage di atas 70% per tanggal ${dateStr}\n${closing}`;
    navigator.clipboard.writeText(msg).then(() => {
        showCopyToast(`Teks untuk ${r.sapaan} ${r.number} ter-copy ke clipboard!`);
    });
}
