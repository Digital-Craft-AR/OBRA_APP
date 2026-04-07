import { useTranslation } from "react-i18next";
import { BlockingShellFrame } from "@/components/shells/BlockingShellFrame";
import { VerifyEmailPanel } from "@/components/verification/VerifyEmailPanel";
import { Button } from "@/components/ui/Button";
import { useEmailVerificationResend } from "@/auth/useEmailVerificationResend";
import { useEntitlement } from "@/entitlement/EntitlementProvider";

export function VerifyEmailShellPage() {
  const { t } = useTranslation();
  const { user, refreshSession } = useEntitlement();
  const email = user?.email ?? "";
  const { busy, message, resend } = useEmailVerificationResend(email);

  return (
    <BlockingShellFrame titleKey="shell.verify.title">
      <VerifyEmailPanel
        email={email}
        message={message}
        busy={busy}
        onResend={resend}
        secondaryAction={
          <Button type="button" variant="ghost" className="w-auto" disabled={busy} onClick={() => void refreshSession()}>
            {t("shell.verify.refreshedSession")}
          </Button>
        }
      />
    </BlockingShellFrame>
  );
}
