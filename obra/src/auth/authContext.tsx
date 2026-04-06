import type { Session } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export type AuthState = {
  session: Session | null;
  loading: boolean;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
