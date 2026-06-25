/**
 * page/export_report.js
 * Fitur: Mengonversi SEMUA data tiket Open menjadi format .xlsx ASLI dengan warna dan border
 * Update: Perbaikan Bug Overwrite JSON. Menggunakan metode Array.find() untuk keakuratan mutlak.
 * Tambahan: Fitur Export On-Demand untuk High Disk Usage (>70%) yang kebal terhadap Null Grafana.
 */

// ==========================================
// FUNGSI PENYERAGAM TANGGAL (DATE STANDARDIZER)
// ==========================================
function standardizeDate(dateStr) {
    if (!dateStr || dateStr.trim() === "") return "";
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; 

    let month = d.getMonth() + 1;
    let day = d.getDate();
    let year = d.getFullYear().toString().slice(-2);
    let hours = d.getHours(); 
    let minutes = String(d.getMinutes()).padStart(2, '0');

    return `${month}/${day}/${year} ${hours}:${minutes}`;
}

// ==========================================
// FUNGSI FILTER: ANULIR TIKET SAMPAH & EXCLUDED
// ==========================================
function isIgnoredTicket(t) {
    let ip = (t.ip || "").trim().split(':')[0];
    let detail = (t.detail || t.DETAIL_ISSUE || "").toLowerCase();

    if (!ip || ip === "" || ip === "-") return true;
    if (detail.includes("apm plugin") || detail.includes("bcp and mssql")) return true;
    if (ip === "10.30.0.3" && detail.includes("memory")) return true;

    if (typeof globalFilterData !== 'undefined' && globalFilterData) {
        if (globalFilterData.excluded && globalFilterData.excluded.includes(ip)) {
            return true;
        }
    }
    return false; 
}

async function exportToExcelReport() {
    if (typeof ExcelJS === 'undefined') {
        alert("Library ExcelJS belum dimuat! Pastikan Anda sudah menambahkan script exceljs.min.js di index HTML.");
        return;
    }

    let grafanaData = [];
    let opmData = [];
    
    // 2. AMBIL & URUTKAN DATA GRAFANA
    if (window.rawGrafanaData && window.rawGrafanaData.length > 0) {
        grafanaData = window.rawGrafanaData.filter(t => 
            !t.status.toLowerCase().includes("close") && 
            !t.status.toLowerCase().includes("resolved") &&
            !isIgnoredTicket(t)
        );
        
        grafanaData.sort((a, b) => {
            let caseA = (a.caseTypeDisplay || a.caseType || a.type || "").toLowerCase();
            let caseB = (b.caseTypeDisplay || b.caseType || b.type || "").toLowerCase();
            if (caseA === caseB) {
                let detailA = (a.detail || a.DETAIL_ISSUE || "").toLowerCase();
                let detailB = (b.detail || b.DETAIL_ISSUE || "").toLowerCase();
                return detailA.localeCompare(detailB);
            }
            return caseA.localeCompare(caseB);
        });
    }
    
    // 3. AMBIL & URUTKAN DATA OPMANAGER
    if (window.rawOpmData && window.rawOpmData.length > 0) {
        opmData = window.rawOpmData.filter(t => 
            t.status.toLowerCase() === "open" && 
            !isIgnoredTicket(t)
        );
        
        opmData.sort((a, b) => {
            let caseA = (a.caseTypeDisplay || a.caseType || "").toLowerCase();
            let caseB = (b.caseTypeDisplay || b.caseType || "").toLowerCase();
            if (caseA === caseB) {
                let detailA = (a.detail || a.DETAIL_ISSUE || "").toLowerCase();
                let detailB = (b.detail || b.DETAIL_ISSUE || "").toLowerCase();
                return detailA.localeCompare(detailB);
            }
            return caseA.localeCompare(caseB);
        });
    }

    if (grafanaData.length === 0 && opmData.length === 0) {
        return alert("Tidak ada tiket OPEN di Grafana maupun OpManager untuk di-export!");
    }

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Open Alerts Report');

        worksheet.columns = [
            { header: 'Issue Date', key: 'issueDate', width: 22 },
            { header: 'Case', key: 'caseType', width: 28 },
            { header: 'Detail Issue', key: 'detail', width: 75 },
            { header: 'IP Address', key: 'ip', width: 16 },
            { header: 'Hostname', key: 'host', width: 22 },
            { header: 'Assignee', key: 'assign', width: 15 },
            { header: 'Status', key: 'status', width: 12 }
        ];

        worksheet.getRow(1).eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2EA043' } }; 
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, name: 'Calibri', size: 11 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });

        const addSectionHeader = (title) => {
            const row = worksheet.addRow({ issueDate: title });
            const rNum = row.number; 
            
            worksheet.mergeCells(`A${rNum}:G${rNum}`);
            const cell = worksheet.getCell(`A${rNum}`);
            
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF30363D' } }; 
            cell.font = { color: { argb: 'FFF1E05A' }, bold: true, name: 'Consolas', size: 11 }; 
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        };

        const addDataRow = (t, defaultAssign) => {
            let caseType = t.caseTypeDisplay || t.caseType || t.type || "Gangguan";
            let rawDetail = t.detail || t.DETAIL_ISSUE || "";
            
            let cleanDetail = rawDetail.replace(/<[^>]*>?/gm, '').trim(); 
            cleanDetail = cleanDetail.replace(/(\r\n|\n|\r)/gm, '\n'); 
            
            let ip = t.ip ? t.ip.split(':')[0] : "";
            let host = t.hostname || "";
            let isOpm = caseType.toLowerCase().includes('opmanager');
            let assign = t.assign || (isOpm ? "Infra" : defaultAssign);
            
            let finalIssueDate = t.issueDate || t.time || "";

            // STANDARISASI FORMAT TANGGAL
            let standardizedIssueDate = standardizeDate(finalIssueDate);
            
            const row = worksheet.addRow({
                issueDate: standardizedIssueDate,
                caseType: caseType,
                detail: cleanDetail,
                ip: ip,
                host: host,
                assign: assign,
                status: t.status || "Open"
            });

            row.eachCell((cell, colNumber) => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                cell.font = { name: 'Calibri', size: 10 };
                cell.alignment = { vertical: 'top', wrapText: colNumber === 3 }; 
                
                if (colNumber === 7) { 
                    cell.font = { color: { argb: 'FFDA3633' }, bold: true, name: 'Calibri', size: 10 };
                    cell.alignment = { vertical: 'top', horizontal: 'center' };
                }
            });
        };

        if (grafanaData.length > 0) {
            addSectionHeader('--- GRAFANA ALERTS ---');
            grafanaData.forEach(t => addDataRow(t, 'Network'));
        }

        if (opmData.length > 0) {
            addSectionHeader('--- OPMANAGER ALERTS ---');
            opmData.forEach(t => addDataRow(t, 'Infra'));
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const d = new Date();
        const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const dateStr = `${d.getDate()} ${namaBulan[d.getMonth()]} ${d.getFullYear()}`;
        
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Alert Open (${dateStr}).xlsx`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Error ExcelJS:", error);
        alert("Gagal men-generate file Excel. Proses terhenti.");
    }
}


// ==============================================================================
// ==================== TAMBAHAN: EXPORT OVERALL DISK USAGE =====================
// ==============================================================================

// 1. Fungsi aman untuk memuat data_disk.js ke dalam memori browser
function reloadDataDiskJs() {
    return new Promise((resolve, reject) => {
        const oldScript = document.getElementById('dynamicDataDiskJs');
        if (oldScript) oldScript.remove();

        const newScript = document.createElement('script');
        newScript.id = 'dynamicDataDiskJs';
        
        // PENTING: Arahkan ke file data_disk.js (output dari .bat terbaru)
        // Kita paksa bypass cache dengan parameter timestamp
        newScript.src = `Data_JSON/data_disk.js?t=${Date.now()}`; 
        
        let isResolved = false;
        
        newScript.onload = () => { 
            if(!isResolved) { isResolved = true; resolve(); } 
        };
        
        newScript.onerror = () => { 
            console.warn("Gagal memuat data_disk.js secara dinamis.");
            if(!isResolved) { isResolved = true; resolve(); } 
        }; 
        
        document.head.appendChild(newScript);
        
        // Failsafe: Paksa lanjut setelah 2 detik
        setTimeout(() => { 
            if(!isResolved) { isResolved = true; resolve(); } 
        }, 2000);
    });
}

// 2. Fungsi trigger saat tombol Export Disk diklik di UI
async function handleExportDiskUsage(btn) {
    const origText = btn.innerText;
    const origBg = btn.style.background;
    
    try {
        btn.innerText = "⏳ Membaca Data Disk...";
        btn.style.background = "#e3b341";
        btn.style.cursor = "wait";
        btn.disabled = true;

        await reloadDataDiskJs(); // Panggil fungsi load data

        btn.innerText = "⏳ Membuat File Excel...";
        await exportToExcelDiskUsage(); // Susun ke Excel

        btn.innerText = "✅ EXPORT BERHASIL!";
        btn.style.background = "#3fb950";

    } catch (error) {
        console.error("Error Export Disk:", error);
        alert("Gagal Export: " + error.message);
        btn.innerText = "❌ GAGAL MEMPROSES";
        btn.style.background = "#da3633";
    } finally {
        setTimeout(() => {
            btn.innerText = origText;
            btn.style.background = origBg;
            btn.style.cursor = "pointer";
            btn.disabled = false;
            if (typeof closeExportModal === 'function') closeExportModal();
        }, 3000);
    }
}

// 3. Fungsi inti pengolahan data JSON (Grafana -> ExcelJS)
async function exportToExcelDiskUsage() {
    if (typeof ExcelJS === 'undefined') {
        throw new Error("Library ExcelJS belum dimuat di index HTML!");
    }

    if (typeof dataDiskOverall === 'undefined') {
        throw new Error("Data Disk tidak ditemukan. Pastikan file Data_JSON/data_disk.js ada isinya.");
    }
    
    if (!dataDiskOverall.results || !dataDiskOverall.results.A || !dataDiskOverall.results.A.frames) {
        throw new Error("Struktur JSON rusak atau kosong dari Grafana.");
    }

    const diskFrames = dataDiskOverall.results.A.frames || [];
    let highDiskNodes = [];

    // Filter node yang >= 70%
    diskFrames.forEach(frame => {
        try {
            const schemaFields = frame.schema?.fields || [];
            if (schemaFields.length < 2) return; // Skip jika struktur aneh

            const field = schemaFields[1];
            const labels = field.labels || {};
            const ip = labels.instance ? labels.instance.split(':')[0] : "Unknown IP";
            const mountpoint = labels.mountpoint || "Unknown Drive";

            // Filter ganda: Abaikan mountpoint sistem (Berjaga-jaga jika lolos dari PromQL)
            if (mountpoint.includes("/boot") || mountpoint.includes("/dev") || mountpoint.includes("/run") || mountpoint.includes("/sys")) return;

            const timeArray = frame.data?.values?.[0] || [];
            const valueArray = frame.data?.values?.[1] || [];
            
            let lastValue = null;
            let lastTime = null;

            // CARI MUNDUR: Ini perbaikan krusial! Mengabaikan nilai Null di ujung grafik
            for (let i = valueArray.length - 1; i >= 0; i--) {
                if (valueArray[i] !== null && valueArray[i] !== undefined && !isNaN(valueArray[i])) {
                    lastValue = valueArray[i];
                    lastTime = timeArray[i];
                    break; // Berhenti mencari jika sudah dapat angka valid
                }
            }

            // Masukkan ke array JIKA nilainya >= 70%
            if (lastValue !== null && lastValue >= 70) {
                highDiskNodes.push({
                    ip: ip,
                    mountpoint: mountpoint,
                    usage: lastValue.toFixed(2), 
                    lastUpdate: standardizeDate(new Date(lastTime).toISOString())
                });
            }
        } catch (e) {
            // Lanjut jika ada frame yang gagal di-parse
        }
    });

    if (highDiskNodes.length === 0) {
        throw new Error("Luar biasa! Tidak ada server/partisi yang Disk Usage-nya di atas 70% saat ini.");
    }

    // Urutkan persentase dari yang paling kepenuhan (tertinggi ke terendah)
    highDiskNodes.sort((a, b) => parseFloat(b.usage) - parseFloat(a.usage));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('High Disk Usage Report');

    // Kolom Excel (Sekarang ada kolom Mountpoint)
    worksheet.columns = [
        { header: 'IP Address', key: 'ip', width: 20 },
        { header: 'Partisi / Mountpoint', key: 'mountpoint', width: 25 },
        { header: 'Disk Usage (%)', key: 'usage', width: 18 },
        { header: 'Last Checked', key: 'lastUpdate', width: 22 }
    ];

    // Styling Header
    worksheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD29922' } }; 
        cell.font = { color: { argb: 'FF000000' }, bold: true, name: 'Calibri', size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    // Masukkan Data
    highDiskNodes.forEach(node => {
        const rowData = { ...node, usage: node.usage + " %" };
        const row = worksheet.addRow(rowData);
        
        row.eachCell((cell, colNumber) => {
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            cell.font = { name: 'Calibri', size: 10 };
            cell.alignment = { horizontal: colNumber === 1 || colNumber === 2 ? 'left' : 'center' };
            
            // Highlight merah menyala jika mencapai 85% ke atas (di kolom 3)
            if (colNumber === 3 && parseFloat(node.usage) >= 85) {
                cell.font = { color: { argb: 'FFDA3633' }, bold: true };
            }
        });
    });

    // Proses Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const d = new Date();
    const dateStr = `${d.getDate()} ${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][d.getMonth()]} ${d.getFullYear()}`;
    
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `High_Disk_Usage_Report (${dateStr}).xlsx`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}