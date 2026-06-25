/**
 * shift_notes.js
 * Fitur: Full-Page Layout, Grid View, "NEW" Badge (< 24 Jam), PIC Dropdown, Priority (P1/P2/P3), Custom Dialog UI
 */

const NOTES_STORAGE_KEY = 'noc_shift_notes';
const MAX_IMAGES_PER_NOTE = 5;
const MAX_IMAGE_DIMENSION = 1400; // px
const IMAGE_QUALITY = 0.82;

let noteImages = []; // Array {base64, name} untuk note yang sedang diedit/dibuat

// === HELPER: DETEKSI SHIFT BERDASARKAN JAM ===
function getShiftString(dateObj) {
    const h = dateObj.getHours();
    const m = dateObj.getMinutes();
    const mins = (h * 60) + m;

    // Shift 1: 07:30 (450) - 14:59 (899)
    if (mins >= 450 && mins <= 899) return "Shift 1";
    // Shift 2: 15:00 (900) - 22:59 (1379)
    if (mins >= 900 && mins <= 1379) return "Shift 2";
    // Shift 3: 23:00 - 07:29
    return "Shift 3";
}

// === HELPER: FORMAT WAKTU UNTUK TAMPILAN ===
function formatDisplayTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const month = monthNames[d.getMonth()];
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month}, ${h}.${m}`;
}

// === HELPER: FORMAT DATETIME-LOCAL (YYYY-MM-DDTHH:MM) ===
function formatForInput(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

// === 1. PEMBUATAN UI FULL-PAGE & CUSTOM DIALOG ===
function createNotesModal() {
    if (document.getElementById('notesModal')) return;

    if (!document.getElementById('shiftNotesEditorStyle')) {
        const s = document.createElement('style');
        s.id = 'shiftNotesEditorStyle';
        s.textContent = `
            #noteContent:empty:before { content: attr(data-placeholder); color: #484f58; pointer-events: none; display: block; }
            #noteContent:focus { border-color: #58a6ff !important; }
            #noteContent h3 { color: #f1e05a; font-size: 15px; margin: 8px 0 4px; font-weight: bold; }
            #noteContent h4 { color: #58a6ff; font-size: 13px; margin: 6px 0 3px; font-weight: bold; }
            #noteContent p { margin: 2px 0; }
            #noteContent ul, #noteContent ol { margin: 4px 0; padding-left: 22px; }
            #noteContent li { margin: 2px 0; }
            #noteContent b, #noteContent strong { font-weight: 700; }
            .note-rich-content h3 { color: #f1e05a; font-size: 15px; margin: 8px 0 4px; font-weight: bold; }
            .note-rich-content h4 { color: #58a6ff; font-size: 13px; margin: 6px 0 3px; font-weight: bold; }
            .note-rich-content p { margin: 2px 0; }
            .note-rich-content ul, .note-rich-content ol { margin: 4px 0; padding-left: 22px; }
            .note-rich-content li { margin: 2px 0; }

            #noteFloatToolbar { position:fixed; display:none; align-items:center; gap:2px; background:#1c2128; border:1px solid #444c56; border-radius:8px; padding:5px 8px; box-shadow:0 8px 32px rgba(0,0,0,0.85); z-index:10020; pointer-events:auto; }
            #noteFloatToolbar::after { content:''; position:absolute; bottom:-6px; left:50%; transform:translateX(-50%); border:6px solid transparent; border-bottom:none; border-top-color:#444c56; }
            @keyframes _ftIn { from { opacity:0; transform:translate(-50%,-100%) translateY(6px); } to { opacity:1; transform:translate(-50%,-100%) translateY(0); } }
            #noteFloatToolbar.visible { display:flex; animation:_ftIn 0.1s ease; }
            #noteFloatToolbar .ft-btn { background:none; border:1px solid transparent; color:#c9d1d9; width:28px; height:28px; border-radius:5px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; transition:background 0.1s; flex-shrink:0; }
            #noteFloatToolbar .ft-btn:hover { background:#30363d; border-color:#444c56; }
            #noteFloatToolbar .ft-btn.active { background:#1f6feb; border-color:#388bfd; color:#fff; }
            #noteFloatToolbar .ft-sep { width:1px; height:20px; background:#30363d; margin:0 3px; flex-shrink:0; }
            #noteFloatToolbar .ft-color { width:16px; height:16px; border-radius:50%; border:2px solid transparent; cursor:pointer; flex-shrink:0; transition:transform 0.1s, border-color 0.1s; }
            #noteFloatToolbar .ft-color:hover { transform:scale(1.25); border-color:#fff; }
        `;
        document.head.appendChild(s);
    }

    const modalHTML = `
    <div id="notesModal" style="display: none; position: fixed; z-index: 10005; left: 0; top: 0; width: 100vw; height: 100vh; background: #0d1117; flex-direction: column; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        
        <div style="height: 55px; background: #161b22; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; padding: 0 25px; box-sizing: border-box;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 20px;">📝</span>
                <span style="color: #f1e05a; font-size: 16px; font-weight: bold; letter-spacing: 1px;">NOC HANDOVER NOTES</span>
            </div>
            <button onclick="closeNotes()" style="background: #da3633; border: none; color: white; padding: 8px 25px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; box-shadow: 0 0 10px rgba(218,54,51,0.4);">✖ KEMBALI KE DASHBOARD</button>
        </div>

        <div style="display: flex; flex: 1; overflow: hidden;">
            
            <div style="width: 380px; background: #161b22; border-right: 1px solid #30363d; display: flex; flex-direction: column; overflow-y: auto; padding: 25px; box-sizing: border-box;">
                
                <h4 style="color: #58a6ff; margin-top: 0; margin-bottom: 20px; font-size: 14px; border-bottom: 1px solid #30363d; padding-bottom: 10px;">✨ TULIS CATATAN SHIFT</h4>
                
                <input type="hidden" id="noteId">
                
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <label style="color: #8b949e; font-size: 11px; font-weight: bold;">NAMA PIC (WAJIB):</label>
                        <select id="notePic" style="width: 100%; background: #010409; border: 1px solid #30363d; color: #c9d1d9; padding: 10px; border-radius: 4px; font-size: 13px; margin-top: 6px; box-sizing: border-box; cursor: pointer;">
                            <option value="" selected disabled>-- Pilih PIC --</option>
                            <option value="Admin">Admin</option>
                            <option value="Yama">Yama</option>
                            <option value="Rizal">Rizal</option>
                            <option value="John">John</option>
                            <option value="Alfarizi">Alfarizi</option>
                            <option value="Pramudita">Pramudita</option>
                            <option value="Egi">Egi</option>
                            <option value="Ririn">Ririn</option>
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label style="color: #8b949e; font-size: 11px; font-weight: bold;">PRIORITY (WAJIB):</label>
                        <select id="notePrio" style="width: 100%; background: #010409; border: 1px solid #30363d; color: #c9d1d9; padding: 10px; border-radius: 4px; font-size: 13px; margin-top: 6px; box-sizing: border-box; cursor: pointer;">
                            <option value="" selected disabled>-- Pilih Priority --</option>
                            <option value="P1" style="color: #ff7b72; font-weight:bold;">P1 - Critical</option>
                            <option value="P2" style="color: #e36209; font-weight:bold;">P2 - Trouble</option>
                            <option value="P3" style="color: #e3b341; font-weight:bold;">P3 - Attention</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #8b949e; font-size: 11px; font-weight: bold;">⏳ EXPIRED TIME (Kosong &rarr; Permanent):</label>
                    <input type="datetime-local" id="noteExpiry" title="Klik ikon kalender di sebelah kanan untuk memilih tanggal. Kosongkan jika ingin Permanen." style="width: 100%; background: #010409; border: 1px solid #30363d; color: #c9d1d9; padding: 9px 12px; border-radius: 4px; font-size: 13px; margin-top: 6px; box-sizing: border-box; cursor: pointer; color-scheme: dark;">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="color: #8b949e; font-size: 11px; font-weight: bold;">DETAIL CATATAN: <span style="color:#484f58; font-weight:normal;">(Pilih teks untuk format)</span></label>
                    <div id="noteContent" contenteditable="true" data-placeholder="Ketik rincian pesan, instruksi, atau anomali di sini..." style="width:100%; min-height:180px; max-height:280px; background:#010409; border:1px solid #30363d; color:#c9d1d9; padding:12px; border-radius:4px; font-size:13px; box-sizing:border-box; line-height:1.6; overflow-y:auto; outline:none; word-break:break-word; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin-top:6px;"></div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #8b949e; font-size: 11px; font-weight: bold;">📎 LAMPIRAN GAMBAR (maks. ${MAX_IMAGES_PER_NOTE} foto):</label>
                    <div id="noteImageDropZone"
                        onclick="document.getElementById('noteImageInput').click()"
                        ondragover="event.preventDefault(); this.style.borderColor='#58a6ff'; this.style.background='#0d1f33';"
                        ondragleave="this.style.borderColor='#30363d'; this.style.background='#010409';"
                        ondrop="event.preventDefault(); this.style.borderColor='#30363d'; this.style.background='#010409'; handleNoteImageFiles(event.dataTransfer.files);"
                        style="width:100%; min-height:70px; background:#010409; border:2px dashed #30363d; border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; margin-top:6px; box-sizing:border-box; transition:0.2s; padding: 12px;">
                        <span style="color:#8b949e; font-size:11px; pointer-events:none;">🖼️ Klik atau drag foto ke sini &nbsp;|&nbsp; Ctrl+V untuk paste screenshot</span>
                        <span style="color:#484f58; font-size:10px; margin-top:4px; pointer-events:none;">JPG, PNG, GIF, WebP — Auto-compressed sebelum disimpan</span>
                    </div>
                    <input type="file" id="noteImageInput" accept="image/*" multiple style="display:none;" onchange="handleNoteImageFiles(this.files)">
                    <div id="noteImagePreview" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;"></div>
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 30px;">
                    <button id="btnCancelEdit" onclick="resetNoteForm()" style="display:none; flex: 1; background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">BATAL EDIT</button>
                    <button id="btnSaveNote" onclick="saveNote()" style="flex: 2; background: #238636; border: none; color: white; padding: 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; box-shadow: 0 4px 12px rgba(35,134,54,0.4);">➕ SIMPAN CATATAN</button>
                </div>
            </div>

            <div id="notesContainer" style="flex: 1; padding: 30px; overflow-y: auto; background: #0d1117; display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); align-content: flex-start; gap: 20px; box-sizing: border-box;">
                </div>

        </div>

        <div id="notesLightbox" style="display:none; position:absolute; inset:0; background:rgba(0,0,0,0.93); z-index:10015; justify-content:center; align-items:center; overflow:hidden;">
            <div id="lbBgClose" onclick="closeNotesLightbox()" style="position:absolute; inset:0; cursor:zoom-out;"></div>
            <img id="notesLightboxImg" src="" style="max-width:90%; max-height:88%; border-radius:6px; box-shadow:0 0 60px rgba(0,0,0,0.9); object-fit:contain; position:relative; z-index:1; transform-origin:center; user-select:none; -webkit-user-drag:none;">
            <div style="position:absolute; bottom:18px; left:50%; transform:translateX(-50%); display:flex; gap:6px; align-items:center; background:rgba(0,0,0,0.75); border:1px solid #444; padding:5px 14px; border-radius:20px; z-index:2;">
                <button id="lbBtnZoomOut" title="Zoom out (−)" onclick="lbZoomBy(-0.25)" style="background:none; border:none; color:#ccc; font-size:18px; cursor:pointer; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:4px; transition:background 0.15s;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='none'">−</button>
                <span id="lbZoomLabel" style="color:#fff; font-size:12px; font-weight:600; min-width:42px; text-align:center; font-family:monospace;">100%</span>
                <button id="lbBtnZoomIn" title="Zoom in (+)" onclick="lbZoomBy(0.25)" style="background:none; border:none; color:#ccc; font-size:18px; cursor:pointer; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:4px; transition:background 0.15s;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='none'">+</button>
                <div style="width:1px; height:18px; background:#555; margin:0 4px;"></div>
                <button title="Reset zoom" onclick="resetLightboxZoom()" style="background:none; border:none; color:#aaa; font-size:11px; cursor:pointer; padding:2px 6px; border-radius:4px; transition:background 0.15s; white-space:nowrap;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='none'">↺ Reset</button>
            </div>
            <button onclick="closeNotesLightbox()" title="Tutup (Esc)" style="position:absolute; top:16px; right:20px; background:rgba(0,0,0,0.7); border:1px solid #555; color:white; width:34px; height:34px; border-radius:50%; font-size:15px; cursor:pointer; line-height:1; z-index:2;">✕</button>
            <div style="position:absolute; top:16px; left:20px; color:#666; font-size:10px; z-index:2; user-select:none;">Scroll = zoom &nbsp;|&nbsp; Drag = geser &nbsp;|&nbsp; Dbl-click = reset</div>
        </div>

        <div id="noteFloatToolbar" onmousedown="return false">
            <button id="ftBold" class="ft-btn" onclick="noteExecCmd('bold')" title="Bold (Ctrl+B)"><b>B</b></button>
            <button id="ftItalic" class="ft-btn" onclick="noteExecCmd('italic')" title="Italic (Ctrl+I)"><i>I</i></button>
            <button id="ftUnder" class="ft-btn" onclick="noteExecCmd('underline')" title="Underline (Ctrl+U)" style="text-decoration:underline;">U</button>
            <div class="ft-sep"></div>
            <button class="ft-btn" onclick="noteFormatBlock('h3')" title="Heading" style="color:#f1e05a; font-size:11px; font-weight:bold; width:28px;">H1</button>
            <button class="ft-btn" onclick="noteFormatBlock('h4')" title="Sub-heading" style="color:#58a6ff; font-size:11px; font-weight:bold; width:28px;">H2</button>
            <button class="ft-btn" onclick="noteFormatBlock('p')" title="Teks normal" style="color:#8b949e; font-size:11px;">¶</button>
            <div class="ft-sep"></div>
            <button class="ft-btn" onclick="noteExecCmd('insertUnorderedList')" title="Bullet list" style="font-size:16px; line-height:1;">•</button>
            <button class="ft-btn" onclick="noteExecCmd('insertOrderedList')" title="Numbered list" style="font-size:10px; font-weight:bold; width:28px;">1.</button>
            <div class="ft-sep"></div>
            <button class="ft-color" onclick="noteExecCmd('foreColor','#ff7b72')" title="Merah" style="background:#ff7b72;"></button>
            <button class="ft-color" onclick="noteExecCmd('foreColor','#e3b341')" title="Kuning" style="background:#e3b341;"></button>
            <button class="ft-color" onclick="noteExecCmd('foreColor','#3fb950')" title="Hijau" style="background:#3fb950;"></button>
            <button class="ft-color" onclick="noteExecCmd('foreColor','#58a6ff')" title="Biru" style="background:#58a6ff;"></button>
            <button class="ft-color" onclick="noteExecCmd('foreColor','#c9d1d9')" title="Reset warna" style="background:#c9d1d9;"></button>
            <div class="ft-sep"></div>
            <button class="ft-btn" onclick="noteExecCmd('removeFormat')" title="Hapus format" style="color:#8b949e; font-size:11px; width:auto; padding:0 6px;">✕</button>
        </div>

        <div id="notesCustomDialog" style="display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.85); z-index: 10010; justify-content: center; align-items: center; padding: 20px;">
            <div id="notesDialogBox" style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; width: 450px; padding: 30px; box-shadow: 0 15px 40px rgba(0,0,0,0.9); text-align: center;">
                <div id="notesDialogTitle" style="font-weight: bold; font-size: 18px; margin-bottom: 15px; color: #f1e05a;">TITLE</div>
                <div id="notesDialogBody" style="color: #c9d1d9; font-size: 13px; line-height: 1.6; margin-bottom: 30px; word-break: break-word;">BODY</div>
                <div id="notesDialogActions" style="display: flex; justify-content: center; gap: 15px;">
                    </div>
            </div>
        </div>

    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('notesModal').style.display = 'none';
}

// === CUSTOM DIALOG CONTROLLERS ===
function closeCustomDialog() {
    document.getElementById('notesCustomDialog').style.display = 'none';
}

function showNotesAlert(title, message, isError = false) {
    document.getElementById('notesDialogTitle').innerHTML = title;
    document.getElementById('notesDialogTitle').style.color = isError ? "#ff7b72" : "#3fb950";
    document.getElementById('notesDialogBody').innerHTML = message;
    
    document.getElementById('notesDialogActions').innerHTML = `
        <button onclick="closeCustomDialog()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 10px 30px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">OK, MENGERTI</button>
    `;
    document.getElementById('notesCustomDialog').style.display = 'flex';
}

function showNotesConfirm(title, message, confirmCallback) {
    document.getElementById('notesDialogTitle').innerHTML = title;
    document.getElementById('notesDialogTitle').style.color = "#da3633"; 
    document.getElementById('notesDialogBody').innerHTML = message;
    
    document.getElementById('notesDialogActions').innerHTML = `
        <button onclick="closeCustomDialog()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 10px 25px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">Batal</button>
        <button id="btnConfirmAction" style="background: #da3633; border: none; color: white; padding: 10px 25px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">Ya, Hapus!</button>
    `;
    
    document.getElementById('btnConfirmAction').onclick = () => {
        closeCustomDialog();
        confirmCallback();
    };
    document.getElementById('notesCustomDialog').style.display = 'flex';
}

function showImportPrompt() {
    document.getElementById('notesDialogTitle').innerHTML = "📥 IMPORT DATA PC LAIN";
    document.getElementById('notesDialogTitle').style.color = "#58a6ff";
    
    const bodyHtml = `
        <div style="text-align: left; margin-bottom: 10px; color: #8b949e;">Paste kode text (JSON) dari PC lain ke kotak di bawah ini:</div>
        <textarea id="importTextarea" placeholder="Paste di sini..." style="width: 100%; height: 120px; background: #010409; border: 1px solid #30363d; color: #c9d1d9; padding: 12px; border-radius: 4px; font-size: 12px; resize: none; box-sizing: border-box; font-family: monospace;"></textarea>
        <div style="color: #ff7b72; font-size: 11px; margin-top: 15px; text-align: left; background: rgba(218,54,51,0.1); padding: 10px; border-radius: 4px; border: 1px solid #da3633;">
            <b>⚠️ Peringatan Overwrite:</b><br>Melakukan import akan MENGGANTIKAN seluruh catatan yang ada di PC ini dengan catatan baru.
        </div>
    `;
    document.getElementById('notesDialogBody').innerHTML = bodyHtml;
    
    document.getElementById('notesDialogActions').innerHTML = `
        <button onclick="closeCustomDialog()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 10px 25px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">Batal</button>
        <button id="btnExecImport" style="background: #3fb950; border: none; color: white; padding: 10px 25px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">Proses Import Data</button>
    `;

    document.getElementById('btnExecImport').onclick = () => {
        const val = document.getElementById('importTextarea').value.trim();
        closeCustomDialog();
        executeImport(val);
    };
    document.getElementById('notesCustomDialog').style.display = 'flex';
}

function executeImport(pastedData) {
    if (!pastedData) return;
    try {
        const parsed = JSON.parse(pastedData);
        if (Array.isArray(parsed)) {
            localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(parsed));
            renderNotes();
            showNotesAlert("✅ IMPORT SUKSES", "Data Catatan dari PC lain berhasil diterapkan. Layar sudah di-refresh dengan data baru.");
        } else {
            showNotesAlert("❌ FORMAT SALAH", "Format data tidak valid! Pastikan Anda mem-paste teks yang benar.", true);
        }
    } catch(e) {
        showNotesAlert("❌ GAGAL MEMBACA DATA", "Teks yang Anda paste rusak atau terpotong.", true);
    }
}

// === IMAGE HANDLING ===

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
                    if (w > h) { h = Math.round(h * MAX_IMAGE_DIMENSION / w); w = MAX_IMAGE_DIMENSION; }
                    else { w = Math.round(w * MAX_IMAGE_DIMENSION / h); h = MAX_IMAGE_DIMENSION; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve({ base64: canvas.toDataURL('image/jpeg', IMAGE_QUALITY), name: file.name });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function handleNoteImageFiles(files) {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES_PER_NOTE - noteImages.length;
    if (remaining <= 0) {
        showNotesAlert("⚠️ BATAS GAMBAR", `Maksimal ${MAX_IMAGES_PER_NOTE} gambar per catatan.`, true);
        return;
    }
    const toProcess = Array.from(files).slice(0, remaining);
    for (const file of toProcess) {
        if (!file.type.startsWith('image/')) continue;
        const compressed = await compressImage(file);
        noteImages.push(compressed);
    }
    renderNoteImagePreview();
    // Reset input agar file yang sama bisa dipilih lagi
    const inp = document.getElementById('noteImageInput');
    if (inp) inp.value = '';
}

function renderNoteImagePreview() {
    const previewEl = document.getElementById('noteImagePreview');
    if (!previewEl) return;
    if (noteImages.length === 0) {
        previewEl.innerHTML = '';
        return;
    }
    previewEl.innerHTML = noteImages.map((img, idx) => `
        <div style="position:relative; width:72px; height:72px; border-radius:5px; overflow:hidden; border:2px solid #30363d; flex-shrink:0; cursor:zoom-in;" onclick="openNotesLightbox('${img.base64}')" title="${img.name}">
            <img src="${img.base64}" style="width:100%; height:100%; object-fit:cover;">
            <button onclick="event.stopPropagation(); removeNoteImage(${idx})" title="Hapus gambar" style="position:absolute; top:2px; right:2px; background:rgba(218,54,51,0.9); border:none; color:white; width:18px; height:18px; border-radius:50%; font-size:10px; cursor:pointer; line-height:1; padding:0; display:flex; align-items:center; justify-content:center;">✕</button>
        </div>`).join('');
}

function removeNoteImage(idx) {
    noteImages.splice(idx, 1);
    renderNoteImagePreview();
}

// === LIGHTBOX ZOOM / PAN STATE ===
let _lbScale = 1;
let _lbTX = 0, _lbTY = 0;
let _lbDragging = false;
let _lbDragOriginX = 0, _lbDragOriginY = 0;
let _lbDragMoved = false;

function _lbApplyTransform() {
    const img = document.getElementById('notesLightboxImg');
    if (!img) return;
    img.style.transform = `translate(${_lbTX}px, ${_lbTY}px) scale(${_lbScale})`;
    img.style.cursor = _lbScale > 1 ? (_lbDragging ? 'grabbing' : 'grab') : 'default';
    const label = document.getElementById('lbZoomLabel');
    if (label) label.textContent = Math.round(_lbScale * 100) + '%';
}

function resetLightboxZoom() {
    _lbScale = 1; _lbTX = 0; _lbTY = 0;
    _lbApplyTransform();
}

function lbZoomBy(delta) {
    _lbScale = Math.min(10, Math.max(0.25, _lbScale + delta));
    _lbApplyTransform();
}

function openNotesLightbox(src) {
    const lb = document.getElementById('notesLightbox');
    if (!lb) return;
    const img = document.getElementById('notesLightboxImg');
    img.src = src;
    resetLightboxZoom();
    lb.style.display = 'flex';

    // wheel zoom
    lb._lbWheelHandler = function(e) {
        e.preventDefault();
        const step = e.deltaY < 0 ? 0.18 : -0.18;
        const prev = _lbScale;
        _lbScale = Math.min(10, Math.max(0.25, _lbScale + step));
        // zoom toward mouse cursor
        const rect = img.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        _lbTX += (e.clientX - cx) * (1 - _lbScale / prev);
        _lbTY += (e.clientY - cy) * (1 - _lbScale / prev);
        _lbApplyTransform();
    };
    lb.addEventListener('wheel', lb._lbWheelHandler, { passive: false });

    // drag to pan
    img._lbMouseDown = function(e) {
        if (e.button !== 0) return;
        _lbDragging = true;
        _lbDragMoved = false;
        _lbDragOriginX = e.clientX - _lbTX;
        _lbDragOriginY = e.clientY - _lbTY;
        img.style.cursor = 'grabbing';
        e.preventDefault();
        e.stopPropagation();
    };
    img.addEventListener('mousedown', img._lbMouseDown);

    lb._lbMouseMove = function(e) {
        if (!_lbDragging) return;
        _lbDragMoved = true;
        _lbTX = e.clientX - _lbDragOriginX;
        _lbTY = e.clientY - _lbDragOriginY;
        _lbApplyTransform();
    };
    lb.addEventListener('mousemove', lb._lbMouseMove);

    lb._lbMouseUp = function() {
        _lbDragging = false;
        img.style.cursor = _lbScale > 1 ? 'grab' : 'default';
    };
    lb.addEventListener('mouseup', lb._lbMouseUp);

    // double-click to reset
    img._lbDblClick = function(e) { e.stopPropagation(); resetLightboxZoom(); };
    img.addEventListener('dblclick', img._lbDblClick);

    // keyboard: Esc close, +/- zoom, arrow keys pan
    lb._lbKeyDown = function(e) {
        if (e.key === 'Escape') { closeNotesLightbox(); return; }
        if (e.key === '+' || e.key === '=') { lbZoomBy(0.25); e.preventDefault(); }
        if (e.key === '-') { lbZoomBy(-0.25); e.preventDefault(); }
        if (e.key === '0') { resetLightboxZoom(); e.preventDefault(); }
        const step = 40;
        if (e.key === 'ArrowLeft') { _lbTX += step; _lbApplyTransform(); e.preventDefault(); }
        if (e.key === 'ArrowRight') { _lbTX -= step; _lbApplyTransform(); e.preventDefault(); }
        if (e.key === 'ArrowUp') { _lbTY += step; _lbApplyTransform(); e.preventDefault(); }
        if (e.key === 'ArrowDown') { _lbTY -= step; _lbApplyTransform(); e.preventDefault(); }
    };
    document.addEventListener('keydown', lb._lbKeyDown);
}

function closeNotesLightbox() {
    const lb = document.getElementById('notesLightbox');
    if (!lb) return;
    lb.style.display = 'none';
    if (lb._lbWheelHandler) { lb.removeEventListener('wheel', lb._lbWheelHandler); delete lb._lbWheelHandler; }
    if (lb._lbMouseMove) { lb.removeEventListener('mousemove', lb._lbMouseMove); delete lb._lbMouseMove; }
    if (lb._lbMouseUp) { lb.removeEventListener('mouseup', lb._lbMouseUp); delete lb._lbMouseUp; }
    if (lb._lbKeyDown) { document.removeEventListener('keydown', lb._lbKeyDown); delete lb._lbKeyDown; }
    const img = document.getElementById('notesLightboxImg');
    if (img) {
        if (img._lbMouseDown) { img.removeEventListener('mousedown', img._lbMouseDown); delete img._lbMouseDown; }
        if (img._lbDblClick) { img.removeEventListener('dblclick', img._lbDblClick); delete img._lbDblClick; }
    }
    resetLightboxZoom();
}

// Paste gambar dari clipboard (Ctrl+V)
document.addEventListener('paste', (e) => {
    const modal = document.getElementById('notesModal');
    if (!modal || modal.style.display === 'none') return;
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    const imageFiles = [];
    for (const item of items) {
        if (item.type.startsWith('image/')) imageFiles.push(item.getAsFile());
    }
    if (imageFiles.length > 0) handleNoteImageFiles(imageFiles);
});

// === RICH TEXT EDITOR HELPERS ===
function noteExecCmd(cmd, value = null) {
    const el = document.getElementById('noteContent');
    if (el) el.focus();
    document.execCommand(cmd, false, value);
    setTimeout(_updateNoteFloatToolbar, 10);
}

function noteFormatBlock(tag) {
    const el = document.getElementById('noteContent');
    if (el) el.focus();
    document.execCommand('formatBlock', false, tag);
    setTimeout(_updateNoteFloatToolbar, 10);
}

function _updateNoteFloatToolbar() {
    const toolbar = document.getElementById('noteFloatToolbar');
    const nc = document.getElementById('noteContent');
    if (!toolbar || !nc) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim() || !nc.contains(sel.anchorNode)) {
        toolbar.classList.remove('visible');
        return;
    }

    // Active states
    document.getElementById('ftBold').classList.toggle('active', document.queryCommandState('bold'));
    document.getElementById('ftItalic').classList.toggle('active', document.queryCommandState('italic'));
    document.getElementById('ftUnder').classList.toggle('active', document.queryCommandState('underline'));

    // Position above selection center
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    toolbar.classList.add('visible');
    const tbW = toolbar.offsetWidth || 300;
    let left = rect.left + rect.width / 2;
    let top = rect.top;
    left = Math.max(tbW / 2 + 8, Math.min(left, window.innerWidth - tbW / 2 - 8));
    toolbar.style.left = left + 'px';
    toolbar.style.top = top + 'px';
    toolbar.style.transform = 'translate(-50%, calc(-100% - 10px))';
}

document.addEventListener('selectionchange', _updateNoteFloatToolbar);

function _renderNoteContent(content) {
    if (!content) return '';
    // HTML content — render langsung
    if (/<[a-zA-Z]/.test(content)) return content;
    // Plain text lama — escape & convert newline ke <br>
    return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

// === CRUD LOGIC ===
function getNotes() {
    const data = localStorage.getItem(NOTES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function renderNotes() {
    const container = document.getElementById('notesContainer');
    if (!container) return;

    let notes = getNotes();
    const now = Date.now();
    const msIn24h = 24 * 60 * 60 * 1000;
    let hasExpired = false;

    // FILTERING: Buang note yang sudah melewati Expired Time
    const validNotes = notes.filter(n => {
        if (n.expiryTS && now > n.expiryTS) {
            hasExpired = true;
            return false; // Buang
        }
        return true; // Simpan
    });

    if (hasExpired) {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(validNotes));
        notes = validNotes;
    }

    container.innerHTML = '';

    if (notes.length === 0) {
        container.innerHTML = `
        <div style="grid-column: 1 / -1; color:#8b949e; text-align:center; font-size:14px; margin-top:100px; padding: 40px; border: 2px dashed #30363d; border-radius: 8px;">
            📭 Belum ada catatan aktif saat ini.<br>Silakan isi form di sebelah kiri untuk membuat catatan baru.
        </div>`;
        return;
    }

    // Sorting: notes < 2 hari selalu di atas (newest first), sisanya urut severity P1→P2→P3 lalu newest
    const msIn2Days = 48 * 60 * 60 * 1000;
    const prioOrder = { P1: 0, P2: 1, P3: 2 };
    notes.sort((a, b) => {
        const aNew = (now - a.timestamp) < msIn2Days;
        const bNew = (now - b.timestamp) < msIn2Days;
        if (aNew && bNew) return b.timestamp - a.timestamp;
        if (aNew) return -1;
        if (bNew) return 1;
        const pa = prioOrder[a.prio] ?? 3;
        const pb = prioOrder[b.prio] ?? 3;
        if (pa !== pb) return pa - pb;
        return b.timestamp - a.timestamp;
    });
    notes.forEach(note => {
        const dateObj = new Date(note.timestamp);
        const shiftStr = getShiftString(dateObj);
        
        // Cek umur catatan, jika < 24 Jam, tampilkan Badge "NEW"
        const isNew = (now - note.timestamp) < msIn24h;
        const newBadgeHtml = isNew ? `<span style="background: #2ea043; color: white; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; margin-left: 10px; vertical-align: top; box-shadow: 0 0 8px rgba(46,160,67,0.6);">🆕 NEW</span>` : '';

        // Badge Priority
        let prioBadgeHtml = "";
        if (note.prio === "P1") {
            prioBadgeHtml = `<span style="background: #da3633; color: white; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; margin-left: 5px; vertical-align: top; box-shadow: 0 0 8px rgba(218,54,51,0.6);">🚨 P1 CRITICAL</span>`;
        } else if (note.prio === "P2") {
            prioBadgeHtml = `<span style="background: #e36209; color: white; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; margin-left: 5px; vertical-align: top; box-shadow: 0 0 8px rgba(227,98,9,0.6);">⚠️ P2 TROUBLE</span>`;
        } else if (note.prio === "P3") {
            prioBadgeHtml = `<span style="background: #e3b341; color: #0d1117; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; margin-left: 5px; vertical-align: top; box-shadow: 0 0 8px rgba(227,179,65,0.6);">ℹ️ P3 ATTENTION</span>`;
        }

        const createTimeStr = `🕒 ${formatDisplayTime(note.timestamp)} <span style="color:#f1e05a;">(${shiftStr})</span>`;
        
        // Desain Label Expired Time
        let expiryHtml = `<div style="color: #3fb950; font-size: 11px; font-weight: normal;">♾️ Permanen</div>`;
        if (note.expiryTS) {
            expiryHtml = `<div style="color: #ff7b72; font-size: 11px; font-weight: normal; background: rgba(218,54,51,0.1); border: 1px solid rgba(218,54,51,0.3); padding: 3px 8px; border-radius: 4px; display: inline-block;">⏳ Auto-Delete: <b>${formatDisplayTime(note.expiryTS)}</b></div>`;
        }

        container.innerHTML += `
        <div style="background: #21262d; border: 1px solid #30363d; border-radius: 8px; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: transform 0.2s;">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 15px 20px; border-bottom: 1px solid #30363d; background: #161b22; border-radius: 8px 8px 0 0;">
                <div>
                    <span style="color: #58a6ff; font-size: 15px; font-weight: bold;">👤 ${note.pic}</span>
                    ${newBadgeHtml}
                    ${prioBadgeHtml}
                </div>
                <div style="text-align: right;">
                    <span style="color: #c9d1d9; font-size: 12px; font-weight: 500;">${createTimeStr}</span>
                </div>
            </div>
            
            <div class="note-rich-content" style="flex: 1; padding: 20px; color: #c9d1d9; font-size: 14px; line-height: 1.6; word-break: break-word;">${_renderNoteContent(note.content)}</div>

            ${(note.images && note.images.length > 0) ? `
            <div style="padding: 0 20px 15px 20px; display:flex; flex-wrap:wrap; gap:8px;">
                ${note.images.map((src, imgIdx) => `
                <div onclick="openNotesLightbox('${src}')" title="Klik untuk perbesar" style="width:80px; height:80px; border-radius:5px; overflow:hidden; border:2px solid #30363d; cursor:zoom-in; flex-shrink:0; transition:0.15s;" onmouseover="this.style.borderColor='#58a6ff';" onmouseout="this.style.borderColor='#30363d';">
                    <img src="${src}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
                </div>`).join('')}
            </div>` : ''}
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-top: 1px dashed #30363d; background: #161b22; border-radius: 0 0 8px 8px;">
                <div>${expiryHtml}</div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="editNote(${note.id})" style="background: #21262d; border: 1px solid #30363d; color: #e3b341; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s;">✏️ Edit</button>
                    <button onclick="deleteNoteRequest(${note.id})" style="background: #21262d; border: 1px solid #30363d; color: #da3633; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s;">🗑️ Hapus</button>
                </div>
            </div>

        </div>`;
    });
}

function saveNote() {
    const idInput = document.getElementById('noteId').value;
    const picInput = document.getElementById('notePic').value;
    const prioInput = document.getElementById('notePrio').value;
    const _ncEl = document.getElementById('noteContent');
    let contentInput = _ncEl.innerHTML.trim();
    if (contentInput === '<br>' || contentInput === '<p><br></p>' || contentInput === '<div><br></div>') contentInput = '';
    const expiryInput = document.getElementById('noteExpiry').value;

    if (!picInput || picInput === "") {
        showNotesAlert("⚠️ DATA TIDAK LENGKAP", "Silakan pilih Nama PIC dari daftar dropdown terlebih dahulu.", true);
        return;
    }
    if (!prioInput || prioInput === "") {
        showNotesAlert("⚠️ DATA TIDAK LENGKAP", "Silakan pilih Priority catatan (P1/P2/P3).", true);
        return;
    }
    if (!contentInput) {
        showNotesAlert("⚠️ DATA TIDAK LENGKAP", "Isi catatan tidak boleh kosong!", true);
        return;
    }

    // Parse Expiry Time
    let expTimestamp = null;
    if (expiryInput) {
        expTimestamp = new Date(expiryInput).getTime();
        if (expTimestamp <= Date.now()) {
            showNotesAlert("⚠️ WAKTU TIDAK VALID", "Expired Time harus disetel di masa depan (waktu yang belum terjadi).", true);
            return;
        }
    }

    let notes = getNotes();

    const imageData = noteImages.map(img => img.base64);

    if (idInput) {
        const index = notes.findIndex(n => n.id == idInput);
        if (index > -1) {
            notes[index].pic = picInput;
            notes[index].prio = prioInput;
            notes[index].content = contentInput;
            notes[index].expiryTS = expTimestamp;
            notes[index].images = imageData;
        }
    } else {
        notes.push({
            id: Date.now(),
            pic: picInput,
            prio: prioInput,
            content: contentInput,
            timestamp: Date.now(),
            expiryTS: expTimestamp,
            images: imageData
        });
    }

    try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
        showNotesAlert("⚠️ PENYIMPANAN PENUH", "Gagal menyimpan — gambar terlalu besar untuk localStorage. Coba kurangi jumlah atau ukuran gambar.", true);
        return;
    }
    resetNoteForm();
    renderNotes();
}

function deleteNoteRequest(id) {
    showNotesConfirm("🗑️ KONFIRMASI HAPUS", "Apakah Anda yakin ingin menghapus catatan ini secara permanen?<br>Tindakan ini tidak dapat dibatalkan.", () => {
        let notes = getNotes();
        notes = notes.filter(n => n.id !== id);
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
        renderNotes();
    });
}

function editNote(id) {
    const notes = getNotes();
    const noteToEdit = notes.find(n => n.id === id);
    if (noteToEdit) {
        document.getElementById('noteId').value = noteToEdit.id;
        document.getElementById('notePic').value = noteToEdit.pic;
        // Tangani data lama yang belum punya Priority
        document.getElementById('notePrio').value = noteToEdit.prio || "P3"; 
        const _ncEdit = document.getElementById('noteContent');
        if (/<[a-zA-Z]/.test(noteToEdit.content)) {
            _ncEdit.innerHTML = noteToEdit.content;
        } else {
            _ncEdit.innerHTML = noteToEdit.content
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>');
        }
        
        if (noteToEdit.expiryTS) {
            document.getElementById('noteExpiry').value = formatForInput(noteToEdit.expiryTS);
        } else {
            document.getElementById('noteExpiry').value = "";
        }
        
        // Load gambar existing
        noteImages = (noteToEdit.images || []).map((base64, i) => ({ base64, name: `Gambar ${i+1}` }));
        renderNoteImagePreview();

        document.getElementById('btnSaveNote').innerHTML = "💾 SIMPAN PERUBAHAN";
        document.getElementById('btnSaveNote').style.background = "#e3b341";
        document.getElementById('btnSaveNote').style.color = "#000000";
        document.getElementById('btnCancelEdit').style.display = "block";

        // Scroll ke atas form
        const panel = document.querySelector('#notesModal > div > div:first-child');
        if (panel) panel.scrollTop = 0;
    }
}

function resetNoteForm() {
    document.getElementById('noteId').value = "";
    document.getElementById('notePic').value = "";
    document.getElementById('notePrio').value = "";
    document.getElementById('noteContent').innerHTML = "";
    document.getElementById('noteExpiry').value = "";

    noteImages = [];
    renderNoteImagePreview();

    document.getElementById('btnSaveNote').innerHTML = "➕ SIMPAN CATATAN";
    document.getElementById('btnSaveNote').style.background = "#238636";
    document.getElementById('btnSaveNote').style.color = "white";
    document.getElementById('btnCancelEdit').style.display = "none";
}

// === SYSTEM WINDOW CONTROLS ===
function openNotes() {
    const oldModal = document.getElementById('notesModal');
    if (oldModal) oldModal.remove();

    createNotesModal();
    document.getElementById('notesModal').style.display = 'flex'; 
    resetNoteForm();
    renderNotes();
}

function closeNotes() {
    const m = document.getElementById('notesModal');
    if (m) m.style.display = 'none';
}