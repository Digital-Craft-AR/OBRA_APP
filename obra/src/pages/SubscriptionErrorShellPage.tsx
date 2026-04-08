import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BlockingShellFrame } from "@/components/shells/BlockingShellFrame";

export function SubscriptionErrorShellPage() {
  const { t } = useTranslation();

  return (
    <BlockingShellFrame titleKey="shell.subscriptionError.title">
      <p className="text-sm text-obra-neutral-600">{t("shell.subscriptionError.body")}</p>
      <p className="text-sm text-obra-neutral-600">{t("shell.subscriptionError.credits")}</p>
      <div className="mt-2">
        <Link
          to="/app/account"
          className="text-sm font-semibold text-obra-blue-700 underline-offset-2 hover:underline"
        >
          {t("shell.account.openMinimalPath")}
        </Link>
      </div>
    </BlockingShellFrame>
  );
}
