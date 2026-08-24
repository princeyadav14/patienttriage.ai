# PatientTriage.ai — Prototype

An AI triage decision-support web app. Two-layer engine (deterministic red-flag
rules + a transparent weighted scoring layer), age-banded thresholds, explicit
confidence, bias-to-escalation under uncertainty, a live waiting-room monitor
with safe-wait thresholds, a 3× surge simulation, and clinician override with a
full audit log.

Team NodeBuild · Accenture Innovation Challenge 2026

---

## What you need installed (one-time)

You only need **Node.js** (version 18 or newer). That's it.

- Check if you have it: open a terminal and run `node -v`
  - If it prints something like `v20.x.x`, you're set.
  - If it says "command not found", install Node from https://nodejs.org
    (download the "LTS" version, run the installer, restart your terminal).

npm (the package manager) comes bundled with Node, so you don't install it
separately.

---

## How to run it (3 steps)

Open a terminal, then:

```bash
# 1. go into the project folder
cd triage-app

# 2. install the dependencies (only needed the first time, ~30 seconds)
npm install

# 3. start the app
npm run dev
```

After step 3, the terminal prints a local address, usually:

```
  ➜  Local:   http://localhost:5173/
```

Open that link in your browser (it may open automatically). The app is running.

To stop it, press `Ctrl + C` in the terminal.

---

## How to demo it (walk the judges through this)

**Tab 1 — Triage**
1. Use the "Load a sample patient" dropdown to pick a case.
2. Press **Assess patient**. The recommendation appears on the right.
3. Try these specific cases to show the key features:
   - **P01 (chest pain)** → rule layer fires instantly, Level 1, red banner.
   - **P04 (3-year-old, fever)** → Level 4, calm. Point out an adult-calibrated
     model would WRONGLY escalate this child on HR 138 / BP 100. This is the
     age-banding safety point.
   - **P07 or P17 (ambiguous)** → **Low confidence**, with the reason shown.
   - **P08 (first-time, missing BP)** → **Low confidence** (no history + missing vital).
   - **P20 (geriatric, ambiguous)** → watch it **escalate one level** for safety
     (low confidence near a boundary) — the driver list says so explicitly.
4. Press **Accept & route** or **Override** on any case. Override lets you pick a
   different level + a preset reason.

**Tab 2 — Waiting Room**
- Press **Simulate surge (3×)** to load 3× volume (60 patients). Watch them
  auto-sort by acuity, and rows turn amber/red as they pass their safe-wait time.
- Click a "Recheck due" or "RE-ASSESS NOW" flag to simulate re-assessment — new
  (worsened) vitals re-run the same two-layer engine and the row updates.

**Tab 3 — Audit Log**
- Every accept, override, and re-assessment is recorded with timestamp, what the
  AI recommended, its confidence and drivers, and what the clinician chose.

---

## How it maps to the brief's Minimum Prototype Expectations

| Requirement | Where |
|---|---|
| 15–20 simulated patients | 20 in `src/data/patients.js` |
| Ambiguous presentation | P07, P17, P20 |
| Pediatric / geriatric case | P04, P05 (pediatric); P03, P06, P15, P18, P20 (geriatric) |
| Zero-history patient | P02, P08, P15, P19 |
| 3× surge behaviour | "Simulate surge" button in Waiting Room |
| Confidence on every score | Shown on every recommendation; never hidden |
| Clinician override + logging | Override button + Audit Log tab |

---

## Project structure

```
triage-app/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.jsx              app entry
    ├── App.jsx              main component: tabs, state, surge, override, log
    ├── styles.css           Round 1 theme (purple/pink/teal)
    ├── engine/
    │   ├── thresholds.js    age-banded NEWS2-based vital thresholds
    │   ├── redFlags.js      LAYER 1: deterministic hard danger signs
    │   └── triageEngine.js  LAYER 2: weighted scoring + confidence + escalation
    ├── data/
    │   └── patients.js      20 synthetic patients (all required case types)
    └── components/
        ├── IntakeForm.jsx
        ├── RecommendationCard.jsx
        ├── OverrideModal.jsx
        ├── QueueView.jsx
        ├── AuditLog.jsx
        └── ui.js            shared acuity labels + safe-wait thresholds
```

The engine (`src/engine/`) is plain JavaScript with no UI dependencies. It runs
in the browser — no backend server needed for the demo. In production, the same
engine sits behind a hospital API and the scoring layer is replaced by a model
trained on real ED data (e.g. MIMIC-IV-ED); nothing else changes.

---

## Optional: put it online for the pitch

To share a live link instead of running locally:

```bash
npm run build
```

This creates a `dist/` folder. Drag that folder onto https://app.netlify.com/drop
(free, no account needed) and you get a public URL in seconds.

---

## Important honesty notes (for Q&A)

- The scoring layer is a transparent proof-of-concept stand-in for a model that
  would be trained on real ED data in production. Its thresholds are illustrative
  (based on NEWS2 for adults, simplified pediatric bands) and would require
  clinical validation before real use.
- Patients are hand-crafted synthetic records, not real data.
- This is decision support with a human always in the loop — not a cleared
  medical device.
