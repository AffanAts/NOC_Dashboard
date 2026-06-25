/**
 * page/tools/console_modal.js
 * Console In-App — menangkap error / warning / log JS dan menampilkannya di modal.
 * Berguna untuk tahu cepat apakah ada yang rusak tanpa harus buka DevTools (F12).
 *
 * Dipanggil dari menu 🛠️ Tools → 🖥️ Console.
 * Self-contained: pasang penangkap SEDINI mungkin, inject CSS sendiri, bangun modal di <body>.
 */

(function () {
    'use strict';
    if (window.__nocConsoleInstalled) return;
    window.__nocConsoleInstalled = true;

    const MAX_ENTRIES = 500;              // batasi memori
    const _log = [];                      // { t, level, msg, src }
    let _unseenError = 0;                 // jumlah error baru yang belum dilihat
    let _open = false;
    let _filter = 'all';                  // all | error | warn | info

    // ── Util ──────────────────────────────────────────────────────────────────
    function _now() {
        const d = new Date();
        return d.toLocaleTimeString('id-ID', { hour12: false }) + '.' +
               String(d.getMilliseconds()).padStart(3, '0');
    }

    function _fileOf(src) {
        if (!src) return '';
        try { return String(src).split(/[\\/]/).pop().split('?')[0]; } catch (e) { return String(src); }
    }

    // Ubah argumen apa pun jadi teks yang terbaca
    function _stringify(a) {
        if (a instanceof Error) return (a.stack || (a.name + ': ' + a.message));
        if (typeof a === 'string') return a;
        if (a === undefined) return 'undefined';
        if (a === null) return 'null';
        try { return JSON.stringify(a, null, 0); } catch (e) { return String(a); }
    }

    function _push(level, msg, src) {
        _log.push({ t: _now(), level, msg, src: _fileOf(src) });
        if (_log.length > MAX_ENTRIES) _log.shift();
        if (level === 'error') { _unseenError++; _refreshBadge(); }
        if (_open) _render();
    }

    // ── Pasang penangkap (sedini mungkin) ──────────────────────────────────────
    // 1) Error sintaks / runtime tak tertangkap
    window.addEventListener('error', function (e) {
        // Error pemuatan resource (img/script/link) punya e.target, bukan e.message
        if (e.target && (e.target.src || e.target.href) && !e.message) {
            _push('error', 'Gagal memuat resource: ' + (e.target.src || e.target.href), _fileOf(e.target.src || e.target.href));
            return;
        }
        const where = _fileOf(e.filename) + (e.lineno ? ':' + e.lineno + ':' + (e.colno || 0) : '');
        _push('error', (e.message || 'Uncaught error') + (where ? '   @ ' + where : ''), e.filename);
    }, true);

    // 2) Promise yang ditolak tanpa .catch
    window.addEventListener('unhandledrejection', function (e) {
        const r = e.reason;
        _push('error', 'Unhandled Promise rejection: ' + _stringify(r), r && r.stack ? _fileOf(r.stack.split('\n')[1]) : '');
    });

    // 3) Bungkus console.* agar log aplikasi ikut tertangkap (tetap teruskan ke aslinya)
    ['error', 'warn', 'log', 'info'].forEach(function (m) {
        const orig = console[m] ? console[m].bind(console) : function () {};
        const level = (m === 'log' || m === 'info') ? 'info' : m;
        console[m] = function () {
            try {
                const text = Array.prototype.map.call(arguments, _stringify).join(' ');
                _push(level, text, '');
            } catch (err) { /* jangan sampai console kita sendiri bikin loop */ }
            orig.apply(null, arguments);
        };
    });

    // ── CSS ────────────────────────────────────────────────────────────────────
    function _injectStyle() {
        if (document.getElementById('_nocConStyle')) return;
        const s = document.createElement('style');
        s.id = '_nocConStyle';
        s.textContent = `
        #nocConOverlay {
            display:none; position:fixed; inset:0; z-index:50050;
            background:rgba(0,0,0,0.7); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
            justify-content:center; align-items:center;
            font-family:'Inter',system-ui,'Segoe UI',sans-serif;
        }
        #nocConOverlay.show { display:flex; }
        #nocConBox {
            width:880px; max-width:94vw; height:78vh;
            background:linear-gradient(180deg,#0d1117,#0a0e14);
            border:1px solid #30363d; border-radius:12px;
            box-shadow:0 24px 60px rgba(0,0,0,0.6);
            display:flex; flex-direction:column; overflow:hidden;
        }
        .nocCon-head { display:flex; align-items:center; gap:12px; padding:13px 18px; border-bottom:1px solid #21262d;
            background:linear-gradient(180deg,rgba(88,166,255,0.05),transparent); }
        .nocCon-title { color:#58a6ff; font-weight:800; font-size:15px; display:flex; align-items:center; gap:8px; }
        .nocCon-title small { color:#6e7681; font-weight:500; font-size:11px; }
        .nocCon-counts { display:flex; gap:7px; margin-left:6px; }
        .nocCon-chip { font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px; border:1px solid transparent; }
        .nocCon-chip.e { background:rgba(248,81,73,0.12); color:#ff7b72; border-color:rgba(248,81,73,0.3); }
        .nocCon-chip.w { background:rgba(241,224,90,0.12); color:#f1e05a; border-color:rgba(241,224,90,0.3); }
        .nocCon-chip.i { background:rgba(88,166,255,0.10); color:#79c0ff; border-color:rgba(88,166,255,0.25); }
        .nocCon-spacer { flex:1; }
        .nocCon-btn { background:#161b22; border:1px solid #30363d; color:#8b949e; font-size:11px; font-weight:600;
            padding:6px 12px; border-radius:7px; cursor:pointer; height:auto; transition:all .15s; }
        .nocCon-btn:hover { border-color:#58a6ff; color:#58a6ff; }
        .nocCon-btn.danger:hover { border-color:#f85149; color:#ff7b72; }
        .nocCon-x { background:transparent; border:none; color:#f85149; font-size:22px; cursor:pointer;
            width:32px; height:32px; border-radius:7px; line-height:1; transition:all .15s;
            display:flex; align-items:center; justify-content:center; }
        .nocCon-x:hover { background:rgba(248,81,73,0.12); transform:rotate(90deg); }
        .nocCon-tabs { display:flex; gap:4px; padding:9px 16px 0; border-bottom:1px solid #21262d; background:#0d1117; }
        .nocCon-tab { background:transparent; border:none; border-bottom:2px solid transparent; color:#8b949e;
            font-size:12px; font-weight:600; padding:7px 13px; cursor:pointer; border-radius:6px 6px 0 0; height:auto; }
        .nocCon-tab:hover { color:#c9d1d9; }
        .nocCon-tab.active { color:#58a6ff; border-bottom-color:#58a6ff; }
        .nocCon-body { flex:1; overflow-y:auto; padding:6px 0; background:#0a0e14;
            font-family:'JetBrains Mono','Consolas',monospace; font-size:12px; }
        .nocCon-row { display:flex; gap:10px; padding:5px 16px; border-bottom:1px solid rgba(255,255,255,0.03); white-space:pre-wrap; word-break:break-word; }
        .nocCon-row:hover { background:rgba(255,255,255,0.02); }
        .nocCon-row .ts { color:#484f58; flex-shrink:0; font-size:11px; }
        .nocCon-row .tag { flex-shrink:0; font-weight:800; font-size:10px; padding:0 6px; border-radius:4px; height:fit-content; line-height:18px; }
        .nocCon-row.error .tag { background:rgba(248,81,73,0.16); color:#ff7b72; }
        .nocCon-row.warn  .tag { background:rgba(241,224,90,0.16); color:#f1e05a; }
        .nocCon-row.info  .tag { background:rgba(88,166,255,0.12); color:#79c0ff; }
        .nocCon-row .txt { color:#c9d1d9; flex:1; }
        .nocCon-row.error .txt { color:#ffb3ae; }
        .nocCon-empty { text-align:center; color:#3fb950; padding:40px 20px; font-family:'Inter',sans-serif; font-size:13px; }
        .nocCon-empty.muted { color:#6e7681; }

        /* Badge merah di tombol Tools saat ada error */
        .tools-err-badge {
            position:absolute; top:-6px; right:-6px; min-width:16px; height:16px; padding:0 4px;
            background:#f85149; color:#fff; font-size:10px; font-weight:800; border-radius:9px;
            display:none; align-items:center; justify-content:center; line-height:1;
            box-shadow:0 0 0 2px #0a0e14; font-family:'Inter',sans-serif;
        }
        .tools-err-badge.show { display:flex; }
        `;
        document.head.appendChild(s);
    }

    // ── Badge di tombol Tools ───────────────────────────────────────────────────
    function _refreshBadge() {
        let badge = document.getElementById('toolsErrBadge');
        if (!badge) {
            const wrap = document.getElementById('toolsDropWrap');
            if (!wrap) return; // header belum siap
            badge = document.createElement('span');
            badge.id = 'toolsErrBadge';
            badge.className = 'tools-err-badge';
            badge.title = 'Ada error JS — buka Tools → Console';
            wrap.appendChild(badge);
        }
        if (_unseenError > 0) {
            badge.textContent = _unseenError > 99 ? '99+' : _unseenError;
            badge.classList.add('show');
        } else {
            badge.classList.remove('show');
        }
    }

    // ── Render isi ──────────────────────────────────────────────────────────────
    function _counts() {
        let e = 0, w = 0, i = 0;
        _log.forEach(function (x) { if (x.level === 'error') e++; else if (x.level === 'warn') w++; else i++; });
        return { e, w, i };
    }

    function _render() {
        const body = document.getElementById('nocConBody');
        if (!body) return;
        const c = _counts();
        const ce = document.getElementById('nocConCe'), cw = document.getElementById('nocConCw'), ci = document.getElementById('nocConCi');
        if (ce) ce.textContent = '✕ ' + c.e;
        if (cw) cw.textContent = '⚠ ' + c.w;
        if (ci) ci.textContent = 'ℹ ' + c.i;

        const rows = _log.filter(function (x) { return _filter === 'all' || x.level === _filter; });
        if (rows.length === 0) {
            const clean = (_filter === 'all' || _filter === 'error') && c.e === 0;
            body.innerHTML = '<div class="nocCon-empty ' + (clean ? '' : 'muted') + '">'
                + (clean ? '✓ Tidak ada error. Sistem berjalan normal.' : 'Tidak ada entri untuk filter ini.')
                + '</div>';
            return;
        }
        let h = '';
        const tagText = { error: 'ERR', warn: 'WARN', info: 'INFO' };
        rows.forEach(function (x) {
            h += '<div class="nocCon-row ' + x.level + '">'
               +   '<span class="ts">' + x.t + '</span>'
               +   '<span class="tag">' + tagText[x.level] + '</span>'
               +   '<span class="txt">' + _esc(x.msg) + (x.src ? '  <span style="color:#6e7681;">(' + _esc(x.src) + ')</span>' : '') + '</span>'
               + '</div>';
        });
        body.innerHTML = h;
        body.scrollTop = body.scrollHeight; // auto-scroll ke terbaru
    }

    function _esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ── Build modal ─────────────────────────────────────────────────────────────
    function _build() {
        if (document.getElementById('nocConOverlay')) return;
        _injectStyle();
        const o = document.createElement('div');
        o.id = 'nocConOverlay';
        o.addEventListener('click', function (e) { if (e.target === o) closeConsoleModal(); });
        o.innerHTML =
            '<div id="nocConBox">'
          +   '<div class="nocCon-head">'
          +     '<div class="nocCon-title">🖥️ Console <small>NOC — pemantau error JS</small></div>'
          +     '<div class="nocCon-counts">'
          +       '<span class="nocCon-chip e" id="nocConCe">✕ 0</span>'
          +       '<span class="nocCon-chip w" id="nocConCw">⚠ 0</span>'
          +       '<span class="nocCon-chip i" id="nocConCi">ℹ 0</span>'
          +     '</div>'
          +     '<div class="nocCon-spacer"></div>'
          +     '<button class="nocCon-btn" onclick="_nocConCopy()">📋 Salin</button>'
          +     '<button class="nocCon-btn danger" onclick="_nocConClear()">🗑 Bersihkan</button>'
          +     '<button class="nocCon-x" onclick="closeConsoleModal()">&times;</button>'
          +   '</div>'
          +   '<div class="nocCon-tabs">'
          +     '<button class="nocCon-tab active" data-f="all"   onclick="_nocConFilter(\'all\',this)">Semua</button>'
          +     '<button class="nocCon-tab"        data-f="error" onclick="_nocConFilter(\'error\',this)">Error</button>'
          +     '<button class="nocCon-tab"        data-f="warn"  onclick="_nocConFilter(\'warn\',this)">Warning</button>'
          +     '<button class="nocCon-tab"        data-f="info"  onclick="_nocConFilter(\'info\',this)">Info / Log</button>'
          +   '</div>'
          +   '<div class="nocCon-body" id="nocConBody"></div>'
          + '</div>';
        document.body.appendChild(o);
    }

    // ── API publik ───────────────────────────────────────────────────────────────
    window.openConsoleModal = function () {
        _build();
        document.getElementById('nocConOverlay').classList.add('show');
        _open = true;
        _unseenError = 0;   // dianggap sudah dilihat
        _refreshBadge();
        _render();
    };
    window.closeConsoleModal = function () {
        const o = document.getElementById('nocConOverlay');
        if (o) o.classList.remove('show');
        _open = false;
    };
    window._nocConFilter = function (f, btn) {
        _filter = f;
        document.querySelectorAll('.nocCon-tab').forEach(function (b) { b.classList.toggle('active', b === btn); });
        _render();
    };
    window._nocConClear = function () {
        _log.length = 0; _unseenError = 0; _refreshBadge(); _render();
    };
    window._nocConCopy = function () {
        const text = _log.map(function (x) { return '[' + x.t + '] ' + x.level.toUpperCase() + ' ' + x.msg + (x.src ? ' (' + x.src + ')' : ''); }).join('\n');
        if (navigator.clipboard && text) {
            navigator.clipboard.writeText(text).then(function () {
                const b = document.querySelector('.nocCon-head .nocCon-btn');
                if (b) { const o = b.textContent; b.textContent = '✓ Tersalin'; setTimeout(function () { b.textContent = o; }, 1200); }
            }).catch(function () {});
        }
    };

    // ESC untuk tutup
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && _open) closeConsoleModal();
    });

    // Pasang badge segera setelah header siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _refreshBadge);
    } else {
        _refreshBadge();
    }
})();
