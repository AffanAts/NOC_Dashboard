// alarm_worker.js — Web Worker Timer
// Tujuan: Jalankan interval di dalam Worker agar tidak kena browser tab throttling.
// Worker tidak punya akses ke DOM/window, jadi hanya kirim sinyal "tick" ke main thread.

const INTERVALS = {
    alarm:          10000,  // 10 detik — alarm scanner (grafana & opm)
    panic:          10000,  // 10 detik — panic scanner
    prtg:           15000,  // 15 detik — prtg scanner
    shift:          10000,  // 10 detik — shift alarm checker
    grafana_custom: 10000,  // 10 detik — custom grafana alarm scanner
    masterui:       10000   // 10 detik — master UI updater
};

Object.entries(INTERVALS).forEach(([name, ms]) => {
    setInterval(() => {
        postMessage({ tick: name });
    }, ms);
});
