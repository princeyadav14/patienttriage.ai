# PatientTriage.ai

An AI decision-support prototype for emergency department (ED) triage. It helps
a triage nurse assign an acuity level (ESI 1 to 5) to arriving patients, monitors
the waiting room for patients who need re-checking, and keeps a full audit trail
of every decision. It is designed to support clinical judgement, never to replace
it: a licensed clinician commits every decision.

This is a working proof-of-concept built with React. It runs entirely in the
browser on synthetic patient data. It is not a medical device and is not for
clinical use.

---

## Table of contents

1. [What it does](#what-it-does)
2. [Running it locally](#running-it-locally)
3. [The screens](#the-screens)
4. [How the scoring works](#how-the-scoring-works)
5. [Confidence and safety design](#confidence-and-safety-design)
6. [Waiting-room monitoring and surge](#waiting-room-monitoring-and-surge)
7. [Configuration](#configuration)
8. [Project structure](#project-structure)
9. [Tech stack](#tech-stack)
10. [Limitations](#limitations)

---

## What it does

At patient arrival, a nurse enters the vitals and a few observations. The system
returns a recommended acuity level, the plain-language reasons behind it, and a
confidence indicator. The nurse reviews it and either accepts it or overrides it
with a reason. Every action is logged.

Beyond the first decision, the system tracks how long each waiting patient has
gone without a re-check against a safe-wait policy, and flags anyone who is due.
Re-checking a patient re-runs the same scoring engine on fresh observations.

Core capabilities:

- Acuity scoring across ESI Levels 1 to 5, calibrated by age band.
- A two-layer engine: deterministic red-flag rules, then a weighted score.
- Explicit confidence on every recommendation.
- A bias toward escalation when the system is uncertain.
- Waiting-room monitoring with safe-wait thresholds.
- A surge mode that changes department behaviour under load.
- Clinician override capture and a full audit log.

---

## Running it locally

You need [Node.js](https://nodejs.org) version 18 or newer.

```bash
npm install     # first time only, installs dependencies
npm run dev     # starts the dev server
```

The terminal automatically opens the app in the browser on a local address. If not, then the terminal prints a local address, usually `http://localhost:5173/`. Open it
in a browser.

Other commands:

```bash
npm run build     # produce a production build in dist/
npm run preview   # serve the production build locally
```

A simulated department clock runs while the app is open (one department minute
every few seconds), so recheck timers and wait times advance during use.

---

## The screens

The app has three tabs.

### Board

The live waiting room and the home screen. It has three lanes:

- **Not yet triaged** — patients who have arrived; their door-to-triage clock is
  running. Click one to triage them.
- **Waiting** — triaged patients being monitored. Rows show acuity, confidence,
  time waited, and recheck status. A row turns amber when it passes the safe wait
  for its level, and red when well overdue.
- **In treatment** — patients moved off the waiting clock.

The board also holds the surge control and a safety counter-metric panel
(escalation rate and override rate across the shift).

### Triage

A two-panel screen for assessing one patient.

- **Left (intake):** a patient header, the vitals block, and the observed block.
  Vitals are heart rate, SpO2, systolic BP, temperature, and a manually counted
  respiratory rate. On-oxygen status is a toggle inside the SpO2 tile. Observed
  inputs are the presenting complaint, consciousness (ACVPU), general appearance,
  and pain score.
- **Right (recommendation):** appears once the nurse confirms the vitals. It
  shows the recommended acuity level, which layer produced it, the scoring
  drivers with their weights, and a confidence indicator. Below it is the nurse's
  own acuity field with an inline override (pick a level, then a reason). After
  the first confirmation the recommendation updates live as observations change.

Confirmation is blocked until the minimum vitals are present (heart rate, SpO2,
respiratory rate, and consciousness).

### Audit Log

A role-restricted record of every decision this shift: what the system
recommended, its confidence and drivers, what the clinician committed, and any
override reason, each with a timestamp.

---

## How the scoring works

Every patient passes through two layers behind a single interface: patient in,
`{ acuity, drivers, confidence, safety }` out.

### Layer 1: red-flag rules (deterministic)

A fixed list of hard danger signs, checked first. If any fires, the patient is
escalated immediately and the scoring layer is skipped. This layer never depends
on a confidence value, so the most dangerous cases cannot be softened by a low
score. Examples: critical hypoxia (SpO2 at or below the critical threshold), any
consciousness state other than Alert, age-banded extreme heart or respiratory
rate, hypotension, a hard-stop fever, and red-flag complaints such as chest pain
or stroke symptoms. Every fired rule names itself.

### Layer 2: weighted score

For patients who pass Layer 1, each vital is given a sub-score of 0 to 3 based on
how far it sits from normal **for the patient's age band**. Adult sub-scores
follow the NEWS2 (National Early Warning Score 2) chart; paediatric bands use
simplified, illustrative ranges because children run higher normal heart and
respiratory rates. The sub-scores are summed into an aggregate, which maps to an
acuity level. Each contributing vital is shown as a driver with the points it
added, so the recommendation is explainable by construction.

Age banding is the key safety feature here: applying a single adult-calibrated
model to a child would misread a normal toddler heart rate as dangerous. The
bands prevent that.

---

## Confidence and safety design

Confidence is computed separately from the acuity level. It falls when there is
less to go on: a first-time patient with no history, missing vitals, an ambiguous
presentation (see `src/engine/ambiguity.js`), or a score sitting near the
boundary between two levels.

Two safety behaviours follow from this:

- **Bias to escalation.** When confidence is low and the score is near a
  boundary, the system rounds toward the more urgent level, not the safer one.
  Under-triage (missing a sick patient) is treated as worse than over-triage.
- **Clinical ceilings.** Severe pain and a sick general appearance each cap the
  acuity at a more urgent level regardless of vitals, following ESI decision
  logic.

Because the system is deliberately biased toward escalation, the Board shows a
counter-metric (escalation rate and override rate) so over-escalation can be
watched rather than assumed away.

---

## Waiting-room monitoring and surge

Each triaged patient has a safe-wait time based on their acuity level (more
urgent patients have shorter safe waits). The system tracks time since the last
check and flags patients who are due or overdue. Re-checking a patient records
an outcome (improved, no change, worse) and re-runs both engine layers on the
updated observations, which can raise the acuity.

Surge mode represents a state the whole department is in, not a data load. It can
be entered manually with the toggle in the status bar, or triggered by simulating
a rush of arrivals from the Board. In surge, recheck intervals tighten and
routine low-acuity alerts are suppressed (and every suppression is logged). The
patient queue is never cleared by entering or leaving surge.

---

## Configuration

Everything that would vary by hospital lives in `src/config/site.js`: the
hospital name and jurisdiction, the safe-wait policy per acuity level, the surge
enter/exit thresholds and behaviour, the safety ceilings, the geriatric
weighting, and the quick-complaint terms. Adapting the app to a different
hospital is a configuration change, not a code change.

---

## Project structure

```
src/
  main.jsx                 entry point
  App.jsx                  shell, routing, clock, triage flow
  styles.css               design system and all styling

  engine/
    triageEngine.js        the two-layer scoring pipeline
    redFlags.js            Layer 1 deterministic rules
    thresholds.js          age bands, NEWS2 sub-scores, danger zones
    ambiguity.js           derives presentation ambiguity for confidence

  lib/
    store.js               reducer holding all state, plus selectors/helpers
    format.js              time, age, and label display helpers

  config/
    site.js                per-hospital configuration

  data/
    patients.js            synthetic patient scenarios
    deviceFeed.js          simulated monitor feed for vitals

  components/
    StatusBar.jsx          persistent top strip with the mode toggle
    BoardView.jsx          live board, surge control, counter-metric
    IntakeForm.jsx         triage capture (left panel)
    VitalsBlock.jsx        vital entry and confirmation
    ObservedBlock.jsx      complaint, consciousness, appearance, pain
    RecommendationCard.jsx recommendation plus the nurse's decision
    PatientView.jsx        single-patient detail and timeline
    PatientHeader.jsx      identity band
    AuditLogView.jsx       audit log screen
    AuditLog.jsx           the audit entry list
    ConfidenceMeter.jsx    reusable confidence indicator
    ui.js                  shared acuity/confidence/layer labels
```

The engine (`src/engine/`) is plain JavaScript with no UI dependencies. It runs
in the browser; there is no backend server. In a production system, the same
engine would sit behind a hospital API and the scoring layer could be replaced by
a model trained on real ED data without changing the rest of the system.

---

## Tech stack

- **React 18** with **Vite** for the build and dev server.
- Plain JavaScript for the engine and state (a `useReducer`-based store).
- No backend, no database, no external services. State lives in memory for the
  session.

---

## Limitations

- This is a proof-of-concept on **synthetic data**, not real patients.
- The scoring layer is a transparent, rules-and-weights stand-in. Adult
  thresholds follow NEWS2; paediatric bands are simplified and illustrative and
  would need clinical validation before any real use.
- There is no persistence: refreshing the page resets all state.
- It is **not a medical device** and must not be used for clinical decisions.
