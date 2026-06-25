/**
 * schedule_algorithm.js
 * 🧠 OTAK ALGORITMA PENJADWALAN (ROSTERING ENGINE)
 */

// Fungsi Validasi Super Ketat: Anti-Jumping & Anti 7-Hari Kerja
function isValidShift(p, d, shiftType, schedArray, numDays) {
    let prev = d > 0 ? schedArray[d-1] : "OFF";
    let next = d < numDays - 1 ? schedArray[d+1] : "OFF";
    
    // 1. Anti-Jumping Logic
    if (prev === "S3" && (shiftType === "S1" || shiftType === "S1a" || shiftType === "S2")) return false;
    if (prev === "S2" && (shiftType === "S1" || shiftType === "S1a")) return false;
    if ((prev === "S1" || prev === "S1a") && shiftType === "S3") return false;
    
    if (shiftType === "S3" && (next === "S1" || next === "S1a" || next === "S2")) return false;
    if (shiftType === "S2" && (next === "S1" || next === "S1a")) return false;
    if ((shiftType === "S1" || shiftType === "S1a") && next === "S3") return false;

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
                
                if (dow === 5) needed.S1--; // Kurangi jatah S1 karena Ririn wajib masuk

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
                            return Math.random() - 0.5; // Pengacak untuk Re-generate
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

            // --- FASE 3: TAMBAL KEKURANGAN HK (S3/S1) ---
            people.forEach(p => {
                let attempts = 0;
                while(shiftCounts[p].total < targetWorkDays && attempts < numDays) {
                    let offDays = [];
                    for(let d=0; d<numDays; d++) { if(schedule[p][d] === "OFF") offDays.push(d); }

                    let targetShift = (p === "Ririn") ? "S1" : "S3";
                    let validOffDays = offDays.filter(day => isValidShift(p, day, targetShift, schedule[p], numDays));

                    if (validOffDays.length > 0) {
                        let targetDay = validOffDays[Math.floor(Math.random() * validOffDays.length)];
                        schedule[p][targetDay] = targetShift;
                        shiftCounts[p][targetShift]++;
                        shiftCounts[p].total++;
                    } else break; 
                    attempts++;
                }
            });

            let shiftData = [];
            people.forEach(p => { shiftData.push({ name: p, shifts: schedule[p] }); });

            // SIMPAN KE VARIABEL SEMENTARA UNTUK PREVIEW (JANGAN LANGSUNG KE MASTER)
            window.tempPreviewData = {}; window.tempPreviewHolidays = {};
            window.tempPreviewData[monthInput] = { dayNames: dayNamesArr, shiftData: shiftData };
            window.tempPreviewHolidays[monthInput] = holsArr;
            window.tempPreviewMonthKey = monthInput;
            window.tempPreviewDateObj = new Date(year, month-1, 1);

            if(typeof window.showPreviewMode === 'function') {
                window.showPreviewMode();
            } else {
                alert("Fungsi UI showPreviewMode tidak ditemukan di schedule_modal.js!");
            }
            
        } catch (e) {
            console.error("Gagal Auto Generate: ", e);
            alert("Terjadi kesalahan: " + e.message);
        }
        btn.innerText = origText;
        btn.disabled = false;
    }, 50);
}

// Fungsi Pemicu Re-Generate
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