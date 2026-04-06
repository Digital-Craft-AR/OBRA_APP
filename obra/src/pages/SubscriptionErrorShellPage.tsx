import { useTranslation } from "react-i18next";
import { BlockingShellFrame } from "@/components/shells/BlockingShellFrame";

export function SubscriptionErrorShellPage() {
  const { t } = useTranslation();

  return (
    <BlockingShellFrame titleKey="shell.subscriptionError.title">
      <p className="text-sm text-obra-neutral-600">{t("shell.subscriptionError.body")}</p>
      <p className="text-sm text-obra-neutral-600">{t("shell.subscriptionError.credits")}</p>
    </BlockingShellFrame>
  );
}
