import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, FolderOpen, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalContent, ModalFooter, ModalHead, ModalSubtitle, ModalTitle } from "@/components/ui/Modal";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  open: boolean;
  onClose: () => void;
  subscriptionAccessUntil: Date | null;
  creditsBalance: number;
  onConfirm: () => Promise<void>;
  busy: boolean;
};

type CardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function InfoCard({ icon, title, description }: CardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-obra-blue-100 bg-obra-blue-50 p-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-obra-blue-700">
        {icon}
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-obra-blue-950">{title}</p>
        <p className="text-sm text-obra-neutral-600">{description}</p>
      </div>
    </div>
  );
}

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
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(
        subscriptionAccessUntil,
      )
    : null;

  const projectCountTitle = projectsLoading
    ? t("common.loading")
    : t("settings.billing.cancelModal.activeProjects", { count: activeProjectCount ?? 0 });

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} closeLabel={t("common.close")}>
      <ModalHead>
        <div>
          <ModalTitle>{t("settings.billing.cancelModal.title")}</ModalTitle>
          <ModalSubtitle>{t("settings.billing.cancelModal.subtitle")}</ModalSubtitle>
        </div>
      </ModalHead>
      <ModalContent className="flex flex-col gap-3">
        <InfoCard
          icon={<Zap className="size-5" />}
          title={t("settings.billing.cancelModal.credits", { count: creditsBalance })}
          description={t("settings.billing.cancelModal.creditsDescription")}
        />
        <InfoCard
          icon={<FolderOpen className="size-5" />}
          title={projectCountTitle}
          description={t("settings.billing.cancelModal.activeProjectsDescription")}
        />
        {dateStr ? (
          <InfoCard
            icon={<Calendar className="size-5" />}
            title={t("settings.billing.cancelModal.accessUntil", { date: dateStr })}
            description={t("settings.billing.cancelModal.accessUntilDescription")}
          />
        ) : null}
      </ModalContent>
      <ModalFooter className="flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant="tertiary"
          disabled={busy}
          onClick={onClose}
          className="w-full sm:w-auto flex-1"
        >
          {t("settings.billing.cancelModal.back")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={busy}
          onClick={() => void onConfirm()}
          data-testid="cancel-subscription-confirm-btn"
          className="w-full sm:w-auto flex-1"
        >
          {busy ? t("common.loading") : t("settings.billing.cancelModal.confirm")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
