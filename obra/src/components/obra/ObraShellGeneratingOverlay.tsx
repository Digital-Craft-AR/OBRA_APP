import { useTranslation } from "react-i18next";
import { ObraGeneratingOverlay } from "./ObraGeneratingOverlay";

type Props = {
  current?: number;
  total?: number;
};

export function ObraShellGeneratingOverlay({ current, total }: Props) {
  const { t } = useTranslation();
  const msgs = t("wizard.preview.shell.loadingMsgs", { returnObjects: true }) as string[];
  const messages = Array.isArray(msgs) && msgs.length > 0 ? msgs : [t("wizard.preview.shell.generatingHint")];

  return (
    <ObraGeneratingOverlay
      title={t("wizard.preview.shell.generatingTitle")}
      messages={messages}
      ariaLabel={t("wizard.preview.shell.generating")}
      current={current}
      total={total}
    />
  );
}
