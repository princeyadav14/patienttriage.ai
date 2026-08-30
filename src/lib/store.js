// store - centralised state via a reducer.
// Owns the clock, the arrivals and queue, surge mode, and the audit log.
// Handles triage start/commit, waiting-room reassessment, treatment moves,
// and surge enter/exit and simulation. Also exports selectors (stats) and
// helpers (safeWaitFor, waitStatus, sortForBoard).

import SITE from "../config/site";
import { triage } from "../engine/triageEngine";
import { patients as SAMPLE, arrivals as SAMPLE_ARRIVALS } from "../data/patients";
import { resample } from "../data/deviceFeed";

// ---------------------------------------------------------------------------
// Safe-wait policy
// ---------------------------------------------------------------------------

/** Minutes a patient at this acuity may wait before a recheck is due. */
export function safeWaitFor(acuity, mode) {
  const base = SITE.safeWaitMinutes[acuity] ?? 60;
  // In surge, rechecks tighten rather than relax. The temptation is the
  // opposite, and the temptation is how people get missed.
  return mode === "surge" ? Math.round(base * SITE.surge.recheckTightenFactor) : base;
}

/** "ok" | "due" | "overdue" for a queue item at the current clock. */
export function waitStatus(item, clockMin, mode) {
  const safe = safeWaitFor(item.acuity, mode);
  const since = clockMin - item.lastCheckMin;
  if (safe <= 0) return since > 0 ? "due" : "ok";
  if (since >= safe * 1.5) return "overdue";
  if (since >= safe) return "due";
  return "ok";
}

/** Door-to-triage status for someone who has not been seen yet. */
export function doorStatus(arrival, clockMin) {
  const waited = clockMin - arrival.arrivedAtMin;
  const target = SITE.doorToTriageTargetMinutes;
  if (waited >= target * 1.5) return "overdue";
  if (waited >= target) return "due";
  return "ok";
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const START_CLOCK = 75; // department has been open a while; the board is not empty

function seedQueue(clockMin) {
  // Pre-triaged patients so the application never opens on an empty board.
  // the single cheapest change to how the product reads.
  const seedIds = ["P01", "P03", "P05", "P06", "P13", "P14", "P18", "P07", "P04", "P09", "P10", "P17"];
  return seedIds
    .map((id) => SAMPLE.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => {
      const triagedAt = Math.max(0, clockMin - (p.arrivedAt ?? 20));
      const result = triage(p, { vitalsAgeMinutes: 0 });
      return makeQueueItem(p, result, triagedAt, {
        acuity: result.acuity,
        status: p.id === "P01" || p.id === "P03" ? "treatment" : "waiting",
      });
    });
}

let __itemSeq = 0;
function makeQueueItem(record, result, atMin, extra = {}) {
  return {
    key: `${record.id}-${atMin}-${__itemSeq++}`,
    record,
    result,
    systemAcuity: result.acuity,
    acuity: extra.acuity ?? result.acuity,
    overridden: false,
    overrideReason: null,
    nurseUnsure: !!record.nurseUnsure,
    triagedAtMin: atMin,
    lastCheckMin: atMin,
    vitalsCapturedAtMin: atMin,
    reassessments: [],
    status: extra.status || "waiting",
    ...extra,
  };
}

export function initialState() {
  const clockMin = START_CLOCK;
  return {
    clockMin,
    mode: "normal",
    surgeEnteredAtMin: null,
    surgeManual: false,
    arrivals: SAMPLE_ARRIVALS.map((a) => ({
      ...a,
      arrivedAtMin: Math.max(0, clockMin - a.arrivedAt),
    })),
    queue: seedQueue(clockMin),
    log: [],
    suppressedAlerts: 0,
    tab: "board",
    activeDraft: null,   // patient being triaged right now
    focusPatient: null,  // queue key open on the Patient tab
  };
}

// ---------------------------------------------------------------------------
// Audit entries: full decision provenance
//
// produce: what the system saw, what it recommended, how sure it was, what the
// clinician decided, and under which autonomy level and jurisdiction.
// ---------------------------------------------------------------------------
let auditSeq = 0;

function auditEntry({ action, item, clockMin, clinician = {}, extra = {} }) {
  const r = item.result;
  return {
    id: `AUD-${String(++auditSeq).padStart(5, "0")}`,
    action,
    atMin: clockMin,
    at: new Date().toISOString(),
    patient: {
      id: item.record.id,
      mrn: item.record.mrn,
      name: item.record.name,
      age: item.record.age,
      band: r.bandLabel,
    },
    observed: {
      complaint: item.record.complaint,
      vitals: { ...item.record.vitals },
      pain: item.record.pain,
      appearance: item.record.appearance,
      completeness: r.dataCompleteness,
    },
    system: {
      acuity: r.acuity,
      decidedBy: r.decidedBy,
      aggregate: r.aggregateScore,
      confidence: r.confidence.level,
      confidenceReasons: r.confidence.reasons,
      drivers: r.drivers.map((d) => d.text),
      redFlags: r.redFlags,
      escalated: r.safety.escalated,
      safetyReasons: r.safety.reasons,
    },
    clinician: {
      acuity: clinician.acuity ?? item.acuity,
      reason: clinician.reason ?? null,
      note: clinician.note ?? null,
      unsure: !!clinician.unsure,
      actor: clinician.actor || "N. Rao (triage nurse)",
    },
    governance: {
      autonomyLevel: SITE.autonomyLevel,
      siteId: SITE.id,
      jurisdiction: SITE.jurisdiction,
    },
    ...extra,
  };
}

/** A surge suppression is still a decision, so it is still logged. */
function suppressionEntry(count, clockMin, on) {
  return {
    id: `AUD-${String(++auditSeq).padStart(5, "0")}`,
    action: on ? "surge-on" : "surge-off",
    atMin: clockMin,
    at: new Date().toISOString(),
    patient: null,
    observed: null,
    system: null,
    clinician: { actor: "S. Kaur (charge nurse)" },
    governance: { autonomyLevel: SITE.autonomyLevel, siteId: SITE.id, jurisdiction: SITE.jurisdiction },
    surge: {
      waiting: count,
      suppressAtOrBelow: SITE.surge.suppressAlertsAtOrBelowAcuity,
      recheckFactor: SITE.surge.recheckTightenFactor,
    },
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function reducer(state, action) {
  switch (action.type) {
    // -- clock ------------------------------------------------------------
    case "TICK": {
      const clockMin = state.clockMin + 1;
      let next = { ...state, clockMin };
      // Surge is entered and exited on department load, with hysteresis so it
      // does not flap. A charge nurse can always override manually.
      if (!state.surgeManual) {
        const waiting = state.queue.filter((q) => q.status === "waiting").length + state.arrivals.length;
        if (state.mode === "normal" && waiting >= SITE.surge.enterAtWaiting) {
          next = enterSurge(next, waiting);
        } else if (state.mode === "surge" && waiting <= SITE.surge.exitAtWaiting) {
          next = exitSurge(next, waiting);
        }
      }
      return next;
    }

    case "SET_TAB":
      return { ...state, tab: action.tab };

    // -- triage flow -------------------------------------------------------
    case "START_TRIAGE": {
      // Opened FROM a patient, never from a blank slate.
      return {
        ...state,
        tab: "triage",
        activeDraft: action.draft,
        arrivals: action.arrivalId
          ? state.arrivals.filter((a) => a.id !== action.arrivalId)
          : state.arrivals,
      };
    }

    case "UPDATE_DRAFT":
      return { ...state, activeDraft: { ...state.activeDraft, ...action.patch } };

    case "CANCEL_TRIAGE":
      return { ...state, activeDraft: null, tab: "board" };

    case "COMMIT": {
      const { record, result, clinicianAcuity, reason, note, unsure } = action;
      const overridden = clinicianAcuity !== result.acuity;
      const item = makeQueueItem(record, result, state.clockMin, {
        acuity: clinicianAcuity,
        overridden,
        overrideReason: overridden ? reason : null,
        nurseUnsure: !!unsure,
      });
      const entry = auditEntry({
        action: overridden ? "override" : "accept",
        item,
        clockMin: state.clockMin,
        clinician: { acuity: clinicianAcuity, reason: overridden ? reason : null, note, unsure },
      });
      return {
        ...state,
        queue: [...state.queue, item],
        log: [entry, ...state.log],
        activeDraft: null,
        tab: "board",
      };
    }

    // -- waiting-room monitoring ------------------------------------------
    case "REASSESS": {
      const { key, outcome } = action;
      const idx = state.queue.findIndex((q) => q.key === key);
      if (idx < 0) return state;
      const prev = state.queue[idx];

      const newVitals = resample(prev.record.vitals, outcome);
      const record = { ...prev.record, vitals: newVitals };
      const result = triage(record, { vitalsAgeMinutes: 0 });

      const next = {
        ...prev,
        record,
        result,
        systemAcuity: result.acuity,
        // A recheck may raise the acuity. It never silently lowers a level a
        // clinician has already committed to: that would be the system
        // overruling a person, which is not a thing this product does.
        acuity: Math.min(prev.acuity, result.acuity),
        lastCheckMin: state.clockMin,
        vitalsCapturedAtMin: state.clockMin,
        reassessments: [
          ...prev.reassessments,
          { atMin: state.clockMin, outcome, from: prev.acuity, to: Math.min(prev.acuity, result.acuity) },
        ],
      };

      const queue = [...state.queue];
      queue[idx] = next;

      const entry = auditEntry({
        action: "reassess",
        item: next,
        clockMin: state.clockMin,
        clinician: { acuity: next.acuity, reason: `Re-assessment: ${outcome}` },
        extra: { reassessment: { outcome, from: prev.acuity, to: next.acuity } },
      });

      return { ...state, queue, log: [entry, ...state.log] };
    }

    case "MOVE_TO_TREATMENT": {
      const queue = state.queue.map((q) =>
        q.key === action.key ? { ...q, status: "treatment", lastCheckMin: state.clockMin } : q
      );
      return { ...state, queue };
    }

    case "FOCUS_PATIENT":
      return { ...state, focusPatient: action.key, tab: "patient" };

    // -- surge -------------------------------------------------------------
    case "SET_SURGE": {
      const waiting = state.queue.filter((q) => q.status === "waiting").length + state.arrivals.length;
      const base = { ...state, surgeManual: true };
      return action.on ? enterSurge(base, waiting, true) : exitSurge(base, waiting, true);
    }

    case "SIMULATE_SURGE": {
      // Triple the arrival rate: inject two more cohorts of realistic patients
      // with staggered arrival times. NOTE what this does NOT do: it does not
      // touch, replace or clear the existing queue.
      // Guard: don't stack a second identical surge if one was already injected.
      if (state.queue.some((q) => String(q.record.id).includes("-s"))) {
        return enterSurge(state, state.queue.length + state.arrivals.length);
      }
      const cohorts = [1, 2].flatMap((wave) =>
        SAMPLE.filter((p) => !["P01", "P03"].includes(p.id)).map((p, i) => {
          const record = { ...p, id: `${p.id}-s${wave}`, mrn: p.mrn ? `${p.mrn}-${wave}` : null };
          // Stagger triage times across a realistic 0-40 min window so some
          // patients read as due/overdue for the demo without waits ballooning
          // into implausible multi-hour numbers.
          const triagedAt = Math.max(0, state.clockMin - ((i * 5 + wave * 8) % 40));
          const result = triage(record, { vitalsAgeMinutes: 0 });
          return makeQueueItem(record, result, triagedAt, { acuity: result.acuity });
        })
      );
      const waiting = state.queue.length + cohorts.length + state.arrivals.length;
      const next = { ...state, queue: [...state.queue, ...cohorts] };
      return enterSurge(next, waiting);
    }

    default:
      return state;
  }
}

function enterSurge(state, waiting, manual = false) {
  if (state.mode === "surge") return state;
  return {
    ...state,
    mode: "surge",
    surgeEnteredAtMin: state.clockMin,
    surgeManual: manual ? true : state.surgeManual,
    log: [suppressionEntry(waiting, state.clockMin, true), ...state.log],
  };
}

function exitSurge(state, waiting, manual = false) {
  if (state.mode === "normal") return state;
  return {
    ...state,
    mode: "normal",
    surgeEnteredAtMin: null,
    surgeManual: manual ? true : state.surgeManual,
    log: [suppressionEntry(waiting, state.clockMin, false), ...state.log],
  };
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function selectStats(state) {
  const waitingList = state.queue.filter((q) => q.status === "waiting");
  const overdue = waitingList.filter((q) => waitStatus(q, state.clockMin, state.mode) !== "ok");
  const lowConf = waitingList.filter((q) => q.result.confidence.level === "Low");
  const longest = waitingList.reduce(
    (max, q) => Math.max(max, state.clockMin - q.triagedAtMin),
    0
  );
  const inTreatment = state.queue.filter((q) => q.status === "treatment").length;

  return {
    waiting: waitingList.length,
    awaitingTriage: state.arrivals.length,
    overdue: overdue.length,
    lowConfidence: lowConf.length,
    escalated: waitingList.filter((q) => q.result.safety.escalated).length,
    longestWait: longest,
    inTreatment,
    baysFree: Math.max(0, SITE.treatmentBays - inTreatment),
    load: Math.round((waitingList.length / SITE.surge.enterAtWaiting) * 100),
  };
}

/** Board ordering: acuity first, then who has waited longest. */
export function sortForBoard(items, clockMin) {
  return [...items].sort((a, b) => {
    if (a.acuity !== b.acuity) return a.acuity - b.acuity;
    return (clockMin - b.triagedAtMin) - (clockMin - a.triagedAtMin);
  });
}

/**
 * Should this patient's alert be shown, given the department state?
 * In surge, routine alerts go quiet so the escalations stay visible. Every
 * suppression is countable and auditable: silence is a decision too.
 */
export function alertVisible(item, mode) {
  if (mode !== "surge") return true;
  if (item.result.safety.escalated) return true;
  return item.acuity <= SITE.surge.suppressAlertsAtOrBelowAcuity - 1;
}
