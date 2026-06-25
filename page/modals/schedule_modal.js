/**
 * schedule_modal.js
 * Fitur: Auto-Highlight Partner, Paste Excel Bulk, Klik Kanan Edit Per-Cell.
 * Update: FIXED Swap Logic (S3 penambal HK), S1 & S2 Max 2 Absolut, Daily Summary Baris Bawah.
 */

window.emptyShifts = Array(31).fill("x");
window.defaultShiftData = [
    { name: "Egi Rizkia Munajat", shifts: [...window.emptyShifts] },
    { name: "Admin Haidar",       shifts: [...window.emptyShifts] },
    { name: "Muhamad Alfarizi",   shifts: [...window.emptyShifts] },
    { name: "Yama Amarulloh",     shifts: [...window.emptyShifts] },
    { name: "Pramudita",          shifts: [...window.emptyShifts] },
    { name: "Rizal Solihin",      shifts: [...window.emptyShifts] },
    { name: "M John Abiyyu",     shifts: [...window.emptyShifts] },
    { name: "Ririn",              shifts: [...window.emptyShifts] }
];
window.defaultDayNames = ["Su","Mo","Tu","We","Th","Fr","Sa","Su","Mo","Tu","We","Th","Fr","Sa","Su","Mo","Tu","We","Th","Fr","Sa","Su","Mo","Tu","We","Th","Fr","Sa","Su","Mo","Tu"];

window.masterScheduleData = {}; 
window.masterHolidays = {};
window.scheduleSelectedName = null; 

window.tempPreviewData = {};
window.tempPreviewHolidays = {};
window.tempPreviewMonthKey = "";
window.tempPreviewDateObj = null;

// --- HELPER FORMAT WAKTU ---
function getMonthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function getMonthName(d) {
    const m = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    return `${m[d.getMonth()]} ${d.getFullYear()}`;
}

// --- FUNGSI LOAD & MIGRASI DATA ---
function loadScheduleData(currentKey, nextKey) {
    const saved = localStorage.getItem('noc_schedule_master_v2');
    if (saved) { window.masterScheduleData = JSON.parse(saved); } 
    else { const oldData = localStorage.getItem('noc_schedule_data'); if (oldData) window.masterScheduleData[currentKey] = JSON.parse(oldData); }
    
    const savedHols = localStorage.getItem('noc_holidays_master_v2');
    if (savedHols) { window.masterHolidays = JSON.parse(savedHols); } 
    else { const oldHols = localStorage.getItem('noc_holidays_data'); if (oldHols) window.masterHolidays[currentKey] = oldHols.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)); }

    let isChanged = false;
    Object.keys(window.masterScheduleData).forEach(k => {
        if (k !== currentKey && k !== nextKey) {
            delete window.masterScheduleData[k]; delete window.masterHolidays[k]; isChanged = true;
        }
    });
    if (isChanged) {
        localStorage.setItem('noc_schedule_master_v2', JSON.stringify(window.masterScheduleData));
        localStorage.setItem('noc_holidays_master_v2', JSON.stringify(window.masterHolidays));
    }
}

window.saveHolidays = function(monthKey, inputId, btnId) {
    const val = document.getElementById(inputId).value;
    window.masterHolidays[monthKey] = val.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    localStorage.setItem('noc_holidays_master_v2', JSON.stringify(window.masterHolidays));
    
    const btn = document.getElementById(btnId);
    btn.innerText = "✔ SAVED"; btn.style.background = "#238636";
    setTimeout(() => openSchedule(), 500);
}

function getShiftColor(shift) {
    let s = (shift || "").toUpperCase();
    if (s.includes("S1")) return { bg: "rgba(88, 166, 255, 0.15)", col: "#58a6ff" }; 
    if (s.includes("S2")) return { bg: "rgba(63, 185, 80, 0.15)",  col: "#3fb950" }; 
    if (s.includes("S3")) return { bg: "rgba(255, 153, 0, 0.15)",  col: "#ff9900" }; 
    if (s === "C" || s === "CUTI") return { bg: "rgba(241, 224, 90, 0.2)", col: "#f1e05a" }; 
    if (s === "OFF") return { bg: "rgba(218, 54, 51, 0.15)", col: "#da3633" }; 
    return { bg: "transparent", col: "#484f58" }; 
}

window.toggleScheduleHighlight = function(name) {
    window.scheduleSelectedName = (window.scheduleSelectedName === name) ? null : name;
    openSchedule(); 
};

window.editSingleShift = function(personIndex, dayIndex, monthKey) {
    if (!window.masterScheduleData[monthKey]) return;
    const oldShift = window.masterScheduleData[monthKey].shiftData[personIndex].shifts[dayIndex];
    const newShift = prompt(`Ubah Shift untuk ${window.masterScheduleData[monthKey].shiftData[personIndex].name} (Tgl ${dayIndex + 1})\nKetik S1a / S1 / S2 / S3 / C / OFF:`, oldShift);
    
    if (newShift !== null) {
        let val = newShift.trim().toUpperCase();
        if(val === "S1A") val = "S1a"; 
        
        window.masterScheduleData[monthKey].shiftData[personIndex].shifts[dayIndex] = val;
        localStorage.setItem('noc_schedule_master_v2', JSON.stringify(window.masterScheduleData));
        openSchedule(); 
    }
};

function determineActiveShifts(hour, minute, currentDayIndex) {
    let active = { currentStr: [], nextStr: [], activeDayIdx: currentDayIndex, nextDayIdx: currentDayIndex };
    const timeFloat = hour + (minute / 60);
    
    if (timeFloat >= 7.5 && timeFloat < 14.5) { active.currentStr = ["S1", "S1a"]; active.nextStr = ["S2"]; } 
    else if (timeFloat >= 14.5 && timeFloat < 22.5) { active.currentStr = ["S2"]; active.nextStr = ["S3"]; } 
    else if (timeFloat >= 22.5 || timeFloat < 0) { active.currentStr = ["S3"]; active.nextStr = ["S1", "S1a"]; active.nextDayIdx = currentDayIndex + 1; } 
    else if (timeFloat >= 0 && timeFloat < 7.5) { active.currentStr = ["S3"]; active.activeDayIdx = currentDayIndex - 1; active.nextStr = ["S1", "S1a"]; active.nextDayIdx = currentDayIndex; }
    return active;
}

function buildTableUI(monthKey, targetDateObj, isCurrentMonth, dataSource = window.masterScheduleData, holidaySource = window.masterHolidays) {
    if (!dataSource[monthKey]) {
        dataSource[monthKey] = { shiftData: JSON.parse(JSON.stringify(window.defaultShiftData)), dayNames: [...window.defaultDayNames] };
    }
    
    const mData = dataSource[monthKey]; const hols = holidaySource[monthKey] || [];
    const maxDays = mData.dayNames.length > 0 ? mData.dayNames.length : 31;
    const todayDate = isCurrentMonth ? new Date().getDate() : -1; 
    const currentHour = new Date().getHours(); const currentMinute = new Date().getMinutes();
    const shiftLogic = isCurrentMonth ? determineActiveShifts(currentHour, currentMinute, todayDate - 1) : { currentStr: [], nextStr: [], activeDayIdx: -1, nextDayIdx: -1 };
    let targetPersonData = window.scheduleSelectedName ? mData.shiftData.find(p => p.name === window.scheduleSelectedName) : null;

    let hkn = 0;
    for (let i = 1; i <= maxDays; i++) {
        const dName = mData.dayNames[i-1] || "-";
        const isWeekend = dName.toUpperCase() === "SA" || dName.toUpperCase() === "SU";
        const isRedDay = isWeekend || hols.includes(i);
        if (!isRedDay) hkn++;
    }

    let thDates = ""; let thDays = "";
    for (let i = 1; i <= maxDays; i++) {
        const isToday = (i === todayDate); const dName = mData.dayNames[i-1] || "-";
        const isWeekend = dName.toUpperCase() === "SA" || dName.toUpperCase() === "SU";
        const isRedDay = isWeekend || hols.includes(i);
        let bgHead = isToday ? "#238636" : "#161b22"; let colHead = isToday ? "#ffffff" : (isRedDay ? "#ff7b72" : "#8b949e"); 
        
        thDates += `<th style="padding: 8px 6px; border: 1px solid #30363d; background: ${bgHead}; color: ${colHead}; width: 30px; text-align: center;">${i}</th>`;
        thDays += `<th style="padding: 4px; border: 1px solid #30363d; background: ${bgHead}; color: ${colHead}; font-size: 9px; text-align: center;">${dName}</th>`;
    }

    thDates += `<th colspan="6" style="padding: 8px 6px; border: 1px solid #30363d; background: #21262d; color: #58a6ff; width: 175px; text-align: center; border-left: 2px solid #58a6ff;">SUMMARY (HKN: ${hkn})</th>`;
    thDays += `
        <th style="padding: 4px; border: 1px solid #30363d; background: #161b22; color: #58a6ff; font-size: 9px; text-align: center; border-left: 2px solid #58a6ff;">S1</th>
        <th style="padding: 4px; border: 1px solid #30363d; background: #161b22; color: #3fb950; font-size: 9px; text-align: center;">S2</th>
        <th style="padding: 4px; border: 1px solid #30363d; background: #161b22; color: #ff9900; font-size: 9px; text-align: center;">S3</th>
        <th style="padding: 4px; border: 1px solid #30363d; background: #161b22; color: #da3633; font-size: 9px; text-align: center;">OFF</th>
        <th style="padding: 4px; border: 1px solid #30363d; background: #161b22; color: #ffffff; font-size: 9px; text-align: center;" title="Hari Kerja Didapat">HK</th>
        <th style="padding: 4px; border: 1px solid #30363d; background: #161b22; color: #d2a8ff; font-size: 9px; text-align: center;" title="Persentase Beban Kerja">%</th>
    `;

    let trBody = "";
    mData.shiftData.forEach((person, pIndex) => {
        let tdShifts = ""; let isSelectedPerson = (window.scheduleSelectedName === person.name);
        let isCurrentDuty = false; let isNextDuty = false; let isTaspenDuty = false;
        const isEgi = person.name.toLowerCase().includes("Egi");
        
        let cS1 = 0; let cS2 = 0; let cS3 = 0; let cOff = 0; let cWork = 0;

        for (let i = 0; i < maxDays; i++) {
            let shift = person.shifts[i] || ""; 
            if(shift.toUpperCase() === "S1A") shift = "S1a"; 
            const shiftUp = shift.toUpperCase();
            const isToday = (i + 1 === todayDate); const dName = mData.dayNames[i] || "-";
            const isSelasaOrJumat = dName.toUpperCase() === "TU" || dName.toUpperCase() === "FR";
            
            let isWorkingShift = shiftUp.includes("S1") || shiftUp.includes("S2") || shiftUp.includes("S3");
            let isCuti = shiftUp === "C" || shiftUp === "CUTI";

            if (shiftUp.includes("S1")) cS1++;
            if (shiftUp.includes("S2")) cS2++;
            if (shiftUp.includes("S3")) cS3++;
            if (shiftUp === "OFF") cOff++;
            if (isWorkingShift || isCuti) cWork++;

            const style = getShiftColor(shift); 
            let highlightBorder = isToday ? "border-left: 2px solid #3fb950; border-right: 2px solid #3fb950;" : "border: 1px solid #30363d;";
            let opacityStyle = "1"; 
            let boxGlow = "";

            if (isCurrentMonth && i === shiftLogic.activeDayIdx && shiftLogic.currentStr.some(s => shiftUp.includes(s))) {
                isCurrentDuty = true; if (isEgi && shiftUp === "S1A" && isSelasaOrJumat) isTaspenDuty = true;
                highlightBorder = `border: 2px solid #000000; z-index: 10;`; boxGlow = `box-shadow: inset 0 0 10px rgba(0,0,0,0.5), 0 0 5px rgba(0,0,0,0.8);`;
            } else if (isCurrentMonth && i === shiftLogic.nextDayIdx && shiftLogic.nextStr.some(s => shiftUp.includes(s))) {
                if (!(isEgi && shiftUp === "S1A" && isSelasaOrJumat)) {
                    isNextDuty = true; highlightBorder = `border: 1px solid #ffffff; z-index: 5;`; boxGlow = `box-shadow: inset 0 0 5px rgba(255,255,255,0.3);`;
                }
            }

            if (targetPersonData) {
                if (isSelectedPerson) {
                    opacityStyle = "1"; if (!isToday && isWorkingShift && !isCurrentDuty && !isNextDuty) highlightBorder = `border: 1px solid ${style.col}; box-shadow: inset 0 0 3px ${style.col};`;
                } else {
                    if (isWorkingShift && shift === (targetPersonData.shifts[i] || "")) {
                        opacityStyle = "1"; style.bg = style.col + "33"; 
                        if (!isCurrentDuty && !isNextDuty) highlightBorder = `border: 1px solid ${style.col}; box-shadow: inset 0 0 8px ${style.col};`;
                    } else opacityStyle = "0.2";
                }
            } else { if(isToday && shift !== "" && !isCurrentDuty && !isNextDuty) style.bg = "rgba(35, 134, 54, 0.2)"; }
            
            let onContextEvent = (dataSource === window.tempPreviewData) ? "" : `oncontextmenu="event.preventDefault(); window.editSingleShift(${pIndex}, ${i}, '${monthKey}');"`;
            let cursorStyle = (dataSource === window.tempPreviewData) ? "cursor: default;" : "cursor: context-menu;";

            tdShifts += `<td ${onContextEvent} title="${(dataSource === window.tempPreviewData) ? 'Preview Mode' : 'Klik Kanan untuk Edit'}" style="padding: 6px 4px; ${highlightBorder} background: ${style.bg}; color: ${style.col}; opacity: ${opacityStyle}; transition: 0.3s; text-align: center; font-weight: bold; font-size: 11px; ${cursorStyle} ${boxGlow} position: relative;">${shift}</td>`;
        }
        
        let pct = hkn > 0 ? Math.round((cWork / hkn) * 100) : 0;
        let pctColor = pct > 100 ? "#ff7b72" : (pct === 100 ? "#3fb950" : "#d2a8ff");
        let pctGlow = pct > 100 ? "text-shadow: 0 0 5px rgba(255,123,114,0.5);" : "";

        tdShifts += `
            <td style="padding: 6px 4px; border: 1px solid #30363d; background: rgba(88, 166, 255, 0.05); color: #58a6ff; font-weight: bold; text-align: center; font-size: 11px; border-left: 2px solid #58a6ff;">${cS1}</td>
            <td style="padding: 6px 4px; border: 1px solid #30363d; background: rgba(63, 185, 80, 0.05); color: #3fb950; font-weight: bold; text-align: center; font-size: 11px;">${cS2}</td>
            <td style="padding: 6px 4px; border: 1px solid #30363d; background: rgba(255, 153, 0, 0.05); color: #ff9900; font-weight: bold; text-align: center; font-size: 11px;">${cS3}</td>
            <td style="padding: 6px 4px; border: 1px solid #30363d; background: rgba(218, 54, 51, 0.05); color: #da3633; font-weight: bold; text-align: center; font-size: 11px;">${cOff}</td>
            <td style="padding: 6px 4px; border: 1px solid #30363d; background: #21262d; color: #ffffff; font-weight: bold; text-align: center; font-size: 12px; box-shadow: inset 0 0 5px rgba(0,0,0,0.5);">${cWork}</td>
            <td style="padding: 6px 4px; border: 1px solid #30363d; background: #161b22; color: ${pctColor}; font-weight: bold; text-align: center; font-size: 11px; ${pctGlow}" title="${cWork} dari ${hkn} Hari Normal">${pct}%</td>
        `;

        let nameColor = "#c9d1d9"; let nameBg = "#0d1117"; let nameGlow = ""; let nameBadge = "";
        if (isSelectedPerson) { nameColor = "#58a6ff"; nameBg = "#161b22"; nameGlow = "text-shadow: 0 0 5px rgba(88,166,255,0.5);"; } 
        else if (isCurrentDuty) {
            if (isTaspenDuty) { nameColor = "#ffffff"; nameBg = "rgba(137, 87, 229, 0.15)"; nameGlow = "text-shadow: 0 0 5px rgba(255,255,255,0.3);"; nameBadge = `<span style="background: rgba(137, 87, 229, 0.2); border: 1px solid #8957e5; color: #8957e5; font-size: 8px; padding: 2px 5px; border-radius: 3px; font-weight: bold; white-space: nowrap;">ON DUTY TASPEN</span>`; } 
            else { nameColor = "#ffffff"; nameBg = "rgba(31, 111, 235, 0.15)"; nameGlow = "text-shadow: 0 0 5px rgba(255,255,255,0.3);"; nameBadge = `<span style="background: rgba(88, 166, 255, 0.2); border: 1px solid #58a6ff; color: #58a6ff; font-size: 8px; padding: 2px 5px; border-radius: 3px; font-weight: bold; white-space: nowrap;">ON DUTY</span>`; }
        } else if (isNextDuty) {
            nameColor = "#d29922"; nameBg = "rgba(210, 153, 34, 0.05)"; nameBadge = `<span style="border: 1px solid rgba(210, 153, 34, 0.5); color: #d29922; font-size: 8px; padding: 2px 5px; border-radius: 3px; white-space: nowrap;">NEXT SHIFT</span>`;
        }

        trBody += `
            <tr style="border-bottom: 1px solid #30363d; transition: 0.1s;" onmouseover="this.style.background='#21262d'; this.style.borderBottom='1px solid #58a6ff'" onmouseout="this.style.background='transparent'; this.style.borderBottom='1px solid #30363d'">
                <td onclick="window.toggleScheduleHighlight('${person.name}')" title="Klik Kiri: Sorot Partner" style="padding: 8px 12px; border: 1px solid #30363d; background: ${nameBg}; position: sticky; left: 0; z-index: 2; cursor: pointer; box-shadow: 2px 0 5px rgba(0,0,0,0.5); transition: 0.2s; width: 170px; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 8px;">
                        <span style="font-weight: bold; color: ${nameColor}; ${nameGlow} white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${person.name}</span>
                        ${nameBadge ? `<div>${nameBadge}</div>` : ''}
                        ${isSelectedPerson && !nameBadge ? '<span style="font-size: 10px; flex-shrink: 0;">🔍</span>' : ''}
                    </div>
                </td>
                ${tdShifts}
            </tr>`;
    });

    // --- MENAMBAHKAN DAILY SUMMARY (DI BAWAH TABEL) ---
    let dailySummaryRow = `<tr><td style="padding: 8px 12px; border: 1px solid #30363d; background: #161b22; position: sticky; left: 0; z-index: 2; font-weight: bold; color: #d2a8ff; font-size: 10px; box-shadow: 2px 0 5px rgba(0,0,0,0.5);">DAILY SUMMARY</td>`;
    
    for (let i = 0; i < maxDays; i++) {
        let dS1 = 0, dS1a = 0, dS2 = 0, dS3 = 0, dOff = 0;
        mData.shiftData.forEach(p => {
            let s = (p.shifts[i] || "").toUpperCase();
            if(s === "S1") dS1++;
            else if(s === "S1A") dS1a++;
            else if(s === "S2") dS2++;
            else if(s === "S3") dS3++;
            else if(s === "OFF") dOff++;
        });

        // Warna Merah jika S1/S2 lebih dari 2 orang (Warning Absolut)
        let cS1 = dS1 > 2 ? "#ff7b72" : "#58a6ff";
        let cS1a = dS1a > 1 ? "#ff7b72" : "#58a6ff";
        let cS2 = dS2 > 2 ? "#ff7b72" : "#3fb950";
        let cS3 = dS3 > 4 ? "#ff7b72" : "#ff9900"; 

        dailySummaryRow += `
        <td style="padding: 4px; border: 1px solid #30363d; background: #010409; font-size: 9px; line-height: 1.4; vertical-align: top;">
            <div style="display:flex; justify-content:space-between; color:${cS1}"><span>S1:</span><span>${dS1}</span></div>
            <div style="display:flex; justify-content:space-between; color:${cS1a}"><span>S1a:</span><span>${dS1a}</span></div>
            <div style="display:flex; justify-content:space-between; color:${cS2}"><span>S2:</span><span>${dS2}</span></div>
            <div style="display:flex; justify-content:space-between; color:${cS3}"><span>S3:</span><span>${dS3}</span></div>
            <div style="display:flex; justify-content:space-between; color:#da3633; margin-top:2px; border-top:1px solid #30363d; padding-top:2px;"><span>OFF:</span><span>${dOff}</span></div>
        </td>`;
    }
    dailySummaryRow += `<td colspan="6" style="border: 1px solid #30363d; background: #010409;"></td></tr>`;
    trBody += dailySummaryRow;

    const isPreview = (dataSource === window.tempPreviewData);
    let toolsHTML = "";
    if (!isPreview) {
        toolsHTML = `
            <div style="display:flex; align-items:center; gap: 6px;">
                <span style="color:#ff7b72; font-size: 11px; font-weight:bold;">Tgl Merah (Cth: 1, 15):</span>
                <input type="text" id="hol_${monthKey}" value="${hols.join(', ')}" placeholder="Koma ( , )" style="background:#010409; border:1px solid #30363d; color:#ff7b72; font-size:11px; padding:4px 6px; width:100px; border-radius:3px; outline:none; font-family:'Consolas',monospace;">
                <button id="btnHol_${monthKey}" onclick="window.saveHolidays('${monthKey}', 'hol_${monthKey}', 'btnHol_${monthKey}')" style="background:#21262d; border:1px solid #30363d; color:#c9d1d9; cursor:pointer; padding:4px 10px; border-radius:3px; font-size:11px; font-weight:bold; transition:0.2s;" onmouseover="this.style.background='#30363d'" onmouseout="this.style.background='#21262d'">SET</button>
            </div>`;
    }

    return `
    <div style="margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #d2a8ff; font-size: 14px; font-weight: bold;">JADWAL SHIFT - <span style="color: #ffffff;">${getMonthName(targetDateObj)}</span></span>
                ${!isCurrentMonth ? '<span style="background: rgba(210,153,34,0.15); color: #d29922; font-size: 10px; border: 1px solid #d29922; padding: 2px 6px; border-radius: 4px; font-weight: bold;">DRAFT BULAN DEPAN</span>' : ''}
                ${!isPreview ? `<button onclick="downloadWallpaper('${monthKey}', '${getMonthName(targetDateObj)}')" style="background: transparent; border: 1px dashed #58a6ff; color: #58a6ff; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: bold; margin-left: 10px; transition: 0.2s;" onmouseover="this.style.background='rgba(88,166,255,0.2)'" onmouseout="this.style.background='transparent'">📱 DOWNLOAD WALLPAPER</button>` : ''}
                ${!isPreview ? (() => {
                    const hasImg = !!localStorage.getItem('helpdesk_schedule_img_' + monthKey);
                    if (hasImg) return `
                        <button onclick="window.viewHelpdeskSchedule('${monthKey}')" style="background:transparent;border:1px solid #3fb950;color:#3fb950;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:bold;transition:0.2s;" onmouseover="this.style.background='rgba(63,185,80,0.15)'" onmouseout="this.style.background='transparent'">🗓 Lihat Jadwal Helpdesk</button>
                        <button onclick="window.deleteHelpdeskSchedule('${monthKey}')" style="background:transparent;border:1px solid #da3633;color:#da3633;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:bold;transition:0.2s;" onmouseover="this.style.background='rgba(218,54,51,0.15)'" onmouseout="this.style.background='transparent'">🗑</button>
                    `;
                    return `<input type="file" id="hdInput_${monthKey}" accept="image/*" style="display:none;" onchange="window.loadHelpdeskSchedule(this,'${monthKey}')"><button onclick="document.getElementById('hdInput_${monthKey}').click()" style="background:transparent;border:1px dashed #484f58;color:#8b949e;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:bold;transition:0.2s;" onmouseover="this.style.borderColor='#58a6ff';this.style.color='#58a6ff'" onmouseout="this.style.borderColor='#484f58';this.style.color='#8b949e'">📋 Upload Jadwal Helpdesk</button>`;
                })() : ''}
            </div>
            ${toolsHTML}
        </div>
        <div class="schedule-table-container" style="overflow-y: hidden; overflow-x: auto; border-radius: 4px; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; font-family: 'Consolas', monospace;">
                <thead style="position: sticky; top: 0; z-index: 3; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                    <tr>
                        <th rowspan="2" style="padding: 10px; border: 1px solid #30363d; background: #161b22; color: #8b949e; width: 170px; position: sticky; left: 0; z-index: 4; box-shadow: 2px 0 5px rgba(0,0,0,0.5);">NAMA MEMBER</th>
                        ${thDates}
                    </tr>
                    <tr>${thDays}</tr>
                </thead>
                <tbody>${trBody}</tbody>
            </table>
        </div>
    </div>`;
}

// === FUNGSI GENERATE WALLPAPER ===
window.downloadWallpaper = function(monthKey, monthName) {
    if (!window.scheduleSelectedName) { alert("⚠️ SILAKAN KLIK NAMA ANDA (di kolom tabel kiri) terlebih dahulu!\nSistem butuh target nama untuk membuat jadwal personal Anda."); return; }
    const mData = window.masterScheduleData[monthKey]; const personData = mData.shiftData.find(p => p.name === window.scheduleSelectedName);
    const maxDays = mData.dayNames.length > 0 ? mData.dayNames.length : 31; const hols = window.masterHolidays[monthKey] || [];
    const IMG_WIDTH  = 1440; const IMG_HEIGHT = 2440; const BOX_WIDTH  = 125;  const BOX_HEIGHT = 125; 
    const CENTER_X = IMG_WIDTH / 2; const CENTER_Y = IMG_HEIGHT / 2;
    const canvas = document.createElement('canvas'); canvas.width = IMG_WIDTH; canvas.height = IMG_HEIGHT; const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, IMG_WIDTH, IMG_HEIGHT);
    const firstDay = (mData.dayNames[0] || "MO").toUpperCase().substring(0,3);
    let startIdx = 0;
    if (["MON", "MO ", "MO", "SEN"].includes(firstDay)) startIdx = 0; else if (["TUE", "TU ", "TU", "SEL"].includes(firstDay)) startIdx = 1;
    else if (["WED", "WE ", "WE", "RAB"].includes(firstDay)) startIdx = 2; else if (["THU", "TH ", "TH", "KAM"].includes(firstDay)) startIdx = 3;
    else if (["FRI", "FR ", "FR", "JUM"].includes(firstDay)) startIdx = 4; else if (["SAT", "SA ", "SA", "SAB"].includes(firstDay)) startIdx = 5;
    else if (["SUN", "SU ", "SU", "MIN", "MING"].includes(firstDay)) startIdx = 6;

    const totalCols = 7; const totalRows = Math.ceil((startIdx + maxDays) / 7);
    const gridTotalWidth = totalCols * BOX_WIDTH; const gridTotalHeight = totalRows * BOX_HEIGHT;
    const startX = (IMG_WIDTH - gridTotalWidth) / 2; const startY = (IMG_HEIGHT - gridTotalHeight) / 2 + 60; 

    ctx.textAlign = 'center'; ctx.fillStyle = '#58a6ff'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('JADWAL SHIFT NOC', CENTER_X, startY - 180);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 50px sans-serif'; ctx.fillText(window.scheduleSelectedName.toUpperCase(), CENTER_X, startY - 115);
    ctx.fillStyle = '#d2a8ff'; ctx.font = 'bold 26px sans-serif'; ctx.fillText(monthName, CENTER_X, startY - 65);

    const daysLabel = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];
    ctx.font = 'bold 18px sans-serif'; 
    for(let i=0; i<7; i++) { ctx.fillStyle = (i >= 5) ? '#ff7b72' : '#8b949e'; ctx.fillText(daysLabel[i], startX + (i*BOX_WIDTH) + (BOX_WIDTH/2), startY - 20); }

    for (let i = 0; i < maxDays; i++) {
        let col = (startIdx + i) % 7; let row = Math.floor((startIdx + i) / 7);
        let x = startX + (col * BOX_WIDTH); let y = startY + (row * BOX_HEIGHT);

        ctx.strokeStyle = '#30363d'; ctx.lineWidth = 2; ctx.strokeRect(x, y, BOX_WIDTH, BOX_HEIGHT);
        let shift = personData.shifts[i] || ""; 
        if(shift.toUpperCase() === "S1A") shift = "S1a";
        const shiftUp = shift.toUpperCase();
        const isWorking = shiftUp.includes("S1") || shiftUp.includes("S2") || shiftUp.includes("S3");

        if (shiftUp === "OFF") { ctx.fillStyle = 'rgba(218, 54, 51, 0.1)'; ctx.fillRect(x, y, BOX_WIDTH, BOX_HEIGHT); } 
        else if (shiftUp === "C" || shiftUp === "CUTI") { ctx.fillStyle = 'rgba(241, 224, 90, 0.1)'; ctx.fillRect(x, y, BOX_WIDTH, BOX_HEIGHT); } 
        else if (isWorking) {
            if (shiftUp.includes("S1")) ctx.fillStyle = 'rgba(88, 166, 255, 0.1)';
            if (shiftUp.includes("S2")) ctx.fillStyle = 'rgba(63, 185, 80, 0.1)';
            if (shiftUp.includes("S3")) ctx.fillStyle = 'rgba(255, 153, 0, 0.1)';
            ctx.fillRect(x, y, BOX_WIDTH, BOX_HEIGHT);
        }

        ctx.fillStyle = (col >= 5 || hols.includes(i+1)) ? '#ff7b72' : '#c9d1d9'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(i + 1, x + 8, y + 25);
        ctx.textAlign = 'center';
        if (shiftUp.includes("S1")) ctx.fillStyle = '#58a6ff'; else if (shiftUp.includes("S2")) ctx.fillStyle = '#3fb950';
        else if (shiftUp.includes("S3")) ctx.fillStyle = '#ff9900'; else if (shiftUp === "OFF") ctx.fillStyle = '#da3633';
        else if (shiftUp === "C" || shiftUp === "CUTI") ctx.fillStyle = '#f1e05a'; else ctx.fillStyle = '#8b949e';
        ctx.font = 'bold 36px sans-serif'; ctx.fillText(shift, x + (BOX_WIDTH/2), y + 70);

        if (isWorking) {
            let partners = [];
            mData.shiftData.forEach(p => {
                if (p.name !== personData.name) {
                    const pShift = (p.shifts[i] || "").toUpperCase();
                    if (isWorking && pShift === shiftUp) {
                        let nameParts = p.name.split(' '); let callName = nameParts[0];
                        if ((callName.toUpperCase() === "MUHAMAD" || callName.toUpperCase() === "MUHAMMAD" || callName.toUpperCase() === "M") && nameParts.length > 1) { callName = nameParts[1]; }
                        partners.push(callName); 
                    }
                }
            });

            if (partners.length > 0) {
                ctx.fillStyle = '#8b949e'; ctx.font = 'bold 22px sans-serif'; 
                let pText = partners.slice(0, 2).join(', '); ctx.fillText(pText, x + (BOX_WIDTH/2), y + 95); 
                if (partners.length > 2) { ctx.fillStyle = '#58a6ff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText("+" + (partners.length - 2) + " Lainya", x + (BOX_WIDTH/2), y + 110); }
            }
        }
    }
    ctx.fillStyle = '#30363d'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText("Generated offline by Dashboard NOC", CENTER_X, startY + gridTotalHeight + 40);
    const link = document.createElement('a'); link.download = `Jadwal_${window.scheduleSelectedName.replace(/\s+/g, '_')}_${monthKey}.png`;
    link.href = canvas.toDataURL('image/png'); link.click();
}

window.openSchedule = function() {
    const dateObj = new Date(); const todayDate = dateObj.getDate();
    const currentMonthKey = getMonthKey(dateObj);
    let nextMonthKey = ""; let nextDateObj = null;

    if (todayDate >= 25) {
        nextDateObj = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 1);
        nextMonthKey = getMonthKey(nextDateObj);
    }

    loadScheduleData(currentMonthKey, nextMonthKey); 

    let modal = document.getElementById('scheduleModal');
    if (modal) modal.remove();

    let tablesHTML = buildTableUI(currentMonthKey, dateObj, true);
    let dropdownTargetHTML = `<option value="${currentMonthKey}">Bulan Ini (${getMonthName(dateObj)})</option>`;

    if (todayDate >= 25 && nextMonthKey) {
        tablesHTML += `<div style="width: 100%; height: 2px; border-top: 2px dashed #30363d; margin-bottom: 20px;"></div>`;
        tablesHTML += buildTableUI(nextMonthKey, nextDateObj, false);
        dropdownTargetHTML += `<option value="${nextMonthKey}">Bulan Depan (${getMonthName(nextDateObj)})</option>`;
    }

    const modalHTML = `
    <style>
        .schedule-table-container::-webkit-scrollbar { height: 10px; width: 10px; }
        .schedule-table-container::-webkit-scrollbar-track { background: #0d1117; border-radius: 4px; }
        .schedule-table-container::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
        .schedule-table-container::-webkit-scrollbar-thumb:hover { background: #58a6ff; }
    </style>
    <div id="scheduleModal" style="display: flex; position: fixed; z-index: 12000; left: 0; top: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); justify-content: center; align-items: center; font-family: 'Consolas', monospace; backdrop-filter: blur(3px);">
        <div style="background: #0d1117; border: 1px solid #30363d; border-radius: 8px; width: 98%; max-width: 1900px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
            
            <div style="padding: 15px 20px; background: #161b22; border-bottom: 1px solid #30363d; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color: #d2a8ff; font-size: 16px; font-weight: bold;">📅 JADWAL SHIFT NOC</span>
                    <div style="display:flex; gap: 12px; font-size: 11px; font-weight: bold; background: #010409; padding: 6px 12px; border-radius: 4px; border: 1px solid #30363d;">
                        <span style="color:#58a6ff;">S1a (08:30-17:30)</span>
                        <span style="color:#58a6ff;">S1 (07:00-15:00)</span>
                        <span style="color:#3fb950;">S2 (14:30-23:00)</span>
                        <span style="color:#ff9900;">S3 (22:30-07:30)</span>
                        <span style="color:#f1e05a;">C (Cuti)</span>
                        <span style="color:#da3633;">OFF</span>
                    </div>
                    <div style="display:flex; gap: 10px; font-size: 10px; font-weight: bold; background: #0d1117; padding: 4px 10px; border-radius: 4px; border: 1px solid #30363d;">
                        <span style="color:#8b949e;">⬛ ON DUTY</span>
                        <span style="color:#8b949e;">⬜ NEXT SHIFT</span>
                        <span style="color:#8957e5;">🟪 TASPEN</span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.toggleAutoGenerate()" id="btnToggleAuto" style="background: #8957e5; border: none; color: white; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px; transition: 0.2s;">🎲 AUTO GENERATE</button>
                    <button onclick="window.toggleEditSchedule()" id="btnToggleEdit" style="background: #238636; border: none; color: white; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px; transition: 0.2s;">✏️ PASTE EXCEL (BULK)</button>
<button onclick="document.getElementById('scheduleModal').remove()" style="background: #da3633; border: none; color: white; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;">EXIT</button>
                </div>
            </div>

            <div id="scheduleView" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column;">
                <div style="margin-bottom: 10px; color: #8b949e; font-size: 11px; font-style: italic;">
                    💡 Tips: Klik <b>Kiri</b> Nama utk Filter Partner | Klik <b>Kanan</b> Kotak utk Edit Manual.
                </div>
                ${tablesHTML}
            </div>
            
            <div id="scheduleEdit" style="flex: 1; padding: 20px; display: none; flex-direction: column; gap: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="color: #8b949e; font-size: 12px; font-weight: bold;">Blok seluruh tabel Jadwal di Excel Anda (Termasuk "Nama Member" & "Days"), lalu Paste di bawah:</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <label style="color: #58a6ff; font-size: 12px; font-weight: bold;">Target Paste:</label>
                        <select id="pasteMonthTarget" style="background: #010409; color: #c9d1d9; border: 1px solid #30363d; padding: 6px 10px; border-radius: 4px; outline: none; font-weight: bold; cursor: pointer; font-family: 'Consolas', monospace;">
                            ${dropdownTargetHTML}
                        </select>
                    </div>
                </div>
                <textarea id="excelPasteArea" placeholder="Nama Member\t 1\t 2\t 3...\nDays\t Su\t Mo...\nEgi Rizkia...\t OFF\t S1..." style="flex: 1; background: #010409; border: 1px solid #30363d; color: #58a6ff; font-family: 'Consolas', monospace; font-size: 11px; padding: 15px; border-radius: 6px; resize: none; outline: none; white-space: pre; overflow: auto;"></textarea>
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button onclick="window.toggleEditSchedule()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">CANCEL</button>
                    <button onclick="window.saveExcelSchedule()" style="background: #1f6feb; border: none; color: white; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">💾 PARSE & SAVE BULK</button>
                </div>
            </div>

            <div id="scheduleAuto" style="flex: 1; padding: 20px; display: none; flex-direction: column; gap: 15px; align-items: center; justify-content: center;">
                <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 30px; width: 500px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <h2 style="color: #a371f7; text-align: center; margin-top: 0; margin-bottom: 25px;">🎲 AUTO GENERATOR JADWAL</h2>
                    
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <div>
                            <label style="color: #8b949e; font-size: 12px; font-weight: bold; margin-bottom: 5px; display: block;">Target Bulan & Tahun:</label>
                            <input type="month" id="autoMonthTarget" value="${currentMonthKey}" style="width: 100%; background: #010409; border: 1px solid #30363d; color: #c9d1d9; padding: 10px; border-radius: 4px; font-family: 'Consolas', monospace; font-size: 14px; box-sizing: border-box; outline: none;">
                        </div>

                        <div>
                            <label style="color: #8b949e; font-size: 12px; font-weight: bold; margin-bottom: 5px; display: block;">Tanggal Merah (Libur Nasional):</label>
                            <input type="text" id="autoHolidays" placeholder="Contoh: 1, 15, 20" style="width: 100%; background: #010409; border: 1px solid #30363d; color: #ff7b72; padding: 10px; border-radius: 4px; font-family: 'Consolas', monospace; font-size: 14px; box-sizing: border-box; outline: none;">
                            <span style="font-size: 10px; color: #57606a; margin-top: 5px; display: block;">*Pisahkan dengan koma. Sistem akan menghitung quota libur otomatis.</span>
                        </div>

                        <div style="background: rgba(137, 87, 229, 0.1); border: 1px solid #8957e5; padding: 10px; border-radius: 4px; margin-top: 10px;">
                            <span style="color: #d2a8ff; font-size: 11px; font-weight: bold;">Aturan Otomatis Aktif:</span>
                            <ul style="color: #c9d1d9; font-size: 10px; margin: 5px 0 0 15px; padding: 0;">
                                <li>Kapasitas: S1 (2 org), S2 (2 org), S3 (1 org). S1/S2 dijaga absolut maks 2 orang!</li>
                                <li>Egi: S1a (Selasa & Jumat). Ririn: S1 (Jumat) & No S3.</li>
                                <li>Anti-Jumping: S3->S2, S2->S1, S1->S3 DILARANG.</li>
                                <li>Maksimal kerja 6 hari berurutan.</li>
                            </ul>
                        </div>

                        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                            <button onclick="window.toggleAutoGenerate()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">CANCEL</button>
                            <button id="btnExeAuto" onclick="window.executeAutoGenerateWrapper(this)" style="background: #8957e5; border: none; color: white; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px; box-shadow: 0 0 10px rgba(137,87,229,0.5);">🚀 GENERATE PREVIEW</button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="schedulePreview" style="flex: 1; padding: 20px; display: none; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(210, 153, 34, 0.1); border: 1px solid #d29922; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                    <div>
                        <h3 style="color: #d29922; margin: 0 0 5px 0; font-size: 15px;">👀 MODE PREVIEW JADWAL</h3>
                        <span style="color: #c9d1d9; font-size: 11px;">Jadwal ini <b>belum disimpan</b>. Cek baris "DAILY SUMMARY" paling bawah.</span>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.discardPreview()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">❌ DISCARD</button>
                        <button onclick="window.reGeneratePreview(this)" style="background: #8957e5; border: none; color: white; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; box-shadow: 0 0 10px rgba(137,87,229,0.5);">🎲 RE-GENERATE</button>
                        <button onclick="window.applyPreview()" style="background: #2ea043; border: none; color: white; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; box-shadow: 0 0 10px rgba(46,160,67,0.5);">✔ APPLY JADWAL INI</button>
                    </div>
                </div>
                <div id="previewTableContainer" style="flex: 1; overflow-y: auto; overflow-x: hidden;"></div>
            </div>

        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.toggleEditSchedule = function() {
    const view = document.getElementById('scheduleView');
    const edit = document.getElementById('scheduleEdit');
    const auto = document.getElementById('scheduleAuto');
    const prev = document.getElementById('schedulePreview');
    const btnE = document.getElementById('btnToggleEdit');
    const btnA = document.getElementById('btnToggleAuto');

    if (edit.style.display === 'none') {
        view.style.display = 'none'; auto.style.display = 'none'; prev.style.display = 'none'; edit.style.display = 'flex';
        btnE.innerText = "⬅️ BACK TO TABLE"; btnE.style.background = "#d29922";
        if (btnA) { btnA.innerText = "🎲 AUTO GENERATE"; btnA.style.background = "#8957e5"; btnA.style.display = 'block'; }
    } else {
        view.style.display = 'flex'; edit.style.display = 'none'; prev.style.display = 'none';
        btnE.innerText = "✏️ PASTE EXCEL (BULK)"; btnE.style.background = "#238636";
        if (btnA) btnA.style.display = 'none';
    }
}

window.toggleAutoGenerate = function() {
    const view = document.getElementById('scheduleView');
    const edit = document.getElementById('scheduleEdit');
    const auto = document.getElementById('scheduleAuto');
    const prev = document.getElementById('schedulePreview');
    const btnE = document.getElementById('btnToggleEdit');
    const btnA = document.getElementById('btnToggleAuto');

    if (auto.style.display === 'none') {
        view.style.display = 'none'; edit.style.display = 'none'; prev.style.display = 'none'; auto.style.display = 'flex';
        if (btnA) { btnA.innerText = "⬅️ BACK TO TABLE"; btnA.style.background = "#d29922"; btnA.style.display = 'block';}
        btnE.innerText = "✏️ PASTE EXCEL (BULK)"; btnE.style.background = "#238636";
    } else {
        view.style.display = 'flex'; auto.style.display = 'none'; prev.style.display = 'none';
        if (btnA) { btnA.innerText = "🎲 AUTO GENERATE"; btnA.style.background = "#8957e5"; btnA.style.display = 'none';}
    }
}

window.saveExcelSchedule = function() {
    const rawText = document.getElementById('excelPasteArea').value.trim();
    if (!rawText) { alert("Kolom paste tidak boleh kosong!"); return; }

    const lines = rawText.split('\n');
    let parsedDayNames = []; let parsedShiftData = [];

    for (let i = 0; i < lines.length; i++) {
        let cols = lines[i].split('\t').map(c => c.trim());
        if (cols.length < 2) continue; 
        const firstCol = cols[0].toLowerCase();

        if (firstCol.includes("nama member") || firstCol === "no" || firstCol === "tanggal") continue;
        else if (firstCol === "days" || firstCol === "hari") parsedDayNames = cols.slice(1);
        else parsedShiftData.push({ name: cols[0], shifts: cols.slice(1) });
    }

    if (parsedShiftData.length === 0) { alert("Gagal membaca data! Pastikan Paste dari Excel dgn separator Tab."); return; }
    const targetMonthKey = document.getElementById('pasteMonthTarget').value;

    window.scheduleSelectedName = null; 
    window.masterScheduleData[targetMonthKey] = { dayNames: parsedDayNames.length > 0 ? parsedDayNames : window.defaultDayNames, shiftData: parsedShiftData };
    localStorage.setItem('noc_schedule_master_v2', JSON.stringify(window.masterScheduleData));
    window.masterHolidays[targetMonthKey] = []; localStorage.setItem('noc_holidays_master_v2', JSON.stringify(window.masterHolidays));
    openSchedule(); 
}

// ==============================================================
// 🧠 OTAK ALGORITMA PENJADWALAN (ROSTERING ENGINE)
// ==============================================================

function isValidShift(p, d, shiftType, schedArray, numDays) {
    let prev = d > 0 ? schedArray[d-1] : "OFF";
    let next = d < numDays - 1 ? schedArray[d+1] : "OFF";
    
    // 1. Anti-Jumping Logic
    if (prev === "S3" && (shiftType === "S1" || shiftType === "S1A" || shiftType === "S2" || shiftType === "S1a")) return false;
    if (prev === "S2" && (shiftType === "S1" || shiftType === "S1A" || shiftType === "S1a")) return false;
    if ((prev === "S1" || prev === "S1A" || prev === "S1a") && shiftType === "S3") return false;
    
    if (shiftType === "S3" && (next === "S1" || next === "S1A" || next === "S2" || next === "S1a")) return false;
    if (shiftType === "S2" && (next === "S1" || next === "S1A" || next === "S1a")) return false;
    if ((shiftType === "S1" || shiftType === "S1A" || shiftType === "S1a") && next === "S3") return false;

    // 2. Anti 7-Hari Kerja Berturut-turut (Max 6)
    let leftStreak = 0;
    for(let i=d-1; i>=0; i--) { 
        let s = schedArray[i];
        if(s !== "OFF" && s !== "C" && s !== "CUTI" && s !== "x" && s !== "") leftStreak++; 
        else break; 
    }
    let rightStreak = 0;
    for(let i=d+1; i<numDays; i++) { 
        let s = schedArray[i];
        if(s !== "OFF" && s !== "C" && s !== "CUTI" && s !== "x" && s !== "") rightStreak++; 
        else break; 
    }
    if(leftStreak + rightStreak + 1 > 6) return false;

    return true;
}

window.executeAutoGenerateWrapper = function(btn) {
    const origText = btn.innerText;
    btn.innerText = "⏳ GENERATING...";
    btn.disabled = true;
    
    setTimeout(() => {
        try {
            const monthInput = document.getElementById('autoMonthTarget').value;
            const holsInput = document.getElementById('autoHolidays').value;
            if(!monthInput) { alert("Pilih bulan dan tahun!"); btn.innerText = origText; btn.disabled = false; return; }

            const [yearStr, monthStr] = monthInput.split('-');
            const year = parseInt(yearStr); const month = parseInt(monthStr);
            const numDays = new Date(year, month, 0).getDate();
            const holsArr = holsInput.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));

            let targetWorkDays = 0; let dayNamesArr = [];
            const dayNamesList = ["Su","Mo","Tu","We","Th","Fr","Sa"];

            for(let d=1; d<=numDays; d++) {
                let date = new Date(year, month-1, d);
                let dow = date.getDay();
                dayNamesArr.push(dayNamesList[dow]);
                if(dow !== 0 && dow !== 6 && !holsArr.includes(d)) targetWorkDays++;
            }

            const people = ["Egi Rizkia Munajat", "Admin Haidar", "Muhamad Alfarizi", "Yama Amarulloh", "Pramudita", "Rizal Solihin", "M John Abiyyu", "Ririn"];
            let schedule = {}; let shiftCounts = {};
            people.forEach(p => {
                schedule[p] = Array(numDays).fill("OFF");
                shiftCounts[p] = {S1:0, S2:0, S3:0, S1a:0, total:0};
            });

            // --- FASE 1: HARD CONSTRAINTS (Aturan Mutlak) ---
            for(let d=0; d<numDays; d++) {
                let dow = new Date(year, month-1, d+1).getDay(); 
                if (dow === 2 || dow === 5) { 
                    schedule["Egi Rizkia Munajat"][d] = "S1a"; 
                    shiftCounts["Egi Rizkia Munajat"].S1a++; 
                    shiftCounts["Egi Rizkia Munajat"].total++; 
                }
                if (dow === 5) { 
                    schedule["Ririn"][d] = "S1"; 
                    shiftCounts["Ririn"].S1++; 
                    shiftCounts["Ririn"].total++; 
                }
            }

            // --- FASE 2: GREEDY FILL ---
            for(let d=0; d<numDays; d++) {
                let dow = new Date(year, month-1, d+1).getDay(); 
                let needed = {S1: 2, S2: 2, S3: 1}; 
                
                if (dow === 5) needed.S1--; // S1 dikurangi karena Ririn sudah menempati 1 slot

                ['S1', 'S2', 'S3'].forEach(shiftType => {
                    for(let i=0; i<needed[shiftType]; i++) {
                        
                        let candidates = people.filter(p => schedule[p][d] === "OFF");
                        if (shiftType === 'S3') candidates = candidates.filter(p => p !== "Ririn");

                        let strictCandidates = candidates.filter(p => isValidShift(p, d, shiftType, schedule[p], numDays));
                        
                        strictCandidates = strictCandidates.filter(p => {
                            let consecutiveOff = 0;
                            for(let j=d-1; j>=0; j--) { if(schedule[p][j]==="OFF") consecutiveOff++; else break; }
                            if (consecutiveOff >= 3) return true; 
                            return true; 
                        });

                        let fallbackCandidates = candidates.filter(p => {
                            let leftStreak = 0;
                            for(let j=d-1; j>=0; j--) { if(schedule[p][j]!=="OFF") leftStreak++; else break; }
                            return leftStreak < 6;
                        });

                        let priorityMustWork = strictCandidates.filter(p => {
                            let cOff = 0; for(let j=d-1; j>=0; j--) { if(schedule[p][j]==="OFF") cOff++; else break; }
                            return cOff >= 3;
                        });

                        let pool = priorityMustWork.length > 0 ? priorityMustWork : (strictCandidates.length > 0 ? strictCandidates : fallbackCandidates);

                        pool.sort((a, b) => {
                            let defA = targetWorkDays - shiftCounts[a].total;
                            let defB = targetWorkDays - shiftCounts[b].total;
                            if (defA !== defB) return defB - defA;

                            let scoreA = 0; let scoreB = 0;
                            const getConsecutiveOffs = (p) => { let c=0; for(let i=d-1; i>=0; i--) { if(schedule[p][i]==="OFF") c++; else break; } return c; };
                            let offA = getConsecutiveOffs(a); let offB = getConsecutiveOffs(b);

                            if (offA === 1) scoreA -= 1000;
                            if (offB === 1) scoreB -= 1000;
                            if (offA === 2) scoreA += 500;
                            if (offB === 2) scoreB += 500;
                            if (offA >= 3) scoreA += 5000;
                            if (offB >= 3) scoreB += 5000;

                            if (d > 0) {
                                let prevA = schedule[a][d-1]; let prevB = schedule[b][d-1];
                                if (prevA === "S1" && shiftType === "S2") scoreA += 2;
                                if (prevA === "S2" && shiftType === "S3") scoreA += 2;
                                if (prevA === "OFF" && shiftType === "S1") scoreA += 1;
                                
                                if (prevB === "S1" && shiftType === "S2") scoreB += 2;
                                if (prevB === "S2" && shiftType === "S3") scoreB += 2;
                                if (prevB === "OFF" && shiftType === "S1") scoreB += 1;
                            }

                            if (scoreA !== scoreB) return scoreB - scoreA;
                            let bal = shiftCounts[a][shiftType] - shiftCounts[b][shiftType];
                            if (bal !== 0) return bal;
                            return Math.random() - 0.5;
                        });

                        if (pool.length > 0) {
                            let sel = pool[0];
                            schedule[sel][d] = shiftType;
                            shiftCounts[sel][shiftType]++;
                            shiftCounts[sel].total++;
                        }
                    }
                });
            }

            // --- FASE 3: TAMBAL KEKURANGAN HK DENGAN PROTEKSI MAX 2 ORANG S1 ---
            people.forEach(p => {
                let attempts = 0;
                while(shiftCounts[p].total < targetWorkDays && attempts < numDays * 2) {
                    let offDays = [];
                    for(let d=0; d<numDays; d++) { if(schedule[p][d] === "OFF") offDays.push(d); }
                    offDays.sort(() => Math.random() - 0.5);

                    let success = false;
                    for (let targetDay of offDays) {
                        if (p !== "Ririn") {
                            // Non-Ririn langsung ditaruh S3 (sebagai tambahan 2 orang di malam hari)
                            if (isValidShift(p, targetDay, "S3", schedule[p], numDays)) {
                                schedule[p][targetDay] = "S3";
                                shiftCounts[p].S3++;
                                shiftCounts[p].total++;
                                success = true;
                                break;
                            }
                        } else {
                            // Karena Ririn dilarang S3, dia HARUS mengisi S1 atau S2.
                            // Kita hitung dulu berapa orang di S1 & S2 pada hari tersebut.
                            let cS1 = 0, cS2 = 0;
                            people.forEach(px => { 
                                if(schedule[px][targetDay] === "S1") cS1++; 
                                if(schedule[px][targetDay] === "S2") cS2++; 
                            });

                            let targetShift = "";
                            if (cS1 < 2) targetShift = "S1";
                            else if (cS2 < 2) targetShift = "S2";

                            if (targetShift !== "") {
                                if (isValidShift(p, targetDay, targetShift, schedule[p], numDays)) {
                                    schedule[p][targetDay] = targetShift;
                                    shiftCounts[p][targetShift]++;
                                    shiftCounts[p].total++;
                                    success = true;
                                    break;
                                }
                            } else {
                                // JIKA S1 & S2 SUDAH PENUH (2 ORANG) -> SWAP SALAH SATU ORANG KE S3
                                let possibleSwaps = people.filter(px => 
                                    px !== "Ririn" && px !== "Egi Rizkia Munajat" && 
                                    (schedule[px][targetDay] === "S1" || schedule[px][targetDay] === "S2") &&
                                    isValidShift(px, targetDay, "S3", schedule[px], numDays)
                                );
                                
                                possibleSwaps.sort(() => Math.random() - 0.5);

                                for (let swapCandidate of possibleSwaps) {
                                    let shiftToTake = schedule[swapCandidate][targetDay]; // S1 atau S2
                                    if (isValidShift(p, targetDay, shiftToTake, schedule[p], numDays)) {
                                        // Lempar orang lama ke S3
                                        schedule[swapCandidate][targetDay] = "S3";
                                        shiftCounts[swapCandidate][shiftToTake]--;
                                        shiftCounts[swapCandidate].S3++;
                                        
                                        // Masukkan Ririn ke Shift yang kosong (S1/S2)
                                        schedule[p][targetDay] = shiftToTake;
                                        shiftCounts[p][shiftToTake]++;
                                        shiftCounts[p].total++;
                                        success = true;
                                        break;
                                    }
                                }
                                if (success) break;
                            }
                        }
                    }
                    if (!success) break; 
                    attempts++;
                }
            });

            let shiftData = [];
            people.forEach(p => { shiftData.push({ name: p, shifts: schedule[p] }); });

            window.tempPreviewData = {}; window.tempPreviewHolidays = {};
            window.tempPreviewData[monthInput] = { dayNames: dayNamesArr, shiftData: shiftData };
            window.tempPreviewHolidays[monthInput] = holsArr;
            window.tempPreviewMonthKey = monthInput;
            window.tempPreviewDateObj = new Date(year, month-1, 1);

            window.showPreviewMode();
        } catch (e) {
            console.error("Gagal Auto Generate: ", e);
            alert("Terjadi kesalahan: " + e.message);
        }
        btn.innerText = origText;
        btn.disabled = false;
    }, 50);
}

// Fungsi Re-Generate yang aman untuk Preview
window.reGeneratePreview = function(previewBtn) {
    const mainBtn = document.getElementById('btnExeAuto');
    const targetBtn = mainBtn ? mainBtn : previewBtn; 
    
    if(targetBtn) {
        window.executeAutoGenerateWrapper(targetBtn);
    } else {
        const dummyBtn = { innerText: "🎲 RE-GENERATE", disabled: false };
        window.executeAutoGenerateWrapper(dummyBtn);
    }
}

window.showPreviewMode = function() {
    document.getElementById('scheduleAuto').style.display = 'none';
    document.getElementById('schedulePreview').style.display = 'flex';
    
    const container = document.getElementById('previewTableContainer');
    container.innerHTML = buildTableUI(window.tempPreviewMonthKey, window.tempPreviewDateObj, false, window.tempPreviewData, window.tempPreviewHolidays);
}

window.discardPreview = function() {
    window.tempPreviewData = {}; window.tempPreviewHolidays = {};
    document.getElementById('schedulePreview').style.display = 'none';
    document.getElementById('scheduleAuto').style.display = 'flex';
}

window.loadHelpdeskSchedule = function(input, monthKey) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        localStorage.setItem('helpdesk_schedule_img_' + monthKey, e.target.result);
        input.value = '';
        // refresh modal to show view/delete buttons
        openSchedule();
    };
    reader.readAsDataURL(file);
};

window.viewHelpdeskSchedule = function(monthKey) {
    const img = localStorage.getItem('helpdesk_schedule_img_' + monthKey);
    if (!img) return;

    const overlay = document.createElement('div');
    overlay.id = 'helpdeskImgOverlay';
    overlay.style.cssText = 'position:fixed;z-index:99999;inset:0;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;';
    overlay.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center;">
            <span style="color:#58a6ff;font-weight:bold;font-size:13px;">Jadwal Helpdesk — ${monthKey}</span>
            <button onclick="document.getElementById('helpdeskImgOverlay').remove()" style="background:#da3633;border:none;color:#fff;padding:5px 14px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;">✕ Tutup</button>
        </div>
        <img src="${img}" style="max-width:95vw;max-height:88vh;border-radius:6px;box-shadow:0 0 40px rgba(0,0,0,0.8);object-fit:contain;">
    `;
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
};

window.deleteHelpdeskSchedule = function(monthKey) {
    if (!confirm('Hapus jadwal Helpdesk bulan ' + monthKey + '?')) return;
    localStorage.removeItem('helpdesk_schedule_img_' + monthKey);
    openSchedule();
};

window.applyPreview = function() {
    window.masterScheduleData[window.tempPreviewMonthKey] = window.tempPreviewData[window.tempPreviewMonthKey];
    window.masterHolidays[window.tempPreviewMonthKey] = window.tempPreviewHolidays[window.tempPreviewMonthKey];

    localStorage.setItem('noc_schedule_master_v2', JSON.stringify(window.masterScheduleData));
    localStorage.setItem('noc_holidays_master_v2', JSON.stringify(window.masterHolidays));

    alert("Jadwal bulan " + window.tempPreviewMonthKey + " berhasil di-Apply!");
    window.tempPreviewData = {}; window.scheduleSelectedName = null; 
    openSchedule(); 
}