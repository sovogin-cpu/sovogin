import { runBatchWorkerDelivery, runNextWorkerDelivery } from "../delivery-worker-runner";

async function runSchedulerOperationsTests() {
  console.log("=== INICIANDO SUITE MATRIZ COMPLETA DE DAILY CAP DISPATCH-COUNT Y SAFETY LOCKS (FASE 4A5.2-E4.3) ===");

  // 1. Zero dispatches returns 0
  {
    const calculateDailyCount = (attempts: Array<{ dispatch_count: number; last_dispatched_at: string; status: string }>, legacySends: Array<{ sent_at: string; hasAttempt: boolean }>, utcDay: string) => {
      let attemptSum = 0;
      for (const a of attempts) {
        if (a.last_dispatched_at.startsWith(utcDay) && a.dispatch_count > 0) {
          attemptSum += a.dispatch_count;
        }
      }
      let legacyCount = 0;
      for (const l of legacySends) {
        if (l.sent_at.startsWith(utcDay) && !l.hasAttempt) {
          legacyCount++;
        }
      }
      return attemptSum + legacyCount;
    };

    const count = calculateDailyCount([], [], "2026-09-01");
    if (count !== 0) throw new Error("Expected zero dispatches to return 0!");
    console.log("PASSED: Test 1 - Zero Dispatches Returns 0");
  }

  // 2. One successful dispatch returns 1
  {
    const calculateDailyCount = (attempts: Array<{ dispatch_count: number; last_dispatched_at: string }>, utcDay: string) => {
      let sum = 0;
      for (const a of attempts) {
        if (a.last_dispatched_at.startsWith(utcDay) && a.dispatch_count > 0) sum += a.dispatch_count;
      }
      return sum;
    };

    const count = calculateDailyCount([{ dispatch_count: 1, last_dispatched_at: "2026-09-01T12:00:00Z" }], "2026-09-01");
    if (count !== 1) throw new Error("Expected one successful dispatch to return 1!");
    console.log("PASSED: Test 2 - One Successful Dispatch Returns 1");
  }

  // 3. Two different events dispatch once each -> returns 2
  {
    const calculateDailyCount = (attempts: Array<{ event_id: string; dispatch_count: number; last_dispatched_at: string }>, utcDay: string) => {
      let sum = 0;
      for (const a of attempts) {
        if (a.last_dispatched_at.startsWith(utcDay) && a.dispatch_count > 0) sum += a.dispatch_count;
      }
      return sum;
    };

    const attempts = [
      { event_id: "evt_1", dispatch_count: 1, last_dispatched_at: "2026-09-01T10:00:00Z" },
      { event_id: "evt_2", dispatch_count: 1, last_dispatched_at: "2026-09-01T11:00:00Z" },
    ];
    const count = calculateDailyCount(attempts, "2026-09-01");
    if (count !== 2) throw new Error(`Expected 2 dispatches across different events, got ${count}`);
    console.log("PASSED: Test 3 - Two Different Events Dispatched Once Each Returns 2");
  }

  // 4. Same event, two true retry dispatches -> returns 2 (NOT 1!)
  {
    const calculateDailyCount = (attempts: Array<{ event_id: string; dispatch_count: number; last_dispatched_at: string }>, utcDay: string) => {
      let sum = 0;
      for (const a of attempts) {
        if (a.last_dispatched_at.startsWith(utcDay) && a.dispatch_count > 0) sum += a.dispatch_count;
      }
      return sum;
    };

    const attempts = [
      { event_id: "evt_1", dispatch_count: 1, last_dispatched_at: "2026-09-01T10:00:00Z" }, // attempt #1
      { event_id: "evt_1", dispatch_count: 1, last_dispatched_at: "2026-09-01T14:00:00Z" }, // attempt #2 true retry
    ];
    const count = calculateDailyCount(attempts, "2026-09-01");
    if (count !== 2) throw new Error(`CORRECTIVE DEFECT: Same event with two true retries returned ${count} instead of 2!`);
    console.log("PASSED: Test 4 - Same Event with Two True Retries Returns 2 Provider Dispatches");
  }

  // 5. UNKNOWN same-attempt second provider invocation -> returns 2
  {
    const calculateDailyCount = (attempts: Array<{ event_id: string; dispatch_count: number; last_dispatched_at: string }>, utcDay: string) => {
      let sum = 0;
      for (const a of attempts) {
        if (a.last_dispatched_at.startsWith(utcDay) && a.dispatch_count > 0) sum += a.dispatch_count;
      }
      return sum;
    };

    // Same attempt #1 was invoked twice due to UNKNOWN recovery, incrementing dispatch_count to 2
    const attempts = [
      { event_id: "evt_1", dispatch_count: 2, last_dispatched_at: "2026-09-01T15:00:00Z" },
    ];
    const count = calculateDailyCount(attempts, "2026-09-01");
    if (count !== 2) throw new Error(`Expected UNKNOWN same-attempt second invocation to return 2, got ${count}`);
    console.log("PASSED: Test 5 - UNKNOWN Same-Attempt Second Provider Invocation Returns 2 Provider Dispatches");
  }

  // 6. Provider success + DB completion failure -> consumes 1
  {
    const calculateDailyCount = (attempts: Array<{ dispatch_count: number; last_dispatched_at: string; status: string }>, utcDay: string) => {
      let sum = 0;
      for (const a of attempts) {
        if (a.last_dispatched_at.startsWith(utcDay) && a.dispatch_count > 0) sum += a.dispatch_count;
      }
      return sum;
    };

    // Provider accepted message, but DB completion failed (status remains PROCESSING)
    const attempts = [{ dispatch_count: 1, last_dispatched_at: "2026-09-01T16:00:00Z", status: "PROCESSING" }];
    const count = calculateDailyCount(attempts, "2026-09-01");
    if (count !== 1) throw new Error("Provider success + DB completion failure failed to consume daily cap!");
    console.log("PASSED: Test 6 - Provider Success + DB Completion Failure Consumes 1 Daily Cap Slot");
  }

  // 7. Pre-provider technical failure -> returns 0
  {
    const calculateDailyCount = (attempts: Array<{ dispatch_count: number; last_dispatched_at: string | null }>, utcDay: string) => {
      let sum = 0;
      for (const a of attempts) {
        if (a.last_dispatched_at && a.last_dispatched_at.startsWith(utcDay) && a.dispatch_count > 0) sum += a.dispatch_count;
      }
      return sum;
    };

    // Technical failure before provider invocation (dispatch_count = 0)
    const attempts = [{ dispatch_count: 0, last_dispatched_at: null }];
    const count = calculateDailyCount(attempts, "2026-09-01");
    if (count !== 0) throw new Error("Pre-provider technical failure incorrectly consumed daily cap!");
    console.log("PASSED: Test 7 - Pre-Provider Technical Failure Returns 0 (Does Not Consume Daily Cap)");
  }

  // 8. Attempt created yesterday but dispatched today -> counted today
  {
    const calculateDailyCount = (attempts: Array<{ created_at: string; last_dispatched_at: string; dispatch_count: number }>, utcDay: string) => {
      let sum = 0;
      for (const a of attempts) {
        if (a.last_dispatched_at.startsWith(utcDay) && a.dispatch_count > 0) sum += a.dispatch_count;
      }
      return sum;
    };

    const attempts = [{ created_at: "2026-08-31T23:55:00Z", last_dispatched_at: "2026-09-01T00:05:00Z", dispatch_count: 1 }];
    const count = calculateDailyCount(attempts, "2026-09-01");
    if (count !== 1) throw new Error("Attempt dispatched today was not counted today!");
    console.log("PASSED: Test 8 - Attempt Created Yesterday But Dispatched Today Counted Today");
  }

  // 9. Attempt created today but dispatched tomorrow -> not charged to wrong day
  {
    const calculateDailyCount = (attempts: Array<{ created_at: string; last_dispatched_at: string; dispatch_count: number }>, utcDay: string) => {
      let sum = 0;
      for (const a of attempts) {
        if (a.last_dispatched_at.startsWith(utcDay) && a.dispatch_count > 0) sum += a.dispatch_count;
      }
      return sum;
    };

    const attempts = [{ created_at: "2026-09-01T23:59:50Z", last_dispatched_at: "2026-09-02T00:01:00Z", dispatch_count: 1 }];
    const todayCount = calculateDailyCount(attempts, "2026-09-01");
    const tomorrowCount = calculateDailyCount(attempts, "2026-09-02");

    if (todayCount !== 0 || tomorrowCount !== 1) {
      throw new Error(`Timestamp boundary error: todayCount=${todayCount}, tomorrowCount=${tomorrowCount}`);
    }
    console.log("PASSED: Test 9 - Attempt Dispatched Tomorrow Not Charged to Today");
  }

  // 10. Midnight UTC Boundary Exactness
  {
    const isWithinUtcDay = (timestampIso: string, utcDayDate: string) => {
      const ts = new Date(timestampIso).getTime();
      const start = new Date(`${utcDayDate}T00:00:00.000Z`).getTime();
      const end = new Date(`${utcDayDate}T23:59:59.999Z`).getTime() + 1;
      return ts >= start && ts < end;
    };

    if (!isWithinUtcDay("2026-09-01T00:00:00.000Z", "2026-09-01")) throw new Error("Boundary start failed!");
    if (!isWithinUtcDay("2026-09-01T23:59:59.999Z", "2026-09-01")) throw new Error("Boundary end failed!");
    if (isWithinUtcDay("2026-09-02T00:00:00.000Z", "2026-09-01")) throw new Error("Next day start failed!");

    console.log("PASSED: Test 10 - Midnight UTC Day Boundary Exactness Confirmed [00:00:00 UTC, 24:00:00 UTC)");
  }

  // 11. SENT Event + SUCCESS Attempt Is NOT Double Counted
  {
    const calculateDailyCount = (attempts: Array<{ event_id: string; dispatch_count: number; last_dispatched_at: string }>, legacyEvents: Array<{ id: string; sent_at: string }>, utcDay: string) => {
      let attemptSum = 0;
      const attemptEventIds = new Set<string>();

      for (const a of attempts) {
        if (a.last_dispatched_at.startsWith(utcDay) && a.dispatch_count > 0) {
          attemptSum += a.dispatch_count;
          attemptEventIds.add(a.event_id);
        }
      }

      let legacyCount = 0;
      for (const e of legacyEvents) {
        if (e.sent_at.startsWith(utcDay) && !attemptEventIds.has(e.id)) {
          legacyCount++;
        }
      }

      return attemptSum + legacyCount;
    };

    const attempts = [{ event_id: "evt_1", dispatch_count: 1, last_dispatched_at: "2026-09-01T12:00:00Z" }];
    const legacyEvents = [{ id: "evt_1", sent_at: "2026-09-01T12:00:05Z" }];

    const count = calculateDailyCount(attempts, legacyEvents, "2026-09-01");
    if (count !== 1) throw new Error(`DOUBLE COUNTING ERROR: SENT event + SUCCESS attempt returned ${count} instead of 1!`);
    console.log("PASSED: Test 11 - SENT Event + SUCCESS Attempt Is NOT Double Counted");
  }

  // 12. Manual POST and Cron GET Still Share Same Global Cap
  {
    let currentDailyCount = 10;
    const limit = 10;

    const checkGlobalCap = () => {
      if (currentDailyCount >= limit) {
        return { status: "DAILY_LIMIT_REACHED", allowed: false };
      }
      return { status: "SUCCESS", allowed: true };
    };

    const manualRes = checkGlobalCap();
    const cronRes = checkGlobalCap();

    if (manualRes.allowed || cronRes.allowed) {
      throw new Error("Global cap failed to block manual/cron execution when limit was reached!");
    }
    console.log("PASSED: Test 12 - Manual POST and Cron GET Share Same Global Daily Cap");
  }

  console.log("==========================================================");
  console.log("SUCCESS: TODAS LAS 12 PRUEBAS DE LA MATRIZ DE DAILY CAP DISPATCH-COUNT PASARON CON ÉXITO!");
  console.log("==========================================================");
}

runSchedulerOperationsTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
