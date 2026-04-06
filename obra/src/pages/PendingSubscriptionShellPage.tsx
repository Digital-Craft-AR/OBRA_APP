import { useTranslation } from "react-i18next";
import { BlockingShellFrame } from "@/components/shells/BlockingShellFrame";
import { Button } from "@/components/ui/Button";

/**
 * Checkout entry (#35) wires Mercado Pago here; until then the CTA stays disabled with clear copy.
 */
export function PendingSubscriptionShellPage() {
  const { t } = useTranslation();

  return (
    <BlockingShellFrame titleKey="shell.pending.title">
      <p className="text-sm text-obra-neutral-600">{t("shell.pending.body")}</p>
      <Button type="button" variant="cta" className="w-full sm:w-auto" disabled>
        {t("shell.pending.cta")}
      </Button>
      <p className="text-xs text-obra-neutral-600">{t("shell.pending.checkoutNote")}</p>
    </BlockingShellFrame>
  );
}
