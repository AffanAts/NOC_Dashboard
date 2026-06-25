/**
 * page/tools/docs_modal.js
 * Dokumentasi Program NOC Monitoring Dashboard + API Testing
 * Dipanggil dari tombol "📘 Docs" di header.
 *
 * Self-contained: inject CSS sendiri, bangun modal di <body>.
 */

const DOCS_ITSM_PROXY = 'http://127.0.0.1:3737/itsm';

// ── Inject CSS sekali ─────────────────────────────────────────────────────────
function _docsInjectStyle() {
    if (document.getElementById('_docsStyle')) return;
    const s = document.createElement('style');
    s.id = '_docsStyle';
    s.textContent = `
    #docsOverlay {
        display:none; position:fixed; inset:0; z-index:50000;
        background:rgba(0,0,0,0.72); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
        justify-content:center; align-items:center;
        font-family:'Inter',system-ui,'Segoe UI',sans-serif;
    }
    #docsOverlay.show { display:flex; }
    #docsBox {
        width:920px; max-width:94vw; height:88vh;
        background:linear-gradient(180deg,#11161d,#0a0e14);
        border:1px solid #30363d; border-radius:12px;
        box-shadow:0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset;
        display:flex; flex-direction:column; overflow:hidden;
    }
    .docs-head {
        display:flex; align-items:center; justify-content:space-between;
        padding:16px 22px; border-bottom:1px solid #21262d;
        background:linear-gradient(180deg,rgba(88,166,255,0.06),transparent);
    }
    .docs-title { color:#58a6ff; font-weight:800; font-size:16px; letter-spacing:0.4px; display:flex; align-items:center; gap:9px; }
    .docs-title small { color:#6e7681; font-weight:500; font-size:11px; letter-spacing:0; }
    .docs-x {
        background:transparent; border:none; color:#f85149; font-size:22px; cursor:pointer;
        width:34px; height:34px; border-radius:7px; line-height:1; transition:all .15s;
        display:flex; align-items:center; justify-content:center;
    }
    .docs-x:hover { background:rgba(248,81,73,0.12); transform:rotate(90deg); }
    .docs-tabs {
        display:flex; gap:2px; padding:10px 16px 0; border-bottom:1px solid #21262d;
        background:#0d1117; flex-wrap:wrap;
    }
    .docs-tab {
        background:transparent; border:none; border-bottom:2px solid transparent;
        color:#8b949e; font-size:12px; font-weight:600; padding:9px 14px; cursor:pointer;
        border-radius:6px 6px 0 0; transition:all .15s; letter-spacing:0.2px; height:auto;
    }
    .docs-tab:hover { color:#c9d1d9; background:rgba(255,255,255,0.03); }
    .docs-tab.active { color:#58a6ff; border-bottom-color:#58a6ff; background:rgba(88,166,255,0.06); }
    .docs-body { flex:1; overflow-y:auto; padding:22px 26px; color:#c9d1d9; font-size:13px; line-height:1.6; }
    .docs-pane { display:none; }
    .docs-pane.active { display:block; animation:docsFade .25s ease; }
    @keyframes docsFade { from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:none;} }
    .docs-body h3 { color:#f0f6fc; font-size:14px; font-weight:700; margin:0 0 12px; display:flex; align-items:center; gap:8px; }
    .docs-body h4 { color:#58a6ff; font-size:12px; font-weight:700; margin:22px 0 10px; text-transform:uppercase; letter-spacing:0.6px; }
    .docs-body p { margin:0 0 12px; color:#8b949e; }
    .docs-body code { background:#161b22; border:1px solid #21262d; border-radius:4px; padding:1px 6px; font-family:'JetBrains Mono','Consolas',monospace; font-size:11.5px; color:#79c0ff; }
    .docs-table { width:100%; border-collapse:collapse; margin:6px 0 16px; font-size:12px; }
    .docs-table th { text-align:left; color:#6e7681; font-weight:700; font-size:10.5px; text-transform:uppercase; letter-spacing:0.5px; padding:8px 10px; border-bottom:1px solid #30363d; }
    .docs-table td { padding:9px 10px; border-bottom:1px solid #161b22; color:#c9d1d9; vertical-align:top; }
    .docs-table tr:hover td { background:rgba(255,255,255,0.02); }
    .docs-table td b { color:#f0f6fc; }
    .docs-flow { display:flex; flex-direction:column; gap:8px; margin:6px 0 18px; }
    .docs-step { display:flex; gap:12px; align-items:flex-start; background:#0d1117; border:1px solid #21262d; border-radius:8px; padding:11px 14px; }
    .docs-step .n { flex-shrink:0; width:24px; height:24px; border-radius:50%; background:rgba(88,166,255,0.14); color:#58a6ff; font-weight:800; font-size:12px; display:flex; align-items:center; justify-content:center; }
    .docs-step .t { color:#c9d1d9; font-size:12.5px; }
    .docs-step .t b { color:#f0f6fc; }
    .docs-pill { display:inline-block; padding:1px 8px; border-radius:20px; font-size:10.5px; font-weight:700; letter-spacing:0.3px; }
    .pill-blue { background:rgba(88,166,255,0.14); color:#58a6ff; }
    .pill-green { background:rgba(63,185,80,0.14); color:#3fb950; }
    .pill-amber { background:rgba(241,224,90,0.14); color:#f1e05a; }
    .pill-red { background:rgba(248,81,73,0.14); color:#ff7b72; }
    .pill-grey { background:rgba(139,148,158,0.14); color:#8b949e; }

    /* API Testing */
    .docs-test-bar { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
    .docs-btn-all { background:linear-gradient(135deg,#1f6feb,#1158c7); border:none; color:#fff; font-weight:700; font-size:12px; padding:9px 18px; border-radius:7px; cursor:pointer; height:auto; box-shadow:0 2px 8px rgba(31,111,235,0.3); }
    .docs-btn-all:hover { background:linear-gradient(135deg,#388bfd,#1f6feb); }
    .docs-btn-all:disabled { opacity:0.5; cursor:wait; }
    .docs-test-meta { color:#6e7681; font-size:11px; }
    .docs-cards { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .docs-card { background:#0d1117; border:1px solid #21262d; border-radius:9px; padding:14px 16px; transition:border-color .15s; }
    .docs-card:hover { border-color:#30363d; }
    .docs-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
    .docs-card-name { color:#f0f6fc; font-weight:700; font-size:13px; display:flex; align-items:center; gap:7px; }
    .docs-card-url { color:#6e7681; font-size:10.5px; font-family:'JetBrains Mono','Consolas',monospace; word-break:break-all; margin-bottom:9px; }
    .docs-card-detail { color:#8b949e; font-size:11.5px; min-height:17px; }
    .docs-card-detail b { color:#c9d1d9; }
    .docs-badge { font-size:10px; font-weight:800; padding:3px 9px; border-radius:20px; letter-spacing:0.4px; white-space:nowrap; }
    .b-idle { background:#161b22; color:#6e7681; border:1px solid #30363d; }
    .b-run  { background:rgba(88,166,255,0.14); color:#58a6ff; }
    .b-ok   { background:rgba(63,185,80,0.16); color:#3fb950; }
    .b-warn { background:rgba(241,224,90,0.16); color:#f1e05a; }
    .b-err  { background:rgba(248,81,73,0.16); color:#ff7b72; }
    .b-wait { background:rgba(88,166,255,0.10); color:#79c0ff; border:1px dashed rgba(88,166,255,0.4); }
    .docs-card-foot { margin-top:10px; display:flex; align-items:center; justify-content:space-between; }
    .docs-retest { background:transparent; border:1px solid #30363d; color:#8b949e; font-size:10.5px; font-weight:600; padding:4px 11px; border-radius:6px; cursor:pointer; height:auto; }
    .docs-retest:hover { border-color:#58a6ff; color:#58a6ff; }
    .docs-ms { color:#6e7681; font-size:10.5px; font-family:'JetBrains Mono',monospace; }
    .docs-spin { width:11px; height:11px; border:2px solid rgba(88,166,255,0.3); border-top-color:#58a6ff; border-radius:50%; display:inline-block; animation:docsSpin .7s linear infinite; vertical-align:middle; }
    @keyframes docsSpin { to { transform:rotate(360deg); } }

    /* Callout (analogi untuk non-dev) */
    .docs-note { display:flex; gap:11px; align-items:flex-start; background:rgba(88,166,255,0.06); border:1px solid rgba(88,166,255,0.22); border-radius:9px; padding:12px 15px; margin:6px 0 18px; }
    .docs-note .ico { font-size:17px; line-height:1.4; flex-shrink:0; }
    .docs-note .txt { color:#adbac7; font-size:12.5px; line-height:1.6; }
    .docs-note .txt b { color:#e6edf3; }
    .docs-note.amber { background:rgba(241,224,90,0.06); border-color:rgba(241,224,90,0.22); }
    .docs-note.green { background:rgba(63,185,80,0.06); border-color:rgba(63,185,80,0.22); }

    /* Pohon folder interaktif (klik untuk buka/tutup) */
    .docs-tree-bar { display:flex; gap:8px; margin-bottom:10px; }
    .docs-tree-btn { background:#161b22; border:1px solid #30363d; color:#8b949e; font-size:11px; font-weight:600; padding:5px 13px; border-radius:6px; cursor:pointer; height:auto; }
    .docs-tree-btn:hover { border-color:#58a6ff; color:#58a6ff; }
    .docs-dtree { background:#0d1117; border:1px solid #21262d; border-radius:9px; padding:12px 14px; margin:0 0 18px;
        font-family:'JetBrains Mono','Consolas',monospace; font-size:12px; line-height:1.5; }
    .docs-dtree details { margin:0; }
    .docs-dtree summary { cursor:pointer; list-style:none; display:flex; gap:8px; align-items:baseline; padding:4px 8px; border-radius:6px; user-select:none; }
    .docs-dtree summary::-webkit-details-marker { display:none; }
    .docs-dtree summary:hover { background:rgba(88,166,255,0.07); }
    .docs-dtree .arr { color:#6e7681; font-size:9px; width:11px; flex-shrink:0; display:inline-block; transition:transform .15s; }
    .docs-dtree details[open] > summary .arr { transform:rotate(90deg); }
    .docs-dtree .kids { margin-left:13px; padding-left:13px; border-left:1px solid #21262d; }
    .docs-dtree .frow { display:flex; gap:8px; align-items:baseline; padding:3px 8px; border-radius:6px; }
    .docs-dtree .frow:hover { background:rgba(255,255,255,0.025); }
    .docs-dtree .pad { width:11px; flex-shrink:0; display:inline-block; }
    .docs-dtree .nm { color:#adbac7; flex-shrink:0; }
    .docs-dtree .nm.dir { color:#58a6ff; font-weight:700; }
    .docs-dtree .nm.star { color:#3fb950; font-weight:700; }
    .docs-dtree .cm { color:#6e7681; font-size:11px; font-style:italic; font-family:'Inter',system-ui,'Segoe UI',sans-serif; }

    /* Pipeline / tahap bernomor besar */
    .docs-pipe { display:flex; flex-direction:column; gap:0; margin:6px 0 18px; }
    .docs-pipe-step { display:flex; gap:14px; }
    .docs-pipe-rail { display:flex; flex-direction:column; align-items:center; flex-shrink:0; }
    .docs-pipe-num { width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,#1f6feb,#1158c7); color:#fff; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(31,111,235,0.3); z-index:1; }
    .docs-pipe-line { width:2px; flex:1; background:#21262d; margin:2px 0; }
    .docs-pipe-step:last-child .docs-pipe-line { display:none; }
    .docs-pipe-body { padding-bottom:16px; }
    .docs-pipe-step:last-child .docs-pipe-body { padding-bottom:0; }
    .docs-pipe-title { color:#f0f6fc; font-weight:700; font-size:13px; margin:4px 0 4px; }
    .docs-pipe-desc { color:#8b949e; font-size:12px; line-height:1.55; }
    .docs-pipe-desc b { color:#c9d1d9; }
    .docs-pipe-tag { display:inline-block; margin-top:5px; font-family:'JetBrains Mono','Consolas',monospace; font-size:10.5px; color:#79c0ff; background:#161b22; border:1px solid #21262d; border-radius:4px; padding:2px 7px; }

    /* Tombol Export PDF di header modal */
    .docs-pdf {
        background:linear-gradient(135deg,#238636,#1a6e2b); border:none; color:#fff;
        font-weight:700; font-size:11.5px; padding:7px 15px; border-radius:7px; cursor:pointer;
        height:auto; box-shadow:0 2px 8px rgba(35,134,54,0.3); transition:all .15s;
    }
    .docs-pdf:hover { background:linear-gradient(135deg,#2ea043,#238636); transform:translateY(-1px); }

    /* Tombol Docs di header */
    .btn-docs {
        background:linear-gradient(135deg,#1f6feb,#1158c7) !important;
        border:1px solid #1f6feb !important; color:#fff !important; font-weight:700 !important;
        font-size:11px !important; padding:5px 12px !important; height:28px !important;
        box-shadow:0 2px 8px rgba(31,111,235,0.28);
    }
    .btn-docs:hover { background:linear-gradient(135deg,#388bfd,#1f6feb) !important; border-color:#388bfd !important; }
    `;
    document.head.appendChild(s);
}

// ── Definisi sumber data (untuk tab Sumber Data) ──────────────────────────────
const DOCS_SOURCES = [
    ['Grafana', 'https://grafana.example.com:3000/api/ds/query', 'Basic Auth', 'grafana/raw_*.json → data.js', 'fetch_availability / cpu / memory.bat'],
    ['OpManager', 'https://opmanager.example.com:8060/client/api/json', 'JSESSIONID', 'opmanager_data.js · panic_data.js', 'fetch_opman.bat'],
    ['Kibana Transaksi', 'http://kibana.example.com:5601/internal/bsearch', 'MONCOMCEN1', 'kibana_aggregation_result.json', 'kibana_query.py'],
    ['Kibana QRIS', 'http://kibana.example.com:5601/internal/bsearch', 'MONCOMCEN1', 'kibana_aggregation_result_qris.json', 'kibana_query_qris.py'],
    ['PRTG', 'https://maps.example.com/public/mapshow_simple.htm', 'Scrape HTML', 'prtg_data.js', 'scrap_prtg.ps1'],
    ['ITSM', 'https://itsm.example.com/rest/servicedeskapi', 'Bearer (proxy :3737)', 'Live fetch (browser)', 'fu_itsm.js'],
    ['RVTools', 'File Excel lokal', '—', 'RVTOOLS.json', 'rvtools_processor.ps1'],
];

// ── Definisi komponen JS (untuk tab Komponen) ─────────────────────────────────
const DOCS_COMPONENTS = [
    ['core/alarm_engine.js', 'Engine alarm utama — polling status IP, hitung CRIT, picu suara & toast'],
    ['core/notification.js', 'Toast notifikasi Kibana per-channel (streak 4-bar merah)'],
    ['core/shift_notes.js', 'Catatan handover per shift'],
    ['core/reminder.js', 'Pengingat terjadwal (harian / bulanan) dengan pop-up + audio'],
    ['core/export_report.js', 'Export laporan monitoring ke Excel (ExcelJS)'],
    ['tools/fu_pagi.js', 'FU Pagi — verifikasi tiket, export Excel, eskalasi WhatsApp'],
    ['tools/fu_itsm.js', 'FU ITSM — fetch tiket open → render gambar tabel → clipboard → WA'],
    ['tools/ip_checker.js', 'Cek detail & status sebuah IP'],
    ['tools/ticket_verifier.js', 'Verifikasi tiket terhadap data alarm'],
    ['tools/dynatrace_scraper.js', 'Scraper data Dynatrace'],
    ['tools/rvtools_manager.js', 'Pengelola database RVTools'],
    ['grafana/*.js', 'UI, aksi, launcher & history panel Grafana (ava / CPU / memory)'],
    ['opmanager/*.js', 'UI, aksi & history panel OpManager'],
    ['modals/unified_ticket.js', 'Modal tiket gabungan (🎫 TICKETS)'],
    ['modals/panic_modal.js', 'Modal eskalasi PANIC link SITE-A / SITE-B'],
    ['modals/schedule_modal.js + schedule_algorithm.js', 'Modal & algoritma penjadwalan shift'],
];

// ── Definisi tombol UI (untuk tab Tombol) ─────────────────────────────────────
const DOCS_BUTTONS = [
    ['🛠️ Tools', 'Dropdown: FU Pagi · FU ITSM · 🌙 EOS Report · Export Laporan · RVTools DB · PRTG Status · Notes Shift · IP Checker · Log Riwayat · Jadwal Shift · 🖥️ Console · 📘 Dokumentasi · Settings'],
    ['🌙 EOS Report', 'Ada di dalam menu 🛠️ Tools — End of Shift on-demand: tarik metrik server dari Grafana saat diklik (tidak tiap siklus), hasilkan Excel + TXT + HTML'],
    ['🖥️ Console', 'Ada di dalam menu 🛠️ Tools — pemantau error JS in-app (lihat error/warning/log tanpa buka DevTools). Badge merah muncul di tombol Tools saat ada error baru'],
    ['📘 Dokumentasi', 'Ada di dalam menu 🛠️ Tools — buka dokumentasi ini + API Testing'],
    ['💵 USD/IDR', 'Widget kurs live di header (Frankfurter / ECB) — klik untuk refresh manual, auto tiap 30 menit'],
    ['🎫 TICKETS', 'Buka modal tiket gabungan (Grafana + OpManager)'],
    ['PANIC', 'Eskalasi status link SITE-A / SITE-B ke WhatsApp'],
    ['🔊 / 🔇', 'Mute / unmute seluruh suara alarm'],
    ['🛑 STOP', 'Hentikan suara alarm yang sedang berbunyi'],
    ['Grafana icon', 'Launcher: buka IP terpilih langsung di Grafana asli'],
    ['🖨️ Export PDF', 'Di dalam dokumentasi — simpan seluruh panduan sebagai file PDF'],
];

// ── Definisi test API (untuk tab API Testing) ─────────────────────────────────
// kind 'http' = uji koneksi langsung · 'file' = uji file data + kesegaran (Last-Modified)
const DOCS_TESTS = [
    { id:'web',    name:'Web Server', icon:'🌐', url:'127.0.0.1:8060', kind:'http',
      run: async () => _docsHttp(location.origin + '/index.html', { method:'HEAD' }, r => r.ok ? ['ok','Server aktif & melayani dashboard'] : ['err','HTTP ' + r.status]) },

    { id:'itsm',   name:'ITSM Proxy', icon:'📋', url:'127.0.0.1:3737/itsm', kind:'http',
      run: async () => _docsHttp(DOCS_ITSM_PROXY + '/rest/servicedeskapi/request?requestStatus=OPEN_REQUESTS&limit=1', {}, async r => {
          if (!r.ok) return ['err','HTTP ' + r.status + ' — proxy/token bermasalah'];
          const d = await r.json();
          const total = (d.size != null ? d.size : (d.values ? d.values.length : '?'));
          return ['ok','Proxy OK · ada <b>' + total + '</b> tiket open'];
      }) },

    { id:'graf',   name:'Grafana', icon:'📈', url:'Data_JSON/grafana/raw_ava_v1.json', kind:'file',
      run: async () => _docsFile('Data_JSON/grafana/raw_ava_v1.json', d => {
          const frames = d?.results?.A?.frames;
          if (!frames) return ['warn','Format tak terbaca / belum ada data'];
          return ['ok','<b>' + frames.length + '</b> frame metric'];
      }) },

    { id:'opm',    name:'OpManager', icon:'🚨', url:'Data_JSON/opmanager_temp_1.json', kind:'file',
      run: async () => _docsFile('Data_JSON/opmanager_temp_1.json', d => {
          if (!d || d.rows == null) return ['warn','Belum ada data alarm'];
          return ['ok','<b>' + d.rows.length + '</b> alarm · total ' + (d.rowCount != null ? d.rowCount : '?')];
      }) },

    { id:'kib',    name:'Kibana Transaksi', icon:'💳', url:'Data_JSON/kibana/kibana_aggregation_result.json', kind:'file',
      run: async () => _docsFile('Data_JSON/kibana/kibana_aggregation_result.json', d => {
          const ch = d && typeof d === 'object' ? Object.keys(d).length : 0;
          if (!ch) return ['warn','Belum ada channel'];
          return ['ok','<b>' + ch + '</b> channel termonitor'];
      }) },

    { id:'qris',   name:'Kibana QRIS', icon:'🏧', url:'Data_JSON/kibana/kibana_aggregation_result_qris.json', kind:'file',
      run: async () => _docsFile('Data_JSON/kibana/kibana_aggregation_result_qris.json', d => {
          if (!d) return ['warn','Belum ada data QRIS'];
          return ['ok','Data QRIS tersedia'];
      }) },

    { id:'prtg',   name:'PRTG', icon:'📡', url:'Data_JSON/prtg_data.js', kind:'file',
      run: async () => _docsFile('Data_JSON/prtg_data.js', null, txt => {
          if (!txt || txt.indexOf('lastUpdate') === -1) return ['warn','Data PRTG belum lengkap'];
          const m = txt.match(/lastUpdate"?\s*[:=]\s*"([^"]+)"/);
          return ['ok','Update terakhir: <b>' + (m ? m[1] : '?') + '</b>'];
      }) },

    { id:'rvt',    name:'RVTools DB', icon:'🖥️', url:'Data_JSON/RVTOOLS.json', kind:'file',
      run: async () => _docsFile('Data_JSON/RVTOOLS.json', d => {
          const n = Array.isArray(d) ? d.length : (d && d.rows ? d.rows.length : null);
          return ['ok', n != null ? '<b>' + n + '</b> baris VM' : 'Database tersedia'];
      }) },
];

// ── Helper test ───────────────────────────────────────────────────────────────
async function _docsHttp(url, opts, handler) {
    const t0 = performance.now();
    try {
        const r = await fetch(url, opts);
        const ms = Math.round(performance.now() - t0);
        const res = await handler(r);
        return { state: res[0], detail: res[1], ms, fresh: null };
    } catch (e) {
        const ms = Math.round(performance.now() - t0);
        return { state:'err', detail:'Tidak dapat terhubung — pastikan service jalan', ms, fresh:null };
    }
}

function _docsFreshMin(resp) {
    const lm = resp.headers.get('Last-Modified');
    if (!lm) return null;
    const age = Date.now() - new Date(lm).getTime();
    return Math.floor(age / 60000);
}

// handler(parsedJson) → [state,detail] ; atau textHandler(rawText) untuk file non-JSON
async function _docsFile(path, handler, textHandler) {
    const t0 = performance.now();
    try {
        const r = await fetch(path + '?t=' + Date.now());
        const ms = Math.round(performance.now() - t0);
        // 404 = file belum dibuat — kemungkinan siklus start.bat belum sampai tahap ini → tunggu, bukan error
        if (r.status === 404) return { state:'wait', detail:'File belum dibuat — siklus start.bat kemungkinan sedang/belum menarik data ini', ms, fresh:null };
        if (!r.ok) return { state:'err', detail:'File tidak terbaca (HTTP ' + r.status + ')', ms, fresh:null };
        const fresh = _docsFreshMin(r);
        let res;
        if (textHandler) {
            res = textHandler(await r.text());
        } else {
            let d = null;
            try { d = await r.json(); } catch (e) { return { state:'warn', detail:'File bukan JSON valid', ms, fresh }; }
            res = handler(d);
        }
        // Override jadi stale bila terlalu lama (kecuali sudah error)
        let state = res[0];
        if (state === 'ok' && fresh != null) {
            if (fresh > 60) state = 'err';
            else if (fresh > 15) state = 'warn';
        }
        return { state, detail: res[1], ms, fresh };
    } catch (e) {
        const ms = Math.round(performance.now() - t0);
        return { state:'err', detail:'Gagal baca file: ' + e.message, ms, fresh:null };
    }
}

function _docsFreshLabel(fresh) {
    if (fresh == null) return '';
    if (fresh <= 0) return ' · baru saja';
    if (fresh === 1) return ' · 1 menit lalu';
    if (fresh < 60) return ' · ' + fresh + ' menit lalu';
    const h = Math.floor(fresh / 60);
    return ' · ' + h + ' jam lalu';
}

// ── Render hasil test ke kartu ────────────────────────────────────────────────
function _docsRenderResult(id, res) {
    const card = document.getElementById('docsCard_' + id);
    if (!card) return;
    const badge = card.querySelector('.docs-badge');
    const detail = card.querySelector('.docs-card-detail');
    const ms = card.querySelector('.docs-ms');

    const map = { ok:['b-ok','✓ OK'], warn:['b-warn','⚠ STALE'], err:['b-err','✕ ERROR'], wait:['b-wait','⏳ MENUNGGU'] };
    const m = map[res.state] || ['b-idle','—'];
    badge.className = 'docs-badge ' + m[0];
    badge.textContent = m[1];
    detail.innerHTML = (res.detail || '') + _docsFreshLabel(res.fresh);
    ms.textContent = res.ms != null ? res.ms + ' ms' : '';
}

function _docsSetRunning(id) {
    const card = document.getElementById('docsCard_' + id);
    if (!card) return;
    const badge = card.querySelector('.docs-badge');
    badge.className = 'docs-badge b-run';
    badge.innerHTML = '<span class="docs-spin"></span> ...';
    card.querySelector('.docs-card-detail').innerHTML = '<span style="color:#6e7681;">Menguji…</span>';
    card.querySelector('.docs-ms').textContent = '';
}

// Auto re-test untuk status MENUNGGU: ulangi tiap 10 dtk selama modal masih terbuka,
// sampai file-nya muncul (siklus start.bat selesai menulis).
const _docsRetryTimers = {};
const DOCS_RETRY_MS = 10000;

function _docsHandleResult(id, res) {
    if (_docsRetryTimers[id]) { clearTimeout(_docsRetryTimers[id]); delete _docsRetryTimers[id]; }
    if (res.state === 'wait') {
        res = Object.assign({}, res, { detail: res.detail + ' · <b>re-test otomatis ' + (DOCS_RETRY_MS / 1000) + ' dtk lagi</b>' });
        _docsRetryTimers[id] = setTimeout(() => {
            delete _docsRetryTimers[id];
            const o = document.getElementById('docsOverlay');
            if (o && o.classList.contains('show')) _docsRunOne(id);
        }, DOCS_RETRY_MS);
    }
    _docsRenderResult(id, res);
}

async function _docsRunOne(id) {
    const test = DOCS_TESTS.find(t => t.id === id);
    if (!test) return;
    _docsSetRunning(id);
    const res = await test.run();
    _docsHandleResult(id, res);
}

async function _docsRunAll() {
    const btn = document.getElementById('docsBtnAll');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="docs-spin"></span> Menguji semua…'; }
    DOCS_TESTS.forEach(t => _docsSetRunning(t.id));
    await Promise.all(DOCS_TESTS.map(async t => {
        const res = await t.run();
        _docsHandleResult(t.id, res);
    }));
    if (btn) { btn.disabled = false; btn.textContent = '▶ Test All'; }
    const meta = document.getElementById('docsTestMeta');
    if (meta) meta.textContent = 'Terakhir diuji: ' + new Date().toLocaleTimeString('id-ID');
}

// ── Builder konten tab ────────────────────────────────────────────────────────
function _docsRowsTable(head, rows) {
    let h = '<table class="docs-table"><thead><tr>';
    head.forEach(c => h += '<th>' + c + '</th>');
    h += '</tr></thead><tbody>';
    rows.forEach(r => {
        h += '<tr>';
        r.forEach((c, i) => h += '<td>' + (i === 0 ? '<b>' + c + '</b>' : c) + '</td>');
        h += '</tr>';
    });
    return h + '</tbody></table>';
}

function _docsPaneOverview() {
    let h = '<h3>🗂️ Gambaran Sistem</h3>';
    h += '<p>Dashboard NOC Acme adalah <b>monitoring terpusat</b> yang menggabungkan data Grafana, OpManager, Kibana, PRTG, dan ITSM ke dalam satu layar. Backend berupa kumpulan script (<code>.bat</code>/<code>.ps1</code>/<code>.py</code>) yang dijalankan looping oleh <code>start.bat</code>; frontend murni HTML/JS yang membaca file JSON hasil tarikan. Detail alurnya bisa dilihat di tab <b>⚙️ Cara Kerja</b>.</p>';
    h += '<h4>Port yang dipakai</h4>';
    h += '<p><span class="docs-pill pill-blue">8060</span> Local Web Server (dashboard + Data_JSON) &nbsp;&nbsp; <span class="docs-pill pill-blue">3737</span> ITSM CORS Proxy</p>';
    h += '<h4>Menjalankan & menghentikan</h4>';
    h += '<div class="docs-flow">';
    h += '<div class="docs-step"><div class="n">▶</div><div class="t">Double-click <b>start.bat</b> — biarkan window-nya tetap terbuka (itu yang menjalankan loop penarikan data).</div></div>';
    h += '<div class="docs-step"><div class="n">🌐</div><div class="t">Buka browser ke <code>http://127.0.0.1:8060</code>.</div></div>';
    h += '<div class="docs-step"><div class="n">⏹</div><div class="t">Untuk stop: tutup window <b>start.bat</b> (atau tekan Ctrl+C di dalamnya).</div></div>';
    h += '</div>';
    h += '<h4>Masalah umum</h4>';
    h += _docsRowsTable(['Gejala','Solusi'], DOCS_TROUBLE);
    return h;
}

function _docsPaneSources() {
    let h = '<h3>🔌 Sumber Data & Endpoint</h3>';
    h += '<p>Setiap sumber ditarik oleh script backend, disimpan sebagai file di <code>Data_JSON/</code>, lalu dibaca frontend. Uji koneksi live ada di tab <b>API Testing</b>.</p>';
    h += _docsRowsTable(['Sumber','Endpoint','Auth','Output','Penarik'], DOCS_SOURCES);
    return h;
}

function _docsPaneComponents() {
    let h = '<h3>🧩 Komponen Frontend (JS)</h3>';
    h += '<p>File JavaScript di folder <code>page/</code> yang membangun UI & interaksi dashboard.</p>';
    h += _docsRowsTable(['File','Fungsi'], DOCS_COMPONENTS);
    return h;
}

function _docsPaneButtons() {
    let h = '<h3>⌨️ Tombol & Menu UI</h3>';
    h += '<p>Kontrol utama yang tersedia di header dashboard.</p>';
    h += _docsRowsTable(['Tombol','Fungsi'], DOCS_BUTTONS);
    return h;
}

function _docsPaneTesting() {
    let h = '<h3>🧪 API & Data Testing</h3>';
    h += '<p>Uji koneksi setiap sumber data secara langsung dari browser. Test <b>HTTP</b> menguji koneksi live; test <b>file</b> mengecek keberadaan & kesegaran data (<i>Last-Modified</i>). '
       + 'Bila file belum dibuat (siklus start.bat belum sampai), status jadi <span class="docs-badge b-wait">⏳ MENUNGGU</span> dan otomatis dicoba ulang tiap 10 detik sampai datanya muncul.</p>';
    h += '<div class="docs-test-bar">';
    h += '<button class="docs-btn-all" id="docsBtnAll" onclick="_docsRunAll()">▶ Test All</button>';
    h += '<span class="docs-test-meta" id="docsTestMeta">Klik “Test All” atau “Re-test” per kartu.</span>';
    h += '</div>';
    h += '<div class="docs-cards">';
    DOCS_TESTS.forEach(t => {
        const kindPill = t.kind === 'http'
            ? '<span class="docs-pill pill-blue" style="font-size:9px;">HTTP</span>'
            : '<span class="docs-pill pill-grey" style="font-size:9px;">FILE</span>';
        h += '<div class="docs-card" id="docsCard_' + t.id + '">'
           +   '<div class="docs-card-top">'
           +     '<div class="docs-card-name">' + t.icon + ' ' + t.name + ' ' + kindPill + '</div>'
           +     '<span class="docs-badge b-idle">— IDLE</span>'
           +   '</div>'
           +   '<div class="docs-card-url">' + t.url + '</div>'
           +   '<div class="docs-card-detail">Belum diuji</div>'
           +   '<div class="docs-card-foot">'
           +     '<button class="docs-retest" onclick="_docsRunOne(\'' + t.id + '\')">↻ Re-test</button>'
           +     '<span class="docs-ms"></span>'
           +   '</div>'
           + '</div>';
    });
    h += '</div>';
    return h;
}

// ── Data bersama: dipakai tab modal DAN export PDF ────────────────────────────
const DOCS_ANALOGY = 'bayangkan <b>start.bat</b> sebagai seorang <b>petugas pengumpul data</b>. '
    + 'Setiap beberapa detik ia berkeliling ke 5 “kantor” berbeda (Grafana, OpManager, PRTG, Kibana, Kibana QRIS), '
    + 'mencatat laporan dari masing-masing, merapikannya jadi satu berkas, lalu menaruh berkas itu di <b>papan pengumuman</b> '
    + '(web server). Dashboard yang Anda buka di browser tinggal <b>membaca papan pengumuman</b> tersebut. '
    + 'Selama petugas terus berkeliling, papan selalu berisi data terbaru.';

const DOCS_FLOW = [
    { n:'A', title:'Bersih-bersih & nyalakan “papan pengumuman”', tag:'python -m http.server 8060',
      desc:'start.bat membuat folder <code>Data_JSON</code> bila belum ada, lalu <b>membersihkan port 8060</b> (mematikan sisa server lama) dan <b>menyalakan Local Web Server</b> dengan Python. Inilah “papan pengumuman” yang nanti dibaca browser.' },
    { n:'B', title:'Nyalakan jembatan ke ITSM', tag:'pythonw itsm_proxy.py → :3737',
      desc:'Menjalankan <b>ITSM Proxy</b> (file <code>itsm_proxy.py</code>) di port 3737. Ini jembatan agar dashboard boleh mengambil data tiket dari server ITSM tanpa diblokir aturan keamanan browser (CORS).' },
    { n:'C', title:'Masuk siklus berulang (loop) — di sinilah data dikumpulkan', tag:'goto main_loop',
      desc:'Mulai titik ini, start.bat <b>mengulang langkah 1–8 terus-menerus</b>. Satu putaran penuh diberi jeda ±5 detik sebelum mulai lagi. Tiap putaran menarik data segar dari semua sumber. Layar hitam start.bat menampilkan status tiap tahap: <code>[ .. ]</code> sedang proses, <code>[ OK ]</code> selesai, <code>[TIME]</code> dilewati karena terlalu lama.' },
    { n:'D', title:'Tarik data mentah dari tiap sumber', tag:'fetch_*.bat · scrap_prtg.ps1 · kibana_query.py',
      desc:'Dalam satu putaran, petugas menarik berurutan: <b>Grafana</b> (availability, CPU, memory) → <b>OpManager</b> (alarm; dibatasi maks 90 detik agar tak macet) → <b>PRTG</b> (widget jaringan) → <b>Kibana</b> (transaksi) → <b>Kibana QRIS</b>. Tiap hasil disimpan sebagai file mentah di folder <code>Data_JSON/</code>.' },
    { n:'E', title:'Saring & hitung', tag:'filter_logic.ps1 · opm_logic.ps1',
      desc:'Data mentah belum rapi. start.bat menjalankan <b>filter IP</b> (memilih hanya server yang dipantau) dan <b>logika tiket & history</b> (menentukan mana yang masuk hitungan CRIT, mencatat riwayat naik/turun status).' },
    { n:'F', title:'Rapikan jadi satu berkas → tempel ke papan', tag:'data.js · opmanager_data.js',
      desc:'Semua hasil digabung dan ditulis menjadi <code>Data_JSON/data.js</code> (dan <code>opmanager_data.js</code>). File inilah “berkas final” yang ditempel di papan pengumuman — satu file berisi semua data siap pakai.' },
    { n:'G', title:'Dashboard membaca & menampilkan', tag:'index.html → Data_JSON/*',
      desc:'Anda buka <code>http://127.0.0.1:8060</code> di browser. Halaman dan panel-panelnya <b>membaca file final tadi</b> lalu menggambar angka, grafik, dan alarm. Karena loop terus memperbarui file, dashboard ikut ter-update otomatis tiap putaran.' },
];

const DOCS_HOTKEYS = [
    ['P', 'Update daftar file suara alarm (membaca ulang folder <code>src/alarm/</code>).'],
    ['R', 'Paksa perbarui database <b>RVTools</b> (nama-nama VM) dari file Excel terbaru.'],
];

const DOCS_TROUBLE = [
    ['FU ITSM error / gambar gagal', 'Pastikan ITSM Proxy (:3737) hidup — cek di tab <b>API Testing</b>. Bila mati, jalankan ulang <code>start.bat</code>.'],
    ['Data tidak update', 'Pastikan window <b>start.bat</b> masih berjalan & loop tidak macet. Cek kesegaran file di <b>API Testing</b>.'],
    ['Suara alarm tak bunyi', 'Cek tombol <code>🔊</code> tidak dalam kondisi mute, dan file audio ada di <code>src/alarm/</code>.'],
    ['Panel kosong / blank', 'Refresh browser (Ctrl+F5). Bila tetap, cek file terkait di <code>Data_JSON/</code> via tab API Testing.'],
];

function _docsPaneHowItWorks() {
    let h = '<h3>⚙️ Cara Kerja — Dari start.bat Sampai Jadi Data</h3>';

    h += '<div class="docs-note green">'
       +   '<div class="ico">💡</div>'
       +   '<div class="txt"><b>Analogi sederhana:</b> ' + DOCS_ANALOGY + '</div>'
       + '</div>';

    h += '<h4>Yang terjadi saat start.bat dijalankan</h4>';
    h += '<p>Begitu <code>start.bat</code> di-double-click, ia melakukan <b>persiapan satu kali</b>, lalu masuk ke <b>siklus berulang tanpa henti</b>. Berikut tahap demi tahapnya:</p>';

    h += '<div class="docs-pipe">';
    const stepHtml = (n, title, desc, tag) =>
        '<div class="docs-pipe-step">'
      +   '<div class="docs-pipe-rail"><div class="docs-pipe-num">' + n + '</div><div class="docs-pipe-line"></div></div>'
      +   '<div class="docs-pipe-body">'
      +     '<div class="docs-pipe-title">' + title + '</div>'
      +     '<div class="docs-pipe-desc">' + desc + (tag ? '<br><span class="docs-pipe-tag">' + tag + '</span>' : '') + '</div>'
      +   '</div>'
      + '</div>';

    DOCS_FLOW.forEach(s => { h += stepHtml(s.n, s.title, s.desc, s.tag); });
    h += '</div>';

    h += '<div class="docs-note amber">'
       +   '<div class="ico">⚠️</div>'
       +   '<div class="txt"><b>Penting:</b> jendela hitam <b>start.bat harus tetap terbuka</b>. Itulah “petugas” yang berkeliling. '
       +   'Jika ditutup, pengumpulan berhenti dan data di dashboard tidak lagi diperbarui (angka jadi basi). '
       +   'Untuk berhenti dengan sengaja: tutup jendela start.bat atau tekan Ctrl+C di dalamnya.</div>'
       + '</div>';

    h += '<h4>Dua tombol pintas di layar start.bat</h4>';
    h += _docsRowsTable(['Tekan', 'Fungsi'], DOCS_HOTKEYS);
    h += '<p style="color:#6e7681;font-size:11.5px;">Bila tidak ditekan apa-apa dalam 5 detik, siklus otomatis lanjut ke putaran berikutnya. Selain itu, tiap pergantian jam (menit :00) sistem otomatis memperbarui katalog IP global & RVTools.</p>';

    return h;
}

// Data pohon folder — children = folder (bisa dibuka), tanpa children = file
const DOCS_TREE = {
    name:'MONITORING DASHBOARD', open:true, cm:'folder utama proyek', children:[
        { name:'API', cm:'“mesin” penarik data — semua script yang mengambil data dari tiap sumber', children:[
            { name:'grafana', cm:'penarik data Grafana (availability / CPU / memory)', children:[
                { name:'fetch_availability.bat', cm:'tarik data availability server' },
                { name:'fetch_cpu.bat',          cm:'tarik data pemakaian CPU' },
                { name:'fetch_memory.bat',       cm:'tarik data pemakaian memory' },
                { name:'fetch_ip.bat',           cm:'ambil katalog daftar IP (auto tiap jam :00)' },
                { name:'filter_logic.ps1',       cm:'saring hanya IP yang dipantau' },
                { name:'history_logger.bat',     cm:'catat riwayat naik/turun status' },
                { name:'logger_logic.ps1',       cm:'logika pencatatan riwayat' },
            ]},
            { name:'kibana', cm:'penarik data transaksi Kibana', children:[
                { name:'kibana_query.py',      cm:'query transaksi channel (TAHAP 7)' },
                { name:'kibana_query_qris.py', cm:'query QRIS Do Not Honor (TAHAP 8)' },
            ]},
            { name:'fetch_opman.bat',       cm:'tarik alarm OpManager (TAHAP 3, maks 90 dtk)' },
            { name:'opm_logic.ps1',         cm:'hitung logika tiket & history (TAHAP 4)' },
            { name:'scrap_prtg.ps1',        cm:'ambil widget jaringan PRTG (TAHAP 6)' },
            { name:'rvtools_processor.ps1', cm:'olah Excel RVTools → RVTOOLS.json' },
        ]},
        { name:'Data_JSON', cm:'“gudang” hasil tarikan — semua file di sini DIBUAT OTOMATIS oleh script', children:[
            { name:'grafana', cm:'data mentah Grafana sebelum digabung', children:[
                { name:'raw_ava_v1/v2.json', cm:'availability mentah' },
                { name:'raw_cpu_v1/v2.json', cm:'CPU mentah' },
                { name:'raw_mem_v1/v2.json', cm:'memory mentah' },
            ]},
            { name:'kibana', cm:'hasil agregasi Kibana', children:[
                { name:'kibana_aggregation_result.json',      cm:'transaksi per channel' },
                { name:'kibana_aggregation_result_qris.json', cm:'data QRIS' },
                { name:'kibana_aggregation_result_perm.json', cm:'salinan permanen (cadangan)' },
            ]},
            { name:'RVTOOLS', cm:'tempat menaruh file Excel/CSV RVTools untuk diolah', children:[] },
            { name:'data.js',                star:true, cm:'BERKAS FINAL — gabungan semua data Grafana + history, dibaca dashboard' },
            { name:'opmanager_data.js',      star:true, cm:'BERKAS FINAL — data alarm siap pakai' },
            { name:'opmanager_temp_1..4.json', cm:'potongan alarm mentah per halaman' },
            { name:'panic_data.js · panic1..5_temp.json', cm:'data status link PANIC (SITE-A/SITE-B)' },
            { name:'prtg_data.js',           cm:'hasil tarikan widget PRTG' },
            { name:'filter.json · filter_cpu_mem.json', cm:'daftar IP hasil saringan' },
            { name:'history_log.json · history_utilization.json · history_opmanager.json', cm:'riwayat status & utilization' },
            { name:'RVTOOLS.json',           cm:'kamus IP → nama VM (bertahan sebagai backup)' },
            { name:'alarm_list.json',        cm:'daftar file suara alarm' },
        ]},
        { name:'page', cm:'semua “tampilan” & interaksi dashboard (frontend)', children:[
            { name:'core', cm:'otak dashboard', children:[
                { name:'alarm_engine.js',  cm:'engine alarm utama — hitung CRIT, picu suara' },
                { name:'notification.js',  cm:'toast notifikasi Kibana per-channel' },
                { name:'reminder.js',      cm:'pengingat terjadwal' },
                { name:'shift_notes.js',   cm:'catatan handover shift' },
                { name:'export_report.js', cm:'export laporan ke Excel' },
            ]},
            { name:'grafana', cm:'panel Grafana (ava / CPU / memory)', children:[
                { name:'availability.html · cpu_monitor.html · memory_monitor.html', cm:'3 panel monitor' },
                { name:'grafana_ui.js · grafana_action.js · grafana_launcher.js', cm:'UI, aksi & launcher' },
                { name:'history_log.js · history_ticket.js · asset_modal.js', cm:'riwayat & aset' },
            ]},
            { name:'opmanager', cm:'panel alarm OpManager', children:[
                { name:'opm_ui.js · opm_action.js · history_opmanager.js', cm:'UI, aksi & riwayat' },
            ]},
            { name:'kibana', cm:'panel transaksi', children:[
                { name:'channel_merah.html', cm:'panel monitoring channel (4-bar merah)' },
            ]},
            { name:'modals', cm:'jendela pop-up', children:[
                { name:'unified_ticket.js',  cm:'modal 🎫 TICKETS gabungan' },
                { name:'panic_modal.js',     cm:'modal eskalasi PANIC' },
                { name:'schedule_modal.js · schedule_algorithm.js', cm:'jadwal shift' },
            ]},
            { name:'tools', cm:'alat bantu di menu 🛠️ Tools', children:[
                { name:'fu_pagi.js',           cm:'FU Pagi — verifikasi & eskalasi WA' },
                { name:'fu_itsm.js',           cm:'FU ITSM — tiket open → gambar → WA' },
                { name:'eos_report.js',        cm:'EOS Report 🌙 on-demand — Grafana → Excel+TXT+HTML' },
                { name:'ip_checker.js',        cm:'cek detail sebuah IP' },
                { name:'ticket_verifier.js',   cm:'verifikasi tiket vs alarm' },
                { name:'rvtools_manager.js',   cm:'pengelola database RVTools' },
                { name:'dynatrace_scraper.js', cm:'scraper Dynatrace' },
                { name:'console_modal.js',     cm:'Console in-app 🖥️ — pemantau error JS' },
                { name:'docs_modal.js',        cm:'dokumentasi ini 📘' },
            ]},
        ]},
        { name:'src', cm:'aset pendukung', children:[
            { name:'alarm', cm:'file suara alarm (.mp3 / .wav)', children:[] },
            { name:'lib',   cm:'library JS (ExcelJS, html2canvas, dll)', children:[] },
        ]},
        { name:'backup', cm:'cadangan file lama', children:[] },
        { name:'start.bat',        star:true, ico:'🚀', cm:'PENGGERAK UTAMA — double-click ini untuk menjalankan semuanya' },
        { name:'index.html',       cm:'halaman dashboard utama (yang dibuka di browser)' },
        { name:'itsm_proxy.py',    cm:'jembatan CORS ke server ITSM (port 3737)' },
        { name:'start_hidden.vbs', cm:'jalankan start.bat tanpa jendela (tersembunyi)' },
        { name:'stop_hidden.bat',  cm:'hentikan proses yang berjalan tersembunyi' },
        { name:'ip_checker.html · rvtools.html · settings.html · prtg_modal.html', cm:'halaman pendukung' },
    ]
};

function _docsTreeNode(node) {
    const cm = node.cm ? '<span class="cm">' + node.cm + '</span>' : '';
    if (node.children) {
        const kids = node.children.length
            ? node.children.map(_docsTreeNode).join('')
            : '<div class="frow"><span class="pad"></span><span class="cm">(isi dibuat/diisi sesuai kebutuhan)</span></div>';
        return '<details' + (node.open ? ' open' : '') + '>'
             +   '<summary><span class="arr">▶</span><span class="nm dir">📁 ' + node.name + '</span>' + cm + '</summary>'
             +   '<div class="kids">' + kids + '</div>'
             + '</details>';
    }
    const ico = node.ico || '📄';
    return '<div class="frow"><span class="pad"></span>'
         +   '<span class="nm' + (node.star ? ' star' : '') + '">' + ico + ' ' + node.name + (node.star ? ' ⭐' : '') + '</span>' + cm
         + '</div>';
}

function _docsTreeAll(open) {
    document.querySelectorAll('#docsTreeWrap details').forEach(d => { d.open = open; });
}

function _docsPaneStructure() {
    let h = '<h3>📁 Struktur Folder Proyek</h3>';
    h += '<p><b>Klik nama folder 📁 untuk membuka / menutup isinya.</b> Singkatnya: <b>API</b> = mesin penarik data, <b>Data_JSON</b> = gudang hasil, <b>page</b> = tampilan, <b>src</b> = aset (suara & library), dan file di akar = penggerak (start.bat) plus halaman pendukung.</p>';

    h += '<div class="docs-tree-bar">'
       +   '<button class="docs-tree-btn" onclick="_docsTreeAll(true)">⊞ Buka Semua</button>'
       +   '<button class="docs-tree-btn" onclick="_docsTreeAll(false); document.querySelector(\'#docsTreeWrap > details\').open = true;">⊟ Tutup Semua</button>'
       + '</div>';

    h += '<div class="docs-dtree" id="docsTreeWrap">' + _docsTreeNode(DOCS_TREE) + '</div>';

    h += '<div class="docs-note">'
       +   '<div class="ico">🧭</div>'
       +   '<div class="txt"><b>Cara membaca alur file:</b> script di <b>📁API</b> menarik data dan menulisnya ke <b>📁Data_JSON</b>. '
       +   'File <code>start.bat</code> menggabungkan semuanya menjadi <code>data.js</code>. '
       +   'Lalu <code>index.html</code> + script di <b>📁page</b> membaca <code>data.js</code> dan menggambar dashboard. '
       +   'Jadi arah datanya: <b>API → Data_JSON → page (browser)</b>.</div>'
       + '</div>';

    h += '<div class="docs-note green">'
       +   '<div class="ico">⭐</div>'
       +   '<div class="txt">Tiga file paling penting: <code>start.bat</code> (penggerak), <code>Data_JSON/data.js</code> (hasil gabungan), '
       +   'dan <code>index.html</code> (yang Anda lihat di browser).</div>'
       + '</div>';

    return h;
}

const DOCS_PANES = [
    { id:'overview',  label:'🗂️ Overview',      build:_docsPaneOverview },
    { id:'howitworks', label:'⚙️ Cara Kerja',    build:_docsPaneHowItWorks },
    { id:'structure', label:'📁 Struktur Folder', build:_docsPaneStructure },
    { id:'sources',   label:'🔌 Sumber Data',    build:_docsPaneSources },
    { id:'components', label:'🧩 Komponen',       build:_docsPaneComponents },
    { id:'buttons',   label:'⌨️ Tombol UI',      build:_docsPaneButtons },
    { id:'testing',   label:'🧪 API Testing',     build:_docsPaneTesting },
];

function _docsSwitchTab(id) {
    document.querySelectorAll('.docs-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    document.querySelectorAll('.docs-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === id));
}

// ── Build modal ───────────────────────────────────────────────────────────────
function _docsBuild() {
    if (document.getElementById('docsOverlay')) return;
    _docsInjectStyle();

    const overlay = document.createElement('div');
    overlay.id = 'docsOverlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeDocsModal(); });

    let tabs = '';
    let panes = '';
    DOCS_PANES.forEach((p, i) => {
        tabs += '<button class="docs-tab' + (i === 0 ? ' active' : '') + '" data-tab="' + p.id + '" onclick="_docsSwitchTab(\'' + p.id + '\')">' + p.label + '</button>';
        panes += '<div class="docs-pane' + (i === 0 ? ' active' : '') + '" data-pane="' + p.id + '">' + p.build() + '</div>';
    });

    overlay.innerHTML =
        '<div id="docsBox">'
      +   '<div class="docs-head">'
      +     '<div class="docs-title">📘 Dokumentasi Program <small>NOC Acme Monitoring Dashboard</small></div>'
      +     '<div style="display:flex;align-items:center;gap:10px;">'
      +       '<button class="docs-pdf" onclick="_docsExportPdf()" title="Simpan seluruh dokumentasi sebagai file PDF">🖨️ Export PDF</button>'
      +       '<button class="docs-x" onclick="closeDocsModal()">&times;</button>'
      +     '</div>'
      +   '</div>'
      +   '<div class="docs-tabs">' + tabs + '</div>'
      +   '<div class="docs-body">' + panes + '</div>'
      + '</div>';

    document.body.appendChild(overlay);
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT PDF — buka jendela cetak ramah kertas, lalu pilih "Save as PDF"
// ══════════════════════════════════════════════════════════════════════════════

// Glosarium: istilah teknis dijelaskan dengan bahasa sehari-hari (untuk non-IT)
const DOCS_GLOSSARY = [
    ['Dashboard', 'Layar ringkasan yang menampilkan banyak informasi penting dalam satu tampilan — seperti panel instrumen mobil.'],
    ['Server', 'Komputer yang tugasnya “melayani” permintaan komputer lain, misalnya menyimpan data atau menjalankan aplikasi.'],
    ['Browser', 'Aplikasi untuk membuka halaman web — contohnya Chrome atau Edge.'],
    ['Port', 'Nomor “pintu” pada komputer. Satu komputer punya banyak pintu — dashboard ini lewat pintu 8060, jembatan ITSM lewat pintu 3737.'],
    ['Script', 'Daftar perintah tertulis yang dijalankan komputer secara otomatis tanpa perlu diklik satu-satu (file .bat, .ps1, .py).'],
    ['API', '“Loket resmi” tempat sebuah aplikasi meminta data ke aplikasi lain — kita bertanya lewat loket, dijawab dengan data.'],
    ['JSON', 'Format file teks untuk menyimpan data secara terstruktur agar mudah dibaca program — ibarat formulir yang isiannya rapi.'],
    ['Proxy', 'Perantara / jembatan antara dua pihak yang tidak bisa berkomunikasi langsung.'],
    ['Loop / Siklus', 'Proses yang diulang terus-menerus secara otomatis: selesai sampai akhir, kembali lagi ke awal.'],
    ['Fetch / Tarik data', 'Proses mengambil data dari sistem sumber untuk disimpan dan diolah.'],
    ['Alarm / CRIT', 'Tanda peringatan saat ada server atau perangkat bermasalah (CRIT = critical = kondisi parah).'],
    ['Availability', 'Tingkat “kehadiran” server — berapa persen waktu server menyala dan bisa diakses.'],
    ['Scraping', 'Mengambil data dengan cara “membaca” tampilan halaman web, karena sistemnya tidak menyediakan loket resmi (API).'],
    ['Bucket / Keranjang', 'Pengelompokan data per potongan waktu — misalnya semua transaksi dalam 30 detik dimasukkan ke satu keranjang.'],
    ['Watchdog', 'Penjaga waktu — bila sebuah proses berjalan terlalu lama, dihentikan paksa supaya keseluruhan sistem tidak ikut macet.'],
    ['Raw / Data mentah', 'Data persis seperti yang diberikan sumbernya, belum dirapikan — perlu diolah dulu sebelum bisa ditampilkan.'],
];

function _pdfTable(head, rows) {
    let h = '<table><thead><tr>';
    head.forEach(c => h += '<th>' + c + '</th>');
    h += '</tr></thead><tbody>';
    rows.forEach(r => {
        h += '<tr>';
        r.forEach((c, i) => h += '<td>' + (i === 0 ? '<b>' + c + '</b>' : c) + '</td>');
        h += '</tr>';
    });
    return h + '</tbody></table>';
}

function _pdfNote(cls, ico, html) {
    return '<div class="note ' + cls + '">' + ico + ' ' + html + '</div>';
}

function _pdfSteps(arr) {
    let h = '';
    arr.forEach(s => {
        h += '<div class="step"><div class="n">' + s.n + '</div><div>'
           +   '<div class="tt">' + s.title + '</div>'
           +   '<div class="dd">' + s.desc + '</div>'
           +   (s.tag ? '<span class="tag">' + s.tag + '</span>' : '')
           + '</div></div>';
    });
    return h;
}

// Diagram alur vertikal: objek {b:judul, s:keterangan} = kotak · string = panah berlabel
function _pdfFlow(items) {
    let h = '<div class="flow">';
    items.forEach(it => {
        if (typeof it === 'string') {
            h += '<div class="farr">▼ <i>' + it + '</i></div>';
        } else {
            h += '<div class="fbox"><div class="ft">' + it.b + '</div>'
               + (it.s ? '<div class="fs">' + it.s + '</div>' : '') + '</div>';
        }
    });
    return h + '</div>';
}

// Pohon folder versi cetak: semua terbuka, indentasi ke bawah
function _pdfTreeRows(node, depth) {
    const isDir = !!node.children;
    const ico = isDir ? (depth === 0 ? '📂' : '📁') : (node.ico || '📄');
    const cls = node.star ? 'tr-star' : (isDir ? 'tr-dir' : '');
    let h = '<div class="tr-row" style="padding-left:' + (depth * 16) + 'px">'
          +   '<span class="' + cls + '">' + ico + ' ' + node.name + (node.star ? ' ⭐' : '') + '</span>'
          +   (node.cm ? ' <span class="tr-cm">— ' + node.cm + '</span>' : '')
          + '</div>';
    if (isDir) node.children.forEach(c => { h += _pdfTreeRows(c, depth + 1); });
    return h;
}

function _docsPdfHtml() {
    const today = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

    const css = `
    * { box-sizing:border-box; }
    body { font-family:'Segoe UI',system-ui,sans-serif; color:#24292f; margin:0; line-height:1.65; font-size:12.5px; background:#fff; padding-top:56px; }
    @page { size:A4; margin:16mm 15mm; }
    @media print { body { padding-top:0; } .no-print { display:none !important; } }
    .toolbar { position:fixed; top:0; left:0; right:0; background:#0a3069; color:#fff; padding:10px 18px;
        display:flex; align-items:center; justify-content:space-between; gap:14px; font-size:12.5px; z-index:10; box-shadow:0 2px 10px rgba(0,0,0,.25); }
    .toolbar button { background:#2ea043; border:none; color:#fff; font-weight:700; padding:9px 18px; border-radius:6px; cursor:pointer; font-size:12.5px; white-space:nowrap; }
    .toolbar button:hover { background:#3fb950; }
    .wrap { max-width:760px; margin:0 auto; padding:28px 24px; }
    @media print { .wrap { max-width:none; padding:0; } }
    .cover { text-align:center; padding-top:130px; page-break-after:always; }
    .cover .big { font-size:88px; }
    .cover h1 { font-size:32px; color:#0a3069; margin:16px 0 6px; }
    .cover .sub { font-size:17px; color:#57606a; font-weight:600; }
    .cover .meta { margin-top:26px; color:#6e7781; font-size:12px; }
    .cover .tagline { margin-top:50px; color:#57606a; font-size:13px; font-style:italic; }
    h2.chap { font-size:20px; color:#0a3069; border-bottom:3px solid #218bff; padding-bottom:8px; margin:0 0 16px; page-break-after:avoid; }
    .chapter { page-break-before:always; }
    h3 { font-size:14px; color:#0969da; margin:20px 0 8px; page-break-after:avoid; }
    p { margin:0 0 10px; color:#3f4750; }
    p.small { color:#6e7781; font-size:11px; }
    code { background:#f6f8fa; border:1px solid #d0d7de; border-radius:4px; padding:1px 5px; font-family:Consolas,monospace; font-size:11px; color:#0a3069; }
    table { width:100%; border-collapse:collapse; margin:8px 0 16px; font-size:11.5px; }
    th { background:#f6f8fa; border:1px solid #d0d7de; padding:7px 9px; text-align:left; color:#24292f; }
    td { border:1px solid #d0d7de; padding:7px 9px; vertical-align:top; color:#3f4750; }
    tr { page-break-inside:avoid; }
    .note { background:#ddf4ff; border:1px solid #54aeff; border-radius:8px; padding:12px 15px; margin:10px 0 16px; page-break-inside:avoid; }
    .note.amber { background:#fff8c5; border-color:#d4a72c; }
    .note.green { background:#dafbe1; border-color:#4ac26b; }
    .step { display:flex; gap:12px; border:1px solid #d0d7de; border-radius:8px; padding:10px 13px; margin-bottom:8px; page-break-inside:avoid; }
    .step .n { width:27px; height:27px; border-radius:50%; background:#218bff; color:#fff; font-weight:700;
        display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:12px; }
    .step .tt { font-weight:700; color:#24292f; }
    .step .dd { color:#57606a; font-size:11.5px; }
    .tag { display:inline-block; margin-top:5px; font-family:Consolas,monospace; font-size:10px; background:#f6f8fa; border:1px solid #d0d7de; border-radius:4px; padding:1px 7px; color:#0a3069; }
    .flow { margin:10px 0 18px; }
    .fbox { border:1.5px solid #218bff; background:#f0f7ff; border-radius:8px; padding:9px 14px; page-break-inside:avoid; }
    .fbox .ft { font-weight:700; color:#0a3069; font-size:12px; }
    .fbox .fs { color:#57606a; font-size:11px; margin-top:2px; }
    .farr { text-align:center; color:#0969da; font-size:10.5px; padding:4px 0; page-break-inside:avoid; }
    .tree { font-family:Consolas,monospace; font-size:11px; border:1px solid #d0d7de; border-radius:8px; padding:13px 15px; margin:8px 0 16px; line-height:1.7; }
    .tr-dir { color:#0969da; font-weight:700; }
    .tr-star { color:#1a7f37; font-weight:700; }
    .tr-cm { color:#6e7781; font-style:italic; font-family:'Segoe UI',sans-serif; font-size:10.5px; }
    .toc { font-size:14px; line-height:2.2; }
    .toc li { padding-left:6px; }
    .foot { margin-top:34px; color:#8b949e; font-size:10.5px; text-align:center; border-top:1px solid #d0d7de; padding-top:10px; }
    `;

    const chap = (no, title, inner) => '<div class="chapter"><h2 class="chap">' + no + '. ' + title + '</h2>' + inner + '</div>';

    // ── Bab 1: Pendahuluan ──
    let c1 = '<p><b>NOC Acme Monitoring Dashboard</b> adalah aplikasi pemantau terpusat: satu layar yang menampilkan kondisi seluruh server, jaringan, transaksi, dan tiket gangguan Example Corp secara <b>real-time</b>. Data dikumpulkan otomatis dari 5 sistem berbeda (Grafana, OpManager, Kibana, PRTG, dan ITSM), sehingga petugas NOC tidak perlu membuka banyak aplikasi satu per satu.</p>';
    c1 += _pdfNote('green', '💡', '<b>Analogi sederhana:</b> ' + DOCS_ANALOGY);
    c1 += '<h3>Alamat penting</h3>';
    c1 += _pdfTable(['Port (pintu)', 'Kegunaan'], [
        ['8060', 'Alamat utama dashboard. Buka di browser: <code>http://127.0.0.1:8060</code>'],
        ['3737', 'Jembatan (proxy) ke sistem tiket ITSM — berjalan otomatis di belakang layar'],
    ]);
    c1 += '<h3>Cara menjalankan & menghentikan</h3>';
    c1 += _pdfSteps([
        { n:'1', title:'Nyalakan', desc:'Double-click file <code>start.bat</code> di folder utama. Akan muncul jendela hitam — <b>biarkan tetap terbuka</b>, itulah “mesin” yang bekerja mengumpulkan data.' },
        { n:'2', title:'Buka dashboard', desc:'Buka browser (Chrome / Edge), ketik alamat <code>http://127.0.0.1:8060</code>.' },
        { n:'3', title:'Mematikan', desc:'Tutup jendela hitam start.bat (atau tekan Ctrl+C di dalamnya). Setelah itu dashboard berhenti menerima data baru.' },
    ]);
    c1 += '<h3>Masalah umum & solusinya</h3>';
    c1 += _pdfTable(['Gejala', 'Solusi'], DOCS_TROUBLE);

    // ── Bab 2: Peta Besar Siklus ──
    let c2 = '<p>Satu putaran siklus <code>start.bat</code> menjalankan 8 tahap. <b>Catatan penting:</b> nomor 1–8 di layar hitam adalah nomor tampilan — urutan eksekusi sebenarnya adalah <b>1 → 3 → 6 → 7 → 8 → 2 → 4 → 5</b>: semua data mentah <i>ditarik dulu</i> dari tiap sumber, baru <i>diolah bersama</i> di akhir putaran.</p>';
    c2 += _pdfTable(['Tahap', 'Yang dilakukan', 'Script', 'Hasil (file)'], [
        ['INIT (sekali)', 'Bersihkan port 8060, proses RVTools awal, nyalakan web server + ITSM proxy', 'start.bat · rvtools_processor.ps1 · itsm_proxy.py', 'Server :8060 & :3737 hidup'],
        ['Tiap jam :00', 'Perbarui katalog IP global & kamus RVTools', 'fetch_ip.bat · rvtools_processor.ps1', 'RVTOOLS.json'],
        ['1', 'Tarik utilization Grafana (availability, CPU, memory)', 'fetch_availability / cpu / memory .bat', '6 file raw_*.json'],
        ['3', 'Tarik alarm OpManager — diawasi watchdog maks 90 detik', 'fetch_opman.bat', 'opmanager_temp_*.json · inventory · panic_data.js'],
        ['6', 'Ambil widget jaringan PRTG (scraping HTML)', 'scrap_prtg.ps1', 'prtg_data.js'],
        ['7', 'Ambil transaksi Kibana per channel', 'kibana_query.py', 'kibana_aggregation_result.json'],
        ['8', 'Ambil QRIS Do Not Honor', 'kibana_query_qris.py', 'kibana_aggregation_result_qris.json'],
        ['2', 'Saring IP yang dipantau dari semua data mentah', 'filter_logic.ps1', 'filter.json · filter_cpu_mem.json'],
        ['4', 'Gabung halaman alarm + hitung riwayat OpManager', 'opm_logic.ps1', 'opmanager_temp.json · history_opmanager.json'],
        ['5', 'Catat history & rakit berkas final', 'history_logger.bat · start.bat', 'data.js ⭐ · opmanager_data.js ⭐'],
        ['Jeda 5 dtk', 'Tunggu tombol C / P / R, lalu ulangi dari awal', 'choice', '—'],
    ]);
    c2 += _pdfNote('amber', '⚠️', '<b>Watchdog TAHAP 3:</b> bila penarikan OpManager macet lebih dari 90 detik, prosesnya dihentikan paksa dan siklus lanjut dengan status <code>[TIME]</code> — supaya satu sumber yang bermasalah tidak membuat seluruh dashboard ikut macet.');
    c2 += '<h3>Tombol pintas di jendela start.bat</h3>';
    c2 += _pdfTable(['Tekan', 'Fungsi'], DOCS_HOTKEYS);

    // ── Bab 3: Alur Grafana ──
    let c3 = '<p>Grafana menyimpan data kesehatan server: availability (ping), CPU, dan memory. Berikut perjalanan datanya dari awal sampai tampil di panel:</p>';
    c3 += _pdfFlow([
        { b:'⏱️ start.bat — TAHAP 1', s:'Memanggil 3 script penarik secara berurutan' },
        'menjalankan',
        { b:'📥 fetch_availability.bat · fetch_cpu.bat · fetch_memory.bat', s:'curl POST ke API Grafana <code>/api/ds/query</code> dengan login Basic Auth. Menanyakan metric (mis. <code>ping_percent_packet_loss</code> untuk availability) rentang 4 jam terakhir, ke 2 datasource sekaligus (v1 & v2)' },
        'jawaban mentah disimpan apa adanya ke',
        { b:'🗃️ Data_JSON/grafana/raw_ava_v1.json … raw_mem_v2.json', s:'6 file JSON mentah dalam format asli Grafana (frames = deret angka per waktu). Belum bisa langsung dipakai dashboard' },
        'TAHAP 2 — dirapikan oleh',
        { b:'🧹 filter_logic.ps1 (logic perapih)', s:'① merakit isi raw menjadi variabel di <code>data.js</code> (dataDS1, dataCPU1, …) ② mengekstrak semua alamat IP dari data mentah dengan pencocokan pola ③ menggabungkan IP secara cerdas ke <code>filter.json</code> (daftar v1/v2 + app_level + priority) ④ mencatat siapa yang aktif mengirim CPU/MEM ke <code>filter_cpu_mem.json</code>. Anti-crash: bila tarikan gagal/kosong, dipakai objek pengganti agar dashboard tidak error' },
        'TAHAP 5 — riwayat dicatat oleh',
        { b:'📝 history_logger.bat → logger_logic.ps1', s:'Membandingkan nilai sekarang vs riwayat sebelumnya: nilai jelek → catat CRITICAL · pulih → RECOVERY · data hilang → NO DATA (CPU/MEM). Hasil ke <code>history_log.json</code> & <code>history_utilization.json</code>' },
        'lalu start.bat menggabung semuanya jadi berkas final',
        { b:'⭐ Data_JSON/data.js', s:'Satu file berisi 6 data raw + log riwayat + history utilization — siap dibaca browser' },
        'dibaca & digambar oleh',
        { b:'🖥️ availability.html · cpu_monitor.html · memory_monitor.html', s:'3 panel di dashboard. Nama server diterjemahkan dari kamus <code>RVTOOLS.json</code>; bila tidak ada di kamus, tampil IP-nya' },
    ]);

    // ── Bab 4: Alur OpManager ──
    let c4 = '<p>OpManager adalah sistem alarm jaringan & perangkat. Penarikannya paling rumit karena datanya berhalaman-halaman dan servernya kadang lambat:</p>';
    c4 += _pdfFlow([
        { b:'⏱️ start.bat — TAHAP 3 (dijaga watchdog 90 detik)', s:'Bila proses macet > 90 detik → dihentikan paksa, status <code>[TIME]</code>, siklus tetap lanjut' },
        'menjalankan',
        { b:'📥 fetch_opman.bat', s:'curl dengan cookie sesi (JSESSIONID) ke API OpManager — tiap permintaan dibatasi 20 detik, gagal → diulang' },
        'langkah ① — daftar alarm (berhalaman)',
        { b:'🗃️ listAlarms → opmanager_temp_1.json … _N.json', s:'Ambil 500 alarm per halaman. Dari jumlah total (rowCount) dihitung berapa halaman yang dibutuhkan, lalu semua halaman ditarik satu per satu' },
        'langkah ② — daftar perangkat',
        { b:'🗃️ listDevices → opmanager_inventory.json', s:'Katalog perangkat — dipakai untuk memetakan IP ↔ nama perangkat' },
        'langkah ③ — status 2 link penting',
        { b:'🚨 getInterfaceSummary → panic_data.js', s:'Status link SITE-A & SITE-B untuk tombol PANIC — langsung dirakit jadi file siap-baca browser' },
        'TAHAP 4 — diolah oleh',
        { b:'🧮 opm_logic.ps1 (logic penghitung)', s:'① gabungkan semua halaman jadi <code>opmanager_temp.json</code> lalu hapus file sementara ② GUARD: bila hasil 0 alarm, berhenti — mencegah riwayat tertutup massal gara-gara tarikan gagal ③ kelola <code>history_opmanager.json</code> (kapan alarm muncul/hilang) lengkap dengan auto-restore dari folder backup bila file rusak' },
        'TAHAP 5 — dibungkus jadi',
        { b:'⭐ Data_JSON/opmanager_data.js', s:'start.bat menambahkan awalan <code>var dataOPM =</code> supaya bisa langsung dibaca browser' },
        'dibaca & digambar oleh',
        { b:'🖥️ Panel OpManager (opm_ui.js) + modal 🎫 TICKETS', s:'Tabel alarm aktif, umur alarm, dan status tiketnya' },
    ]);
    c4 += _pdfNote('', 'ℹ️', '<b>Bonus:</b> fetch_opman.bat juga menulis ringkasan “alarm berumur 5–15 menit” ke <code>ui_summary.txt</code> yang ditampilkan di layar hitam start.bat — petugas bisa melihat IP prioritas terbaru tanpa membuka dashboard.');

    // ── Bab 5: Alur Kibana ──
    let c5 = '<p>Kibana menyimpan log transaksi channel pembayaran. Tujuan pemantauan: mendeteksi channel yang transaksinya mulai gagal, secepat mungkin.</p>';
    c5 += '<h3>Transaksi per channel (TAHAP 7)</h3>';
    c5 += _pdfFlow([
        { b:'🐍 kibana_query.py', s:'Login lalu POST ke <code>/internal/bsearch</code>. Meminta seluruh transaksi 15 menit terakhir (kode respons 0210), dikelompokkan per channel, lalu per potongan 30 detik' },
        'tiap “keranjang” 30 detik dihitung',
        { b:'🧮 Success vs non-Success', s:'Keranjang yang berisi transaksi Fail / Timeout / Error → ditandai MERAH · semua sukses → HIJAU' },
        'hasil disimpan ke',
        { b:'🗃️ Data_JSON/kibana/kibana_aggregation_result.json', s:'start.bat juga menyalinnya ke <code>…_perm.json</code> sebagai cadangan permanen' },
        'dibaca & digambar oleh',
        { b:'🖥️ channel_merah.html (panel Kibana)', s:'Deret bar per channel — frontend memeriksa 4 keranjang terakhir tiap channel' },
        'bila 4 bar merah berturut-turut…',
        { b:'🔔 notification.js + alarm_engine.js', s:'Toast muncul di kiri-bawah layar (hilang otomatis 40 detik / klik ✕) + suara alarm berbunyi (kibana_153 / kibana_194)' },
    ]);
    c5 += '<h3>QRIS Do Not Honor (TAHAP 8)</h3>';
    c5 += '<p>Jalurnya sama persis, hanya script-nya <code>kibana_query_qris.py</code> dan hasilnya <code>kibana_aggregation_result_qris.json</code>. Alarm khususnya: jumlah “Do Not Honor” <b>naik +20</b> dibanding pengecekan sebelumnya → alarm 🚨 · mencapai <b>≥ 200</b> → alarm CRITICAL 💀.</p>';

    // ── Bab 6: Alur PRTG ──
    let c6 = '<p>PRTG memantau koneksi jaringan kantor cabang (MPLS & Internet). Bedanya dari sumber lain: PRTG di sini tidak diakses lewat loket API — datanya diambil dengan <b>scraping</b>, yaitu “membaca” tampilan halaman webnya lalu mengekstrak angka-angkanya.</p>';
    c6 += _pdfFlow([
        { b:'⏱️ start.bat — TAHAP 6 → scrap_prtg.ps1', s:'curl mengunduh halaman peta publik PRTG (file HTML utuh)' },
        'HTML dibedah dengan pencocokan pola (regex)',
        { b:'🧮 Ekstraksi 2 bagian', s:'① grafik donat ringkasan MPLS & INTERNET (berapa site up / down / warning) ② tabel daftar site yang sedang down' },
        'hasil disimpan ke',
        { b:'🗃️ Data_JSON/prtg_data.js', s:'Berisi jam update terakhir + ringkasan + daftar alarm. Bila gagal terhubung, pesan kegagalannya dicatat ke <code>ui_summary.txt</code>' },
        'dibaca & digambar oleh',
        { b:'🖥️ Widget PRTG di dashboard + alarm', s:'Site prioritas down → alarm ⭐ (prtg_vip) · site biasa down → alarm 🔔 (prtg_gen)' },
    ]);

    // ── Bab 7: Alur ITSM ──
    let c7 = '<p>ITSM (sistem tiket) berbeda dari semua sumber lain: datanya <b>tidak ikut siklus start.bat</b>, melainkan diambil <b>langsung saat tombol ditekan</b> (live). Contoh alur fitur FU ITSM:</p>';
    c7 += _pdfFlow([
        { b:'🖱️ Klik menu FU ITSM (di 🛠️ Tools)', s:'fu_itsm.js meminta daftar tiket yang masih open' },
        'permintaan dikirim ke',
        { b:'🌉 itsm_proxy.py (port 3737)', s:'“Jembatan” yang dinyalakan start.bat saat awal. Ia menambahkan kunci akses (token) lalu meneruskan permintaan ke server ITSM asli' },
        'diteruskan ke',
        { b:'🏦 itsm.example.com/rest/servicedeskapi', s:'Server ITSM menjawab dengan daftar tiket open' },
        'hasil dirender jadi',
        { b:'🖼️ Tabel tiket → diubah jadi GAMBAR (html2canvas)', s:'Gambar otomatis tersalin ke clipboard' },
        'tinggal',
        { b:'📲 Paste (Ctrl+V) di WhatsApp', s:'Untuk laporan / follow-up ke grup' },
    ]);
    c7 += _pdfNote('', '🛡️', '<b>Kenapa perlu jembatan?</b> Browser punya aturan keamanan (CORS) yang melarang halaman web mengambil data dari situs lain secara langsung. Proxy menjadi perantara resmi yang diperbolehkan.');

    // ── Bab 8: Alur RVTools ──
    let c8 = '<p>RVTools adalah ekspor data VMware berisi daftar seluruh VM. Di dashboard ini ia berperan sebagai <b>kamus penerjemah</b>: dari alamat IP menjadi nama server — supaya yang tampil adalah nama yang mudah dikenali, bukan sekadar deretan angka.</p>';
    c8 += _pdfFlow([
        { b:'📄 File Excel / CSV hasil ekspor RVTools', s:'Ditaruh manual di folder <code>Data_JSON/RVTOOLS/</code>' },
        'diolah oleh rvtools_processor.ps1 — berjalan saat: start awal · otomatis tiap jam :00 · tombol R',
        { b:'🗃️ Data_JSON/RVTOOLS.json', s:'Kamus jadi: IP → nama VM, cluster, host' },
        'dipakai oleh',
        { b:'🖥️ Panel Grafana (availability dkk.)', s:'Menampilkan nama VM untuk tiap IP yang dipantau' },
    ]);
    c8 += _pdfNote('green', '💾', '<b>Sekaligus backup:</b> bila file CSV-nya dihapus, <code>RVTOOLS.json</code> lama TIDAK ikut terhapus — nama-nama server tetap tampil dari data terakhir yang pernah diolah.');

    // ── Bab 9: Sistem Alarm & Notifikasi ──
    let c9 = '<p>Semua data yang terkumpul diawasi oleh <b>alarm_engine.js</b> — “CCTV” di dalam browser yang memeriksa kondisi setiap beberapa detik dan membunyikan suara bila ada masalah. Alarm dibagi 6 kelompok:</p>';
    c9 += _pdfTable(['Kelompok', 'Isi & pemicunya'], [
        ['🚨 1. Critical & Escalation', 'PANIC BUTTON — link utama SITE-A / SITE-B terdeteksi down'],
        ['🎫 2. Ticket Alarms', 'Alarm OpManager / Grafana yang belum direspons > 5 menit (versi priority ⭐ & biasa 🎫)'],
        ['🔔 3. Grafana New Alert', 'Alert baru berumur < 5 menit + CPU / Memory No Data (server menghilang dari Grafana)'],
        ['📡 4. PRTG Site Down', 'Site prioritas (⭐) atau biasa (🔔) terdeteksi down'],
        ['💳 5. Kibana Transaksi', 'Channel -153 / -194 merah 4 bar berturut-turut · QRIS Do Not Honor naik +20 · QRIS ≥ 200 (CRITICAL)'],
        ['🕵️ 6. Hidden / Special', 'Grafana priority > 3 menit · tiket OpManager > 12 menit'],
    ]);
    c9 += '<p>Tiap alarm punya <b>suara sendiri</b> (file di <code>src/alarm/</code>), volume, durasi, dan jumlah pengulangan — semuanya bisa diatur lewat Settings. Tombol <code>🔊/🔇</code> me-mute semua suara, <code>🛑 STOP</code> menghentikan suara yang sedang berbunyi.</p>';
    c9 += '<h3>Fitur pendamping</h3>';
    c9 += _pdfTable(['Fitur', 'Cara kerja'], [
        ['Toast Kibana (notification.js)', 'Channel 4-bar merah → kartu notifikasi muncul di kiri-bawah, hilang sendiri setelah 40 detik atau klik ✕'],
        ['Reminder (reminder.js)', 'Pengingat terjadwal harian / bulanan — pop-up + suara'],
        ['PANIC (panic_modal.js)', 'Membaca panic_data.js → modal eskalasi status link SITE-A / SITE-B, siap kirim ke WhatsApp'],
        ['Notes Shift (shift_notes.js)', 'Catatan serah-terima antar shift'],
        ['Export Laporan (export_report.js)', 'Merangkum data monitoring menjadi file Excel'],
    ]);

    // ── Bab 10: Struktur Folder ──
    let c10 = '<p>Peta folder proyek. Cara membaca alurnya: script di <b>API</b> menarik data dan menulis hasilnya ke <b>Data_JSON</b>; lalu <code>start.bat</code> menggabungkannya menjadi <code>data.js</code>; terakhir <code>index.html</code> + script di <b>page</b> membacanya dan menggambar dashboard. Arah datanya: <b>API → Data_JSON → page (browser)</b>.</p>';
    c10 += '<div class="tree">' + _pdfTreeRows(DOCS_TREE, 0) + '</div>';
    c10 += _pdfNote('green', '⭐', 'Tiga file paling penting: <code>start.bat</code> (penggerak), <code>Data_JSON/data.js</code> (hasil gabungan semua data), dan <code>index.html</code> (tampilan yang dibuka di browser).');

    // ── Bab 11: Glosarium ──
    let c11 = '<p>Istilah teknis yang muncul dalam dokumen ini, dijelaskan dengan bahasa sehari-hari:</p>'
            + _pdfTable(['Istilah', 'Arti sederhana'], DOCS_GLOSSARY);

    // ── Bab 12: Lampiran ──
    let c12 = '<h3>Sumber data & endpoint</h3>';
    c12 += '<p>Arti kolom: <b>Sumber</b> = sistem asal data · <b>Endpoint</b> = alamat “loket” · <b>Auth</b> = cara masuk · <b>Output</b> = file hasil · <b>Penarik</b> = script pengambil.</p>';
    c12 += _pdfTable(['Sumber', 'Endpoint', 'Auth', 'Output', 'Penarik'], DOCS_SOURCES);
    c12 += '<h3>Tombol & menu dashboard</h3>';
    c12 += _pdfTable(['Tombol', 'Fungsi'], DOCS_BUTTONS);
    c12 += '<h3>Komponen frontend (untuk tim IT)</h3>';
    c12 += _pdfTable(['File', 'Fungsi'], DOCS_COMPONENTS);

    let b = '';
    b += '<div class="toolbar no-print">'
       +   '<span>💾 <b>Cara menyimpan:</b> klik tombol hijau → pada dialog pilih printer <b>“Save as PDF”</b> atau <b>“Microsoft Print to PDF”</b> → klik Save.</span>'
       +   '<button onclick="window.print()">🖨️ Cetak / Simpan PDF</button>'
       + '</div>';
    b += '<div class="wrap">';
    b += '<div class="cover">'
       +   '<div class="big">📘</div>'
       +   '<h1>Dokumentasi Program</h1>'
       +   '<div class="sub">NOC Acme Monitoring Dashboard</div>'
       +   '<div class="meta">Dibuat otomatis dari aplikasi · ' + today + '</div>'
       +   '<div class="tagline">Panduan lengkap sistem monitoring — ditulis dengan bahasa sederhana<br>agar dapat dipahami siapa pun, termasuk yang bukan orang IT.</div>'
       + '</div>';
    b += '<h2 class="chap">Daftar Isi</h2><ol class="toc">'
       +   '<li>Pendahuluan &amp; Cara Menjalankan</li>'
       +   '<li>Peta Besar — Siklus start.bat</li>'
       +   '<li>Alur Grafana (Availability · CPU · Memory)</li>'
       +   '<li>Alur OpManager (Alarm · Inventory · PANIC Link)</li>'
       +   '<li>Alur Kibana (Transaksi &amp; QRIS)</li>'
       +   '<li>Alur PRTG (Jaringan Cabang)</li>'
       +   '<li>Alur ITSM (Tiket — Live)</li>'
       +   '<li>Alur RVTools (Kamus Nama Server)</li>'
       +   '<li>Sistem Alarm &amp; Notifikasi</li>'
       +   '<li>Struktur Folder</li>'
       +   '<li>Glosarium — istilah teknis dalam bahasa sederhana</li>'
       +   '<li>Lampiran — Tabel Ringkas</li>'
       + '</ol>';
    b += chap(1, 'Pendahuluan &amp; Cara Menjalankan', c1);
    b += chap(2, 'Peta Besar — Siklus start.bat', c2);
    b += chap(3, 'Alur Grafana (Availability · CPU · Memory)', c3);
    b += chap(4, 'Alur OpManager (Alarm · Inventory · PANIC Link)', c4);
    b += chap(5, 'Alur Kibana (Transaksi &amp; QRIS)', c5);
    b += chap(6, 'Alur PRTG (Jaringan Cabang)', c6);
    b += chap(7, 'Alur ITSM (Tiket — Live)', c7);
    b += chap(8, 'Alur RVTools (Kamus Nama Server)', c8);
    b += chap(9, 'Sistem Alarm &amp; Notifikasi', c9);
    b += chap(10, 'Struktur Folder', c10);
    b += chap(11, 'Glosarium', c11);
    b += chap(12, 'Lampiran — Tabel Ringkas', c12);
    b += '<div class="foot">Dokumen ini dibuat otomatis dari aplikasi — tombol 📘 Docs → 🖨️ Export PDF · ' + today + '</div>';
    b += '</div>';

    const autoprint = '<scr' + 'ipt>window.addEventListener("load",function(){setTimeout(function(){window.print();},600);});</scr' + 'ipt>';

    return '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">'
         + '<title>Dokumentasi - NOC Acme Monitoring Dashboard</title>'
         + '<style>' + css + '</style></head><body>' + b + autoprint + '</body></html>';
}

function _docsExportPdf() {
    const w = window.open('', '_blank');
    if (!w) {
        alert('Pop-up diblokir browser.\nIzinkan pop-up untuk 127.0.0.1 lalu klik 🖨️ Export PDF lagi.');
        return;
    }
    w.document.write(_docsPdfHtml());
    w.document.close();
}

// ── API publik ────────────────────────────────────────────────────────────────
function openDocsModal() {
    _docsBuild();
    const o = document.getElementById('docsOverlay');
    o.classList.add('show');
    // auto jalankan test bila tab API Testing dibuka? Tidak — biar manual. Tapi reset ke overview.
    _docsSwitchTab('overview');
}

function closeDocsModal() {
    const o = document.getElementById('docsOverlay');
    if (o) o.classList.remove('show');
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const o = document.getElementById('docsOverlay');
        if (o && o.classList.contains('show')) closeDocsModal();
    }
});
