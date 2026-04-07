/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Dev-only: force entitlement shell for manual QA (`verify_email`, `full_app`, …). */
  readonly VITE_DEV_ENTITLEMENT_OUTCOME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
