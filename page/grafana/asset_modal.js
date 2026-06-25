/**
 * asset_modal.js
 * Menangani Modal Detail Asset secara Fullscreen di Root Dashboard.
 * Dipanggil di index.html tapi kodenya terpisah agar rapi.
 */

// Menunggu sampai seluruh elemen HTML (termasuk body) selesai dimuat
window.addEventListener('DOMContentLoaded', function() {

    // Load Chart.js sekali saja di parent
    if (!window._chartJsLoaded) {
        window._chartJsLoaded = true;
        const sc = document.createElement('script');
        sc.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        document.head.appendChild(sc);
    }

    // 1. Suntikkan CSS ke Head
    const style = document.createElement('style');
    style.innerHTML = `
        #masterDetailModal {
            display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); z-index: 25000; justify-content: center;
            align-items: center; backdrop-filter: blur(4px); font-family: 'Segoe UI', sans-serif;
        }
        #masterDetailModal .modal-box {
            background: #161b22; border: 1px solid #30363d; border-radius: 8px;
            width: 820px; max-width: 95vw; max-height: 90vh;
            display: flex; flex-direction: column;
            box-shadow: 0 20px 50px rgba(0,0,0,0.7); padding: 0;
        }
        #masterDetailModal .modal-header {
            padding: 12px 15px; border-bottom: 1px solid #30363d; display: flex;
            justify-content: space-between; align-items: center; background: #010409;
            border-radius: 8px 8px 0 0; flex-shrink: 0;
        }
        #masterDetailModal .modal-content-row {
            display: flex; flex: 1; overflow: hidden; min-height: 0;
        }
        #masterDetailModal .modal-body {
            padding: 15px; overflow-y: auto; font-size: 12px; color: #c9d1d9; line-height: 1.5;
            flex: 0 0 320px; border-right: 1px solid #21262d;
        }
        #masterDetailModal .chart-panel {
            flex: 1; display: flex; flex-direction: column;
            padding: 12px 14px 14px; min-width: 0;
        }
        #masterDetailModal .chart-label {
            font-size: 10px; color: #6e7681; font-weight: 700; letter-spacing: 0.5px;
            text-transform: uppercase; margin-bottom: 8px; flex-shrink: 0;
        }
        #masterDetailModal .chart-canvas-wrap {
            flex: 1; position: relative; min-height: 0;
        }
        #masterDetailModal .no-chart-msg {
            display: flex; align-items: center; justify-content: center;
            height: 100%; color: #484f58; font-size: 12px; text-align: center;
        }
        #masterDetailModal .info-table { width: 100%; border-collapse: collapse; }
        #masterDetailModal .info-table td { padding: 10px 0; border-bottom: 1px dotted #30363d; }
        #masterDetailModal .info-table td:first-child { color: #8b949e; width: 130px; font-weight: bold; }
        #masterDetailModal .info-table td:last-child { color: #58a6ff; text-align: right; font-family: monospace; }
        #masterDetailModal .copy-ip {
            color: #58a6ff; font-size: 15px; font-family: monospace;
            cursor: pointer; transition: 0.2s; font-weight: bold;
            padding: 2px 4px; border-radius: 4px;
        }
        #masterDetailModal .copy-ip:hover { background: rgba(88, 166, 255, 0.15); color: #c9d1d9; }
        #masterDetailModal .copy-full {
            color: #8b949e; font-size: 12px; font-family: monospace;
            cursor: pointer; transition: 0.2s; font-weight: normal;
            padding: 2px 4px; border-radius: 4px; margin-left: 4px;
        }
        #masterDetailModal .copy-full:hover { background: rgba(139, 148, 158, 0.15); color: #c9d1d9; }
        #masterDetailModal .close-btn {
            background: none; border: none; color: #8b949e; font-weight: bold;
            cursor: pointer; font-size: 16px; transition: 0.2s; padding: 0 5px; margin-left: 10px;
        }
        #masterDetailModal .close-btn:hover { color: #ff7b72; }
        #masterDetailModal .btn-wa {
            background: #238636; color: white; border: none; padding: 4px 8px;
            border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;
            display: flex; align-items: center; gap: 4px; transition: 0.2s;
        }
        #masterDetailModal .btn-wa:hover { background: #2ea043; }
    `;
    document.head.appendChild(style);

    // 2. Suntikkan HTML ke Body
    const modalHTML = `
        <div id="masterDetailModal">
            <div class="modal-box">
                <div class="modal-header">
                    <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
                        
                        <div style="flex:1; display:flex; align-items:center; overflow:hidden; white-space:nowrap;">
                            <span id="masterCopyIp" class="copy-ip" title="Klik untuk Copy IP Saja">IP</span>
                            <span id="masterCopyFull" class="copy-full" title="Klik untuk Copy IP [Hostname]">[HOSTNAME]</span>
                        </div>

                        <button id="masterBtnWa" class="btn-wa" style="display: none;">
                            <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 10.30.0.4-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>
                            WA
                        </button>
                        <button class="close-btn" id="closeMasterDet">X</button>
                    </div>
                </div>
                <div class="modal-content-row">
                    <div class="modal-body">
                        <table class="info-table" id="masterDetTable"></table>
                    </div>
                    <div class="chart-panel" id="masterChartPanel">
                        <div class="chart-label" id="masterChartLabel">4 JAM TERAKHIR</div>
                        <div class="chart-canvas-wrap">
                            <canvas id="masterChart"></canvas>
                            <div class="no-chart-msg" id="masterNoChart" style="display:none;">Tidak ada data grafik</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('masterDetailModal');
    let _chartInst = null;

    window.closeMasterDetailModal = function() {
        modal.style.display = 'none';
    };

    function renderChart(chartData) {
        const canvas  = document.getElementById('masterChart');
        const noChart = document.getElementById('masterNoChart');

        if (_chartInst) { _chartInst.destroy(); _chartInst = null; }

        if (!chartData || !chartData.times || !chartData.values || !chartData.times.length || typeof Chart === 'undefined') {
            canvas.style.display = 'none';
            noChart.style.display = 'flex';
            return;
        }
        canvas.style.display = 'block';
        noChart.style.display = 'none';
        document.getElementById('masterChartLabel').textContent = (chartData.module || '') + ' — 4 JAM TERAKHIR';

        // Downsample ke max 150 titik agar ringan
        const raw  = chartData.times.map((t, i) => ({ t, v: chartData.values[i] }));
        const step = Math.max(1, Math.floor(raw.length / 150));
        const pts  = raw.filter((_, i) => i % step === 0);

        const labels = pts.map(p => {
            const d = new Date(p.t);
            return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
        });
        const vals = pts.map(p => p.v !== null ? +p.v.toFixed(2) : null);

        const critColor  = chartData.critColor || '#ff7b72';
        const threshold  = chartData.threshold || 70;
        const warnLevel  = chartData.warnLevel !== undefined ? chartData.warnLevel : 50;

        // Warna titik hover sesuai nilai
        const pointBgColors = vals.map(v => {
            if (v === null) return 'transparent';
            return v >= threshold ? critColor : (v >= warnLevel ? '#e3b341' : '#3fb950');
        });

        // Warna fill area bawah garis
        const hexToRgba = (hex, a) => {
            const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
            return 'rgba('+r+','+g+','+b+','+a+')';
        };
        const fillColor = hexToRgba(critColor, 0.08);

        // Garis threshold: flat array sepanjang data
        const critLine = vals.map(() => threshold);
        const warnLine = vals.map(() => warnLevel);

        _chartInst = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        data: vals,
                        borderColor: critColor,
                        borderWidth: 1.5,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: pointBgColors,
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 1.5,
                        fill: true,
                        backgroundColor: fillColor,
                        tension: 0.3,
                        spanGaps: true,
                        order: 1
                    },
                    {
                        data: critLine,
                        borderColor: 'rgba(255,123,114,0.7)',
                        borderWidth: 1,
                        borderDash: [4, 3],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        tension: 0,
                        order: 2
                    },
                    {
                        data: warnLine,
                        borderColor: 'rgba(227,179,65,0.7)',
                        borderWidth: 1,
                        borderDash: [4, 3],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        tension: 0,
                        order: 3
                    }
                ]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#1c2128',
                        borderColor: '#30363d',
                        borderWidth: 1,
                        titleColor: '#8b949e',
                        bodyColor: critColor,
                        bodyFont: { family: 'JetBrains Mono, monospace', size: 13, weight: 'bold' },
                        titleFont: { size: 10 },
                        padding: 10,
                        displayColors: false,
                        filter: item => item.datasetIndex === 0,
                        callbacks: {
                            title: items => items[0].label,
                            label: ctx => ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) + '%' : 'N/A'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#6e7681', font: { size: 9 }, maxTicksLimit: 6, maxRotation: 0 },
                        grid: { color: '#21262d' }
                    },
                    y: {
                        ticks: { color: '#6e7681', font: { size: 9 }, callback: v => v + '%' },
                        grid: { color: '#21262d' },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                }
            }
        });
    }
    document.getElementById('closeMasterDet').onclick = closeMasterDetailModal;
    
    // Fungsi Setup Helper untuk Tombol Copy
    function setupCopyButton(btnId, successMsg) {
        const btn = document.getElementById(btnId);
        let timeout;
        btn.onclick = function() {
            const text = this.getAttribute('data-copy');
            navigator.clipboard.writeText(text).then(() => {
                clearTimeout(timeout);
                const origText = this.getAttribute('data-orig-text');
                this.innerText = successMsg;
                this.style.color = "#3fb950";
                
                timeout = setTimeout(() => {
                    this.innerText = origText;
                    this.style.color = ""; // Mengembalikan ke warna default CSS
                }, 1000);
            });
        };
    }

    setupCopyButton('masterCopyIp', "✔ COPIED IP!");
    setupCopyButton('masterCopyFull', "✔ COPIED ALL!");

    // 4. Penangkap Pesan dari Iframe
    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'SHOW_ASSET_DETAIL') {
            const p = e.data.payload;
            
            // Memecah payload untuk 2 tombol berbeda (Data diambil dari WA Obj)
            const ipOnly = p.waObj.ip;
            const hostname = p.waObj.hostname;
            const fullHostStr = `[${hostname}]`;
            
            // Set Data untuk Tombol IP
            const btnIp = document.getElementById('masterCopyIp');
            btnIp.innerText = ipOnly;
            btnIp.setAttribute('data-copy', ipOnly);
            btnIp.setAttribute('data-orig-text', ipOnly);

            // Set Data untuk Tombol Full [Hostname]
            const btnFull = document.getElementById('masterCopyFull');
            btnFull.innerText = fullHostStr;
            btnFull.setAttribute('data-copy', `${ipOnly} ${fullHostStr}`);
            btnFull.setAttribute('data-orig-text', fullHostStr);

            // Render Tabel
            document.getElementById('masterDetTable').innerHTML = p.tableHTML;

            // Render Chart
            renderChart(p.chartData || null);

            // Render WA Button
            const btnWA = document.getElementById('masterBtnWa');
            if (p.isCrit) {
                btnWA.style.display = 'flex';
                btnWA.onclick = function() {
                    if (typeof copyWA === 'function') {
                        window.globalFilterData = window.parent.globalFilterData || window.globalFilterData;
                        copyWA(this, p.waObj);
                    } else {
                        alert("Fungsi copyWA tidak ditemukan di index.html!");
                    }
                };
            } else {
                btnWA.style.display = 'none';
            }
            
            // Tampilkan Modal
            modal.style.display = 'flex';
        }
    });

    // Klik background untuk tutup
    window.addEventListener('click', function(e) {
        if (e.target === modal) closeMasterDetailModal();
    });

});