import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

const missingConfigMessage = "Supabase configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

const createMissingResult = async () => ({ data: null, error: new Error(missingConfigMessage) });

const missingQueryBuilder = {
  select: () => missingQueryBuilder,
  insert: () => missingQueryBuilder,
  update: () => missingQueryBuilder,
  delete: () => missingQueryBuilder,
  upsert: () => missingQueryBuilder,
  eq: () => missingQueryBuilder,
  neq: () => missingQueryBuilder,
  in: () => missingQueryBuilder,
  lt: () => missingQueryBuilder,
  lte: () => missingQueryBuilder,
  gt: () => missingQueryBuilder,
  gte: () => missingQueryBuilder,
  ilike: () => missingQueryBuilder,
  order: () => missingQueryBuilder,
  limit: () => missingQueryBuilder,
  single: createMissingResult,
  maybeSingle: createMissingResult,
  then: (onFulfilled?: (value: { data: null; error: Error }) => unknown, onRejected?: (reason: unknown) => unknown) =>
    createMissingResult().then(onFulfilled, onRejected),
  catch: (onRejected?: (reason: unknown) => unknown) => createMissingResult().catch(onRejected),
  finally: (onFinally?: () => void) => createMissingResult().finally(onFinally),
};

const missingStorageBucket = {
  upload: () => createMissingResult(),
  download: () => createMissingResult(),
  list: () => createMissingResult(),
  remove: () => createMissingResult(),
  getPublicUrl: (path: string) => ({ data: { publicUrl: path }, error: new Error(missingConfigMessage) }),
};

const missingSupabaseClient = {
  from: () => missingQueryBuilder,
  storage: {
    from: () => missingStorageBucket,
  },
  auth: {
    getUser: async () => ({ data: { user: null }, error: new Error(missingConfigMessage) }),
    getSession: async () => ({ data: { session: null }, error: new Error(missingConfigMessage) }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ data: null, error: new Error(missingConfigMessage) }),
    signOut: async () => ({ error: new Error(missingConfigMessage) }),
  },
} as unknown as SupabaseClient;

// ✅ Singleton — สร้างครั้งเดียว ไม่ว่าจะ import กี่ที่
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      if (typeof window !== "undefined") {
        console.warn(missingConfigMessage);
      }
      supabaseInstance = missingSupabaseClient;
      return supabaseInstance;
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'sb-auth-token',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      }
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();
