import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { BlockingShellFrame } from "@/components/shells/BlockingShellFrame";
import { Button } from "@/components/ui/Button";
import { useEntitlement } from "@/entitlement/EntitlementProvider";

const POLL_MS = 3000;
const MAX_POLLS = 20;

/** Post–Mercado Pago return: poll profile + manual refresh (#36 expands reconciliation). */
export function ActivatingShellPage() {
  const { t } = useTranslation();
  const { refetchProfile, clearCheckoutReturn } = useEntitlement();
  const pollCount = useRef(0);

  useEffect(() => {
    pollCount.current = 0;
    const id = window.setInterval(() => {
      pollCount.current += 1;
      void refetchProfile();
      if (pollCount.current >= MAX_POLLS) {
        window.clearInterval(id);
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refetchProfile]);

  return (
    <BlockingShellFrame titleKey="shell.activating.title">
      <p className="text-sm text-obra-neutral-600">{t("shell.activating.body")}</p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="primary" onClick={() => void refetchProfile()}>
          {t("shell.activating.refresh")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => clearCheckoutReturn()}>
          {t("shell.activating.clearReturn")}
        </Button>
      </div>
      <p className="text-xs text-obra-neutral-600">{t("shell.activating.note")}</p>
    </BlockingShellFrame>
  );
}
