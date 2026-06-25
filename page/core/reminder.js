/**
 * reminder.js
 * Fitur: Pengingat Otomatis (Harian & Bulanan) + Fitur Edit
 */

let nocReminders = [];
let triggeredReminders = {}; 
let editingReminderId = null; // Menyimpan ID yang sedang di-edit

function loadReminders() {
    const saved = localStorage.getItem('noc_reminders');
    if (saved) nocReminders = JSON.parse(saved);
}

function saveReminders() {
    localStorage.setItem('noc_reminders', JSON.stringify(nocReminders));
}

function openReminderSettings() {
    renderReminderList();
    document.getElementById('reminderSettingsModal').style.display = 'flex';
}

function closeReminderSettings() {
    document.getElementById('reminderSettingsModal').style.display = 'none';
    resetFormReminder(); // Reset form saat ditutup
}

function renderReminderList() {
    const container = document.getElementById('reminderListContainer');
    container.innerHTML = '';

    if (nocReminders.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #8b949e; padding: 20px;">Belum ada pengingat yang dibuat.</div>';
        return;
    }

    nocReminders.forEach(rm => {
        let typeBadge;
        if (rm.type === 'daily') {
            typeBadge = `<span style="background: #1f6feb; color: white; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold;">HARIAN</span>`;
        } else if (rm.type === 'monthly') {
            typeBadge = `<span style="background: #8957e5; color: white; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold;">BULANAN (Tgl ${rm.date})</span>`;
        } else {
            typeBadge = `<span style="background: #d29922; color: #000; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold;">SATU KALI</span>`;
        }

        let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #161b22; border: 1px solid #30363d; padding: 10px 15px; border-radius: 6px; margin-bottom: 8px;">
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #f1e05a; font-size: 16px; font-weight: bold; font-family: monospace;">${rm.time}</span>
                    ${typeBadge}
                </div>
                <div style="color: #c9d1d9; font-size: 12px;">${rm.message}</div>
            </div>
            <div style="display: flex; gap: 5px;">
                <button onclick="editReminder('${rm.id}')" style="background: #d29922; border: none; color: #000; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: bold;">EDIT</button>
                <button onclick="deleteReminder('${rm.id}')" style="background: #da3633; border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: bold;">HAPUS</button>
            </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}

function addNewReminder() {
    const type = document.getElementById('remType').value;
    const time = document.getElementById('remTime').value;
    const date = document.getElementById('remDate').value;
    const msg = document.getElementById('remMsg').value.trim();

    if (!time || !msg) { alert("Waktu dan Pesan harus diisi!"); return; }
    if (type === 'monthly' && (!date || date < 1 || date > 31)) { alert("Pilih tanggal valid (1-31)."); return; }
    if (type === 'onetime' && (!date)) { alert("Pilih tanggal untuk reminder satu kali!"); return; }

    if (editingReminderId) {
        // MODE EDIT
        const index = nocReminders.findIndex(r => r.id === editingReminderId);
        if (index > -1) {
            nocReminders[index].type = type;
            nocReminders[index].time = time;
            nocReminders[index].date = (type === 'monthly' || type === 'onetime') ? parseInt(date) : null;
            nocReminders[index].message = msg;

            // Hapus cache trigger lama agar bisa bunyi lagi jika jamnya diubah
            Object.keys(triggeredReminders).forEach(k => { if(k.startsWith(editingReminderId)) delete triggeredReminders[k]; });
        }
    } else {
        // MODE TAMBAH BARU
        nocReminders.push({
            id: 'REM_' + Date.now(),
            type: type,
            time: time,
            date: (type === 'monthly' || type === 'onetime') ? parseInt(date) : null,
            message: msg,
            triggered: false
        });
    }

    saveReminders();
    resetFormReminder();
    renderReminderList();
}

function editReminder(id) {
    const rm = nocReminders.find(r => r.id === id);
    if (!rm) return;

    document.getElementById('remType').value = rm.type;
    toggleDateInput();
    if (rm.type === 'monthly') document.getElementById('remDate').value = rm.date;
    document.getElementById('remTime').value = rm.time;
    document.getElementById('remMsg').value = rm.message;

    editingReminderId = id;
    
    // Ubah warna dan teks tombol
    const btn = document.getElementById('btnSaveReminder');
    btn.innerText = "UPDATE REMINDER";
    btn.style.background = "#d29922";
    btn.style.borderColor = "#e3b341";
    btn.style.color = "#000";
}

function deleteReminder(id) {
    nocReminders = nocReminders.filter(rm => rm.id !== id);
    saveReminders();
    renderReminderList();
}

function toggleDateInput() {
    const type = document.getElementById('remType').value;
    document.getElementById('remDateContainer').style.display = type === 'monthly' ? 'block' : 'none';
}

function resetFormReminder() {
    document.getElementById('remTime').value = '';
    document.getElementById('remMsg').value = '';
    editingReminderId = null;
    
    // Kembalikan tombol ke mode Simpan
    const btn = document.getElementById('btnSaveReminder');
    if (btn) {
        btn.innerText = "SIMPAN REMINDER";
        btn.style.background = "#2ea043";
        btn.style.borderColor = "#3fb950";
        btn.style.color = "white";
    }
}

// ==========================================
// MESIN PENGINGAT (BACKGROUND)
// ==========================================
function closeReminderPopup() {
    document.getElementById('reminderPopupModal').style.display = 'none';
    const audio = document.getElementById('reminderAudio');
    if (audio) { audio.pause(); audio.currentTime = 0; }
}

function showReminderPopup(message) {
    document.getElementById('reminderPopupMsg').innerText = message;
    document.getElementById('reminderPopupModal').style.display = 'flex';
    const audio = document.getElementById('reminderAudio');
    if (audio) { audio.currentTime = 0; audio.play().catch(e => {}); }
}

function checkActiveReminders() {
    if (nocReminders.length === 0) return;

    const now = new Date();
    const curTime = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    const curDate = now.getDate();
    const todayKey = `${now.getFullYear()}-${now.getMonth()+1}-${curDate}`;

    nocReminders.forEach(rm => {
        const triggerKey = `${rm.id}_${todayKey}_${curTime}`;
        if (rm.time === curTime) {
            let shouldTrigger = false;

            if (rm.type === 'daily') {
                shouldTrigger = true;
            } else if (rm.type === 'monthly' && rm.date === curDate) {
                shouldTrigger = true;
            } else if (rm.type === 'onetime' && rm.date === curDate && !rm.triggered) {
                shouldTrigger = true;
                rm.triggered = true;
                saveReminders();
            }

            if (shouldTrigger && !triggeredReminders[triggerKey]) {
                triggeredReminders[triggerKey] = true;
                showReminderPopup(rm.message);
            }
        }
    });
}

loadReminders();
setInterval(checkActiveReminders, 15000);