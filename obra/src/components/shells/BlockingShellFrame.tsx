import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { shellPanelClass } from "@/lib/uiClasses";

type BlockingShellFrameProps = {
  titleKey: string;
  children: ReactNode;
};

/**
 * Shared chrome for entitlement blocking shells: single card on page background (sign out + title + body + help).
 */
export function BlockingShellFrame({ titleKey, children }: BlockingShellFrameProps) {
  const { t } = useTranslation();

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="flex min-h-screen flex-col bg-obra-blue-50">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className={shellPanelClass}>
          <div className="flex items-center justify-between gap-4 border-b border-obra-blue-100 pb-4">
            <Link to="/" className="font-display text-lg font-semibold text-obra-blue-900">
              {t("app.name")}
            </Link>
            <Button
              type="button"
              variant="ghost"
              className="shrink-0 text-sm"
              onClick={() => void signOut()}
            >
              {t("nav.logout")}
            </Button>
          </div>
          <h1 className="font-display text-2xl font-bold text-obra-blue-950">
            {t(titleKey)}
          </h1>
          {children}
          <p className="border-t border-obra-blue-100 pt-4 text-sm text-obra-neutral-600">
            {t("shell.supportHint")}
          </p>
        </div>
      </main>
    </div>
  );
}
