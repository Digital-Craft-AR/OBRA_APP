import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ObraLogoLink } from "@/components/obra/ObraLogoLink";
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
        <div className={`${shellPanelClass} text-center`}>
          <div className="flex items-center justify-center pb-4">
            <ObraLogoLink tone="solidBlue950" />
          </div>
          <h1 className="font-display text-2xl font-bold text-obra-blue-950">
            {t(titleKey)}
          </h1>
          {children}
          <p className="pt-4 text-sm text-obra-neutral-600">
            {t("shell.supportHint")}
          </p>
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="ghost"
              title={t("nav.logout")}
              className="h-9 border-0 bg-transparent px-0 text-sm text-obra-neutral-600 hover:bg-transparent hover:text-obra-blue-700"
              onClick={() => void signOut()}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {t("nav.logout")}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
