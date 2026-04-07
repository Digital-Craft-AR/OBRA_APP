import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BlockingShellFrame } from "@/components/shells/BlockingShellFrame";
import { Button } from "@/components/ui/Button";
import { useEntitlement } from "@/entitlement/EntitlementProvider";

const POLL_MS = 3000;
const MAX_POLLS = 20;

/** Post–Mercado Pago return: poll profile + manual refresh (#36 expands reconciliation). */
export function ActivatingShellPage() {
  const { t } = useTranslation();
  const { reconcileSubscription, clearCheckoutReturn } = useEntitlement();
  const pollCount = useRef(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    pollCount.current = 0;
    setTimedOut(false);
    const id = window.setInterval(() => {
      pollCount.current += 1;
      void reconcileSubscription();
      if (pollCount.current >= MAX_POLLS) {
        setTimedOut(true);
        window.clearInterval(id);
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [reconcileSubscription]);

  return (
    <BlockingShellFrame titleKey="shell.activating.title">
      <p className="text-sm text-obra-neutral-600">{t("shell.activating.body")}</p>
      <div className="flex w-full flex-col gap-3">
        <Button
          type="button"
          variant="primary"
          className="w-full sm:w-auto"
          onClick={() => void reconcileSubscription()}
        >
          {t("shell.activating.refresh")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => clearCheckoutReturn()}>
          {t("shell.activating.clearReturn")}
        </Button>
      </div>
      {timedOut ? (
        <p className="text-xs text-obra-neutral-700">{t("shell.activating.timeoutHint")}</p>
      ) : null}
      <p className="text-xs text-obra-neutral-600">{t("shell.activating.note")}</p>
    </BlockingShellFrame>
  );
}
