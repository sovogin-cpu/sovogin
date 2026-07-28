import { createClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error("supabaseAdmin solo puede ejecutarse del lado servidor.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Falta la variable NEXT_PUBLIC_SUPABASE_URL en el archivo .env.local"
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Falta la variable SUPABASE_SERVICE_ROLE_KEY en el archivo .env.local"
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);