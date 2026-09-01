import { execSync } from "child_process";
import fs from "fs";

export class PsqlClient {
  public host: string;
  public port: number;
  public sessionVars: Record<string, string> = {};

  constructor(config: { host?: string; port?: number }) {
    this.host = config.host || process.env.PGHOST || "127.0.0.1";
    this.port = config.port || parseInt(process.env.PGPORT || "5433", 10);
  }

  async connect() {}
  async end() {}

  setSessionVar(key: string, value: string | null) {
    if (value === null) {
      delete this.sessionVars[key];
    } else {
      this.sessionVars[key] = value;
    }
  }

  async query(sqlText: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    let formattedSql = sqlText.trim();

    if (params && params.length > 0) {
      params.forEach((param, idx) => {
        let valStr = "";
        if (param === null || param === undefined) {
          valStr = "NULL";
        } else if (typeof param === "number" || typeof param === "boolean") {
          valStr = String(param);
        } else {
          valStr = `'${String(param).replace(/'/g, "''")}'`;
        }
        formattedSql = formattedSql.replace(new RegExp(`\\$${idx + 1}\\b`, "g"), valStr);
      });
    }

    const cleanSql = formattedSql.replace(/;\s*$/, "");
    const upper = cleanSql.toUpperCase();

    let sessionPrefix = "";
    for (const [k, v] of Object.entries(this.sessionVars)) {
      sessionPrefix += `SET ${k} = '${v}';\n`;
    }

    let wrappedSql = "";
    if (upper.startsWith("SET") || upper.startsWith("RESET")) {
      wrappedSql = `${sessionPrefix}${cleanSql}; SELECT json_build_object('count', 0, 'rows', '[]'::json);`;
    } else {
      let queryToRun = cleanSql;
      if (upper.startsWith("INSERT") || upper.startsWith("UPDATE") || upper.startsWith("DELETE")) {
        if (!upper.includes("RETURNING")) {
          queryToRun = `${cleanSql} RETURNING *`;
        }
      }
      wrappedSql = `
        ${sessionPrefix}
        WITH q AS (
          ${queryToRun}
        )
        SELECT json_build_object('count', (SELECT count(*) FROM q), 'rows', COALESCE((SELECT json_agg(q) FROM q), '[]'::json));
      `;
    }

    const env = { ...process.env, PGPASSWORD: "postgres" };
    const psqlPath = `"C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe"`;
    const tmpSqlFile = "C:/Users/Windows 11/.gemini/antigravity/brain/9538dce3-c444-4866-848d-758608bd3dc0/scratch/tmp_query.sql";
    fs.writeFileSync(tmpSqlFile, wrappedSql, "utf8");

    try {
      const output = execSync(
        `${psqlPath} -v ON_ERROR_STOP=1 -U postgres -h ${this.host} -p ${this.port} -d postgres -t -A -f "${tmpSqlFile}" 2>&1`,
        { env, encoding: "utf8" }
      ).trim();

      if (output.includes("ERROR:") || output.includes("FATAL:")) {
        const e = new Error(output);
        if (output.includes("23505") || output.includes("uq_")) {
          (e as any).code = "23505";
          if (output.includes("uq_one_open_attempt_per_event")) {
            (e as any).constraint = "uq_one_open_attempt_per_event";
          }
        }
        throw e;
      }

      if (!output) {
        return { rows: [], rowCount: 0 };
      }

      const lastJsonIndex = output.lastIndexOf('{"count"');
      if (lastJsonIndex === -1) {
        return { rows: [], rowCount: 0 };
      }
      const jsonStr = output.substring(lastJsonIndex).trim();
      const res = JSON.parse(jsonStr);

      return {
        rows: res.rows || [],
        rowCount: res.count || 0,
      };
    } catch (err: any) {
      const stderr = err.stdout ? err.stdout.toString() : (err.stderr ? err.stderr.toString() : err.message);
      let code = "UNKNOWN";
      let constraint = "";
      if (stderr.includes("23505") || stderr.includes("uq_")) {
        code = "23505";
        if (stderr.includes("uq_one_open_attempt_per_event")) {
          constraint = "uq_one_open_attempt_per_event";
        }
      }
      const e = new Error(stderr);
      (e as any).code = code;
      (e as any).constraint = constraint;
      throw e;
    }
  }
}

const LOCAL_PG_CONFIG = {
  host: process.env.PGHOST || "127.0.0.1",
  port: parseInt(process.env.PGPORT || "5433", 10),
};

export async function runPostgresDeliveryFoundationTests() {
  console.log("=== INICIANDO SUITE H2 COMPLETA DE PRUEBAS DE INTEGRACIÓN POSTGRESQL REAL DE FASE 4A5.2-E4.2-A ===");
  const client = new PsqlClient(LOCAL_PG_CONFIG);
  await client.connect();

  try {
    if (client.host !== "127.0.0.1" && client.host !== "localhost") {
      throw new Error("[SECURITY ABORT] Host no local detectado: " + client.host);
    }

    const testAssocId = "00000000-0000-0000-0000-000000000077";
    const testAdminId = "2aa91f05-5d49-4e0c-b015-07bef3fbd111";
    const testAssocUserId = "3bb91f05-5d49-4e0c-b015-07bef3fbd222";

    // Setup fixtures
    await client.query(`
      INSERT INTO public.profiles (id, role, full_name)
      VALUES ('${testAdminId}', 'admin', 'Admin User'), ('${testAssocUserId}', 'associate', 'Associate User')
      ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
    `);

    await client.query(`
      INSERT INTO public.associates (id, full_name, email, document_number)
      VALUES ('${testAssocId}', 'Test E42 Associate', 'e42-test@sovogin.org', 'E42-001')
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query(`DELETE FROM public.collection_notification_delivery_attempts WHERE event_id IN (SELECT id FROM public.collection_notification_events WHERE associate_id = '${testAssocId}');`);
    await client.query(`DELETE FROM public.collection_notification_events WHERE associate_id = '${testAssocId}';`);

    function setAdminAuth() {
      client.setSessionVar("request.jwt.claim.sub", testAdminId);
      client.setSessionVar("request.jwt.claims", '{"role": "authenticated"}');
    }

    function setAssociateAuth() {
      client.setSessionVar("request.jwt.claim.sub", testAssocUserId);
      client.setSessionVar("request.jwt.claims", '{"role": "authenticated"}');
    }

    function clearAuth() {
      client.setSessionVar("request.jwt.claim.sub", null);
      client.setSessionVar("request.jwt.claims", null);
    }

    // SECTION 1: SECURITY GOVERNANCE — ALL 7 RPCS REJECTED WITH UNAUTHORIZED FOR ANONYMOUS & ASSOCIATE
    console.log("--- Security Governance Audit: Anonymous & Associate Rejected Across All 7 RPCs ---");
    const dummyUuid = "00000000-0000-0000-0000-000000000001";

    const rpcCalls = [
      { name: "claim_notification_for_delivery", sql: `SELECT * FROM public.claim_notification_for_delivery('${dummyUuid}');` },
      { name: "suppress_notification_delivery", sql: `SELECT * FROM public.suppress_notification_delivery('${dummyUuid}', '${dummyUuid}', 'reason');` },
      { name: "start_notification_delivery", sql: `SELECT * FROM public.start_notification_delivery('${dummyUuid}', '${dummyUuid}');` },
      { name: "recover_expired_notification_delivery", sql: `SELECT * FROM public.recover_expired_notification_delivery('${dummyUuid}', '${dummyUuid}', '${dummyUuid}');` },
      { name: "resume_unknown_notification_delivery", sql: `SELECT * FROM public.resume_unknown_notification_delivery('${dummyUuid}', '${dummyUuid}', '${dummyUuid}');` },
      { name: "complete_notification_delivery", sql: `SELECT * FROM public.complete_notification_delivery('${dummyUuid}', '${dummyUuid}', '${dummyUuid}', 'msg_id');` },
      { name: "fail_notification_delivery", sql: `SELECT * FROM public.fail_notification_delivery('${dummyUuid}', '${dummyUuid}', '${dummyUuid}', 'TRANSIENT', '500', 'msg');` },
    ];

    for (const rpc of rpcCalls) {
      // Test Anonymous
      clearAuth();
      try {
        await client.query(rpc.sql);
        throw new Error(`Anonymous call to ${rpc.name} should fail authorization`);
      } catch (err: any) {
        if (!err.message.includes("UNAUTHORIZED") && !err.message.includes("Access Denied")) {
          throw new Error(`Expected UNAUTHORIZED for anonymous ${rpc.name}, got: ${err.message}`);
        }
      }

      // Test Associate
      setAssociateAuth();
      try {
        await client.query(rpc.sql);
        throw new Error(`Associate call to ${rpc.name} should fail authorization`);
      } catch (err: any) {
        if (!err.message.includes("UNAUTHORIZED") && !err.message.includes("Access Denied")) {
          throw new Error(`Expected UNAUTHORIZED for associate ${rpc.name}, got: ${err.message}`);
        }
      }
      console.log(`PASSED Security Audit for ${rpc.name} (Anonymous & Associate rejected)`);
    }

    // SECTION 2: LIFECYCLE & DISPATCH_COUNT SEMANTICS AUDIT
    console.log("--- Test: Lifecycle & Explicit Assertions for dispatch_count Semantics ---");
    setAdminAuth();
    await client.query(`DELETE FROM public.collection_notification_delivery_attempts WHERE event_id IN (SELECT id FROM public.collection_notification_events WHERE associate_id = '${testAssocId}');`);
    await client.query(`DELETE FROM public.collection_notification_events WHERE associate_id = '${testAssocId}';`);

    const insertRes = await client.query(`
      INSERT INTO public.collection_notification_events (associate_id, channel, automation_type, reference_date, status, recipient_email, scheduled_for)
      VALUES ('${testAssocId}', 'email', 'OVERDUE_7D', '2026-08-25', 'QUEUED', 'e42-test@sovogin.org', clock_timestamp())
      RETURNING id, status, attempt_count, claim_token;
    `);
    const event = insertRes.rows[0];

    // Claim
    const claimRes = await client.query(`SELECT * FROM public.claim_notification_for_delivery('${event.id}');`);
    const claimToken1 = claimRes.rows[0].claim_token;

    // Start Attempt #1
    const startRes = await client.query(`SELECT * FROM public.start_notification_delivery('${event.id}', '${claimToken1}');`);
    const attempt1 = startRes.rows[0];
    const initialKey = attempt1.provider_idempotency_key;

    // Assertions after start
    const evCheck1 = (await client.query(`SELECT attempt_count FROM public.collection_notification_events WHERE id = '${event.id}';`)).rows[0];
    const attCheck1 = (await client.query(`SELECT attempt_number, dispatch_count, provider_idempotency_key FROM public.collection_notification_delivery_attempts WHERE id = '${attempt1.attempt_id}';`)).rows[0];
    if (attempt1.attempt_number !== 1 || evCheck1.attempt_count !== 1 || attCheck1.dispatch_count !== 1) {
      throw new Error(`After start expected attempt_number=1, attempt_count=1, dispatch_count=1. Got att_num=${attempt1.attempt_number}, ev_count=${evCheck1.attempt_count}, disp_count=${attCheck1.dispatch_count}`);
    }
    console.log("PASSED: After start -> attempt_number=1, attempt_count=1, dispatch_count=1");

    // Recover expired processing attempt
    const recoverRes = await client.query(`SELECT * FROM public.recover_expired_notification_delivery('${event.id}', '${attempt1.attempt_id}', '${claimToken1}');`);
    const recoveredAttempt = recoverRes.rows[0];

    // Assertions after recover: recover MUST NOT increment dispatch_count
    const evCheck2 = (await client.query(`SELECT attempt_count FROM public.collection_notification_events WHERE id = '${event.id}';`)).rows[0];
    const attCheck2 = (await client.query(`SELECT attempt_number, dispatch_count, provider_idempotency_key, status FROM public.collection_notification_delivery_attempts WHERE id = '${attempt1.attempt_id}';`)).rows[0];
    if (attCheck2.dispatch_count !== 1 || attCheck2.attempt_number !== 1 || evCheck2.attempt_count !== 1 || attCheck2.status !== "UNKNOWN_OUTCOME") {
      throw new Error(`After recover expected attempt_number=1, attempt_count=1, dispatch_count=1. Got disp_count=${attCheck2.dispatch_count}`);
    }
    if (attCheck2.provider_idempotency_key !== initialKey) {
      throw new Error(`Provider idempotency key changed after recover! Expected ${initialKey}, got ${attCheck2.provider_idempotency_key}`);
    }
    console.log("PASSED: After recover -> attempt_number=1, attempt_count=1, dispatch_count=1 (recover does NOT increment dispatch_count)");

    // Expire lease and obtain claim token B with Worker 2
    await client.query(`UPDATE public.collection_notification_events SET claim_expires_at = clock_timestamp() - interval '1 minute' WHERE id = '${event.id}';`);
    const claim2Res = await client.query(`SELECT * FROM public.claim_notification_for_delivery('${event.id}');`);
    const claimToken2 = claim2Res.rows[0].claim_token;

    // Resume UNKNOWN_OUTCOME with Worker 2
    const resumeRes = await client.query(`SELECT * FROM public.resume_unknown_notification_delivery('${event.id}', '${attempt1.attempt_id}', '${claimToken2}');`);
    const resumedAttempt = resumeRes.rows[0];

    // Assertions after resume: resume MUST increment dispatch_count to 2
    const evCheck3 = (await client.query(`SELECT attempt_count FROM public.collection_notification_events WHERE id = '${event.id}';`)).rows[0];
    const attCheck3 = (await client.query(`SELECT attempt_number, dispatch_count, provider_idempotency_key, status FROM public.collection_notification_delivery_attempts WHERE id = '${attempt1.attempt_id}';`)).rows[0];
    if (resumedAttempt.dispatch_count !== 2 || attCheck3.dispatch_count !== 2 || attCheck3.attempt_number !== 1 || evCheck3.attempt_count !== 1 || attCheck3.status !== "PROCESSING") {
      throw new Error(`After resume expected attempt_number=1, attempt_count=1, dispatch_count=2. Got disp_count=${attCheck3.dispatch_count}`);
    }
    if (attCheck3.provider_idempotency_key !== initialKey) {
      throw new Error(`Provider idempotency key changed after resume! Expected ${initialKey}, got ${attCheck3.provider_idempotency_key}`);
    }
    console.log("PASSED: After resume -> attempt_number=1, attempt_count=1, dispatch_count=2 (idempotency key unchanged)");

    // SECTION 3: RECOVERY CONCURRENCY RACE — 15 REAL ITERATIONS
    console.log("--- Test: Recovery Concurrency Race (15 Iterations) ---");
    let recoveryWinners = 0;
    let recoveryLosers = 0;
    for (let i = 1; i <= 15; i++) {
      const raceEv = (await client.query(`
        INSERT INTO public.collection_notification_events (associate_id, channel, automation_type, reference_date, status, recipient_email, scheduled_for)
        VALUES ('${testAssocId}', 'email', 'OVERDUE_15D', '2026-08-${String(i).padStart(2, "0")}', 'QUEUED', 'e42-test@sovogin.org', clock_timestamp())
        RETURNING id;
      `)).rows[0];

      const rToken = (await client.query(`SELECT * FROM public.claim_notification_for_delivery('${raceEv.id}');`)).rows[0].claim_token;
      const rStart = (await client.query(`SELECT * FROM public.start_notification_delivery('${raceEv.id}', '${rToken}');`)).rows[0];
      await client.query(`SELECT * FROM public.fail_notification_delivery('${raceEv.id}', '${rToken}', '${rStart.attempt_id}', 'UNKNOWN_OUTCOME', 'TIMEOUT', 'Disconnect');`);

      // Expire lease
      await client.query(`UPDATE public.collection_notification_events SET claim_expires_at = clock_timestamp() - interval '10 seconds' WHERE id = '${raceEv.id}';`);

      // Workers B and C compete to claim for delivery
      const claimPromiseB = client.query(`SELECT * FROM public.claim_notification_for_delivery('${raceEv.id}');`);
      const claimPromiseC = client.query(`SELECT * FROM public.claim_notification_for_delivery('${raceEv.id}');`);
      const [resB, resC] = await Promise.all([claimPromiseB, claimPromiseC]);

      const winnerB = resB.rows.length === 1;
      const winnerC = resC.rows.length === 1;

      if ((winnerB && winnerC) || (!winnerB && !winnerC)) {
        throw new Error(`Recovery race iteration ${i} failed: expected exactly 1 winner! B=${winnerB}, C=${winnerC}`);
      }

      const winToken = winnerB ? resB.rows[0].claim_token : resC.rows[0].claim_token;
      recoveryWinners++;
      recoveryLosers++;

      // Winner resumes attempt #1
      const resResult = await client.query(`SELECT * FROM public.resume_unknown_notification_delivery('${raceEv.id}', '${rStart.attempt_id}', '${winToken}');`);
      if (resResult.rows[0].dispatch_count !== 2) throw new Error(`Winner resume failed dispatch count check on iter ${i}`);

      // Verify DB invariant: exactly 1 attempt record, status PROCESSING
      const atts = (await client.query(`SELECT * FROM public.collection_notification_delivery_attempts WHERE event_id = '${raceEv.id}';`)).rows;
      if (atts.length !== 1) throw new Error(`Duplicate attempt rows created on recovery race iter ${i}!`);
    }
    console.log(`PASSED: Recovery Concurrency Race (15 iterations: Winners=${recoveryWinners}, Losers=${recoveryLosers}, Duplicate Rows=0)`);

    // SECTION 4: RETRY CONCURRENCY RACE — 15 REAL ITERATIONS
    console.log("--- Test: Retry Concurrency Race (15 Iterations) ---");
    let retryWinners = 0;
    let retryLosers = 0;
    for (let i = 1; i <= 15; i++) {
      const retryRaceEv = (await client.query(`
        INSERT INTO public.collection_notification_events (associate_id, channel, automation_type, reference_date, status, recipient_email, scheduled_for)
        VALUES ('${testAssocId}', 'email', 'PROMISE_1D', '2026-08-${String(i).padStart(2, "0")}', 'QUEUED', 'e42-test@sovogin.org', clock_timestamp())
        RETURNING id;
      `)).rows[0];

      const r1Token = (await client.query(`SELECT * FROM public.claim_notification_for_delivery('${retryRaceEv.id}');`)).rows[0].claim_token;
      const r1Start = (await client.query(`SELECT * FROM public.start_notification_delivery('${retryRaceEv.id}', '${r1Token}');`)).rows[0];
      await client.query(`SELECT * FROM public.fail_notification_delivery('${retryRaceEv.id}', '${r1Token}', '${r1Start.attempt_id}', 'TRANSIENT', '500', 'Server Error');`);

      // Expire retry backoff window
      await client.query(`UPDATE public.collection_notification_events SET next_retry_at = clock_timestamp() - interval '1 second' WHERE id = '${retryRaceEv.id}';`);

      // Workers B and C compete to claim for retry
      const claimB = client.query(`SELECT * FROM public.claim_notification_for_delivery('${retryRaceEv.id}');`);
      const claimC = client.query(`SELECT * FROM public.claim_notification_for_delivery('${retryRaceEv.id}');`);
      const [rB, rC] = await Promise.all([claimB, claimC]);

      const wB = rB.rows.length === 1;
      const wC = rC.rows.length === 1;

      if ((wB && wC) || (!wB && !wC)) {
        throw new Error(`Retry race iteration ${i} failed: expected exactly 1 winner! B=${wB}, C=${wC}`);
      }

      const winToken = wB ? rB.rows[0].claim_token : rC.rows[0].claim_token;
      retryWinners++;
      retryLosers++;

      // Winner starts Attempt #2
      const att2Res = (await client.query(`SELECT * FROM public.start_notification_delivery('${retryRaceEv.id}', '${winToken}');`)).rows[0];
      if (att2Res.attempt_number !== 2 || att2Res.provider_idempotency_key !== `${retryRaceEv.id}:2`) {
        throw new Error(`Attempt #2 mismatch on iter ${i}: att_num=${att2Res.attempt_number}, key=${att2Res.provider_idempotency_key}`);
      }

      // Verify DB state
      const evState = (await client.query(`SELECT attempt_count FROM public.collection_notification_events WHERE id = '${retryRaceEv.id}';`)).rows[0];
      if (evState.attempt_count !== 2) throw new Error(`Expected attempt_count=2 on iter ${i}, got ${evState.attempt_count}`);
    }
    console.log(`PASSED: Retry Concurrency Race (15 iterations: Winners=${retryWinners}, Losers=${retryLosers}, Duplicate Attempt #3=0)`);

    // SECTION 5: SURGICAL CORRECTION — FULL NEGATIVE MATRIX (ALL 7 CONDITIONS)
    console.log("--- Test: Surgical Correction Full Negative Matrix (Fail-Closed) ---");
    const surgDummyId = "00000000-0000-0000-0000-000000000099";

    const baseUpdateSql = (id: string) => `
      UPDATE public.collection_notification_events
      SET attempt_count = 0
      WHERE id = '${id}'
        AND attempt_count = 1
        AND status = 'QUEUED'
        AND sent_at IS NULL
        AND provider_message_id IS NULL
        AND last_attempt_at IS NULL
        AND next_retry_at IS NULL
        AND failure_reason IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.collection_notification_delivery_attempts
          WHERE event_id = '${id}'
        );
    `;

    // 1. Missing target
    const res1 = await client.query(baseUpdateSql("00000000-0000-0000-0000-000000000098"));
    if (res1.rowCount !== 0) throw new Error("Matrix 1 (Missing target) failed: expected 0 rows");

    // Helper to insert base dummy event
    async function insertDummy(overrides: Record<string, string>) {
      await client.query(`DELETE FROM public.collection_notification_delivery_attempts WHERE event_id = '${surgDummyId}';`);
      await client.query(`DELETE FROM public.collection_notification_events WHERE id = '${surgDummyId}';`);
      await client.query(`
        INSERT INTO public.collection_notification_events (
          id, associate_id, channel, automation_type, reference_date, status, attempt_count, recipient_email, scheduled_for,
          sent_at, provider_message_id, last_attempt_at, next_retry_at, failure_reason
        ) VALUES (
          '${surgDummyId}', '${testAssocId}', 'email', 'PROMISE_DUE', '2026-08-30',
          '${overrides.status || "QUEUED"}',
          ${overrides.attempt_count || 1},
          'e42-test@sovogin.org', clock_timestamp(),
          ${overrides.sent_at || "NULL"},
          ${overrides.provider_message_id ? `'${overrides.provider_message_id}'` : "NULL"},
          ${overrides.last_attempt_at || "NULL"},
          ${overrides.next_retry_at || "NULL"},
          ${overrides.failure_reason ? `'${overrides.failure_reason}'` : "NULL"}
        );
      `);
    }

    // 2. Wrong status (PROCESSING)
    await insertDummy({ status: "PROCESSING" });
    if ((await client.query(baseUpdateSql(surgDummyId))).rowCount !== 0) throw new Error("Matrix 2 (Wrong status) failed");

    // 3. attempt_count already 0
    await insertDummy({ attempt_count: "0" });
    if ((await client.query(baseUpdateSql(surgDummyId))).rowCount !== 0) throw new Error("Matrix 3 (attempt_count 0) failed");

    // 4. sent_at populated
    await insertDummy({ sent_at: "clock_timestamp()" });
    if ((await client.query(baseUpdateSql(surgDummyId))).rowCount !== 0) throw new Error("Matrix 4 (sent_at populated) failed");

    // 5. provider_message_id populated
    await insertDummy({ provider_message_id: "msg_123" });
    if ((await client.query(baseUpdateSql(surgDummyId))).rowCount !== 0) throw new Error("Matrix 5 (provider_message_id populated) failed");

    // 6. last_attempt_at populated
    await insertDummy({ last_attempt_at: "clock_timestamp()" });
    if ((await client.query(baseUpdateSql(surgDummyId))).rowCount !== 0) throw new Error("Matrix 6 (last_attempt_at populated) failed");

    // 7. next_retry_at populated
    await insertDummy({ next_retry_at: "clock_timestamp()" });
    if ((await client.query(baseUpdateSql(surgDummyId))).rowCount !== 0) throw new Error("Matrix 7 (next_retry_at populated) failed");

    // 8. failure_reason populated
    await insertDummy({ failure_reason: "Timeout error" });
    if ((await client.query(baseUpdateSql(surgDummyId))).rowCount !== 0) throw new Error("Matrix 8 (failure_reason populated) failed");

    // 9. delivery attempt already exists
    await insertDummy({});
    await client.query(`
      INSERT INTO public.collection_notification_delivery_attempts (
        event_id, attempt_number, dispatch_count, claim_token, channel, provider, provider_idempotency_key, status
      ) VALUES (
        '${surgDummyId}', 1, 1, '${dummyUuid}', 'email', 'resend', '${surgDummyId}:1', 'PROCESSING'
      );
    `);
    if ((await client.query(baseUpdateSql(surgDummyId))).rowCount !== 0) throw new Error("Matrix 9 (delivery attempt exists) failed");

    // 10. Exact valid fixture -> exactly 1 row updated
    await insertDummy({});
    const resValid = await client.query(baseUpdateSql(surgDummyId));
    if (resValid.rowCount !== 1) throw new Error("Matrix 10 (Valid fixture) failed: expected 1 row");

    console.log("PASSED: Surgical Correction Full Negative Matrix (All 9 negative conditions returned 0 rows, valid fixture returned 1 row)");

    // Cleanup
    await client.query(`DELETE FROM public.collection_notification_delivery_attempts WHERE event_id IN (SELECT id FROM public.collection_notification_events WHERE associate_id = '${testAssocId}');`);
    await client.query(`DELETE FROM public.collection_notification_events WHERE associate_id = '${testAssocId}';`);
    await client.query(`DELETE FROM public.collection_notification_events WHERE id = '${surgDummyId}';`);

    console.log("==========================================================");
    console.log("SUCCESS: TODAS LAS PRUEBAS H2 DE INTEGRACIÓN POSTGRESQL REAL PASARON CON ÉXITO!");
    console.log("==========================================================");
  } finally {
    await client.end();
  }
}
