import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface DeliveryWorkerClientResult {
  supabase: SupabaseClient;
  workerId: string;
  email: string;
}

/**
 * Creates an authenticated Supabase client for the dedicated notification delivery worker.
 *
 * PROHIBITED: Uses SUPABASE_SERVICE_ROLE_KEY.
 * MUST use server-side worker credentials (DELIVERY_WORKER_EMAIL & DELIVERY_WORKER_PASSWORD)
 * via standard GoTrue authentication to enforce least-privilege RPC authorization.
 */
export async function createDeliveryWorkerClient(): Promise<DeliveryWorkerClientResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const workerEmail = process.env.DELIVERY_WORKER_EMAIL;
  const workerPassword = process.env.DELIVERY_WORKER_PASSWORD;

  if (!supabaseUrl || !anonKey) {
    throw new Error("WORKER_ENV_MISSING: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (!workerEmail || !workerPassword) {
    throw new Error("WORKER_CREDENTIALS_MISSING: Missing DELIVERY_WORKER_EMAIL or DELIVERY_WORKER_PASSWORD in server environment");
  }

  // Instantiate temporary unauthenticated client
  const tempClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Authenticate worker identity via GoTrue API
  const { data: authRes, error: authErr } = await tempClient.auth.signInWithPassword({
    email: workerEmail,
    password: workerPassword,
  });

  if (authErr || !authRes?.session?.access_token || !authRes?.user) {
    throw new Error(`WORKER_AUTHENTICATION_FAILED: Unable to authenticate delivery worker user (${authErr?.message || "Invalid credentials"})`);
  }

  const workerId = authRes.user.id;
  const accessToken = authRes.session.access_token;

  // Instantiate authenticated Supabase client carrying the worker's JWT access token
  const authenticatedClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return {
    supabase: authenticatedClient,
    workerId,
    email: workerEmail,
  };
}
