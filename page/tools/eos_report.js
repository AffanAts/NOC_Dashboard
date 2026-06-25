/**
 * page/tools/eos_report.js
 * EOS (End of Shift) Report — ON DEMAND
 * Meniru automation UiPath di folder PERMINTAAN (GrafanaDeep, Vmware, OpManager, Mailz).
 * Output: 3 file (.xlsx / .txt / .html) dengan format SAMA seperti
 *         "NOC Report End of Shift - 13 Juni 2026 (Shift 2).xlsx"
 *
 * Sheet 1 – VM Service   : IP list dari user → Grafana Prometheus → Remark naratif
 * Sheet 2 – VMWARE HOST  : RVTools CSV (kolom Host, unik) → Grafana InfluxDB → Notes naratif
 * Sheet 3 – NETWORK      : OpManager inventory (Router/Switch/Firewall) → Alarm status
 */

// ── Konfigurasi ───────────────────────────────────────────────────────────────
// Fetch lewat grafana_proxy.py :3738 untuk menghindari CORS & SSL self-signed
const EOS_GRAFANA    = 'http://127.0.0.1:3738/grafana';
const EOS_DS_STD     = 'aemew6nyjxnggd';   // datasource standard (IP umum)
const EOS_DS_SPECIAL = 'cewc6nbmjr5kwe';   // datasource khusus (IP 10.100.*)
const EOS_DS_INFLUX  = 'beyymsn457ym8f';   // datasource InfluxDB VMware
const EOS_CFG_URL    = 'http://127.0.0.1:3738/eos-config';

// Config runtime — diisi oleh _eosLoadConfig() sebelum report dijalankan
let EOS_VM_IPS      = [];
let EOS_VMWARE_HOSTS = [];   // override manual (kosong = pakai CSV RVTools)

async function _eosLoadConfig() {
    const r = await fetch(EOS_CFG_URL + '?t=' + Date.now());
    if (!r.ok) throw new Error('Gagal load eos_config.json (HTTP ' + r.status + ')');
    const cfg = await r.json();
    EOS_VM_IPS       = cfg.vmIps       || [];
    EOS_VMWARE_HOSTS = cfg.vmwareHosts || [];
    EOS_NET_DEVICES  = cfg.netDevices  || [];
    return cfg;
}

async function _eosSaveConfig(cfg) {
    const r = await fetch(EOS_CFG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
    });
    if (!r.ok) throw new Error('Gagal simpan config (HTTP ' + r.status + ')');
}

// ── Threshold untuk Remark naratif (sama dengan logika UiPath GrafanaDeep) ────
// normal: <60, medium: 60-79, high: >=80
function _eosRemark(cpu, load, ram, swap, root) {
    const state = v => {
        if (v === 'N/A' || v === null) return null;
        const n = parseFloat(v);
        if (isNaN(n)) return null;
        if (n >= 70) return 'high';
        if (n >= 50) return 'medium';
        return 'normal';
    };
    const parts = [];
    const s = { cpu: state(cpu), load: state(load), ram: state(ram), swap: state(swap), root: state(root) };
    if (s.cpu   && s.cpu   !== 'normal') parts.push('CPU usage in '   + s.cpu + ' state');
    if (s.load  && s.load  !== 'normal') parts.push('System Load in ' + s.load + ' state');
    if (s.ram   && s.ram   !== 'normal') parts.push('RAM usage in '   + s.ram + ' state');
    if (s.swap !== null) {
        if (swap === 'N/A') parts.push('Swap used No Data');
        else if (s.swap !== 'normal') parts.push('Swap used in ' + s.swap + ' state');
    }
    if (s.root  && s.root  !== 'normal') parts.push('Root FS in '    + s.root + ' state');
    return parts.length === 0 ? 'Overall in normal state' : parts.join(', ');
}

// state untuk VMware: normal<50, medium 50-69, high>=70
function _eosVmwareNotes(cpuPct, memPct) {
    const st = v => {
        if (v == null || isNaN(v)) return null;
        if (v >= 70) return 'high'; if (v >= 50) return 'medium'; return 'normal';
    };
    const sc = st(cpuPct), sm = st(memPct);
    const parts = [];
    if (sc && sc !== 'normal') parts.push('CPU usage in ' + sc + ' state');
    if (sm && sm !== 'normal') parts.push('Memory usage in ' + sm + ' state');
    return parts.length === 0 ? 'CPU and Memory usage in normal state' : parts.join(', ');
}

// ── Helper waktu / shift ───────────────────────────────────────────────────────
// Shift 3 melewati tengah malam (00:00–06:59 = masih Shift 3 hari sebelumnya)
// → kembalikan tanggal kemarin agar judul/filename laporan tetap benar
function _eosNow() {
    const now = new Date();
    if (now.getHours() < 7) {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        return d;
    }
    return now;
}
function _eosShiftInfo(now) {
    const t = now.getHours() * 60 + now.getMinutes();
    if (t >= 420 && t <= 900)  return { num: 1, label: 'Shift 1', text: 'S1 07:00 - 15:00', startHour: 7 };
    if (t >= 901 && t <= 1380) return { num: 2, label: 'Shift 2', text: 'S2 15:01 - 23:00', startHour: 15 };
    return { num: 3, label: 'Shift 3', text: 'S3 23:01 - 07:00', startHour: 23 };
}
function _eosTglID(now) {
    const M = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return now.getDate() + ' ' + M[now.getMonth()] + ' ' + now.getFullYear();
}
function _eosFileStamp(now) {
    const p = n => String(n).padStart(2,'0');
    return now.getFullYear()+p(now.getMonth()+1)+p(now.getDate())+'_'+p(now.getHours())+p(now.getMinutes());
}

// ── EOS Cancel flag ────────────────────────────────────────────────────────────
let _eosCancelled = false;
function _eosCheckCancelled() { if (_eosCancelled) throw new Error('__EOS_CANCELLED__'); }

// ── Input dialog: On Shift & Next Shift ───────────────────────────────────────
function _eosGetDefaultShift() {
    // Baca dari jadwal yang tersimpan di localStorage
    try {
        const saved = localStorage.getItem('noc_schedule_master_v2');
        if (!saved) return { onShift: '', nextShift: '' };
        const master = JSON.parse(saved);
        const now = _eosNow();
        const monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        const data = master[monthKey];
        if (!data || !data.shiftData) return { onShift: '', nextShift: '' };

        const h = now.getHours(), m = now.getMinutes();
        const t = h + m / 60;
        let curShifts, nxtShifts;
        const todayIdx = now.getDate() - 1;
        let nxtDayIdx = todayIdx;

        if      (t >= 7.0  && t <= 15.0)              { curShifts = ['S1','S1a']; nxtShifts = ['S2']; }
        else if (t >  15.0 && t <= 23.0)              { curShifts = ['S2'];       nxtShifts = ['S3']; }
        else if (t >  23.0)                            { curShifts = ['S3'];       nxtShifts = ['S1','S1a']; nxtDayIdx = todayIdx + 1; }
        else                                           { curShifts = ['S3'];       nxtShifts = ['S1','S1a']; } // 00:00-07:00

        const shortName = n => {
            if (/alfarizi/i.test(n)) return 'Alfarizi';
            if (/John/i.test(n))   return 'John';
            return n.split(' ')[0];
        };
        const findNames = (dayIdx, shiftList) =>
            data.shiftData
                .filter(p => {
                    const s = (p.shifts[dayIdx] || '').trim().toUpperCase();
                    if (s === 'S1A') return false;  // S1a tidak masuk on/next shift
                    return shiftList.some(sl => s.includes(sl.toUpperCase()));
                })
                .map(p => shortName(p.name));

        const onNames  = findNames(todayIdx, curShifts);
        const nxtNames = findNames(nxtDayIdx, nxtShifts);
        return {
            onShift:   onNames.join(' & ')  || '',
            nextShift: nxtNames.join(' & ') || '',
        };
    } catch(e) { return { onShift: '', nextShift: '' }; }
}

function _eosShowInputDialog() {
    return new Promise((resolve, reject) => {
        const old = document.getElementById('_eosInputDialog');
        if (old) old.remove();

        const defaults = _eosGetDefaultShift();

        if (!document.getElementById('_eosSpinStyle')) {
            const s = document.createElement('style'); s.id = '_eosSpinStyle';
            s.textContent = '@keyframes _eosSpin{to{transform:rotate(360deg)}}';
            document.head.appendChild(s);
        }

        const dlg = document.createElement('div');
        dlg.id = '_eosInputDialog';
        dlg.style.cssText = 'position:fixed;z-index:99999;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:\'Segoe UI\',sans-serif;';
        dlg.innerHTML = `
        <div style="background:#161b22;border:1px solid #30363d;border-radius:14px;padding:32px 36px;width:460px;max-width:94vw;box-shadow:0 16px 48px rgba(0,0,0,0.7);position:relative;">
            <button id="_eosInputCancel" title="Batal" style="position:absolute;top:14px;right:16px;background:none;border:none;color:#8b949e;font-size:20px;cursor:pointer;line-height:1;padding:4px 8px;border-radius:6px;transition:background 0.15s;" onmouseover="this.style.background='#30363d'" onmouseout="this.style.background='none'">✕</button>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
                <div style="background:#2b78c5;border-radius:10px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">📋</div>
                <div style="flex:1;">
                    <div style="color:#e6edf3;font-size:16px;font-weight:700;line-height:1.2;">EOS Report</div>
                    <div style="color:#8b949e;font-size:12px;margin-top:2px;">End of Shift — ${_eosTglID(_eosNow())}</div>
                </div>
                <button id="_eosSettingBtn" title="Pengaturan IP & Device" style="background:#21262d;border:1px solid #30363d;color:#8b949e;font-size:16px;cursor:pointer;padding:6px 10px;border-radius:8px;transition:all 0.15s;flex-shrink:0;" onmouseover="this.style.background='#30363d';this.style.color='#e6edf3'" onmouseout="this.style.background='#21262d';this.style.color='#8b949e'">⚙</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                <div>
                    <label style="color:#8b949e;font-size:11px;font-weight:600;letter-spacing:0.5px;display:block;margin-bottom:8px;">ON SHIFT (sekarang)</label>
                    <input id="_eosInputOnShift" type="text" value="${defaults.onShift}" placeholder="Nama petugas..."
                        style="width:100%;box-sizing:border-box;background:#0d1117;border:1.5px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:8px;font-size:13px;outline:none;transition:border-color 0.15s;"
                        onfocus="this.style.borderColor='#2b78c5'" onblur="this.style.borderColor='#30363d'">
                </div>
                <div>
                    <label style="color:#8b949e;font-size:11px;font-weight:600;letter-spacing:0.5px;display:block;margin-bottom:8px;">NEXT SHIFT</label>
                    <input id="_eosInputNextShift" type="text" value="${defaults.nextShift}" placeholder="Nama petugas..."
                        style="width:100%;box-sizing:border-box;background:#0d1117;border:1.5px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:8px;font-size:13px;outline:none;transition:border-color 0.15s;"
                        onfocus="this.style.borderColor='#2b78c5'" onblur="this.style.borderColor='#30363d'">
                </div>
            </div>
            <div style="margin-bottom:14px;">
                <label style="color:#8b949e;font-size:11px;font-weight:600;letter-spacing:0.5px;display:block;margin-bottom:8px;">SUMMARY TICKET</label>
                <textarea id="_eosInputSummary" rows="4" placeholder="Paste Total Ticket di sini Blayy..."
                    style="width:100%;box-sizing:border-box;background:#0d1117;border:1.5px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:8px;font-size:12px;outline:none;resize:vertical;transition:border-color 0.15s;"
                    onfocus="this.style.borderColor='#2b78c5'" onblur="this.style.borderColor='#30363d'"></textarea>
                <div style="color:#484f58;font-size:11px;margin-top:6px;">Isi ini akan muncul langsung di bawah judul Summary Ticket di file HTML.</div>
            </div>
            <div id="_eosInputWarn" style="display:none;background:rgba(218,54,51,0.12);border:1px solid rgba(218,54,51,0.35);border-radius:7px;color:#ff7b72;font-size:12px;padding:9px 13px;margin-bottom:14px;"></div>
            <button id="_eosInputSubmit"
                style="width:100%;background:#2b78c5;border:none;color:#fff;padding:12px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.3px;transition:background 0.15s;box-shadow:0 4px 14px rgba(43,120,197,0.4);"
                onmouseover="this.style.background='#1a5fa8'" onmouseout="this.style.background='#2b78c5'">
                Generate EOS Report →
            </button>
            <div style="color:#484f58;font-size:11px;text-align:center;margin-top:12px;">Nama diambil otomatis dari jadwal shift. Ubah jika ada pergantian mendadak.</div>
        </div>`;
        document.body.appendChild(dlg);

        const submit = () => {
            const on   = (document.getElementById('_eosInputOnShift').value || '').trim();
            const next = (document.getElementById('_eosInputNextShift').value || '').trim();
            const summaryTicket = (document.getElementById('_eosInputSummary').value || '').trim();
            const warn = document.getElementById('_eosInputWarn');
            if (!on) {
                warn.textContent = 'Nama On Shift tidak boleh kosong.';
                warn.style.display = 'block';
                document.getElementById('_eosInputOnShift').focus();
                return;
            }
            warn.style.display = 'none';
            dlg.remove();
            resolve({ petugas: on, next: next || '-', summaryTicket });
        };

        document.getElementById('_eosInputSubmit').onclick = submit;
        document.getElementById('_eosInputCancel').onclick = () => { dlg.remove(); reject(new Error('__EOS_CANCELLED__')); };
        document.getElementById('_eosSettingBtn').onclick = () => { _eosShowSettingPanel(); };
        dlg.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { dlg.remove(); reject(new Error('__EOS_CANCELLED__')); } });
        setTimeout(() => { const el = document.getElementById('_eosInputOnShift'); if (el) el.focus(); }, 50);
    });
}

// ── Panel Setting: kelola VM IPs, VMware Hosts, Network Devices ───────────────
function _eosShowSettingPanel() {
    const old = document.getElementById('_eosSettingPanel');
    if (old) old.remove();

    const inputStyle = 'width:100%;box-sizing:border-box;background:#0d1117;border:1.5px solid #30363d;color:#e6edf3;padding:8px 10px;border-radius:7px;font-size:12px;outline:none;font-family:\'Segoe UI\',sans-serif;';
    const btnDel = 'background:rgba(218,54,51,0.15);border:1px solid rgba(218,54,51,0.3);color:#ff7b72;padding:3px 9px;border-radius:5px;cursor:pointer;font-size:12px;';
    const btnAdd = 'background:#2b78c5;border:none;color:#fff;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;';

    // ── render list VM IPs ──
    const renderVmList = () => {
        const cont = document.getElementById('_eosCfgVmList');
        if (!cont) return;
        cont.innerHTML = EOS_VM_IPS.map((ip, i) => `
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #21262d;">
                <span style="color:#e6edf3;font-size:12px;flex:1;font-family:monospace;">${ip}</span>
                <button onclick="_eosCfgDelVm(${i})" style="${btnDel}">✕</button>
            </div>`).join('') || '<div style="color:#484f58;font-size:12px;padding:8px 0;">Tidak ada IP.</div>';
    };

    // ── render list VMware Hosts ──
    const renderVmwareList = () => {
        const cont = document.getElementById('_eosCfgVmwareList');
        if (!cont) return;
        const note = EOS_VMWARE_HOSTS.length === 0
            ? '<div style="color:#484f58;font-size:11px;margin-bottom:8px;">Kosong = otomatis pakai CSV RVTools.</div>'
            : '';
        cont.innerHTML = note + (EOS_VMWARE_HOSTS.map((h, i) => `
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #21262d;">
                <span style="color:#e6edf3;font-size:12px;flex:1;font-family:monospace;">${h}</span>
                <button onclick="_eosCfgDelVmware(${i})" style="${btnDel}">✕</button>
            </div>`).join('') || '');
    };

    // ── render list Network Devices ──
    const renderNetList = () => {
        const cont = document.getElementById('_eosCfgNetList');
        if (!cont) return;
        cont.innerHTML = EOS_NET_DEVICES.map((d, i) => `
            <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #21262d;">
                <span style="color:#8b949e;font-size:11px;width:24px;text-align:center;flex-shrink:0;">${d.no}</span>
                <span style="color:#e6edf3;font-size:12px;flex:1;font-family:monospace;">${d.ip}</span>
                <span style="color:#8b949e;font-size:11px;flex:1;">${d.hostname}</span>
                <button onclick="_eosCfgDelNet(${i})" style="${btnDel}">✕</button>
            </div>`).join('') || '<div style="color:#484f58;font-size:12px;padding:8px 0;">Tidak ada device.</div>';
    };

    const overlay = document.createElement('div');
    overlay.id = '_eosSettingPanel';
    overlay.style.cssText = 'position:fixed;z-index:100000;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:\'Segoe UI\',sans-serif;';

    overlay.innerHTML = `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:14px;width:680px;max-width:96vw;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,0.8);">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;padding:20px 24px 0;flex-shrink:0;">
            <span style="font-size:18px;">⚙</span>
            <div style="flex:1;">
                <div style="color:#e6edf3;font-size:15px;font-weight:700;">Pengaturan EOS Config</div>
                <div style="color:#8b949e;font-size:11px;margin-top:2px;">Perubahan langsung disimpan ke Data_JSON/eos_config.json</div>
            </div>
            <button id="_eosCfgClose" style="background:none;border:none;color:#8b949e;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:6px;" onmouseover="this.style.background='#30363d'" onmouseout="this.style.background='none'">✕</button>
        </div>
        <!-- Tabs -->
        <div style="display:flex;gap:0;padding:16px 24px 0;flex-shrink:0;border-bottom:1px solid #21262d;">
            <button id="_eosCfgTab0" onclick="_eosCfgSwitchTab(0)" style="background:none;border:none;border-bottom:2px solid #2b78c5;color:#e6edf3;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;font-family:'Segoe UI',sans-serif;">VM Service IPs</button>
            <button id="_eosCfgTab1" onclick="_eosCfgSwitchTab(1)" style="background:none;border:none;border-bottom:2px solid transparent;color:#8b949e;padding:8px 16px;cursor:pointer;font-size:13px;font-family:'Segoe UI',sans-serif;">VMware Hosts</button>
            <button id="_eosCfgTab2" onclick="_eosCfgSwitchTab(2)" style="background:none;border:none;border-bottom:2px solid transparent;color:#8b949e;padding:8px 16px;cursor:pointer;font-size:13px;font-family:'Segoe UI',sans-serif;">Network Devices</button>
        </div>
        <!-- Tab content -->
        <div style="flex:1;overflow-y:auto;padding:20px 24px;">
            <!-- TAB 0: VM IPs -->
            <div id="_eosCfgPane0">
                <div style="color:#8b949e;font-size:11px;margin-bottom:12px;">Total: <span id="_eosCfgVmCount">${EOS_VM_IPS.length}</span> IP. Format: <code style="background:#21262d;padding:1px 5px;border-radius:3px;color:#79c0ff;">10.x.x.x</code> atau <code style="background:#21262d;padding:1px 5px;border-radius:3px;color:#79c0ff;">10.x.x.x:PORT</code> untuk non-standard port.</div>
                <div style="display:flex;gap:8px;margin-bottom:14px;">
                    <input id="_eosCfgVmInput" type="text" placeholder="Masukkan IP atau IP:PORT..." style="${inputStyle}flex:1;" onfocus="this.style.borderColor='#2b78c5'" onblur="this.style.borderColor='#30363d'">
                    <button onclick="_eosCfgAddVm()" style="${btnAdd}">+ Tambah</button>
                </div>
                <div id="_eosCfgVmMsg" style="display:none;font-size:11px;padding:6px 10px;border-radius:6px;margin-bottom:8px;"></div>
                <div id="_eosCfgVmList" style="max-height:320px;overflow-y:auto;"></div>
            </div>
            <!-- TAB 1: VMware Hosts -->
            <div id="_eosCfgPane1" style="display:none;">
                <div style="color:#8b949e;font-size:11px;margin-bottom:12px;">Jika diisi, list ini dipakai menggantikan CSV RVTools. Kosongkan semua untuk kembali ke auto-detect CSV.</div>
                <div style="display:flex;gap:8px;margin-bottom:14px;">
                    <input id="_eosCfgVmwareInput" type="text" placeholder="Hostname ESXi, misal: SITE-C-dwh-esxi1.Example example.local" style="${inputStyle}flex:1;" onfocus="this.style.borderColor='#2b78c5'" onblur="this.style.borderColor='#30363d'">
                    <button onclick="_eosCfgAddVmware()" style="${btnAdd}">+ Tambah</button>
                </div>
                <div id="_eosCfgVmwareMsg" style="display:none;font-size:11px;padding:6px 10px;border-radius:6px;margin-bottom:8px;"></div>
                <div id="_eosCfgVmwareList" style="max-height:320px;overflow-y:auto;"></div>
            </div>
            <!-- TAB 2: Network Devices -->
            <div id="_eosCfgPane2" style="display:none;">
                <div style="color:#8b949e;font-size:11px;margin-bottom:12px;">Total: <span id="_eosCfgNetCount">${EOS_NET_DEVICES.length}</span> device. Hostname diambil otomatis dari OpManager inventory saat report dibuat.</div>
                <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:14px;flex-wrap:wrap;">
                    <div style="flex:0 0 60px;"><div style="color:#8b949e;font-size:10px;margin-bottom:4px;">No</div><input id="_eosCfgNetNo" type="number" min="1" placeholder="No" style="${inputStyle}width:60px;" onfocus="this.style.borderColor='#2b78c5'" onblur="this.style.borderColor='#30363d'"></div>
                    <div style="flex:1;min-width:130px;"><div style="color:#8b949e;font-size:10px;margin-bottom:4px;">IP</div><input id="_eosCfgNetIp" type="text" placeholder="10.x.x.x" style="${inputStyle}" onfocus="this.style.borderColor='#2b78c5'" onblur="this.style.borderColor='#30363d'"></div>
                    <div style="flex:1;min-width:130px;"><div style="color:#8b949e;font-size:10px;margin-bottom:4px;">Hostname</div><input id="_eosCfgNetHostname" type="text" placeholder="SITE-A-CORE01" style="${inputStyle}" onfocus="this.style.borderColor='#2b78c5'" onblur="this.style.borderColor='#30363d'"></div>
                    <button onclick="_eosCfgAddNet()" style="${btnAdd};flex-shrink:0;">+ Tambah</button>
                </div>
                <div id="_eosCfgNetMsg" style="display:none;font-size:11px;padding:6px 10px;border-radius:6px;margin-bottom:8px;"></div>
                <div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #30363d;margin-bottom:4px;">
                    <span style="color:#8b949e;font-size:10px;width:24px;text-align:center;flex-shrink:0;">No</span>
                    <span style="color:#8b949e;font-size:10px;flex:1;">IP</span>
                    <span style="color:#8b949e;font-size:10px;flex:1;">Hostname</span>
                    <span style="width:42px;"></span>
                </div>
                <div id="_eosCfgNetList" style="max-height:280px;overflow-y:auto;"></div>
            </div>
        </div>
        <!-- Footer status -->
        <div id="_eosCfgFooter" style="padding:12px 24px;border-top:1px solid #21262d;color:#484f58;font-size:11px;flex-shrink:0;">Siap.</div>
    </div>`;
    document.body.appendChild(overlay);

    // Render semua list
    renderVmList();
    renderVmwareList();
    renderNetList();

    document.getElementById('_eosCfgClose').onclick = () => overlay.remove();
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.remove(); });

    // Attach functions ke window agar bisa dipanggil dari inline onclick
    window._eosCfgSwitchTab = idx => {
        [0,1,2].forEach(i => {
            document.getElementById('_eosCfgPane' + i).style.display = i === idx ? '' : 'none';
            const t = document.getElementById('_eosCfgTab' + i);
            t.style.borderBottomColor = i === idx ? '#2b78c5' : 'transparent';
            t.style.color = i === idx ? '#e6edf3' : '#8b949e';
        });
    };

    const setFooter = (msg, ok) => {
        const el = document.getElementById('_eosCfgFooter');
        if (!el) return;
        el.textContent = msg;
        el.style.color = ok ? '#3fb950' : '#ff7b72';
        setTimeout(() => { if (el) { el.textContent = 'Siap.'; el.style.color = '#484f58'; } }, 3000);
    };

    const showMsg = (id, msg, ok) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
        el.style.background = ok ? 'rgba(63,185,80,0.1)' : 'rgba(218,54,51,0.1)';
        el.style.border = ok ? '1px solid rgba(63,185,80,0.3)' : '1px solid rgba(218,54,51,0.3)';
        el.style.color = ok ? '#3fb950' : '#ff7b72';
        setTimeout(() => { if (el) el.style.display = 'none'; }, 3000);
    };

    const saveAndRefresh = async (tab) => {
        try {
            const cfg = { vmIps: EOS_VM_IPS, vmwareHosts: EOS_VMWARE_HOSTS, netDevices: EOS_NET_DEVICES };
            await _eosSaveConfig(cfg);
            setFooter('✓ Tersimpan ke eos_config.json', true);
            // Update counter
            const vc = document.getElementById('_eosCfgVmCount');
            if (vc) vc.textContent = EOS_VM_IPS.length;
            const nc = document.getElementById('_eosCfgNetCount');
            if (nc) nc.textContent = EOS_NET_DEVICES.length;
            renderVmList(); renderVmwareList(); renderNetList();
        } catch(e) {
            setFooter('❌ Gagal simpan: ' + e.message, false);
        }
    };

    window._eosCfgAddVm = async () => {
        const inp = document.getElementById('_eosCfgVmInput');
        const val = (inp.value || '').trim();
        if (!val) { showMsg('_eosCfgVmMsg', 'IP tidak boleh kosong.', false); return; }
        if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(val)) { showMsg('_eosCfgVmMsg', 'Format IP tidak valid.', false); return; }
        if (EOS_VM_IPS.includes(val)) { showMsg('_eosCfgVmMsg', 'IP sudah ada dalam list.', false); return; }
        EOS_VM_IPS.push(val);
        inp.value = '';
        await saveAndRefresh(0);
        showMsg('_eosCfgVmMsg', '✓ IP ditambahkan.', true);
    };

    window._eosCfgDelVm = async (idx) => {
        EOS_VM_IPS.splice(idx, 1);
        await saveAndRefresh(0);
    };

    window._eosCfgAddVmware = async () => {
        const inp = document.getElementById('_eosCfgVmwareInput');
        const val = (inp.value || '').trim();
        if (!val) { showMsg('_eosCfgVmwareMsg', 'Hostname tidak boleh kosong.', false); return; }
        if (EOS_VMWARE_HOSTS.includes(val)) { showMsg('_eosCfgVmwareMsg', 'Hostname sudah ada.', false); return; }
        EOS_VMWARE_HOSTS.push(val);
        inp.value = '';
        await saveAndRefresh(1);
        showMsg('_eosCfgVmwareMsg', '✓ Host ditambahkan.', true);
    };

    window._eosCfgDelVmware = async (idx) => {
        EOS_VMWARE_HOSTS.splice(idx, 1);
        await saveAndRefresh(1);
    };

    window._eosCfgAddNet = async () => {
        const noEl = document.getElementById('_eosCfgNetNo');
        const ipEl = document.getElementById('_eosCfgNetIp');
        const hnEl = document.getElementById('_eosCfgNetHostname');
        const no = parseInt(noEl.value);
        const ip = (ipEl.value || '').trim();
        const hn = (hnEl.value || '').trim();
        if (!ip || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) { showMsg('_eosCfgNetMsg', 'Format IP tidak valid.', false); return; }
        if (!hn) { showMsg('_eosCfgNetMsg', 'Hostname tidak boleh kosong.', false); return; }
        if (EOS_NET_DEVICES.some(d => d.ip === ip)) { showMsg('_eosCfgNetMsg', 'IP sudah ada dalam list.', false); return; }
        // Ambil metadata default berdasarkan pola hostname
        const isCisco = true;
        const meta = { brand: 'Cisco', location: ip.startsWith('10.201') ? 'SITE-A' : 'SITE-B', category: 'Switch', series: 'Cisco', cpu: 'CiscoCPUUtilization5minavg', mem: 'CiscoMemoryUtilization' };
        EOS_NET_DEVICES.push({ no: isNaN(no) ? EOS_NET_DEVICES.length + 1 : no, ip, hostname: hn, ...meta });
        EOS_NET_DEVICES.sort((a, b) => a.no - b.no);
        noEl.value = ''; ipEl.value = ''; hnEl.value = '';
        await saveAndRefresh(2);
        showMsg('_eosCfgNetMsg', '✓ Device ditambahkan.', true);
    };

    window._eosCfgDelNet = async (idx) => {
        EOS_NET_DEVICES.splice(idx, 1);
        await saveAndRefresh(2);
    };

    // Enter di input fields
    document.getElementById('_eosCfgVmInput').addEventListener('keydown', e => { if (e.key === 'Enter') window._eosCfgAddVm(); });
    document.getElementById('_eosCfgVmwareInput').addEventListener('keydown', e => { if (e.key === 'Enter') window._eosCfgAddVmware(); });
    document.getElementById('_eosCfgNetIp').addEventListener('keydown', e => { if (e.key === 'Enter') window._eosCfgAddNet(); });
    document.getElementById('_eosCfgNetHostname').addEventListener('keydown', e => { if (e.key === 'Enter') window._eosCfgAddNet(); });
}

// ── Loading overlay dengan progress steps ─────────────────────────────────────
const _eosSteps = [
    { id: 'vm',      label: 'VM Service dari Grafana' },
    { id: 'vmware',  label: 'VMware Host dari CSV RVTools + Grafana InfluxDB' },
    { id: 'net',     label: 'Network devices dari OpManager' },
    { id: 'build',   label: 'Membuat Excel, TXT & HTML' },
];

function _eosShowLoading() {
    _eosCancelled = false;
    let el = document.getElementById('_eosLoadingOverlay');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = '_eosLoadingOverlay';
    el.style.cssText = 'position:fixed;z-index:99999;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:\'Segoe UI\',sans-serif;';

    const stepRows = _eosSteps.map(s => `
        <div id="_eosStep_${s.id}" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #21262d;">
            <div id="_eosStepIco_${s.id}" style="width:22px;height:22px;border-radius:50%;background:#21262d;border:2px solid #30363d;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;color:#484f58;">–</div>
            <div style="flex:1;">
                <div id="_eosStepLbl_${s.id}" style="color:#8b949e;font-size:13px;">${s.label}</div>
                <div id="_eosStepSub_${s.id}" style="color:#484f58;font-size:11px;margin-top:1px;"></div>
            </div>
        </div>`).join('');

    el.innerHTML = `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:14px;padding:28px 32px;min-width:380px;max-width:94vw;box-shadow:0 16px 48px rgba(0,0,0,0.7);position:relative;">
        <button id="_eosLoadingCancel" title="Batalkan" style="position:absolute;top:14px;right:16px;background:none;border:none;color:#8b949e;font-size:20px;cursor:pointer;line-height:1;padding:4px 8px;border-radius:6px;transition:background 0.15s;" onmouseover="this.style.background='#30363d'" onmouseout="this.style.background='none'">✕</button>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <svg width="28" height="28" viewBox="0 0 36 36" style="animation:_eosSpin 1s linear infinite;flex-shrink:0;"><circle cx="18" cy="18" r="14" fill="none" stroke="#30363d" stroke-width="3"/><path d="M18 4 A14 14 0 0 1 32 18" fill="none" stroke="#3fb950" stroke-width="3" stroke-linecap="round"/></svg>
            <div>
                <div style="color:#e6edf3;font-size:15px;font-weight:700;">Generating EOS Report...</div>
                <div id="_eosLoadingMsg" style="color:#8b949e;font-size:12px;margin-top:2px;">Menyiapkan data...</div>
            </div>
        </div>
        <div style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                <span style="color:#8b949e;font-size:11px;">Overall Progress</span>
                <span id="_eosProgressPct" style="color:#e6edf3;font-size:12px;font-weight:700;">0%</span>
            </div>
            <div style="background:#21262d;border-radius:6px;height:7px;overflow:hidden;">
                <div id="_eosProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg,#2b78c5,#3fb950);border-radius:6px;transition:width 0.4s ease;"></div>
            </div>
        </div>
        <div style="border-top:1px solid #21262d;">${stepRows}</div>
    </div>`;
    document.body.appendChild(el);

    document.getElementById('_eosLoadingCancel').onclick = () => {
        _eosCancelled = true;
        _eosHideLoading();
    };
}

function _eosStepStart(id) {
    const ico = document.getElementById('_eosStepIco_' + id);
    const lbl = document.getElementById('_eosStepLbl_' + id);
    if (ico) { ico.style.background = '#0d1f33'; ico.style.borderColor = '#2b78c5'; ico.innerHTML = '<svg width="12" height="12" viewBox="0 0 36 36" style="animation:_eosSpin 1s linear infinite;"><circle cx="18" cy="18" r="14" fill="none" stroke="#30363d" stroke-width="2"/><path d="M18 4 A14 14 0 0 1 32 18" fill="none" stroke="#2b78c5" stroke-width="2" stroke-linecap="round"/></svg>'; }
    if (lbl) lbl.style.color = '#e6edf3';
}
function _eosStepDone(id, sub) {
    const ico = document.getElementById('_eosStepIco_' + id);
    const lbl = document.getElementById('_eosStepLbl_' + id);
    const subEl = document.getElementById('_eosStepSub_' + id);
    if (ico) { ico.style.background = '#0f3d1a'; ico.style.borderColor = '#3fb950'; ico.style.color = '#3fb950'; ico.innerHTML = '✓'; }
    if (lbl) lbl.style.color = '#3fb950';
    if (subEl && sub) { subEl.textContent = sub; subEl.style.color = '#484f58'; }
}
function _eosStepFail(id, sub) {
    const ico = document.getElementById('_eosStepIco_' + id);
    const lbl = document.getElementById('_eosStepLbl_' + id);
    const subEl = document.getElementById('_eosStepSub_' + id);
    if (ico) { ico.style.background = '#3d0f0f'; ico.style.borderColor = '#da3633'; ico.style.color = '#da3633'; ico.innerHTML = '✕'; }
    if (lbl) lbl.style.color = '#ff7b72';
    if (subEl && sub) { subEl.textContent = sub; subEl.style.color = '#ff7b72'; }
}
function _eosUpdateLoading(msg) { const el = document.getElementById('_eosLoadingMsg'); if (el) el.textContent = msg; }
function _eosSetProgress(pct) {
    pct = Math.min(100, Math.max(0, Math.round(pct)));
    const bar = document.getElementById('_eosProgressBar');
    const txt = document.getElementById('_eosProgressPct');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = pct + '%';
}
function _eosHideLoading() { const el = document.getElementById('_eosLoadingOverlay'); if (el) el.remove(); }

// ── Grafana POST helper ────────────────────────────────────────────────────────
async function _eosGPost(body, dsType) {
    const qs = dsType ? '?ds_type=' + dsType : '';
    const r = await fetch(EOS_GRAFANA + '/api/ds/query' + qs, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body
    });
    if (!r.ok) throw new Error('Grafana HTTP ' + r.status);
    return JSON.parse(await r.text());
}

// ── Ambil nilai terakhir per IP dari respons Grafana ──────────────────────────
function _eosPick(jObj, refId, ip) {
    try {
        const frames = jObj && jObj.results && jObj.results[refId] && jObj.results[refId].frames;
        if (!frames) return 'N/A';
        const hasPort = ip.includes(':');
        const baseIp  = ip.split(':')[0];
        for (const f of frames) {
            // Cari frame yang instance label-nya cocok:
            // - IP dengan port eksplisit (10.30.0.3:10100): harus ada '"10.30.0.3:10100"' di frame
            // - IP tanpa port (10.30.0.3): cukup ada '"10.30.0.3:' atau '"10.30.0.3"'
            const s = JSON.stringify(f);
            if (hasPort) {
                if (s.indexOf('"' + ip + '"') === -1) continue;
            } else {
                if (s.indexOf('"' + baseIp + ':') === -1 && s.indexOf('"' + baseIp + '"') === -1) continue;
            }
            const vals = f.data && f.data.values;
            if (vals && vals.length > 1 && vals[1].length > 0) {
                const raw = vals[1][vals[1].length - 1];
                if (raw == null || isNaN(raw)) return 'N/A';
                return (Math.round(parseFloat(raw) * 100) / 100).toString();
            }
        }
    } catch(e) {}
    return 'N/A';
}

// ── SHEET 1: VM Service dari Grafana Prometheus ────────────────────────────────
async function _eosCollectVmService() {
    const ips = EOS_VM_IPS;
    const ipsStd = ips.filter(ip => !ip.startsWith('10.100.'));
    const ipsSpc = ips.filter(ip =>  ip.startsWith('10.100.'));

    const buildBody = (dsUid, ipArr) => {
        // Pisahkan IP biasa vs IP dengan port non-default.
        // IP biasa: cukup match base IP diikuti port apapun → "^(ip1|ip2)(:.*)?$"
        // IP dengan port khusus: tambahkan entri eksak "ip:port" ke alternasi
        const baseIps    = [];
        const exactPorts = []; // format "ip:port" untuk match eksak
        ipArr.forEach(ip => {
            if (ip.includes(':')) { exactPorts.push(ip); baseIps.push(ip.split(':')[0]); }
            else                  { baseIps.push(ip); }
        });
        const uniqueBases = [...new Set(baseIps)];
        // Regex: base IPs dengan (:.*)?  PLUS port-specific exact matches
        // Contoh: ^(10.30.0.3|10.30.0.18)(:.*)?$
        // Prometheus RE2 tidak butuh escape titik dalam character class, tapi dalam alternasi perlu.
        // Kita pakai pendekatan sederhana: match base IP + optional :port suffix
        const re = '"^(' + uniqueBases.join('|') + ')(:.*)?$"';
        const q = (refId, expr) => ({ refId, datasource: { uid: dsUid }, expr, instant: true });
        return JSON.stringify({
            from: 'now-5m', to: 'now', queries: [
                q('A', "100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{mode='idle', instance=~" + re + "}[2m15s])))"),
                q('B', "(avg by (instance) (node_load1{instance=~" + re + "}) / count by (instance) (node_cpu_seconds_total{mode='idle', instance=~" + re + "})) * 100"),
                q('C', "avg by (instance) (100 * (1 - (node_memory_MemAvailable_bytes{instance=~" + re + "} / node_memory_MemTotal_bytes{instance=~" + re + "})))"),
                q('D', "avg by (instance) (100 * (1 - (node_memory_SwapFree_bytes{instance=~" + re + "} / node_memory_SwapTotal_bytes{instance=~" + re + "})))"),
                q('E', "avg by (instance) (100 * (1 - (node_filesystem_avail_bytes{mountpoint='/', instance=~" + re + "} / node_filesystem_size_bytes{mountpoint='/', instance=~" + re + "})))")
            ]
        });
    };

    const [jStd, jSpc] = await Promise.all([
        ipsStd.length ? _eosGPost(buildBody(EOS_DS_STD, ipsStd), 'prometheus') : null,
        ipsSpc.length ? _eosGPost(buildBody(EOS_DS_SPECIAL, ipsSpc), 'prometheus') : null
    ]);

    return ips.map(ip => {
        const j = ip.startsWith('10.100.') ? jSpc : jStd;
        const cpu = _eosPick(j, 'A', ip), load = _eosPick(j, 'B', ip);
        const ram = _eosPick(j, 'C', ip), swap = _eosPick(j, 'D', ip), root = _eosPick(j, 'E', ip);
        const avail = (cpu==='N/A' && load==='N/A' && ram==='N/A' && swap==='N/A' && root==='N/A') ? 'N/A' : 'OK';
        const remark = avail === 'N/A' ? 'Troubleshoot' : _eosRemark(cpu, load, ram, swap, root);
        return { ip, avail, cpu, load, ram, swap, root, remark };
    });
}

// ── SHEET 2: VMware Host dari RVTools CSV + Grafana InfluxDB ──────────────────
async function _eosCollectVmware() {
    let hosts = [];

    if (EOS_VMWARE_HOSTS && EOS_VMWARE_HOSTS.length > 0) {
        // Gunakan list manual dari eos_config.json
        hosts = [...EOS_VMWARE_HOSTS];
    } else {
        // Fallback: ambil dari RVTools CSV
        const csvFiles = [
            'Data_JSON/RVTOOLS/vmhost_export.csv',
            'Data_JSON/RVTOOLS/vmhost_export.csv'
        ];
        for (const f of csvFiles) {
            try {
                const r = await fetch(f + '?t=' + Date.now());
                if (!r.ok) continue;
                const txt = await r.text();
                const lines = txt.trim().split('\n');
                if (lines.length < 2) continue;
                const headers = _eosCsvRow(lines[0]);
                const hIdx = headers.findIndex(h => h.trim() === 'Host');
                if (hIdx < 0) continue;
                for (let i = 1; i < lines.length; i++) {
                    const cols = _eosCsvRow(lines[i]);
                    const host = (cols[hIdx] || '').trim();
                    if (host && !hosts.includes(host)) hosts.push(host);
                }
            } catch(e) {}
        }
        hosts.sort();
    }
    if (!hosts.length) return [];

    // Query InfluxDB untuk CPU, Memory, Net VMware — persis seperti Vmware.xaml (from=now-8h)
    const mkInflux = (measurement, fn, extraFilter) => JSON.stringify({
        from: 'now-8h', to: 'now',
        queries: [{ refId: 'A', datasource: { type: 'influxdb', uid: EOS_DS_INFLUX }, datasourceId: 8,
            rawQuery: true, intervalMs: 60000, maxDataPoints: 8200,
            query: `from(bucket: "vsphere-data")\r\n  |> range(start: -8h)\r\n  |> filter(fn: (r) => r["_measurement"] == "${measurement}")\r\n  |> filter(fn: (r) => r["_field"] == "usage_average")${extraFilter ? '\r\n  |> filter(fn: (r) => ' + extraFilter + ')' : ''}\r\n  |> group(columns: ["esxhostname"])\r\n  |> aggregateWindow(every: 1m, fn: ${fn}, createEmpty: false)\r\n  |> yield(name: "mean")`
        }]
    });

    let jCpu = null, jMem = null, jNet = null;
    // CPU: filter cpu=="instance-total" agar tidak double-count per core (persis XAML)
    try { jCpu = await _eosGPost(mkInflux('vsphere_host_cpu', 'last', 'r["cpu"] == "instance-total"')); } catch(e) {}
    try { jMem = await _eosGPost(mkInflux('vsphere_host_mem', 'last', null)); } catch(e) {}
    try { jNet = await _eosGPost(mkInflux('vsphere_host_net', 'mean', null)); } catch(e) {}

    const pickInflux = (jObj, hostname) => {
        try {
            const frames = jObj && jObj.results && jObj.results['A'] && jObj.results['A'].frames;
            if (!frames) return null;
            const hn = hostname.toLowerCase();
            for (const f of frames) {
                const fields = f.schema && f.schema.fields;
                if (!fields) continue;
                const labelField = fields.find(fd => fd.labels && fd.labels.esxhostname);
                if (!labelField) continue;
                if (!labelField.labels.esxhostname.toLowerCase().includes(hn)) continue;
                const vals = f.data && f.data.values;
                if (vals && vals.length > 1 && vals[1].length > 0) {
                    const raw = vals[1][vals[1].length - 1];
                    if (raw != null && !isNaN(raw)) return parseFloat(raw);
                }
            }
        } catch(e) {}
        return null;
    };

    const fmtNet = v => {
        if (v == null || isNaN(v)) return 'N/A';
        return v >= 1024 ? (Math.round(v / 1024 * 10) / 10) + ' MB/s' : (Math.round(v * 10) / 10) + ' kB/s';
    };

    return hosts.map(host => {
        const cpuPct = pickInflux(jCpu, host);  // sudah dalam %, tidak perlu /100
        const memPct = pickInflux(jMem, host);  // sudah dalam %, tidak perlu /100
        const netRaw = pickInflux(jNet, host);  // dalam kB/s
        const notes = _eosVmwareNotes(cpuPct, memPct);
        return {
            host,
            cpu:  cpuPct != null ? cpuPct.toFixed(2) + '%' : 'N/A',
            mem:  memPct != null ? memPct.toFixed(2) + '%' : 'N/A',
            net:  fmtNet(netRaw),
            notes,
        };
    });
}

// ── Device list Network — diisi dari eos_config.json saat load ───────────────
let EOS_NET_DEVICES = [];
const EOS_OPMAN_PROXY = 'http://127.0.0.1:3739/opmanager';

// Fetch getGraphData OpManager per device+policy lewat opmanager_proxy.py → array {min,max,avg} (sudah dalam %)
async function _eosOpmanGraph(ip, policyName) {
    const ts = Date.now();
    const url = EOS_OPMAN_PROXY + '/client/api/json/v2/device/getGraphData'
        + '?name=' + ip
        + '&policyName=' + policyName
        + '&index=' + policyName
        + '&withMMA=true&period=Today&graphFilterType=avg&_=' + ts;
    try {
        const r = await fetch(url);
        if (!r.ok) return null;
        const txt = await r.text();
        const j = JSON.parse(txt);
        if (!j || !j.consolidatedValues || !j.consolidatedValues.length) return null;
        return j.consolidatedValues.map(cv => ({
            min: cv.minVal != null ? parseFloat(cv.minVal) : null,
            max: cv.maxVal != null ? parseFloat(cv.maxVal) : null,
            avg: cv.avgVal != null ? parseFloat(cv.avgVal) : null,
        }));
    } catch(e) { return null; }
}

// SUM semua row (mirip rumus =IF(H38="-";"-";SUM(H38:H47)))
function _eosNetSum(arr, key) {
    if (!arr) return null;
    const vals = arr.map(r => r[key]).filter(v => v !== null && !isNaN(v));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0);
}

// Ambil interface Critical/Trouble, return { iface, notes } — retry 3x jika gagal
async function _eosOpmanInterfaces(ip) {
    const baseUrl = EOS_OPMAN_PROXY + '/client/api/json/device/getInterfaces?name=' + ip + '&_=';
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const r = await fetch(baseUrl + Date.now());
            if (!r.ok) { if (attempt < 3) await new Promise(res => setTimeout(res, 1200)); continue; }
            const j = JSON.parse(await r.text());
            if (!j || !Array.isArray(j.interfaces)) { if (attempt < 3) await new Promise(res => setTimeout(res, 1200)); continue; }
            const critical = j.interfaces.filter(i => i.statusStr === 'Critical');
            const trouble  = j.interfaces.filter(i => i.statusStr === 'Trouble');
            const clear    = j.interfaces.filter(i => i.statusStr === 'Clear');
            const top5 = [...critical, ...trouble].slice(0, 5).map(i => i.displayName || i.trimmedDispName || '');
            const iface = top5.length ? top5.join(', ') : '-';
            const notes = `${critical.length} Critical, ${trouble.length} Trouble, ${clear.length} Clear`;
            return { iface, notes };
        } catch(e) { if (attempt < 3) await new Promise(res => setTimeout(res, 1200)); }
    }
    return { iface: '-', notes: '-' };
}

async function _eosOpmanHardware(ip) {
    const stateLabel = s => s===5?'OK':s===1?'Critical':s===2?'Trouble':s===3?'Attention':'Unknown';
    const url = EOS_OPMAN_PROXY + '/client/api/json/device/getHardwareCategoryState?deviceName=' + ip + '&expand=true&_=' + Date.now();
    try {
        const r = await fetch(url);
        if (!r.ok) return { temp: '-', fan: '-' };
        const j = JSON.parse(await r.text());
        if (!Array.isArray(j)) return { temp: '-', fan: '-' };
        const t = j.find(x => x.type === 'Temperature');
        const f = j.find(x => x.type === 'Fan');
        return { temp: t ? stateLabel(t.state) : '-', fan: f ? stateLabel(f.state) : '-' };
    } catch(e) { return { temp: '-', fan: '-' }; }
}

// ── SHEET 3: Network — urutan & metadata dari EOS_NET_DEVICES ────────────────
async function _eosCollectNetwork() {
    // Ambil status alarm dari inventory (map IP → statusStr)
    let alarmMap = {};
    try {
        const r = await fetch('Data_JSON/opmanager_inventory.json?t=' + Date.now());
        if (r.ok) {
            const j = JSON.parse(await r.text());
            (j.rows || []).forEach(d => { if (d.ipaddress) alarmMap[d.ipaddress] = d.statusStr || '-'; });
        }
    } catch(e) {}

    const fmtPct = v => v !== null && !isNaN(v) ? v.toFixed(2) + '%' : '-';

    const rows = [];
    const _total = EOS_NET_DEVICES.length;
    let _done = 0;
    for (const d of EOS_NET_DEVICES) {
        const _globalPct = 30 + Math.round((_done / _total) * 60);
        const _subEl = document.getElementById('_eosStepSub_net');
        if (_subEl) { _subEl.textContent = `${_done}/${_total} — ${d.hostname || d.ip}`; _subEl.style.color = '#8b949e'; }
        _eosSetProgress(_globalPct);
        _eosUpdateLoading(`Menarik Network device ${_done + 1}/${_total} (${_globalPct}%): ${d.hostname || d.ip}`);

        const [cpuRows, memRows, ifaceResult, hwResult] = await Promise.all([
            _eosOpmanGraph(d.ip, d.cpu),
            _eosOpmanGraph(d.ip, d.mem),
            _eosOpmanInterfaces(d.ip),
            _eosOpmanHardware(d.ip),
        ]);
        _done++;

        const cpuLow  = _eosNetSum(cpuRows, 'min');
        const cpuHigh = _eosNetSum(cpuRows, 'max');
        const cpuAvg  = _eosNetSum(cpuRows, 'avg');
        const memLow  = _eosNetSum(memRows, 'min');
        const memHigh = _eosNetSum(memRows, 'max');
        const memAvg  = _eosNetSum(memRows, 'avg');

        rows.push({
            no:       d.no,
            hostname: d.hostname,
            ip:       d.ip,
            brand:    d.brand,
            location: d.location,
            category: d.category,
            series:   d.series,
            alarm:    alarmMap[d.ip] || '-',
            cpuLow:   fmtPct(cpuLow),
            cpuHigh:  fmtPct(cpuHigh),
            cpuAvg:   fmtPct(cpuAvg),
            memLow:   fmtPct(memLow),
            memHigh:  fmtPct(memHigh),
            memAvg:   fmtPct(memAvg),
            subRows: (cpuRows || []).map((cr, i) => ({
                cpuMin: cr.min, cpuMax: cr.max, cpuAvg: cr.avg,
                memMin: memRows && memRows[i] ? memRows[i].min : null,
                memMax: memRows && memRows[i] ? memRows[i].max : null,
                memAvg: memRows && memRows[i] ? memRows[i].avg : null,
            })),
            iface: ifaceResult.iface,
            notes: ifaceResult.notes,
            temp:  hwResult.temp,
            fan:   hwResult.fan,
        });
    }
    return rows;
}

// ── CSV parser sederhana (handle quoted fields) ────────────────────────────────
function _eosCsvRow(line) {
    const out = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQ = !inQ; }
        else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
        else { cur += c; }
    }
    out.push(cur);
    return out;
}

// ── OUTPUT 1: Excel (.xlsx) dengan 3 sheet ────────────────────────────────────
const HDR_COLOR = 'FF2B78C5';  // biru seperti template
const ALT_COLOR = 'FFF2F2F2';

async function _eosBuildExcel(vmRows, vmwareRows, netRows, header, petugas, next, fname) {
    if (typeof ExcelJS === 'undefined') throw new Error('ExcelJS belum dimuat');
    const wb = new ExcelJS.Workbook();

    const fullBorder = {
        top:    { style: 'thin', color: { argb: 'FF000000' } },
        left:   { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right:  { style: 'thin', color: { argb: 'FF000000' } },
    };

    // Title row: kuning + teks hitam bold, isi "header (NAMA PETUGAS)"
    const addTitle = (ws, cols) => {
        ws.mergeCells(1, 1, 1, cols);
        const c = ws.getCell('A1');
        c.value = header + ' (' + petugas + ')';
        c.font = { bold: true, size: 13, color: { argb: 'FF000000' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = fullBorder;
        ws.getRow(1).height = 24;
    };

    // Header row: biru tua + teks putih
    const addHdr = (ws, row, cols) => {
        const r = ws.getRow(row);
        cols.forEach((c, i) => {
            const cell = r.getCell(i + 1);
            cell.value = c;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B78C5' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = fullBorder;
        });
    };

    const cellBorder = fullBorder;
    const ctr = { horizontal: 'center', vertical: 'middle' };

    // ── Sheet 1: VM Service ──
    {
        const ws = wb.addWorksheet('VM Service');
        const COL_COUNT = 8;
        addTitle(ws, COL_COUNT);
        addHdr(ws, 2, ['IP', 'Availability', 'CPU', 'Sys Load', 'RAM Usage', 'SWAP Used', 'Root FS', 'Remark']);

        // Helper: warna cell berdasarkan persen (bg + font color)
        const metricStyle = v => {
            if (v === 'N/A') return null;
            const n = parseFloat(v);
            if (isNaN(n)) return null;
            if (n >= 70) return { bg: 'FFFFC7CE', fg: 'FF9C1B1B' };
            if (n >= 50) return { bg: 'FFFFF2CC', fg: 'FF7D6608' };
            return { bg: 'FFC6EFCE', fg: 'FF1A7F37' };
        };
        const applyMetricStyle = (cell, v) => {
            const s = metricStyle(v);
            if (!s) return;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: s.bg } };
            cell.font = { color: { argb: s.fg }, bold: true };
        };
        const fmtPct = v => v === 'N/A' ? 'N/A' : parseFloat(v).toFixed(2) + '%';

        vmRows.forEach((r, idx) => {
            const row = ws.getRow(3 + idx);
            row.getCell(1).value = r.ip;

            // Availability
            const ac = row.getCell(2);
            ac.value = r.avail; ac.alignment = { horizontal: 'center' };
            ac.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r.avail === 'OK' ? 'FFC6EFCE' : 'FFFFFFFF' } };
            ac.font = { color: { argb: r.avail === 'OK' ? 'FF1A7F37' : 'FF000000' }, bold: r.avail === 'OK' };

            // Metric columns (CPU, Load, RAM, Swap, Root)
            const metrics = [r.cpu, r.load, r.ram, r.swap, r.root];
            metrics.forEach((v, mi) => {
                const c = row.getCell(3 + mi);
                c.value = fmtPct(v);
                c.alignment = { horizontal: 'center' };
                applyMetricStyle(c, v);
            });

            // Remark
            row.getCell(8).value = r.remark;

            for (let i = 1; i <= COL_COUNT; i++) { row.getCell(i).border = cellBorder; }
        });
        ws.columns = [{ width: 22 }, { width: 14 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 55 }];
    }

    // ── Sheet 2: VMWARE HOST ──
    {
        const ws = wb.addWorksheet('VMWARE HOST');
        addTitle(ws, 5);
        addHdr(ws, 2, ['Host', 'CPU', 'Memory', 'Net Usage', 'Notes']);
        const vmStyle = v => {
            const n = parseFloat(v);
            if (isNaN(n)) return null;
            if (n >= 70) return { bg: 'FFFFC7CE', fg: 'FF9C1B1B' };
            if (n >= 50) return { bg: 'FFFFF2CC', fg: 'FF7D6608' };
            return { bg: 'FFC6EFCE', fg: 'FF1A7F37' };
        };
        const applyVmStyle = (cell, v) => {
            const s = vmStyle(v);
            if (!s) return;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: s.bg } };
            cell.font = { color: { argb: s.fg }, bold: true };
        };
        vmwareRows.forEach((r, idx) => {
            const row = ws.getRow(3 + idx);
            row.getCell(1).value = r.host;
            const cpuCell = row.getCell(2); cpuCell.value = r.cpu; cpuCell.alignment = ctr;
            const memCell = row.getCell(3); memCell.value = r.mem; memCell.alignment = ctr;
            const netCell = row.getCell(4); netCell.value = r.net; netCell.alignment = ctr;
            row.getCell(5).value = r.notes;
            applyVmStyle(cpuCell, r.cpu);
            applyVmStyle(memCell, r.mem);
            [1,2,3,4,5].forEach(i => { row.getCell(i).border = cellBorder; });
        });
        ws.columns = [{ width: 40 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 55 }];
    }

    // ── Sheet 3: NETWORK ──
    {
        const ws = wb.addWorksheet('NETWORK');
        const NET_COLS = 19; // No,Brand,Location,Hostname,Management,Category,Series,CPULOW,CPUHIGH,CPUAVG,MEMLOW,MEMHIGH,MEMAVG,TEMP,FAN,Availability,ALARM,INTERFACES ERROR,NOTES
        addTitle(ws, NET_COLS);

        // Baris 2: header grup (CPU Usage, Memory Usage) — biru tua + teks putih
        const grpRow = ws.getRow(2);
        for (let ci = 1; ci <= NET_COLS; ci++) {
            const c = grpRow.getCell(ci);
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B78C5' } };
            c.border = fullBorder;
        }
        ws.mergeCells(2,8,2,10);
        const gCpu = grpRow.getCell(8);
        gCpu.value = 'CPU Usage'; gCpu.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        gCpu.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B78C5' } };
        gCpu.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.mergeCells(2,11,2,13);
        const gMem = grpRow.getCell(11);
        gMem.value = 'Memory Usage'; gMem.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        gMem.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B78C5' } };
        gMem.alignment = { horizontal: 'center', vertical: 'middle' };
        grpRow.height = 16;

        // Baris 3: kolom label
        addHdr(ws, 3, [
            'No','Brand','Location','Hostname','Management','Category','Series',
            'CPU LOW (%)','CPU HIGH (%)','CPU AVG (%)',
            'MEMORY LOW (%)','MEMORY HIGH (%)','MEMORY AVG (%)',
            'TEMP','FAN','Availability','ALARM','INTERFACES ERROR','NOTES'
        ]);

        const alarmArgb = a => a==='Clear'?'FFC6EFCE':a==='Trouble'?'FFFFF2CC':a==='Critical'?'FFFFC7CE':a==='Attention'?'FFFFEB9C':'FFFFFFFF';

        let rowIdx = 4;
        netRows.forEach(r => {
            const mr = ws.getRow(rowIdx);
            mr.getCell(1).value  = r.no;          mr.getCell(1).alignment  = ctr;
            mr.getCell(2).value  = r.brand;
            mr.getCell(3).value  = r.location;    mr.getCell(3).alignment  = ctr;
            mr.getCell(4).value  = r.hostname;
            mr.getCell(5).value  = r.ip;          mr.getCell(5).alignment  = ctr;
            mr.getCell(6).value  = r.category;    mr.getCell(6).alignment  = ctr;
            mr.getCell(7).value  = r.series;
            mr.getCell(8).value  = r.cpuLow;      mr.getCell(8).alignment  = ctr;
            mr.getCell(9).value  = r.cpuHigh;     mr.getCell(9).alignment  = ctr;
            mr.getCell(10).value = r.cpuAvg;      mr.getCell(10).alignment = ctr;
            mr.getCell(11).value = r.memLow;      mr.getCell(11).alignment = ctr;
            mr.getCell(12).value = r.memHigh;     mr.getCell(12).alignment = ctr;
            mr.getCell(13).value = r.memAvg;      mr.getCell(13).alignment = ctr;
            mr.getCell(14).value = r.temp;        mr.getCell(14).alignment = ctr;  // TEMP
            mr.getCell(15).value = r.fan;         mr.getCell(15).alignment = ctr;  // FAN
            mr.getCell(16).value = '100%';        mr.getCell(16).alignment = ctr;  // Availability placeholder
            const ac = mr.getCell(17);
            ac.value = r.alarm; ac.alignment = ctr;
            ac.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: alarmArgb(r.alarm) } };
            mr.getCell(18).value = r.iface;   // INTERFACES ERROR
            mr.getCell(19).value = r.notes;   // NOTES
            for (let i=1;i<=NET_COLS;i++) mr.getCell(i).border = cellBorder;
            rowIdx++;
        });

        // ── Sub-table: detail CPU+Memory per consolidatedValues (mulai kolom F=6) ──
        rowIdx += 2; // baris kosong pemisah

        // Header sub-table baris 1 — No & Hostname di-merge 2 baris, CPU/Memory hdr grup
        const shdrR1 = rowIdx;
        const shdrR2 = rowIdx + 1;
        ws.mergeCells(shdrR1, 6, shdrR2, 6);   // No: merge 2 baris
        ws.mergeCells(shdrR1, 7, shdrR2, 7);   // Hostname: merge 2 baris
        ws.mergeCells(shdrR1, 8, shdrR1, 10);  // CPU Usage hdr
        ws.mergeCells(shdrR1, 11, shdrR1, 13); // Memory Usage hdr
        const shdr1 = ws.getRow(shdrR1);
        [{ci:6,v:'No'},{ci:7,v:'Hostname'},{ci:8,v:'CPU Usage'},{ci:11,v:'Memory Usage'}].forEach(({ci,v}) => {
            const c = shdr1.getCell(ci);
            c.value = v;
            c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B78C5' } };
            c.alignment = { horizontal: 'center', vertical: 'middle' };
            c.border = fullBorder;
        });
        // border pada sel yang ikut merge tapi tidak punya value
        [9,10,12,13].forEach(ci => {
            const c = shdr1.getCell(ci);
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B78C5' } };
            c.border = fullBorder;
        });
        rowIdx++;

        // Header sub-table baris 2 (MINIMUM/MAXIMUM/AVERAGE)
        const shdr2 = ws.getRow(rowIdx);
        ['MINIMUM (%)','MAXIMUM (%)','AVERAGE (%)','MINIMUM (%)','MAXIMUM (%)','AVERAGE (%)'].forEach((lbl, i) => {
            const ci = 8 + i;
            const c = shdr2.getCell(ci);
            c.value = lbl;
            c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B78C5' } };
            c.alignment = { horizontal: 'center', vertical: 'middle' };
            c.border = fullBorder;
        });
        // border pada cell No & Hostname row 2 (sudah di-merge, perlu fill)
        [6,7].forEach(ci => {
            const c = shdr2.getCell(ci);
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B78C5' } };
            c.border = fullBorder;
        });
        rowIdx++;

        // Data sub-table
        const fmtSub = v => v !== null && !isNaN(v) ? (v).toFixed(2) + '%' : '-';
        netRows.forEach(r => {
            if (!r.subRows || r.subRows.length === 0) {
                // baris tunggal tanpa sub-rows
                const row = ws.getRow(rowIdx);
                row.getCell(6).value = r.no;     row.getCell(6).alignment = ctr;
                row.getCell(7).value = r.hostname;
                row.getCell(8).value  = r.cpuLow;  row.getCell(8).alignment  = ctr;
                row.getCell(9).value  = r.cpuHigh; row.getCell(9).alignment  = ctr;
                row.getCell(10).value = r.cpuAvg;  row.getCell(10).alignment = ctr;
                row.getCell(11).value = r.memLow;  row.getCell(11).alignment = ctr;
                row.getCell(12).value = r.memHigh; row.getCell(12).alignment = ctr;
                row.getCell(13).value = r.memAvg;  row.getCell(13).alignment = ctr;
                for (let i=6;i<=13;i++) row.getCell(i).border = cellBorder;
                rowIdx++;
            } else {
                // baris pertama: No + Hostname + sub-row[0]
                r.subRows.forEach((sr, si) => {
                    const row = ws.getRow(rowIdx);
                    if (si === 0) {
                        row.getCell(6).value = r.no;     row.getCell(6).alignment = ctr;
                        row.getCell(7).value = r.hostname;
                    }
                    row.getCell(8).value  = fmtSub(sr.cpuMin); row.getCell(8).alignment  = ctr;
                    row.getCell(9).value  = fmtSub(sr.cpuMax); row.getCell(9).alignment  = ctr;
                    row.getCell(10).value = fmtSub(sr.cpuAvg); row.getCell(10).alignment = ctr;
                    row.getCell(11).value = fmtSub(sr.memMin); row.getCell(11).alignment = ctr;
                    row.getCell(12).value = fmtSub(sr.memMax); row.getCell(12).alignment = ctr;
                    row.getCell(13).value = fmtSub(sr.memAvg); row.getCell(13).alignment = ctr;
                    if (si > 0) row.font = { size: 9, color: { argb: 'FF666666' } };
                    for (let i=6;i<=13;i++) row.getCell(i).border = cellBorder;
                    rowIdx++;
                });
            }
        });

        ws.columns = [
            {width:5},{width:18},{width:10},{width:26},{width:16},{width:14},{width:28},
            {width:13},{width:13},{width:13},{width:16},{width:16},{width:16},
            {width:8},{width:8},{width:13},{width:14},{width:30},{width:45,hidden:true}
        ];
    }

    const buf = await wb.xlsx.writeBuffer();
    _eosDownload(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fname + '.xlsx');
}

// ── OUTPUT 2: TXT (isi = HTML, ekstensi .txt untuk kompatibilitas UiPath/Mailz) ─
function _eosBuildTxt(html, fname) {
    _eosDownload(new Blob([html], { type: 'text/plain;charset=utf-8' }), fname + '.txt');
}

// ── OUTPUT 3: HTML (template PERSIS seperti Mailz.xaml) ───────────────────────
async function _eosBuildHtml(vmRows, vmwareRows, netRows, meta, fname) {
    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const sanitizeSummary = s => {
        const raw = String(s ?? '');
        const escaped = raw
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return escaped.replace(/&lt;(\/?(b|strong|i|em|u|br|p|ul|ol|li))\b[^&]*&gt;/gi, match =>
            match.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        );
    };
    const renderSummaryLines = s => {
        const normalized = sanitizeSummary(s)
            .replace(/\r\n/g, '\n')
            .replace(/\u00A0/g, ' ');

        return normalized
            .split('\n')
            .map(line => {
                const displayLine = line.replace(/\t/g, '    ');
                const text = displayLine.trim();

                if (!text) return '<div>&nbsp;</div>';

                const strongLabel = /^(Total Ticket on Shift|Total Ticket Per|Overall Ticket Open)\b/i.test(text);
                if (text.includes(':')) {
                    const [labelPart, ...rest] = text.split(':');
                    const label = labelPart.trim();
                    const value = rest.join(':').trim();
                    const isBoldLine = strongLabel || /^(Total Ticket on Shift|Total Ticket Per|Overall Ticket Open)/i.test(label);
                    return `<div>${isBoldLine ? '<strong>' : ''}${esc(label)}${isBoldLine ? '</strong>' : ''}${value ? ` : ${isBoldLine ? '<strong>' : ''}${esc(value)}${isBoldLine ? '</strong>' : ''}` : ''}</div>`;
                }

                return `<div>${esc(displayLine)}</div>`;
            })
            .join('');
    };
    const okV = vmRows.filter(r => r.avail === 'OK').length;
    const summaryTicket = (meta && meta.summaryTicket ? String(meta.summaryTicket) : '').trim();
    const summaryHtml = summaryTicket ? renderSummaryLines(summaryTicket) : '';

    const tblStyle = "border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse;width:100%;font-family:sans-serif;border:1px solid #000;table-layout:fixed;'";
    const thStyle  = (c, w) => "<th style='border:1px solid #000;" + (w ? 'width:' + w + ';' : '') + "'>" + esc(c) + '</th>';
    const tdC      = (v, bg, fg) => "<td align='center' style='border:1px solid #000;" + (bg ? 'background-color:' + bg + ';' : '') + (fg ? 'color:' + fg + ';font-weight:bold;' : '') + "'>" + esc(v) + '</td>';
    const tdL      = (v, wrap) => "<td style='border:1px solid #000;" + (wrap ? 'word-wrap:break-word;overflow-wrap:break-word;white-space:normal;' : '') + "'>" + esc(v) + '</td>';
    const pctStyle = v => { const n = parseFloat(v); if (isNaN(n)) return [null,null]; if (n >= 70) return ['#ffc7ce','#9c1b1b']; if (n >= 50) return ['#fff2cc','#7d6608']; return ['#c6efce','#1a7f37']; };

    // Table Network
    const fmtIface = v => {
        if (!v || v === '-') return '-';
        const parts = v.split(', ');
        return parts.slice(0, 3).join(', ') + (parts.length > 3 ? ', ...' : '');
    };
    const netHtml = "<h3 style='margin-bottom:0;'> Summary Network Devices: </h3>"
        + "<table " + tblStyle + "><thead><tr style='background-color:#2b78c5;color:white;'>"
        + thStyle('Hostname','20%') + thStyle('Management','15%') + thStyle('Alarm','10%') + thStyle('INTERFACES ERROR','55%')
        + "</tr></thead><tbody>"
        + netRows.map(r => {
            const ac = r.alarm === 'Clear' ? '#c6efce' : r.alarm === 'Trouble' ? '#fff2cc' : r.alarm === 'Critical' ? '#ffc7ce' : r.alarm === 'Attention' ? '#ffeb9c' : '#ffffff';
            return '<tr>' + tdL(r.hostname) + tdC(r.ip,'') + tdC(r.alarm, ac) + tdL(fmtIface(r.iface), true) + '</tr>';
          }).join('')
        + "</tbody></table>";

    // Table VMware
    const vmwareHtml = "<h3 style='margin-bottom:0;'> Summary VMware Host: </h3>"
        + "<table " + tblStyle + "><thead><tr style='background-color:#2b78c5;color:White;'>"
        + thStyle('Host') + thStyle('Notes')
        + "</tr></thead><tbody>"
        + vmwareRows.map(r => '<tr>' + tdL(r.host) + tdL(r.notes) + '</tr>').join('')
        + "</tbody></table>";

    // Table VM Service
    const vmHtml = "<h3 style='margin-bottom:0;'> Summary VM Service: </h3>"
        + "<table " + tblStyle + "><thead><tr style='background-color:#2b78c5;color:white;'>"
        + thStyle('IP','25%') + thStyle('Availability','15%') + thStyle('Remark','60%')
        + "</tr></thead><tbody>"
        + vmRows.map(r => {
            const avBg = r.avail === 'OK' ? '#c6efce' : '#ffffff';
            const avFg = r.avail === 'OK' ? '#1a7f37' : '#000000';
            return '<tr>'
                + tdL(r.ip)
                + tdC(r.avail, avBg, avFg)
                + tdL(r.remark)
                + '</tr>';
          }).join('')
        + "</tbody></table>";

    const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">
<title>EOS Report - ${esc(meta.header)}</title>
<style>body{font-family:Calibri,sans-serif;margin:24px;color:#000;}h2{color:#21618c;}</style>
</head><body>
<p>NOC Report End Of Shift - ${_eosTglID(meta.now)} (${meta.shift.label})</p><br>
<p>girindra.wardhana@ibm.com, encep.sania@example.local, yossi.wahyuda@example.local, averil.rusdi@example.local, haffiz.pratama@example.local, bino.pramana@example.local, Sam.wardono@example.local, Ryan.wijaya@example.local</p><br>
<p>ivtah.Djauhar@ibm.com, Ardian.Yusufi@ibm.com, Geraldo.Sigalingging1@ibm.com</p><br>
<div style='font-family:sans-serif;line-height:1.6;color:#000;'>
<p>Dear Team,</p>
<p>Berikut Report End Of Shift ${meta.shift.num} tanggal ${_eosTglID(meta.now)}</p>
<p style='margin:0;'><strong>Shifter: </strong>${esc(meta.petugas)}</p>
<p style='margin:0;'><strong>Next Shift: </strong>${esc(meta.next)}</p>
<h4 style='text-decoration:underline;font-style:italic;'>Summary Ticket</h4>
</div>
${summaryHtml}
${netHtml}
${vmwareHtml}
${vmHtml}
<p style='margin-top:16px;'>Demikian informasi yang dapat kami sampaikan, jika ada pertanyaan atau bantuan lainnya silakan untuk menghubungi kami kembali.</p>
<p>Terima Kasih</p><br>
<div class='signature-div'><p>Regards,</p>
<table style='font-family:arial,sans-serif;font-size:12px;color:#000;' cellspacing='0' cellpadding='0'><tbody>
<tr><td style='font-size:16px;font-weight:bold;color:#f58220;'>NOC TEAM</td></tr>
<tr><td style='padding-top:2px;'>ITMS - Network Operations Center</td></tr>
<tr><td style='padding-top:8px;'>PT Acme Data Internasional<br>UPH Gedung C Lt. 5, Jl. M.H Thamrin Boulevard No.2<br>Lippo Karawaci 1100 - Tangerang 15811</td></tr>
<tr><td style='border-top:1px solid #f58220;padding-top:8px;'>Contact us :<br>
<table style='font-family:arial,sans-serif;font-size:12px;' cellspacing='0' cellpadding='0'><tbody>
<tr><td style='padding-right:8px;'>📱</td><td>+62 85591958899</td></tr>
<tr><td style='padding-right:8px;'>📧</td><td>noc.dki@example.local</td></tr>
</tbody></table></td></tr>
<tr><td style='font-size:11px;font-style:italic;font-weight:bold;color:#187c19;'>Please consider the environment before printing this email</td></tr>
</tbody></table></div>
</body></html>`;

    _eosDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), fname + '.html');
    return html;
}

// ── Util download ──────────────────────────────────────────────────────────────
function _eosDownload(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

// ── MAIN: logika inti EOS (dipanggil dari openEosReport maupun tab unified) ───
async function _eosRunWithParams({ petugas, next, summaryTicket }) {
    _eosShowLoading();
    try {
        const now   = _eosNow();
        const shift = _eosShiftInfo(now);
        const header = 'NOC Report End Of Shift - ' + _eosTglID(now) + ' (' + shift.label + ')';
        const meta   = { header, petugas, next, now, shift, summaryTicket };
        const fname  = 'NOC Report End of Shift - ' + _eosTglID(now) + ' (' + shift.label + ')';

        _eosSetProgress(0);
        _eosStepStart('vm');
        _eosUpdateLoading('Menarik data VM Service dari Grafana (' + EOS_VM_IPS.length + ' IP)...');
        _eosCheckCancelled();
        const vmRows = await _eosCollectVmService();
        _eosCheckCancelled();
        const okV = vmRows.filter(r => r.avail === 'OK').length;
        _eosStepDone('vm', okV + ' OK / ' + (vmRows.length - okV) + ' N/A dari ' + vmRows.length + ' server');
        _eosSetProgress(15);

        _eosStepStart('vmware');
        _eosUpdateLoading('Menarik data VMware Host dari RVTools & Grafana InfluxDB...');
        _eosCheckCancelled();
        const vmwareRows = await _eosCollectVmware();
        _eosCheckCancelled();
        _eosStepDone('vmware', vmwareRows.length + ' host ditemukan');
        _eosSetProgress(30);

        _eosStepStart('net');
        _eosUpdateLoading('Menarik data Network dari OpManager (' + EOS_NET_DEVICES.length + ' device)...');
        _eosCheckCancelled();
        const netRows = await _eosCollectNetwork();
        _eosCheckCancelled();
        const clr = netRows.filter(r => r.alarm === 'Clear').length;
        _eosStepDone('net', clr + ' Clear, ' + (netRows.length - clr) + ' alarm dari ' + netRows.length + ' device');
        _eosSetProgress(90);

        _eosStepStart('build');
        _eosUpdateLoading('Membuat file Excel (3 sheet), TXT & HTML...');
        await _eosBuildExcel(vmRows, vmwareRows, netRows, header, petugas, next, fname);
        const html = await _eosBuildHtml(vmRows, vmwareRows, netRows, meta, fname);
        _eosBuildTxt(html, fname);
        _eosStepDone('build', 'Excel + TXT + HTML berhasil diunduh');
        _eosSetProgress(100);

        _eosUpdateLoading('Selesai ✓ Membuka pratinjau HTML...');
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }

        setTimeout(_eosHideLoading, 1200);
    } catch (e) {
        if (e.message === '__EOS_CANCELLED__') { _eosHideLoading(); return; }
        const hint = /Failed to fetch|NetworkError|HTTP 401|HTTP 0|502/i.test(e.message)
            ? ' — Pastikan grafana_proxy & opmanager_proxy berjalan.'
            : '';
        _eosUpdateLoading('❌ ' + (e.message || e) + hint);
        setTimeout(_eosHideLoading, 7000);
    }
}

async function openEosReport() {
    // Demo mode: skip config fetch & live data, use dummy rows directly
    let petugas, next, summaryTicket = '';
    try {
        const inp = await _eosShowInputDialog();
        petugas = inp.petugas;
        next    = inp.next;
        summaryTicket = inp.summaryTicket || '';
    } catch(e) {
        return;
    }
    await _eosRunDemo({ petugas, next, summaryTicket });
}

async function _eosRunDemo({ petugas, next, summaryTicket }) {
    _eosShowLoading();
    try {
        const now   = _eosNow();
        const shift = _eosShiftInfo(now);
        const header = 'NOC Report End Of Shift - ' + _eosTglID(now) + ' (' + shift.label + ')';
        const meta   = { header, petugas, next, now, shift, summaryTicket };
        const fname  = 'NOC Report End of Shift - ' + _eosTglID(now) + ' (' + shift.label + ')';

        _eosSetProgress(10);
        _eosStepStart('vm');
        _eosUpdateLoading('Memuat dummy VM Service data...');
        const vmRows = [
            { ip:'10.20.0.101', avail:'OK',  cpu:'23.45', load:'18.20', ram:'41.30', swap:'0.00',  root:'55.10', remark:'Overall in normal state' },
            { ip:'10.20.0.102', avail:'OK',  cpu:'71.20', load:'65.80', ram:'82.40', swap:'12.50', root:'38.90', remark:'CPU usage in high state, RAM usage in high state' },
            { ip:'10.20.0.103', avail:'OK',  cpu:'45.60', load:'38.10', ram:'59.70', swap:'5.30',  root:'72.40', remark:'Root FS in high state' },
            { ip:'10.20.1.10',  avail:'OK',  cpu:'12.30', load:'9.80',  ram:'33.50', swap:'0.00',  root:'41.20', remark:'Overall in normal state' },
            { ip:'10.20.1.11',  avail:'OK',  cpu:'55.40', load:'51.20', ram:'48.90', swap:'0.00',  root:'29.80', remark:'CPU usage in medium state, System Load in medium state' },
            { ip:'10.20.2.13',  avail:'OK',  cpu:'28.90', load:'22.40', ram:'67.30', swap:'8.10',  root:'88.50', remark:'Root FS in high state' },
            { ip:'10.20.2.14',  avail:'N/A', cpu:'N/A',   load:'N/A',   ram:'N/A',   swap:'N/A',   root:'N/A',   remark:'Troubleshoot' },
            { ip:'10.20.3.50',  avail:'OK',  cpu:'34.10', load:'29.60', ram:'52.80', swap:'3.40',  root:'44.70', remark:'RAM usage in medium state' },
            { ip:'10.20.4.20',  avail:'OK',  cpu:'8.70',  load:'6.50',  ram:'28.40', swap:'0.00',  root:'31.60', remark:'Overall in normal state' },
            { ip:'10.20.5.107', avail:'OK',  cpu:'19.80', load:'16.30', ram:'44.20', swap:'1.80',  root:'91.30', remark:'Root FS in high state' },
        ];
        _eosStepDone('vm', vmRows.filter(r=>r.avail==='OK').length + ' OK / ' + vmRows.filter(r=>r.avail==='N/A').length + ' N/A dari ' + vmRows.length + ' server');
        _eosSetProgress(30);

        _eosStepStart('vmware');
        _eosUpdateLoading('Memuat dummy VMware Host data...');
        const vmwareRows = [
            { host:'esxi-host-01.noc.local', cpu:'22.40%', mem:'38.70%', net:'-', notes:'CPU and Memory usage in normal state' },
            { host:'esxi-host-02.noc.local', cpu:'58.10%', mem:'71.30%', net:'-', notes:'CPU usage in medium state, Memory usage in high state' },
            { host:'esxi-host-03.noc.local', cpu:'11.60%', mem:'29.40%', net:'-', notes:'CPU and Memory usage in normal state' },
            { host:'esxi-host-04.noc.local', cpu:'73.90%', mem:'45.20%', net:'-', notes:'CPU usage in high state' },
            { host:'esxi-host-05.noc.local', cpu:'34.50%', mem:'61.80%', net:'-', notes:'Memory usage in medium state' },
        ];
        _eosStepDone('vmware', vmwareRows.length + ' host ditemukan');
        _eosSetProgress(60);

        _eosStepStart('net');
        _eosUpdateLoading('Memuat dummy Network data...');
        const netRows = [
            { no:1,  hostname:'RTR-CORE-01',    ip:'10.20.0.1',   brand:'Cisco',   location:'Data Center',      category:'Router',   series:'Cisco ASR 1001-X', alarm:'Clear',    cpuLow:'5.20%',  cpuHigh:'18.40%', cpuAvg:'11.30%', memLow:'42.10%', memHigh:'48.90%', memAvg:'45.50%', subRows:[], iface:[], notes:'', temp:'-', fan:'-' },
            { no:2,  hostname:'RTR-CORE-02',    ip:'10.20.0.2',   brand:'Cisco',   location:'Data Center',      category:'Router',   series:'Cisco ASR 1001-X', alarm:'Clear',    cpuLow:'4.80%',  cpuHigh:'16.20%', cpuAvg:'10.50%', memLow:'41.30%', memHigh:'47.60%', memAvg:'44.40%', subRows:[], iface:[], notes:'', temp:'-', fan:'-' },
            { no:3,  hostname:'SW-DIST-01',     ip:'10.20.0.10',  brand:'Cisco',   location:'Data Center',      category:'Switch',   series:'Cisco Catalyst 9300', alarm:'Clear', cpuLow:'2.10%',  cpuHigh:'9.80%',  cpuAvg:'5.40%',  memLow:'38.20%', memHigh:'42.10%', memAvg:'40.10%', subRows:[], iface:[], notes:'', temp:'-', fan:'-' },
            { no:4,  hostname:'SW-DIST-02',     ip:'10.20.0.11',  brand:'Cisco',   location:'Data Center',      category:'Switch',   series:'Cisco Catalyst 9300', alarm:'Clear', cpuLow:'1.90%',  cpuHigh:'8.60%',  cpuAvg:'4.90%',  memLow:'37.80%', memHigh:'41.50%', memAvg:'39.60%', subRows:[], iface:[], notes:'', temp:'-', fan:'-' },
            { no:5,  hostname:'FW-EDGE-01',     ip:'10.20.0.20',  brand:'Palo Alto', location:'Perimeter',     category:'Firewall', series:'PA-3220',          alarm:'Clear',    cpuLow:'8.30%',  cpuHigh:'31.70%', cpuAvg:'19.40%', memLow:'55.10%', memHigh:'62.30%', memAvg:'58.70%', subRows:[], iface:[], notes:'', temp:'-', fan:'-' },
            { no:6,  hostname:'RTR-BRANCH-JKT', ip:'10.20.1.1',   brand:'Cisco',   location:'Jakarta Branch',   category:'Router',   series:'Cisco ISR 4331',   alarm:'Clear',    cpuLow:'3.50%',  cpuHigh:'22.10%', cpuAvg:'12.80%', memLow:'44.20%', memHigh:'51.60%', memAvg:'47.90%', subRows:[], iface:[], notes:'', temp:'-', fan:'-' },
            { no:7,  hostname:'SW-ACCESS-JKT',  ip:'10.20.1.10',  brand:'Cisco',   location:'Jakarta Branch',   category:'Switch',   series:'Cisco Catalyst 2960', alarm:'Clear', cpuLow:'1.20%',  cpuHigh:'6.40%',  cpuAvg:'3.80%',  memLow:'29.40%', memHigh:'33.10%', memAvg:'31.20%', subRows:[], iface:[], notes:'', temp:'-', fan:'-' },
            { no:8,  hostname:'RTR-BRANCH-BDG', ip:'10.20.2.1',   brand:'Cisco',   location:'Bandung Branch',   category:'Router',   series:'Cisco ISR 4331',   alarm:'Alarm',    cpuLow:'12.40%', cpuHigh:'78.30%', cpuAvg:'45.10%', memLow:'48.30%', memHigh:'69.80%', memAvg:'59.00%', subRows:[], iface:[], notes:'High CPU detected', temp:'-', fan:'-' },
            { no:9,  hostname:'SW-ACCESS-BDG',  ip:'10.20.2.10',  brand:'Cisco',   location:'Bandung Branch',   category:'Switch',   series:'Cisco Catalyst 2960', alarm:'Clear', cpuLow:'0.80%',  cpuHigh:'5.20%',  cpuAvg:'2.90%',  memLow:'27.10%', memHigh:'30.40%', memAvg:'28.70%', subRows:[], iface:[], notes:'', temp:'-', fan:'-' },
            { no:10, hostname:'RTR-BRANCH-SBY', ip:'10.20.3.1',   brand:'Huawei',  location:'Surabaya Branch',  category:'Router',   series:'Huawei AR3200',    alarm:'Clear',    cpuLow:'6.10%',  cpuHigh:'28.50%', cpuAvg:'17.20%', memLow:'36.90%', memHigh:'44.70%', memAvg:'40.80%', subRows:[], iface:[], notes:'', temp:'-', fan:'-' },
        ];
        const clr = netRows.filter(r => r.alarm === 'Clear').length;
        _eosStepDone('net', clr + ' Clear, ' + (netRows.length - clr) + ' alarm dari ' + netRows.length + ' device');
        _eosSetProgress(90);

        _eosStepStart('build');
        _eosUpdateLoading('Membuat file Excel (3 sheet), TXT & HTML...');
        await _eosBuildExcel(vmRows, vmwareRows, netRows, header, petugas, next, fname);
        const html = await _eosBuildHtml(vmRows, vmwareRows, netRows, meta, fname);
        _eosBuildTxt(html, fname);
        _eosStepDone('build', 'Excel + TXT + HTML berhasil diunduh');
        _eosSetProgress(100);

        _eosUpdateLoading('Selesai ✓ Membuka pratinjau HTML...');
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }

        setTimeout(_eosHideLoading, 1200);
    } catch (e) {
        if (e.message === '__EOS_CANCELLED__') { _eosHideLoading(); return; }
        _eosUpdateLoading('❌ ' + (e.message || e));
        setTimeout(_eosHideLoading, 7000);
    }
}
