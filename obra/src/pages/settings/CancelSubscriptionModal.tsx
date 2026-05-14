import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Modal, ModalContent, ModalFooter, ModalHead, ModalTitle } from "@/components/ui/Modal";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  open: boolean;
  onClose: () => void;
  subscriptionAccessUntil: Date | null;
  creditsBalance: number;
  onConfirm: () => Promise<void>;
  busy: boolean;
};

export function CancelSubscriptionModal({
  open,
  onClose,
  subscriptionAccessUntil,
  creditsBalance,
  onConfirm,
  busy,
}: Props) {
  const { t, i18n } = useTranslation();
  const [activeProjectCount, setActiveProjectCount] = useState<number | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setActiveProjectCount(null);
    setProjectsLoading(true);
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("lifecycle_status", "active")
      .then(({ count }) => {
        if (!cancelled) {
          setActiveProjectCount(count ?? 0);
          setProjectsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const locale = i18n.language === "pt-BR" ? "pt-BR" : "es-AR";
  const dateStr = subscriptionAccessUntil
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(
        subscriptionAccessUntil,
      )
    : null;

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} closeLabel={t("common.close")}>
      <ModalHead>
        <ModalTitle>{t("settings.billing.cancelModal.title")}</ModalTitle>
      </ModalHead>
      <ModalContent>
        <ul className="space-y-2 text-sm text-obra-blue-950">
          <li>
            <span className="text-obra-neutral-600">{t("settings.billing.cancelModal.credits", { count: creditsBalance })}</span>
          </li>
          <li>
            <span className="text-obra-neutral-600">
              {projectsLoading
                ? t("common.loading")
                : t("settings.billing.cancelModal.activeProjects", { count: activeProjectCount ?? 0 })}
            </span>
          </li>
          {dateStr ? (
            <li>
              <span className="text-obra-neutral-600">
                {t("settings.billing.cancelModal.accessUntil", { date: dateStr })}
              </span>
            </li>
          ) : null}
        </ul>
      </ModalContent>
      <ModalFooter>
        <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
          {t("settings.billing.cancelModal.back")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={busy}
          onClick={() => void onConfirm()}
          data-testid="cancel-subscription-confirm-btn"
        >
          {busy ? t("common.loading") : t("settings.billing.cancelModal.confirm")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
