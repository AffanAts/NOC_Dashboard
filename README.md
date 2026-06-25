# NOC Monitoring Dashboard

> A centralized, real-time monitoring dashboard built for a 24×7 Network Operations Center (NOC) environment in the **banking sector**. Aggregates metrics from Grafana, OpManager, Kibana/Elasticsearch, and PRTG into a single operational view — significantly improving shift handover efficiency and incident response time.

**All data in this repository is fully anonymized dummy data. No real IPs, hostnames, credentials, or internal identifiers are present.**

---

## Live Demo

🔗 [View on Vercel](https://noc-dashboard.vercel.app) <!-- update this link after deploy -->

---

## Screenshots

| | |
|---|---|
| ![Main Dashboard](src/img/aplikasi/Screenshot%202026-06-25%20at%2018.09.09.png) | ![OpManager Alarms](src/img/aplikasi/Screenshot%202026-06-25%20at%2018.09.24.png) |
| ![Grafana CPU Monitor](src/img/aplikasi/Screenshot%202026-06-25%20at%2018.09.38.png) | ![Kibana Channels](src/img/aplikasi/Screenshot%202026-06-25%20at%2018.09.55.png) |
| ![PRTG Status](src/img/aplikasi/Screenshot%202026-06-25%20at%2018.10.09.png) | |

---

## Features

### Infrastructure Monitoring (Grafana + OpManager)
- Real-time visibility into **400–500 Linux servers** via Grafana (CPU, Memory, Disk, Availability)
- Windows Server and **Palo Alto Firewall** monitoring via ManageEngine OpManager
- Alert triage with IP role identification, system pattern recognition, and basic connectivity analysis
- Priority-based alarm view — critical and transaction-related infrastructure surfaced first

### Log-Based Analytics (Kibana / Elasticsearch)
- Business transaction monitoring: tracks RC (Response Code) statuses across multiple billers
- Streak-based alert indicators — channels with consecutive failures rendered as red bars
- Visual grouping of degraded channels for fast operational triage

### PRTG Network Monitoring
- MPLS and Internet link status aggregated from PRTG
- Priority site detection with escalation-ready copy-to-clipboard WhatsApp message format

### Incident Triage Tools
- **OpManager ticket view** — alarm duration tracking with blink indicators for fresh alerts (5–10 min window)
- **Panic button simulation** — rapid firewall interface status verification with SOC escalation flow
- **IP Checker** — lookup tool for quick host classification during incidents
- **EOS Report** — End-of-Service network device reporting utility

### Operational Efficiency
- Shift handover log with structured follow-up tracking
- Dummy data fill buttons for demo/training scenarios
- Fully static frontend — no backend required, zero external API calls

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Data format | JSON (static, dummy) |
| Charts & visualization | Custom canvas rendering |
| Deployment | Vercel (static hosting) |
| Monitoring sources (real env) | Grafana, OpManager, Kibana, PRTG |

---

## Project Structure

```
├── index.html              # Main dashboard (master grid view)
├── prtg_modal.html         # PRTG status overlay
├── ip_checker.html         # IP lookup utility
├── page/
│   ├── grafana/            # Availability, CPU, Memory, Disk monitors
│   ├── opmanager/          # OpManager alarm widget + ticket view
│   ├── kibana/             # Kibana channel alert widget
│   ├── tools/              # Shift handover, EOS report, ITSM tools
│   └── core/               # Alarm engine, sound alerts
├── Data_JSON/              # Static dummy data (anonymized)
│   ├── grafana/            # Time-series CPU/Memory/Availability data
│   ├── kibana/             # Channel alert aggregation results
│   └── history_opmanager.json
└── src/
    ├── img/                # Icons and assets
    └── lib/                # ExcelJS, html2canvas
```

---

## Data Privacy

This is a **portfolio-safe, public version** of an internal operational tool. All sensitive data has been removed or replaced:

| Data type | Handling |
|---|---|
| IP addresses | Replaced with `10.20.x.x` dummy range |
| Hostnames / VM names | Replaced with `node-xxxx` random codes |
| Location names | Replaced with generic identifiers (kota-a, kota-b, etc.) |
| Company branding | Removed |
| Credentials / API keys | Never stored in frontend |
| Backend infrastructure | Not included in this repository |

---

## About the Author

**Affan** — Cybersecurity-oriented engineer with a strong foundation in network operations.

Currently serving as a **Level 1 NOC Engineer** in the banking sector, operating in a 24×7 rotational shift to help keep critical services available and reliable.

**Focus areas:** Vulnerability Assessment · Penetration Testing · Incident Response · SOC Operations

Background spans NOC operations, Front-End Development, and Quality Assurance — combining technical resilience, performance awareness, and user impact.

**Key operational experience:**
- Monitored 400–500 Linux servers (Grafana) and 140+ Windows servers + Palo Alto Firewalls (OpManager)
- Business transaction monitoring via Elasticsearch/Kibana — tracking RC statuses across billers
- First-level incident response for priority networks (ATM downtime, firewall interface verification)
- "Panic button" escalation drills — rapid status verification and SOC handoff
- Built this dashboard using AI-assisted development to consolidate metrics from multiple tools

---

## Context & Limitations

This repository is a **portfolio showcase**, not a production-ready application.

The original tool was built under real constraints:

- **Standardized, locked-down workstation** — the NOC PC is governed by CISO policy. Installing Node.js, package managers, or dev toolchains was not permitted.
- **Not an application team role** — as a NOC Engineer, I had no access to internal CI/CD pipelines, deployment infrastructure, or development environments. This was built entirely within what was available on a shift workstation.
- **Python scripts + PowerShell** were used as the only available backend alternatives to fetch data from internal monitoring APIs (Grafana, OpManager, PRTG) and serve it locally. This public version removes all backend logic and runs as a fully static site with dummy JSON data.

The goal was never to showcase software architecture — it was to **solve a real operational problem with the tools available**: consolidating fragmented monitoring systems into one view, mid-shift, under access restrictions.

It worked. It was used in production.

---

## License

This project is shared publicly for **portfolio purposes only**.  
The design, structure, and tooling patterns reflect real operational workflows — with all sensitive data anonymized.
